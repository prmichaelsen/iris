/// MCP tool for user study list management
import type { ToolContext, ToolRegistration } from './shared'
import { nowSec } from './shared'

const STATIC_INSERT_PRIORITY = 0.65
const DECAY_PER_DAY = 0.01
const MAX_PRIORITY = 1.0
const MIN_PRIORITY = 0.0

// Interaction boosts
const BUMP_USER_USED = 0.1       // user used the word correctly
const BUMP_USER_ASKED = 0.15     // user asked what it means — they need reminding
const BUMP_IRIS_USED = 0.02      // Iris used it and user continued fine

interface StudyListRow {
  user_id: string
  lemma: string
  gloss: string | null
  notes: string | null
  base_priority: number
  last_touched_at: number
  added_at: number
  uses_by_iris: number
  uses_by_user: number
  clarifications_requested: number
}

// Compute effective priority at read time (applies lazy decay).
export function effectivePriority(row: StudyListRow, nowSeconds: number = nowSec()): number {
  const daysSince = Math.max(0, (nowSeconds - row.last_touched_at) / 86400)
  const decayed = row.base_priority - daysSince * DECAY_PER_DAY
  return Math.max(MIN_PRIORITY, Math.min(MAX_PRIORITY, decayed))
}

function clampPriority(p: number): number {
  return Math.max(MIN_PRIORITY, Math.min(MAX_PRIORITY, p))
}

function normalizeLemma(word: string): string {
  return word.trim().toLowerCase().replace(/[.,!?;:"'()\[\]]/g, '')
}

export const studyListTool: ToolRegistration = {
  tool: {
    name: 'study_list',
    description:
      "Manage the user's study list of words they want to practice. When the user says things like 'add X to my study list', 'I keep forgetting Y', or 'let's practice Z', use action='add'. When user says 'remove X' or 'take X off my list', use action='remove'. When user asks 'what's on my study list' use action='list'. Use action='mark_used' WHEN YOU DELIBERATELY USE A STUDY LIST WORD in your reply, so the system can track engagement (this is important). IMPORTANT: When you use a word from the study list in your reply, always include its English gloss inline in parentheses immediately after, like: 'gerade (already)'. This applies to every use of a study list word, not just the first.",
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['add', 'remove', 'list', 'mark_used', 'mark_clarified'],
          description:
            "'add' adds a word; 'remove' deletes a word; 'list' returns current study list; 'mark_used' increments the uses_by_iris counter after you've used a study word in your reply; 'mark_clarified' records that the user asked for clarification on a study word (increments the priority boost).",
        },
        word: {
          type: 'string',
          description:
            "The German word or lemma. Required for add/remove/mark_used/mark_clarified. Case-insensitive; punctuation stripped automatically.",
        },
        gloss: {
          type: 'string',
          description:
            "English translation/gloss. Required for 'add' — this is what gets rendered inline when Iris uses the word: 'gerade (already)'.",
        },
        notes: {
          type: 'string',
          description: "Optional user note for 'add' action (e.g. why they added it).",
        },
      },
      required: ['action'],
    },
  },

  execute: async (input: Record<string, unknown>, ctx: ToolContext): Promise<string> => {
    try {
      const action = input.action as string
      const word = typeof input.word === 'string' ? input.word : undefined
      const gloss = typeof input.gloss === 'string' ? input.gloss : undefined
      const notes = typeof input.notes === 'string' ? input.notes : undefined

      switch (action) {
        case 'add':
          return await addWord(ctx, word, gloss, notes)
        case 'remove':
          return await removeWord(ctx, word)
        case 'list':
          return await listWords(ctx)
        case 'mark_used':
          return await markUsed(ctx, word)
        case 'mark_clarified':
          return await markClarified(ctx, word)
        default:
          return JSON.stringify({
            error: { code: 'INVALID_ACTION', message: `Unknown action: ${action}` },
          })
      }
    } catch (error) {
      return JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
      })
    }
  },
}

