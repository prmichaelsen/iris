import Anthropic from '@anthropic-ai/sdk'
import type {
  DefinitionWidget,
  DefinitionCard,
  DefinitionCardResult,
  DefinitionAnswer,
} from '../../shared/types/widgets'
import { pickVocab, updateSm2, ensureGlossesAndDistractors, newId, type ToolContext, type ToolRegistration, type VocabCard, type Env } from './shared'

const WIDGET_TIMEOUT_MS = 300_000

export const definitionTool: ToolRegistration = {
  tool: {
    name: 'definition',
    description: `Start a definition drill. Shows German words (or speaks them aloud) and asks the user to type the English meaning. Tests active vocabulary recall. Use when the user wants to practice word meanings, test their vocabulary, or work on listening comprehension.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        speak: {
          type: 'boolean',
          description: 'If true, speak the word via TTS (tests listening + meaning). If false (default), show the word as text (tests reading + meaning).'
        },
        count: {
          type: 'integer',
          minimum: 1,
          maximum: 20,
          description: 'Number of words. Default 10.'
        },
        cefr_level: {
          type: 'string',
          enum: ['A1', 'A2', 'B1'],
          description: 'Target CEFR level. Omit to use the user\'s current level.'
        },
      },
      required: [],
    },
  },
  execute: executeDefinition,
}

async function executeDefinition(
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<string> {
  const { env, userId, send, targetLang, pendingWidget } = ctx

  if (!targetLang) return 'Please select a language first.'
  const count = Math.max(1, Math.min(20, Number(input.count) || 10))
  const cefrLevel = (input.cefr_level as string) || undefined
  const speak = Boolean(input.speak)

  const vocabCards = await pickVocab(env.DB, userId, targetLang.code, count, cefrLevel)
  if (vocabCards.length === 0) {
    return `No vocabulary available for ${targetLang.english}. Try a different CEFR level.`
  }

  // Ensure glosses exist (reuse pattern from flashcard-matching)
  await ensureGlossesAndDistractors(env, vocabCards, targetLang.code)

  const widgetId = newId()
  const cards: DefinitionCard[] = []
  const serverState: Array<{
    card_id: string
    vocab_id: number
    word: string
    lemma: string
    expected_meaning: string
  }> = []

  for (const vc of vocabCards) {
    const cardId = newId()
    let vocabRow = await env.DB
      .prepare("SELECT id, gloss_en FROM vocab_items WHERE lemma = ? AND language = ? AND source = 'goethe' LIMIT 1")
      .bind(vc.lemma, targetLang.code)
      .first<{ id: number; gloss_en: string | null }>()

    if (!vocabRow?.gloss_en) continue
    const expectedMeaning = vocabRow.gloss_en
    const word = vc.article ? `${vc.article} ${vc.lemma}` : vc.lemma

    const card: DefinitionCard = {
      card_id: cardId,
      word,
    }

    // TTS integration (Phase 2 — optional speak param)
    if (speak) {
      try {
        // TODO: Implement TTS via elevenlabs.text_to_speech()
        // For now, just skip audio_url if speak=true
        // card.audio_url = await generateTTS(env, word)
        console.log(`[iris] TTS requested for "${word}" but not yet implemented`)
      } catch (err) {
        console.warn(`[iris] TTS failed for "${word}":`, err)
      }
    }

    cards.push(card)
    serverState.push({
      card_id: cardId,
      vocab_id: vocabRow?.id ?? -1,
      word,
      lemma: vc.lemma,
      expected_meaning: expectedMeaning,
    })
  }

  const widget: DefinitionWidget = {
    type: 'definition',
    widget_id: widgetId,
    cards,
    cefr_level: vocabCards[0]?.cefr_level || 'A1',
    speak,
  }
  send({ type: 'widget', widget })

  // Store server state for grading
  pendingWidget.widgetId = widgetId
  // Repurpose correctMap to store server state
  pendingWidget.correctMap.clear()
  for (const state of serverState) {
    pendingWidget.correctMap.set(state.card_id, {
      correct_index: -1, // not used for definition
      correct_answer: state.expected_meaning,
      word: state.word,
    })
  }

  let answers: DefinitionAnswer[]
  try {
    answers = await new Promise<DefinitionAnswer[]>((resolve, reject) => {
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

  // Grade via Claude Haiku
  const gradingResults = await gradeDefinitions(env, serverState, answers)

  const answerMap = new Map(answers.map((a) => [a.card_id, a.answer.trim()]))
  const cardResults: DefinitionCardResult[] = []
  let correctCount = 0

  for (let i = 0; i < serverState.length; i++) {
    const state = serverState[i]
    const userAnswer = answerMap.get(state.card_id) ?? ''
    const grading = gradingResults.find((g) => g.card_id === state.card_id)
    const isCorrect = grading?.correct ?? false
    const feedback = grading?.feedback ?? 'Grading unavailable'

    if (isCorrect) correctCount++
    cardResults.push({
      card_id: state.card_id,
      word: state.word,
      user_answer: userAnswer,
      expected_meaning: state.expected_meaning,
      correct: isCorrect,
      feedback,
    })
  }

  send({
    type: 'widget_result',
    widget_id: widgetId,
    widget_type: 'definition',
    score: correctCount,
    total: cards.length,
    cards: cardResults,
  })

  // SM-2 updates
  for (const cr of cardResults) {
    const state = serverState.find((s) => s.card_id === cr.card_id)
    if (!state || state.vocab_id === -1) continue
    try {
      await updateSm2(env.DB, userId, state.lemma, targetLang.code, cr.correct)
    } catch (err) {
      console.warn(`[iris] SM-2 update failed for ${state.lemma}:`, err)
    }
  }

  ctx.turnWidgetBlocks.push({
    type: 'widget',
    widget_type: 'definition',
    widget_id: widgetId,
    payload: widget,
    response: { type: 'widget_response', widget_id: widgetId, answers },
    result: {
      type: 'widget_result',
      widget_id: widgetId,
      widget_type: 'definition',
      score: correctCount,
      total: cards.length,
      cards: cardResults,
    },
    status: 'completed',
  })

  pendingWidget.widgetId = null
  pendingWidget.correctMap.clear()

  // Tool result summary with feedback
  const summary = cardResults
    .map((c) => {
      if (c.correct) {
        return `${c.word} ✓ (correct)`
      } else {
        return `${c.word} ✗ (you wrote "${c.user_answer}" but expected "${c.expected_meaning}")`
      }
    })
    .join(', ')
  return `User scored ${correctCount}/${cards.length}: ${summary}`
}

async function gradeDefinitions(
  env: Env,
  serverState: Array<{ card_id: string; word: string; expected_meaning: string }>,
  answers: DefinitionAnswer[],
): Promise<Array<{ card_id: string; correct: boolean; feedback: string }>> {
  const answerMap = new Map(answers.map((a) => [a.card_id, a.answer.trim()]))

  const cardsForGrading = serverState.map((s) => ({
    card_id: s.card_id,
    word: s.word,
    expected: s.expected_meaning,
    user_answer: answerMap.get(s.card_id) ?? '',
  }))

  const cardLines = cardsForGrading
    .map((c) => `- card_id: ${c.card_id}, word: "${c.word}", expected: "${c.expected}", user_answer: "${c.user_answer}"`)
    .join('\n')

  const gradingClient = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

  try {
    const response = await gradingClient.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `Grade these German vocabulary answers. For each card, the user was asked to provide the English meaning of a German word.

Accept as correct:
- Exact matches
- Synonyms (e.g., "departure" ≈ "leaving")
- Paraphrases (e.g., "the act of departing")
- Partial answers if they capture the core meaning

Reject as incorrect:
- Completely unrelated words
- Wrong part of speech (e.g., verb for a noun) unless contextually acceptable

Return JSON array: [{ card_id: string, correct: boolean, feedback: string }]
Feedback should be 1 sentence max, friendly tone.

Cards:
${cardLines}

Output JSON only, no markdown.`,
        },
      ],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    // Parse JSON from Claude's response
    const json = JSON.parse(text) as Array<{ card_id: string; correct: boolean; feedback: string }>
    return json
  } catch (err) {
    console.error('[iris] Grading failed:', err)
    // Lenient fallback: non-empty answers are correct
    return cardsForGrading.map((c) => ({
      card_id: c.card_id,
      correct: c.user_answer.length > 0,
      feedback: 'Grading unavailable, scored leniently',
    }))
  }
}

// ensureGlossesAndDistractors is now in shared.ts
