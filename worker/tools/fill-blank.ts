import type {
  FillBlankWidget,
  FillBlankCard,
  FillBlankCardResult,
  FillBlankAnswer,
} from '../../shared/types/widgets'
import { updateSm2, newId, type ToolContext, type ToolRegistration } from './shared'

const WIDGET_TIMEOUT_MS = 300_000

function normalizeGerman(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
}

export const fillBlankTool: ToolRegistration = {
  tool: {
    name: 'fill_blank',
    description: 'Start a fill-in-the-blank grammar exercise. The server generates sentences with one word removed, and the user types the missing word. Use when the user wants to practice grammar, articles, prepositions, or verb conjugations in context.',
    input_schema: {
      type: 'object' as const,
      properties: {
        count: {
          type: 'integer',
          minimum: 1,
          maximum: 10,
          description: 'Number of sentences. Default 5.'
        },
        cefr_level: {
          type: 'string',
          enum: ['A1', 'A2', 'B1'],
          description: 'Target CEFR level. Omit to use the user\'s current level.'
        },
        focus: {
          type: 'string',
          enum: ['verbs', 'articles', 'prepositions', 'mixed'],
          description: 'Focus on a specific part of speech. Omit for mixed practice.'
        },
      },
      required: [],
    },
  },
  execute: executeFillBlank,
}