async function addWord(
  ctx: ToolContext,
  word: string | undefined,
  gloss: string | undefined,
  notes: string | undefined,
): Promise<string> {
  if (!word) {
    return JSON.stringify({
      error: { code: 'INVALID_INPUT', message: "'word' is required for action='add'" },
    })
  }
  if (!gloss) {
    return JSON.stringify({
      error: { code: 'INVALID_INPUT', message: "'gloss' (English translation) is required for action='add'" },
    })
  }

  const lemma = normalizeLemma(word)
  if (!lemma) {
    return JSON.stringify({
      error: { code: 'INVALID_INPUT', message: 'word is empty after normalization' },
    })
  }

  const now = nowSec()

  // Compute median-of-top-N for this user to find a reasonable insert priority.
  // Use static 0.65 as the fallback; we'd need batched writes to properly
  // snapshot median without drift on bulk adds, so static is simpler and safe.
  const insertPriority = STATIC_INSERT_PRIORITY

  await ctx.env.DB
    .prepare(
      `INSERT INTO user_study_list
        (user_id, lemma, gloss, notes, base_priority, last_touched_at, added_at,
         uses_by_iris, uses_by_user, clarifications_requested)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0)
       ON CONFLICT (user_id, lemma) DO UPDATE SET
         gloss = excluded.gloss,
         notes = COALESCE(excluded.notes, user_study_list.notes),
         base_priority = MAX(user_study_list.base_priority, ?),
         last_touched_at = ?`,
    )
    .bind(ctx.userId, lemma, gloss, notes ?? null, insertPriority, now, now, insertPriority, now)
    .run()

  return JSON.stringify({
    success: true,
    action: 'added',
    lemma,
    gloss,
    priority: insertPriority,
    message: `Added "${lemma}" (${gloss}) to your study list.`,
  })
}

async function removeWord(ctx: ToolContext, word: string | undefined): Promise<string> {
  if (!word) {
    return JSON.stringify({
      error: { code: 'INVALID_INPUT', message: "'word' is required for action='remove'" },
    })
  }

  const lemma = normalizeLemma(word)
  const { meta } = await ctx.env.DB
    .prepare(`DELETE FROM user_study_list WHERE user_id = ? AND lemma = ?`)
    .bind(ctx.userId, lemma)
    .run()

  if (meta.changes === 0) {
    return JSON.stringify({
      success: false,
      action: 'remove',
      lemma,
      message: `"${lemma}" was not on your study list.`,
    })
  }

  return JSON.stringify({
    success: true,
    action: 'removed',
    lemma,
    message: `Removed "${lemma}" from your study list.`,
  })
}

async function listWords(ctx: ToolContext): Promise<string> {
  const { results } = await ctx.env.DB
    .prepare(
      `SELECT lemma, gloss, notes, base_priority, last_touched_at, added_at,
              uses_by_iris, uses_by_user, clarifications_requested
       FROM user_study_list
       WHERE user_id = ?
       ORDER BY base_priority DESC, added_at DESC`,
    )
    .bind(ctx.userId)
    .all<StudyListRow>()

  const now = nowSec()
  const words = (results ?? []).map((r) => ({
    lemma: r.lemma,
    gloss: r.gloss,
    priority: Number(effectivePriority({ ...r, user_id: ctx.userId }, now).toFixed(3)),
    uses_by_iris: r.uses_by_iris,
    uses_by_user: r.uses_by_user,
    notes: r.notes,
  }))

  return JSON.stringify({
    success: true,
    action: 'list',
    total: words.length,
    words,
  })
}

async function markUsed(ctx: ToolContext, word: string | undefined): Promise<string> {
  if (!word) {
    return JSON.stringify({
      error: { code: 'INVALID_INPUT', message: "'word' is required for action='mark_used'" },
    })
  }
  const lemma = normalizeLemma(word)
  const now = nowSec()

  // Load current row to compute new priority
  const row = await ctx.env.DB
    .prepare(
      `SELECT base_priority, last_touched_at FROM user_study_list
       WHERE user_id = ? AND lemma = ?`,
    )
    .bind(ctx.userId, lemma)
    .first<{ base_priority: number; last_touched_at: number }>()

  if (!row) {
    return JSON.stringify({
      success: false,
      message: `"${lemma}" is not on the study list.`,
    })
  }

  const newPriority = clampPriority(row.base_priority + BUMP_IRIS_USED)

  await ctx.env.DB
    .prepare(
      `UPDATE user_study_list
       SET base_priority = ?, last_touched_at = ?, uses_by_iris = uses_by_iris + 1
       WHERE user_id = ? AND lemma = ?`,
    )
    .bind(newPriority, now, ctx.userId, lemma)
    .run()

  return JSON.stringify({
    success: true,
    action: 'mark_used',
    lemma,
    priority: newPriority,
  })
}

