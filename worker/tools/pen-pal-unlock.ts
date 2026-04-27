/**
 * Pen Pal Unlock Flow (Spec R10)
 *
 * Completing a Tier 2 narrative quest unlocks the associated pen pal.
 * For M10 we:
 *   1. Derive the pen pal id from the quest id by convention.
 *      Supported quest id shapes:
 *        - `mila_gallery_inspiration`           → penpal_mila
 *        - `quest_mila_gallery_inspiration`     → penpal_mila
 *        - `{name}_{anything}`                  → penpal_{name}
 *   2. Confirm the pen pal exists in the `pen_pals` table.
 *   3. INSERT OR IGNORE into `user_pen_pals` (idempotent on replay).
 *   4. Insert a placeholder "first_contact" letter in `pen_pal_letters` with
 *      `scheduled_send_at = now + 24h`. The letter is NOT dispatched in M10;
 *      the Durable Object scheduler in M11 will promote pending rows.
 *
 * Deferred to M11:
 *   - R24 loot boxes
 *   - R23 cross-character references
 *   - R30 quiet hours + max-letters-per-day enforcement
 */

import { newId } from './shared'

/**
 * Derive a pen pal id from a quest id using naming convention.
 * Returns null if no convention matches.
 */
export function penPalIdFromQuestId(questId: string): string | null {
  // Strip optional `quest_` prefix
  const stripped = questId.replace(/^quest_/, '')
  // First segment before first underscore is the pen pal character short name.
  const firstSegment = stripped.split('_')[0]
  if (!firstSegment) return null
  return `penpal_${firstSegment}`
}

/**
 * If the completed quest implies a pen pal unlock, perform it.
 * Safe to call for any quest — it no-ops when no matching pen pal exists.
 */
export async function maybeUnlockPenPalForQuest(
  db: D1Database,
  userId: string,
  questId: string,
): Promise<{ unlocked: boolean; pen_pal_id: string | null }> {
  const penPalId = penPalIdFromQuestId(questId)
  if (!penPalId) return { unlocked: false, pen_pal_id: null }

  // Confirm the pen pal exists (avoid FK violations)
  const row = await db
    .prepare(`SELECT id FROM pen_pals WHERE id = ?`)
    .bind(penPalId)
    .first<{ id: string }>()

  if (!row) return { unlocked: false, pen_pal_id: null }

  // Idempotent insert. Note: `last_interaction_at` is a nullable column added
  // in migration 004 so `check_pen_pal_attention` queries continue to work.
  const insertResult = await db
    .prepare(
      `INSERT OR IGNORE INTO user_pen_pals
         (user_id, pen_pal_id, unlocked_at, relationship_level, letters_sent, letters_received)
       VALUES (?, ?, datetime('now'), 0, 0, 0)`,
    )
    .bind(userId, penPalId)
    .run()

  // D1's changes count lives on `meta.changes` — fall back to checking for an
  // existing row so we only schedule a first letter on the FIRST unlock.
  const changes =
    (insertResult.meta as { changes?: number } | undefined)?.changes ?? 0

  if (changes > 0) {
    // Schedule first letter within 24h (placeholder row, not yet dispatched).
    // TODO(M11): replace with Durable Object scheduler.
    const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    await db
      .prepare(
        `INSERT INTO pen_pal_letters
           (id, user_id, pen_pal_id, sender, content, topic, sentiment, sent_at, scheduled_send_at)
         VALUES (?, ?, ?, 'pen_pal', '', NULL, 'pending_first_contact', datetime('now'), ?)`,
      )
      .bind(newId(), userId, penPalId, scheduledAt)
      .run()
  }

  return { unlocked: changes > 0, pen_pal_id: penPalId }
}
