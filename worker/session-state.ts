/**
 * Session state persistence helpers.
 *
 * Centralises updates to the `sessions` table for character switching,
 * quest activation, region travel, and quest completion. Used by both the
 * WebSocket handler and MCP tools so that the active_character,
 * active_quest, current_region, and active_voice_id columns remain in sync.
 */

/**
 * Update the most recent session row for a user with new character-state
 * fields. Fields left as undefined are preserved (not overwritten).
 */
export async function updateSessionCharacterState(
  db: D1Database,
  userId: string,
  updates: {
    active_character?: string
    active_voice_id?: string
    active_quest?: string | null
    current_region?: string
  },
): Promise<void> {
  const fields: string[] = []
  const binds: unknown[] = []

  if (updates.active_character !== undefined) {
    fields.push('active_character = ?')
    binds.push(updates.active_character)
  }
  if (updates.active_voice_id !== undefined) {
    fields.push('active_voice_id = ?')
    binds.push(updates.active_voice_id)
  }
  if (updates.active_quest !== undefined) {
    fields.push('active_quest = ?')
    binds.push(updates.active_quest)
  }
  if (updates.current_region !== undefined) {
    fields.push('current_region = ?')
    binds.push(updates.current_region)
  }

  if (fields.length === 0) return

  binds.push(userId, userId)

  await db
    .prepare(
      `UPDATE sessions
       SET ${fields.join(', ')}
       WHERE user_id = ?
       AND token IN (SELECT token FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1)`,
    )
    .bind(...binds)
    .run()
}
