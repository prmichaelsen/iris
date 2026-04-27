/// Shared types and helpers for all tool executors.
import Anthropic from '@anthropic-ai/sdk'
import type {
  FlashcardMatchingAnswer,
  WidgetContentBlock,
} from '../../shared/types/widgets'
import { newId, nowSec } from '../auth'

export interface Env {
  ANTHROPIC_API_KEY: string
  ELEVENLABS_API_KEY: string
  ELEVENLABS_VOICE_ID?: string
  ASSETS: { fetch: (req: Request) => Promise<Response> }
  DB: D1Database
}

export interface VocabCard {
  lemma: string
  display: string
  article: string | null
  cefr_level: string
  sentence_de: string
  sentence_en: string
}

export interface PendingWidget {
  widgetId: string | null
  resolve: ((answers: any) => void) | null
  reject: ((reason: string) => void) | null
  timer: ReturnType<typeof setTimeout> | null
  correctMap: Map<string, any>
}

export interface ToolContext {
  env: Env
  userId: string
  server: WebSocket
  send: (payload: Record<string, unknown>) => void
  targetLang: { code: string; name: string; english: string } | null
  turnWidgetBlocks: WidgetContentBlock[]
  pendingWidget: PendingWidget
  conversationHistory?: Anthropic.MessageParam[]
}

export interface ToolRegistration {
  tool: Anthropic.Tool
  execute: (input: Record<string, unknown>, ctx: ToolContext) => Promise<string>
}

export async function pickVocab(
  db: D1Database,
  userId: string,
  langCode: string,
  count = 5,
  cefrLevel?: string,
): Promise<VocabCard[]> {
  const cefrFilter = cefrLevel ? `AND v.cefr_level = '${cefrLevel}'` : ''
  const result = await db
    .prepare(
      `SELECT v.lemma, v.display, v.article, v.cefr_level,
              e.sentence_de, e.sentence_en
       FROM vocab_items v
       LEFT JOIN vocab_examples e ON e.vocab_item_id = v.id
       LEFT JOIN user_vocab_progress p ON p.vocab_item_id = v.id AND p.user_id = ?
       WHERE v.language = ? ${cefrFilter}
       ORDER BY
         CASE WHEN p.due_at IS NULL THEN 0 ELSE 1 END,
         CASE WHEN p.due_at IS NOT NULL AND p.due_at <= ? THEN 0 ELSE 1 END,
         v.cefr_level ASC,
         RANDOM()
       LIMIT ?`,
    )
    .bind(userId, langCode, nowSec(), count)
    .all<{
      lemma: string
      display: string
      article: string | null
      cefr_level: string
      sentence_de: string | null
      sentence_en: string | null
    }>()

  return (result.results || []).map((r) => ({
    lemma: r.lemma,
    display: r.display,
    article: r.article,
    cefr_level: r.cefr_level,
    sentence_de: r.sentence_de ?? '',
    sentence_en: r.sentence_en ?? '',
  }))
}

export async function updateSm2(
  db: D1Database,
  userId: string,
  lemma: string,
  langCode: string,
  correct: boolean,
): Promise<void> {
  const now = nowSec()
  const prev = await db
    .prepare(
      `SELECT p.ease, p.interval_days FROM user_vocab_progress p
       JOIN vocab_items v ON v.id = p.vocab_item_id
       WHERE p.user_id = ? AND v.lemma = ? AND v.language = ?
       LIMIT 1`,
    )
    .bind(userId, lemma, langCode)
    .first<{ ease: number; interval_days: number }>()

  const ease = prev?.ease ?? 2.5
  const interval = prev?.interval_days ?? 0

  let newEase: number
  let newInterval: number
  if (correct) {
    newInterval = interval === 0 ? 1 : interval === 1 ? 6 : Math.round(interval * ease)
    newEase = Math.max(1.3, ease + 0.1)
  } else {
    newInterval = 0
    newEase = Math.max(1.3, ease - 0.2)
  }

  const dueAt = now + newInterval * 86400

  await db
    .prepare(
      `INSERT INTO user_vocab_progress (user_id, vocab_item_id, ease, interval_days, due_at, last_seen_at, correct_count, incorrect_count)
       SELECT ?, v.id, ?, ?, ?, ?, ?, ?
       FROM vocab_items v WHERE v.lemma = ? AND v.language = ? AND v.source = 'goethe' LIMIT 1
       ON CONFLICT (user_id, vocab_item_id)
       DO UPDATE SET ease = excluded.ease, interval_days = excluded.interval_days,
         due_at = excluded.due_at, last_seen_at = excluded.last_seen_at,
         correct_count = correct_count + excluded.correct_count,
         incorrect_count = incorrect_count + excluded.incorrect_count`,
    )
    .bind(userId, newEase, newInterval, dueAt, now, correct ? 1 : 0, correct ? 0 : 1, lemma, langCode)
    .run()
}

export async function ensureGlossesAndDistractors(
  env: Env,
  vocabCards: VocabCard[],
  langCode: string,
): Promise<void> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default

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
    .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
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

    const item = needsGloss.find((w) => w.id === id)
    if (gloss && item) {
      // Update ALL rows for this lemma (handles duplicates across CEFR levels)
      await env.DB
        .prepare("UPDATE vocab_items SET gloss_en = ? WHERE lemma = ? AND language = ? AND gloss_en IS NULL")
        .bind(gloss, item.lemma, langCode)
        .run()
    }
    for (const d of [d1, d2, d3]) {
      if (d) {
        await env.DB
          .prepare('INSERT OR IGNORE INTO vocab_distractors (vocab_item_id, distractor_en) VALUES (?, ?)')
          .bind(id, d)
          .run()
          .catch(() => {})
      }
    }
  }
  console.log(`[iris] cached glosses + distractors for ${needsGloss.length} words`)
}

export { newId, nowSec }
