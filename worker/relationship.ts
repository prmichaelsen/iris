/**
 * Relationship Delta Calculation
 *
 * Maps conversation grades (0-10) to relationship point changes.
 * Characters become friendlier (or colder) based on conversation quality.
 */

export interface RelationshipDelta {
  delta: number; // -8 to +10
  tier: 'perfect' | 'excellent' | 'good' | 'okay' | 'rough' | 'poor' | 'terrible';
  message: string; // Human-readable description
}

/**
 * Calculate relationship change from overall conversation score
 *
 * Score ranges:
 * - 9.0-10.0 = +10 (perfect)
 * - 8.0-8.9  = +8  (excellent)
 * - 7.0-7.9  = +6  (good)
 * - 6.0-6.9  = +4  (okay)
 * - 5.0-5.9  = +2  (rough)
 * - 3.0-4.9  = -3  (poor)
 * - 0.0-2.9  = -8  (terrible)
 */
export function calculateRelationshipDelta(overallScore: number): RelationshipDelta {
  if (overallScore >= 9.0) {
    return {
      delta: 10,
      tier: 'perfect',
      message: 'Perfect conversation! They were really impressed.',
    };
  } else if (overallScore >= 8.0) {
    return {
      delta: 8,
      tier: 'excellent',
      message: 'Excellent work! They enjoyed talking with you.',
    };
  } else if (overallScore >= 7.0) {
    return {
      delta: 6,
      tier: 'good',
      message: 'Good conversation. They felt comfortable.',
    };
  } else if (overallScore >= 6.0) {
    return {
      delta: 4,
      tier: 'okay',
      message: 'It was okay. Some bumps, but you got through it.',
    };
  } else if (overallScore >= 5.0) {
    return {
      delta: 2,
      tier: 'rough',
      message: 'Rough conversation. They were a bit frustrated.',
    };
  } else if (overallScore >= 3.0) {
    return {
      delta: -3,
      tier: 'poor',
      message: 'That was tough. They had trouble understanding you.',
    };
  } else {
    return {
      delta: -8,
      tier: 'terrible',
      message: 'That was very difficult. They seemed annoyed.',
    };
  }
}

/**
 * Update character relationship in database
 */
export async function updateCharacterRelationship(
  db: D1Database,
  userId: string,
  characterId: string,
  delta: number
): Promise<{ newLevel: number; previousLevel: number }> {
  // Get current relationship level
  const current = await db
    .prepare(
      `SELECT relationship_level, interactions_count
       FROM user_character_relationships
       WHERE user_id = ? AND character_id = ?`
    )
    .bind(userId, characterId)
    .first<{ relationship_level: number; interactions_count: number }>();

  const previousLevel = current?.relationship_level ?? 0;
  const newLevel = Math.max(0, Math.min(100, previousLevel + delta)); // Clamp 0-100
  const interactionCount = (current?.interactions_count ?? 0) + 1;

  // Upsert relationship
  await db
    .prepare(
      `INSERT INTO user_character_relationships
         (user_id, character_id, relationship_level, interactions_count, last_interaction_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id, character_id) DO UPDATE SET
         relationship_level = excluded.relationship_level,
         interactions_count = excluded.interactions_count,
         last_interaction_at = excluded.last_interaction_at`
    )
    .bind(userId, characterId, newLevel, interactionCount)
    .run();

  return { newLevel, previousLevel };
}