async function markClarified(ctx: ToolContext, word: string | undefined): Promise<string> {
  if (!word) {
    return JSON.stringify({
      error: { code: 'INVALID_INPUT', message: "'word' is required for action='mark_clarified'" },
    })
  }
  const lemma = normalizeLemma(word)
  const now = nowSec()

  const row = await ctx.env.DB
    .prepare(
      `SELECT base_priority FROM user_study_list WHERE user_id = ? AND lemma = ?`,
    )
    .bind(ctx.userId, lemma)
    .first<{ base_priority: number }>()

  if (!row) {
    return JSON.stringify({
      success: false,
      message: `"${lemma}" is not on the study list.`,
    })
  }

  const newPriority = clampPriority(row.base_priority + BUMP_USER_ASKED)

  await ctx.env.DB
    .prepare(
      `UPDATE user_study_list
       SET base_priority = ?, last_touched_at = ?, clarifications_requested = clarifications_requested + 1
       WHERE user_id = ? AND lemma = ?`,
    )
    .bind(newPriority, now, ctx.userId, lemma)
    .run()

  return JSON.stringify({
    success: true,
    action: 'mark_clarified',
    lemma,
    priority: newPriority,
  })
}

// --- Injection helper (used by prompt injector) ---

export interface InjectedStudyWord {
  lemma: string
  gloss: string | null
  priority: number
}

/**
 * Compose the per-turn study list injection:
 *   - top 20 by effective priority
 *   - 20 random samples from the most-recent 50 added
 *   - 10 random tail samples (rank 21+ by priority)
 * Deduped by lemma. Returns at most ~45 unique words.
 */
export async function composeStudyListInjection(
  env: ToolContext['env'],
  userId: string,
): Promise<InjectedStudyWord[]> {
  const TOP = 20
  const RECENT_POOL = 50
  const RECENT_PICK = 20
  const RESURFACE_PICK = 10

  const now = nowSec()

  // Top N by base_priority (decay applied in JS for accuracy)
  const { results: topRows = [] } = await env.DB
    .prepare(
      `SELECT lemma, gloss, base_priority, last_touched_at, added_at,
              uses_by_iris, uses_by_user, clarifications_requested, notes
       FROM user_study_list
       WHERE user_id = ?
       ORDER BY base_priority DESC, added_at DESC
       LIMIT ?`,
    )
    .bind(userId, TOP)
    .all<StudyListRow>()

  // Recent pool — rotating bench
  const { results: recentPool = [] } = await env.DB
    .prepare(
      `SELECT lemma, gloss, base_priority, last_touched_at, added_at,
              uses_by_iris, uses_by_user, clarifications_requested, notes
       FROM user_study_list
       WHERE user_id = ?
       ORDER BY added_at DESC
       LIMIT ?`,
    )
    .bind(userId, RECENT_POOL)
    .all<StudyListRow>()

  // Resurface — random from words not in top-TOP
  const { results: resurface = [] } = await env.DB
    .prepare(
      `SELECT lemma, gloss, base_priority, last_touched_at, added_at,
              uses_by_iris, uses_by_user, clarifications_requested, notes
       FROM user_study_list
       WHERE user_id = ?
         AND lemma NOT IN (
           SELECT lemma FROM user_study_list
           WHERE user_id = ?
           ORDER BY base_priority DESC, added_at DESC
           LIMIT ?
         )
       ORDER BY RANDOM()
       LIMIT ?`,
    )
    .bind(userId, userId, TOP, RESURFACE_PICK)
    .all<StudyListRow>()

  // Sample 20 from recent pool (pool of 50 gives real rotation)
  const recentSample = randomSample(recentPool as StudyListRow[], RECENT_PICK)

  // Merge + dedupe by lemma
  const merged = new Map<string, InjectedStudyWord>()
  for (const r of [...(topRows as StudyListRow[]), ...recentSample, ...(resurface as StudyListRow[])]) {
    if (!merged.has(r.lemma)) {
      merged.set(r.lemma, {
        lemma: r.lemma,
        gloss: r.gloss,
        priority: Number(effectivePriority(r, now).toFixed(3)),
      })
    }
  }

  return [...merged.values()]
}

function randomSample<T>(array: T[], k: number): T[] {
  if (array.length <= k) return [...array]
  const copy = [...array]
  // Fisher-Yates partial shuffle — pick k random items
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(Math.random() * (copy.length - i))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, k)
}
