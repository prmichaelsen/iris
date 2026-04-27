// gender-pick is a mode of the unified `flashcard` tool (see ./flashcard.ts).
// This file exports only the execution entry point; the dispatcher in
// ./index.ts routes `flashcard` tool calls with mode='gender-pick' here.

import type {
  GenderPickWidget,
  GenderPickCard,
  GenderPickCardResult,
  GenderPickAnswer,
} from '../../shared/types/widgets'
import { updateSm2, newId, nowSec, type ToolContext } from './shared'

const WIDGET_TIMEOUT_MS = 300_000

export async function executeGenderPick(
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<string> {
  const { env, userId, send, targetLang, pendingWidget } = ctx

  if (!targetLang) return 'Please select a language first.'

  if (targetLang.code !== 'deu') {
    return 'Gender-pick mode is only available for German'
  }

  const mode = input.mode as string
  if (mode !== 'gender-pick') return 'This tool only handles gender-pick mode.'

  const count = Math.max(1, Math.min(20, Number(input.count) || 10))
  const cefrLevel = (input.cefr_level as string) || undefined

  const nouns = await pickNouns(env.DB, userId, targetLang.code, count, cefrLevel)
  if (nouns.length === 0) {
    return `No nouns with gender data available for ${targetLang.english}`
  }

  const widgetId = newId()
  const cards: GenderPickCard[] = []
  const correctMap = new Map<string, { article: string; lemma: string }>()

  for (const noun of nouns) {
    const cardId = newId()
    const bareNoun = stripArticle(noun.display, noun.article)
    cards.push({ card_id: cardId, noun: bareNoun })
    correctMap.set(cardId, { article: noun.article, lemma: noun.lemma })
  }

  pendingWidget.widgetId = widgetId

  const widget: GenderPickWidget = {
    type: 'gender-pick',
    widget_id: widgetId,
    cards,
    cefr_level: nouns[0]?.cefr_level || 'A1',
  }
  send({ type: 'widget', widget })

  let answers: GenderPickAnswer[]
  try {
    answers = await new Promise<GenderPickAnswer[]>((resolve, reject) => {
      pendingWidget.resolve = resolve as any
      pendingWidget.reject = reject
      pendingWidget.timer = setTimeout(() => {
        pendingWidget.widgetId = null
        pendingWidget.resolve = null
        pendingWidget.reject = null
        pendingWidget.timer = null
        reject('Widget timed out — user did not respond within 5 minutes')
      }, WIDGET_TIMEOUT_MS)
    })
  } catch (reason) {
    pendingWidget.widgetId = null
    pendingWidget.correctMap.clear()
    return typeof reason === 'string' ? reason : 'Widget cancelled'
  }

  const answerMap = new Map(answers.map((a) => [a.card_id, a.selected_article]))
  const cardResults: GenderPickCardResult[] = []
  let correctCount = 0

  for (const card of cards) {
    const correct = correctMap.get(card.card_id)!
    const selectedArticle = answerMap.get(card.card_id) || 'der'
    const isCorrect = selectedArticle === correct.article
    if (isCorrect) correctCount++
    cardResults.push({
      card_id: card.card_id,
      noun: card.noun,
      correct_article: correct.article as 'der' | 'die' | 'das',
      selected_article: selectedArticle as 'der' | 'die' | 'das',
      correct: isCorrect,
    })
  }

  send({
    type: 'widget_result',
    widget_id: widgetId,
    widget_type: 'gender-pick',
    score: correctCount,
    total: cards.length,
    cards: cardResults,
  })

  for (const cr of cardResults) {
    const noun = nouns.find((n) => correctMap.get(cr.card_id)?.lemma === n.lemma)
    if (!noun) continue
    try {
      await updateSm2(env.DB, userId, noun.lemma, targetLang.code, cr.correct)
    } catch (err) {
      console.warn(`[iris] SM-2 update failed for ${noun.lemma}:`, err)
    }
  }

  ctx.turnWidgetBlocks.push({
    type: 'widget',
    widget_type: 'gender-pick',
    widget_id: widgetId,
    payload: widget,
    response: { type: 'widget_response', widget_id: widgetId, answers },
    result: {
      type: 'widget_result',
      widget_id: widgetId,
      widget_type: 'gender-pick',
      score: correctCount,
      total: cards.length,
      cards: cardResults,
    },
    status: 'completed',
  })

  pendingWidget.widgetId = null
  pendingWidget.correctMap.clear()

  const summary = cardResults.map((c) => `${c.noun} (${c.correct_article}) ${c.correct ? '✓' : '✗'}`).join(', ')
  return `User scored ${correctCount}/${cards.length}: ${summary}`
}

interface NounRow {
  lemma: string
  display: string
  article: string
  cefr_level: string
}

async function pickNouns(
  db: D1Database,
  userId: string,
  langCode: string,
  count: number,
  cefrLevel?: string,
): Promise<NounRow[]> {
  const cefrFilter = cefrLevel ? `AND v.cefr_level = '${cefrLevel}'` : ''
  const now = nowSec()

  const result = await db
    .prepare(
      `SELECT v.lemma, v.display, v.article, v.cefr_level
       FROM vocab_items v
       LEFT JOIN user_vocab_progress p ON p.vocab_item_id = v.id AND p.user_id = ?
       WHERE v.language = ?
         AND v.pos = 'noun'
         AND v.article IS NOT NULL
         ${cefrFilter}
       ORDER BY
         CASE WHEN p.due_at IS NULL THEN 0 ELSE 1 END,
         CASE WHEN p.due_at IS NOT NULL AND p.due_at <= ? THEN 0 ELSE 1 END,
         v.cefr_level ASC,
         RANDOM()
       LIMIT ?`,
    )
    .bind(userId, langCode, now, count)
    .all<NounRow>()

  return result.results || []
}

function stripArticle(display: string, article: string | null): string {
  if (!article) return display
  const prefix = article + ' '
  if (display.startsWith(prefix)) {
    return display.substring(prefix.length)
  }
  return display
}
