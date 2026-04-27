import Anthropic from '@anthropic-ai/sdk'
import type {
  FlashcardFreeformWidget,
  FlashcardFreeformResult,
} from '../../shared/types/widgets'
import { pickVocab, updateSm2, ensureGlossesAndDistractors, newId, type ToolContext, type ToolRegistration, type VocabCard, type Env } from './shared'

const WIDGET_TIMEOUT_MS = 300_000

// Synonym table for fuzzy matching
const SYNONYMS: Record<string, string[]> = {
  'departure': ['leaving', 'going away', 'exit'],
  'arrival': ['coming', 'arriving'],
  'work': ['job', 'labor'],
  'school': ['schooling'],
  'breakfast': ['morning meal'],
  'lunch': ['midday meal', 'dinner'],
  'dinner': ['supper', 'evening meal'],
  'car': ['automobile', 'vehicle'],
  'train': ['railway'],
  'platform': ['rail platform'],
}

export const flashcardFreeformTool: ToolRegistration = {
  tool: {
    name: 'flashcard_freeform',
    description: `Start a freeform flashcard exercise. User types the English meaning of a German word. Use when the user wants to practice vocabulary with open-ended answers. Say something encouraging before calling this tool.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        cefr_level: { type: 'string', enum: ['A1', 'A2', 'B1'], description: 'Target CEFR level. Omit to auto-detect.' },
      },
      required: [],
    },
  },
  execute: executeFlashcardFreeform,
}

async function executeFlashcardFreeform(
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<string> {
  const { env, userId, send, targetLang, pendingWidget } = ctx

  if (!targetLang) return 'Please select a language first.'
  const cefrLevel = (input.cefr_level as string) || undefined

  const vocabCards = await pickVocab(env.DB, userId, targetLang.code, 1, cefrLevel)
  if (vocabCards.length === 0) {
    return `No vocabulary available for ${targetLang.english}. Try a different CEFR level.`
  }

  await ensureGlossesAndDistractors(env, vocabCards, targetLang.code)

  const vc = vocabCards[0]
  const vocabRow = await env.DB
    .prepare("SELECT id, gloss_en FROM vocab_items WHERE lemma = ? AND language = ? AND source = 'goethe' LIMIT 1")
    .bind(vc.lemma, targetLang.code)
    .first<{ id: number; gloss_en: string | null }>()

  if (!vocabRow?.gloss_en) {
    return `Unable to generate gloss for ${vc.lemma}. Please try again.`
  }

  const correctAnswer = vocabRow.gloss_en
  const word = vc.article ? `${vc.article} ${vc.lemma}` : vc.lemma
  const widgetId = newId()

  const widget: FlashcardFreeformWidget = {
    type: 'flashcard-freeform',
    widget_id: widgetId,
    word,
    cefr_level: vc.cefr_level,
  }

  pendingWidget.widgetId = widgetId
  pendingWidget.correctMap.set(widgetId, { correct_index: 0, correct_answer: correctAnswer, word })

  send({ type: 'widget', widget })

  let userAnswer: string
  try {
    userAnswer = await new Promise<string>((resolve, reject) => {
      const originalResolve = pendingWidget.resolve
      const originalReject = pendingWidget.reject

      pendingWidget.resolve = (answers: any) => {
        if (typeof answers === 'string') {
          resolve(answers)
        } else if (originalResolve) {
          originalResolve(answers)
        }
      }
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

  const gradeResult = await gradeAnswer(userAnswer, correctAnswer, word, env)

  const result: FlashcardFreeformResult = {
    type: 'widget_result',
    widget_id: widgetId,
    widget_type: 'flashcard-freeform',
    word,
    correct_answer: correctAnswer,
    user_answer: userAnswer,
    correct: gradeResult.correct,
    grading_method: gradeResult.method as 'exact' | 'fuzzy' | 'claude',
    claude_explanation: gradeResult.explanation,
  }

  send(result)

  try {
    await updateSm2(env.DB, userId, vc.lemma, targetLang.code, gradeResult.correct)
  } catch (err) {
    console.warn(`[iris] SM-2 update failed for ${vc.lemma}:`, err)
  }

  ctx.turnWidgetBlocks.push({
    type: 'widget',
    widget_type: 'flashcard-freeform',
    widget_id: widgetId,
    payload: widget,
    response: { type: 'widget_response', widget_id: widgetId, answer: userAnswer },
    result,
    status: 'completed',
  })

  pendingWidget.widgetId = null
  pendingWidget.correctMap.clear()

  const mark = gradeResult.correct ? '✓' : '✗'
  const explanation = gradeResult.method === 'claude' && gradeResult.explanation
    ? ` (${gradeResult.explanation})`
    : gradeResult.method === 'fuzzy'
    ? ` (synonym for ${correctAnswer})`
    : ''

  return `${word} → '${userAnswer}' ${mark}${explanation}`
}

async function gradeAnswer(
  userAnswer: string,
  expected: string,
  word: string,
  env: Env,
): Promise<{ correct: boolean; method: string; explanation?: string }> {
  // Normalize
  const normalizedUser = userAnswer.trim().toLowerCase()
  const normalizedExpected = expected.trim().toLowerCase()

  // Edge cases
  if (normalizedUser === '') {
    return { correct: false, method: 'exact' }
  }
  if (normalizedUser.length > 200) {
    return { correct: false, method: 'exact', explanation: 'Answer too long' }
  }

  // 1. Exact match
  if (normalizedUser === normalizedExpected) {
    return { correct: true, method: 'exact' }
  }

  // 2. Fuzzy match via synonym table
  const expectedSynonyms = SYNONYMS[normalizedExpected] || []
  if (expectedSynonyms.some(syn => syn.toLowerCase() === normalizedUser)) {
    return { correct: true, method: 'fuzzy' }
  }

  // Reverse: check if user answer is a key and expected is in its synonyms
  const userSynonyms = SYNONYMS[normalizedUser] || []
  if (userSynonyms.some(syn => syn.toLowerCase() === normalizedExpected)) {
    return { correct: true, method: 'fuzzy' }
  }

  // 3. Claude Haiku fallback
  try {
    const claudeClient = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
    const response = await claudeClient.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `Grade this German vocabulary answer.
Word: ${word}
Correct answer: ${expected}
User's answer: ${userAnswer}
Is the user's answer semantically equivalent? Answer with JSON:
{ "correct": true/false, "explanation": "..." }`,
        },
      ],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    const jsonMatch = text.match(/\{[^}]+\}/)
    if (!jsonMatch) {
      console.error('[iris] Claude grading response not JSON:', text)
      return { correct: false, method: 'claude', explanation: 'Unable to parse grading response' }
    }

    const parsed = JSON.parse(jsonMatch[0])
    if (typeof parsed.correct !== 'boolean') {
      console.error('[iris] Claude grading missing correct field:', parsed)
      return { correct: false, method: 'claude', explanation: 'Invalid grading response' }
    }

    return { correct: parsed.correct, method: 'claude', explanation: parsed.explanation || '' }
  } catch (err) {
    console.error('[iris] Claude grading API error:', err)
    return { correct: false, method: 'claude', explanation: 'Grading service unavailable' }
  }
}

// ensureGloss removed — using shared ensureGlossesAndDistractors instead