async function executeFillBlank(
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<string> {
  const { env, userId, send, targetLang } = ctx

  if (!targetLang) return 'Please select a language first.'

  const count = Math.max(1, Math.min(10, Number(input.count) || 5))
  const cefrLevel = (input.cefr_level as string) || undefined
  const focus = (input.focus as string) || undefined

  // Build focus filter for pos
  let partOfSpeechFilter = ''
  if (focus === 'verbs') {
    partOfSpeechFilter = "AND v.pos = 'verb'"
  } else if (focus === 'articles') {
    partOfSpeechFilter = "AND v.pos = 'article'"
  } else if (focus === 'prepositions') {
    partOfSpeechFilter = "AND v.pos = 'preposition'"
  }

  const cefrFilter = cefrLevel ? `AND v.cefr_level = '${cefrLevel}'` : ''

  // Query vocab items that have example sentences
  const result = await env.DB
    .prepare(
      `SELECT v.id, v.lemma, v.display, v.article, v.cefr_level, v.pos,
              e.id as example_id, e.sentence_de
       FROM vocab_items v
       INNER JOIN vocab_examples e ON e.vocab_item_id = v.id
       LEFT JOIN user_vocab_progress p ON p.vocab_item_id = v.id AND p.user_id = ?
       WHERE v.language = ? ${cefrFilter} ${partOfSpeechFilter}
       ORDER BY
         CASE WHEN p.due_at IS NULL THEN 0 ELSE 1 END,
         CASE WHEN p.due_at IS NOT NULL AND p.due_at <= ? THEN 0 ELSE 1 END,
         v.cefr_level ASC,
         RANDOM()
       LIMIT ?`,
    )
    .bind(userId, targetLang.code, Math.floor(Date.now() / 1000), count * 3)
    .all<{
      id: number
      lemma: string
      display: string
      article: string | null
      cefr_level: string
      pos: string | null
      example_id: number
      sentence_de: string
    }>()

  if (!result.results || result.results.length === 0) {
    if (focus) {
      return `No ${focus} available for this level with example sentences.`
    }
    return 'No example sentences available for this language/level.'
  }

  // Build cards by blanking out the lemma in each example sentence
  const cards: FillBlankCard[] = []
  const serverState: Map<string, { expected: string; vocab_id: string; lemma: string }> = new Map()

  for (const row of result.results) {
    if (cards.length >= count) break

    const lemma = row.lemma
    const sentence = row.sentence_de

    // Try to find the lemma (or a variant) in the sentence
    // For simplicity, we'll do case-insensitive match
    const lemmaNormalized = normalizeGerman(lemma)
    const sentenceNormalized = normalizeGerman(sentence)

    // Find the word in the sentence that matches the lemma
    const words = sentence.split(/\s+/)
    let blankIndex = -1
    let originalWord = ''

    for (let i = 0; i < words.length; i++) {
      const wordNormalized = normalizeGerman(words[i].replace(/[.,!?;:]/g, ''))
      if (wordNormalized === lemmaNormalized || wordNormalized.includes(lemmaNormalized) || lemmaNormalized.includes(wordNormalized)) {
        blankIndex = i
        originalWord = words[i].replace(/[.,!?;:]/g, '')
        break
      }
    }

    // If we couldn't find the lemma in the sentence, skip it
    if (blankIndex === -1) {
      continue
    }

    // Replace the word with ___
    const blankedWords = [...words]
    const punctuation = words[blankIndex].match(/[.,!?;:]$/)?.[0] || ''
    blankedWords[blankIndex] = '___' + punctuation
    const blankedSentence = blankedWords.join(' ')

    const cardId = newId()
    cards.push({
      card_id: cardId,
      sentence: blankedSentence,
      hint: undefined, // Future enhancement
      vocab_id: lemma,
    })

    serverState.set(cardId, {
      expected: originalWord,
      vocab_id: lemma,
      lemma,
    })
  }

  if (cards.length === 0) {
    return 'Unable to generate cards — no suitable example sentences found.'
  }

  const widgetId = newId()
  ctx.pendingWidget.widgetId = widgetId

  const widget: FillBlankWidget = {
    type: 'fill-blank',
    widget_id: widgetId,
    cards,
    cefr_level: result.results[0]?.cefr_level || 'A1',
  }

  send({ type: 'widget', widget })

  let answers: FillBlankAnswer[]
  try {
    answers = await new Promise<FillBlankAnswer[]>((resolve, reject) => {
      ctx.pendingWidget.resolve = resolve as any
      ctx.pendingWidget.reject = reject
      ctx.pendingWidget.timer = setTimeout(() => {
        ctx.pendingWidget.widgetId = null
        ctx.pendingWidget.resolve = null
        ctx.pendingWidget.reject = null
        ctx.pendingWidget.timer = null
        reject('Widget timed out — user did not respond within 5 minutes')
      }, WIDGET_TIMEOUT_MS)
    })
  } catch (reason) {
    ctx.pendingWidget.widgetId = null
    return typeof reason === 'string' ? reason : 'Widget cancelled'
  }

  // Grade answers
  const answerMap = new Map(answers.map((a) => [a.card_id, a.typed_answer]))
  const cardResults: FillBlankCardResult[] = []
  let correctCount = 0

  for (const card of cards) {
    const serverCard = serverState.get(card.card_id)!
    const typedAnswer = answerMap.get(card.card_id) ?? ''
    const isCorrect = normalizeGerman(typedAnswer) === normalizeGerman(serverCard.expected)

    if (isCorrect) correctCount++

    // Restore the original sentence with the expected word
    const restoredSentence = card.sentence.replace('___', serverCard.expected)

    cardResults.push({
      card_id: card.card_id,
      sentence: restoredSentence,
      expected: serverCard.expected,
      typed_answer: typedAnswer,
      correct: isCorrect,
      hint: card.hint,
    })
  }

  // Send result to client
  send({
    type: 'widget_result',
    widget_id: widgetId,
    widget_type: 'fill-blank',
    score: correctCount,
    total: cards.length,
    cards: cardResults,
  })

  // Update SM-2 progress
  for (const cr of cardResults) {
    const serverCard = serverState.get(cr.card_id)
    if (!serverCard) continue
    try {
      await updateSm2(env.DB, userId, serverCard.lemma, targetLang.code, cr.correct)
    } catch (err) {
      console.warn(`[iris] SM-2 update failed for ${serverCard.lemma}:`, err)
    }
  }

  // Persist widget
  ctx.turnWidgetBlocks.push({
    type: 'widget',
    widget_type: 'fill-blank',
    widget_id: widgetId,
    payload: widget,
    response: { type: 'widget_response', widget_id: widgetId, answers },
    result: {
      type: 'widget_result',
      widget_id: widgetId,
      widget_type: 'fill-blank',
      score: correctCount,
      total: cards.length,
      cards: cardResults,
    },
    status: 'completed',
  })

  ctx.pendingWidget.widgetId = null

  // Build text summary for Claude
  const summary = cardResults
    .map((c) => {
      const blank = c.sentence.replace(c.expected, '___')
      return `${blank} (${c.expected}) ${c.correct ? '✓' : '✗'}`
    })
    .join(', ')

  return `User scored ${correctCount}/${cards.length}: ${summary}`
}
