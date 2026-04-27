import Anthropic from '@anthropic-ai/sdk'
import type {
  FlashcardMatchingWidget,
  FlashcardMatchingCard,
  FlashcardMatchingCardResult,
  FlashcardMatchingAnswer,
} from '../../shared/types/widgets'
import { pickVocab, updateSm2, newId, type ToolContext, type ToolRegistration, type VocabCard, type Env } from './shared'

const WIDGET_TIMEOUT_MS = 300_000

export const flashcardMatchingTool: ToolRegistration = {
  tool: {
    name: 'flashcard',
    description: `Start an interactive quiz widget. Available modes: matching (show German word, pick English translation from 4 options), gender-pick (show German noun without article, pick der/die/das). Use matching for vocabulary practice. Use gender-pick when the user asks about noun genders, articles, der/die/das, or gender quizzes. Always try the tool — never tell the user a mode is unavailable without calling it first.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        mode: {
          type: 'string',
          enum: ['matching', 'gender-pick'],
          description: 'Quiz mode. matching: translate vocab; gender-pick: choose der/die/das for German nouns.',
        },
        count: { type: 'integer', minimum: 1, maximum: 20, description: 'Number of cards (1-20). Default 10.' },
        cefr_level: { type: 'string', enum: ['A1', 'A2', 'B1'], description: 'Target CEFR level. Omit to auto-detect.' },
      },
      required: ['mode'],
    },
  },
  execute: executeFlashcard,
}

async function executeFlashcard(
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<string> {
  const { env, userId, send, targetLang, pendingWidget } = ctx

  if (!targetLang) return 'Please select a language first.'
  const mode = input.mode as string
  if (mode !== 'matching') return 'Only matching mode is supported by this executor.'
  const count = Math.max(1, Math.min(20, Number(input.count) || 10))
  const cefrLevel = (input.cefr_level as string) || undefined

  const vocabCards = await pickVocab(env.DB, userId, targetLang.code, count, cefrLevel)
  if (vocabCards.length === 0) {
    return `No vocabulary available for ${targetLang.english}. Try a different CEFR level.`
  }

  await ensureGlossesAndDistractors(env, vocabCards, targetLang.code)

  const widgetId = newId()
  const cards: FlashcardMatchingCard[] = []
  const correctMap = new Map<string, { correct_index: number; correct_answer: string; word: string }>()

  for (const vc of vocabCards) {
    const cardId = newId()
    const vocabRow = await env.DB
      .prepare("SELECT id, gloss_en FROM vocab_items WHERE lemma = ? AND language = ? AND source = 'goethe' LIMIT 1")
      .bind(vc.lemma, targetLang.code)
      .first<{ id: number; gloss_en: string | null }>()

    if (!vocabRow?.gloss_en) continue
    const correctAnswer = vocabRow.gloss_en
    const word = vc.article ? `${vc.article} ${vc.lemma}` : vc.lemma

    let distractors: string[] = []
    if (vocabRow) {
      const dResult = await env.DB
        .prepare('SELECT distractor_en FROM vocab_distractors WHERE vocab_item_id = ? ORDER BY RANDOM() LIMIT 3')
        .bind(vocabRow.id)
        .all<{ distractor_en: string }>()
      distractors = (dResult.results || []).map((r) => r.distractor_en)
    }

    while (distractors.length < 3) {
      const fallback = await env.DB
        .prepare('SELECT gloss_en FROM vocab_items WHERE language = ? AND lemma != ? AND gloss_en IS NOT NULL ORDER BY RANDOM() LIMIT 1')
        .bind(targetLang.code, vc.lemma)
        .first<{ gloss_en: string }>()
      distractors.push(fallback?.gloss_en || `option ${distractors.length + 2}`)
    }

    const options = [correctAnswer, ...distractors.slice(0, 3)]
    const shuffled = options
      .map((o, i) => ({ o, sort: Math.random(), origIdx: i }))
      .sort((a, b) => a.sort - b.sort)
    const shuffledOptions = shuffled.map((s) => s.o)
    const correctIndex = shuffled.findIndex((s) => s.origIdx === 0)

    cards.push({ card_id: cardId, word, options: shuffledOptions })
    correctMap.set(cardId, { correct_index: correctIndex, correct_answer: correctAnswer, word })
  }

  pendingWidget.correctMap = correctMap
  pendingWidget.widgetId = widgetId

  const widget: FlashcardMatchingWidget = {
    type: 'flashcard-matching',
    widget_id: widgetId,
    cards,
    cefr_level: vocabCards[0]?.cefr_level || 'A1',
  }
  send({ type: 'widget', widget })

  let answers: FlashcardMatchingAnswer[]
  try {
    answers = await new Promise<FlashcardMatchingAnswer[]>((resolve, reject) => {
      pendingWidget.resolve = resolve
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

  const answerMap = new Map(answers.map((a) => [a.card_id, a.selected_index]))
  const cardResults: FlashcardMatchingCardResult[] = []
  let correctCount = 0

  for (const card of cards) {
    const correct = correctMap.get(card.card_id)!
    const selectedIndex = answerMap.get(card.card_id) ?? -1
    const isCorrect = selectedIndex === correct.correct_index
    if (isCorrect) correctCount++
    cardResults.push({
      card_id: card.card_id,
      word: correct.word,
      correct_answer: correct.correct_answer,
      correct_index: correct.correct_index,
      selected_index: selectedIndex,
      correct: isCorrect,
    })
  }

  send({
    type: 'widget_result',
    widget_id: widgetId,
    widget_type: 'flashcard-matching',
    score: correctCount,
    total: cards.length,
    cards: cardResults,
  })

  for (const cr of cardResults) {
    const vocab = vocabCards.find((v) => correctMap.get(cr.card_id)?.word === (v.display || v.lemma) || correctMap.get(cr.card_id)?.word === `${v.article} ${v.lemma}`)
    if (!vocab) continue
    try {
      await updateSm2(env.DB, userId, vocab.lemma, targetLang.code, cr.correct)
    } catch (err) {
      console.warn(`[iris] SM-2 update failed for ${vocab.lemma}:`, err)
    }
  }

  ctx.turnWidgetBlocks.push({
    type: 'widget',
    widget_type: 'flashcard-matching',
    widget_id: widgetId,
    payload: widget,
    response: { type: 'widget_response', widget_id: widgetId, answers },
    result: {
      type: 'widget_result',
      widget_id: widgetId,
      widget_type: 'flashcard-matching',
      score: correctCount,
      total: cards.length,
      cards: cardResults,
    },
    status: 'completed',
  })

  pendingWidget.widgetId = null
  pendingWidget.correctMap.clear()

  const summary = cardResults.map((c) => `${c.word} ${c.correct ? '✓' : '✗'}`).join(', ')
  return `User scored ${correctCount}/${cards.length}: ${summary}`
}

async function ensureGlossesAndDistractors(
  env: Env,
  vocabCards: VocabCard[],
  langCode: string,
): Promise<void> {
  const needsGloss: { id: number; lemma: string; article: string | null }[] = []
  for (const vc of vocabCards) {
    const row = await env.DB
      .prepare("SELECT id, gloss_en FROM vocab_items WHERE lemma = ? AND language = ? AND source = 'goethe' LIMIT 1")
      .bind(vc.lemma, langCode)
      .first<{ id: number; gloss_en: string | null }>()
    if (!row) continue
    if (!row.gloss_en) {
      needsGloss.push({ id: row.id, lemma: vc.lemma, article: vc.article })
      continue
    }
    const dCount = await env.DB
      .prepare('SELECT COUNT(*) AS c FROM vocab_distractors WHERE vocab_item_id = ?')
      .bind(row.id)
      .first<{ c: number }>()
    if (!dCount || dCount.c < 3) {
      needsGloss.push({ id: row.id, lemma: vc.lemma, article: vc.article })
    }
  }

  if (needsGloss.length === 0) return

  console.log(`[iris] generating glosses + distractors for ${needsGloss.length} words`)
  const wordList = needsGloss
    .map((w) => `${w.id}|${w.article ? w.article + ' ' : ''}${w.lemma}`)
    .join('\n')

  const glossClient = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  const response = await glossClient.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `For each German word, provide:
1. A short English gloss (1-3 words, like a dictionary entry)
2. Three plausible-but-wrong English distractors (similar category/difficulty, 1-3 words each)

Format each line as: ID|gloss|distractor1|distractor2|distractor3
No extra text, just the lines.

Example:
123|greeting|farewell|question|answer
456|departure|arrival|entrance|delay

Words:
${wordList}`,
      },
    ],
  })

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')

  for (const line of text.split('\n')) {
    const parts = line.trim().split('|')
    if (parts.length < 4) continue
    const id = parseInt(parts[0], 10)
    if (isNaN(id)) continue
    const gloss = parts[1].trim()
    const d1 = parts[2]?.trim()
    const d2 = parts[3]?.trim()
    const d3 = parts[4]?.trim()

    if (gloss) {
      await env.DB.prepare('UPDATE vocab_items SET gloss_en = ? WHERE id = ?').bind(gloss, id).run()
    }
    for (const d of [d1, d2, d3]) {
      if (d) {
        await env.DB
          .prepare('INSERT OR IGNORE INTO vocab_distractors (vocab_item_id, distractor_en) VALUES (?, ?)')
          .bind(id, d).run().catch(() => {})
      }
    }
  }
  console.log(`[iris] cached glosses + distractors for ${needsGloss.length} words`)
}
