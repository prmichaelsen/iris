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

export { newId, nowSec }
