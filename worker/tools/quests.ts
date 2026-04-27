/// MCP tool for consolidated quest management
import Anthropic from '@anthropic-ai/sdk'
import type { ToolContext, ToolRegistration } from './shared'
import { newId, nowSec } from './shared'
import { calculateRelationshipDelta } from '../relationship'
import { gradeConversation, type GradingWeights } from '../grading'
import { getCharacter } from '../characters'
import { updateSessionCharacterState } from '../session-state'

// Valid region IDs
const VALID_REGIONS = [
  'berlin',
  'bavaria',
  'hamburg',
  'rhine',
  'blackforest',
  'saxony',
  'austria',
  'switzerland',
] as const

type RegionId = typeof VALID_REGIONS[number]

// Map short IDs to full region_* IDs
const REGION_ID_MAP: Record<string, string> = {
  berlin: 'region_berlin',
  bavaria: 'region_bavaria',
  hamburg: 'region_hamburg',
  rhine: 'region_rhine_valley',
  blackforest: 'region_black_forest',
  saxony: 'region_saxony',
  austria: 'region_austria',
  switzerland: 'region_switzerland',
}

// Iris is the default meta-layer character we return to on quest completion.
const IRIS_CHARACTER_ID = 'iris'
const IRIS_VOICE_ID = 'XB0fDUnXU5powFXDhCwa'

// Max retries for Claude grading (initial + N retries = N+1 attempts)
const GRADING_MAX_RETRIES = 1

interface CharacterRow {
  id: string
  name: string
  age: number
  region_id: string
  personality_description: string
  specialty: string
  grading_weights: string
}

export const questsTool: ToolRegistration = {
  tool: {
    name: 'quests',
    description:
      "Manage quests and conversations. Actions: 'list' shows available quests, 'activate' starts quest and switches to character, 'complete' ends quest and returns to Iris for debrief, 'details' shows quest info.",
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['list', 'activate', 'complete', 'details'],
          description: 'Action to perform',
        },
        quest_id: {
          type: 'string',
          description: "Quest ID (required for 'activate', 'complete', 'details')",
        },
        region_id: {
          type: 'string',
          description: "Optional region filter for 'list' action",
          enum: VALID_REGIONS as unknown as string[],
        },
      },
      required: ['action'],
    },
  },
  execute: async (input: Record<string, unknown>, ctx: ToolContext): Promise<string> => {
    try {
      const action = input.action as string
      const questId = input.quest_id as string | undefined
      const regionId = input.region_id as RegionId | undefined

      switch (action) {
        case 'list':
          return await listQuests(ctx, regionId)
        case 'activate':
          if (!questId) {
            return JSON.stringify({
              error: {
                code: 'INVALID_INPUT',
                message: "quest_id is required for 'activate' action",
              },
            })
          }
          return await activateQuest(ctx, questId)
        case 'complete':
          if (!questId) {
            return JSON.stringify({
              error: {
                code: 'INVALID_INPUT',
                message: "quest_id is required for 'complete' action",
              },
            })
          }
          return await completeQuest(ctx, questId)
        case 'details':
          if (!questId) {
            return JSON.stringify({
              error: {
                code: 'INVALID_INPUT',
                message: "quest_id is required for 'details' action",
              },
            })
          }
          return await getQuestDetails(ctx, questId)
        default:
          return JSON.stringify({
            error: {
              code: 'INVALID_ACTION',
              message: `Unknown action: ${action}`,
            },
          })
      }
    } catch (error) {
      return JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to execute quests tool',
          details: { error: error instanceof Error ? error.message : String(error) },
        },
      })
    }
  },
}

/**
 * Resolve a quest row (narrative quests have an associated character).
 * If the given id doesn't exist in `quests`, fall back to treating the id
 * as a character id for legacy conversational quests.
 */
async function resolveQuestAndCharacter(
  ctx: ToolContext,
  questId: string,
): Promise<{
  questRow: {
    id: string
    name_de: string
    name_en: string
    description_de: string
    description_en: string
    points_reward: number
    character_id: string | null
    region_id: string
  } | null
  character: (CharacterRow & { region_name: string; voice_unlock: string }) | null
}> {
  const { env } = ctx

  // First, look up as a real quest
  const quest = await env.DB
    .prepare(
      `SELECT q.id, q.name_de, q.name_en, q.description_de, q.description_en,
              q.points_reward, q.character_id,
              c.region_id as character_region_id
       FROM quests q
       LEFT JOIN characters c ON c.id = q.character_id
       WHERE q.id = ?`,
    )
    .bind(questId)
    .first<{
      id: string
      name_de: string
      name_en: string
      description_de: string
      description_en: string
      points_reward: number
      character_id: string | null
      character_region_id: string | null
    }>()

  let characterId: string | null = null
  if (quest?.character_id) {
    characterId = quest.character_id
  } else if (!quest) {
    // Legacy path: treat questId as characterId
    characterId = questId
  }

  let character: (CharacterRow & { region_name: string; voice_unlock: string }) | null = null
  if (characterId) {
    character = await env.DB
      .prepare(
        `SELECT c.id, c.name, c.age, c.region_id, c.personality_description,
                c.specialty, c.grading_weights,
                r.name_en as region_name, r.voice_unlock
         FROM characters c
         JOIN regions r ON r.id = c.region_id
         WHERE c.id = ?`,
      )
      .bind(characterId)
      .first<CharacterRow & { region_name: string; voice_unlock: string }>()
  }

  return {
    questRow: quest
      ? {
          id: quest.id,
          name_de: quest.name_de,
          name_en: quest.name_en,
          description_de: quest.description_de,
          description_en: quest.description_en,
          points_reward: quest.points_reward,
          character_id: quest.character_id,
          region_id: quest.character_region_id || character?.region_id || '',
        }
      : null,
    character,
  }
}

async function listQuests(ctx: ToolContext, regionId?: RegionId): Promise<string> {
  const { env, userId } = ctx

  // Query the quests table per spec (R3, MCP Tools).
  // Tier 1 quests are always available; higher tiers are gated elsewhere.
  // We join character + region info for narrative quests and `user_quests`
  // for completion status.
  let query = `
    SELECT
      q.id,
      q.name_de,
      q.name_en,
      q.description_de,
      q.description_en,
      q.category,
      q.points_reward,
      q.tier_thresholds,
      q.character_id,
      c.region_id as character_region_id,
      c.name as character_name,
      r.name_en as region_name,
      CASE WHEN ur.user_id IS NOT NULL THEN 1 ELSE 0 END as region_unlocked,
      COALESCE(uq.completed, 0) as completed,
      uq.completed_at
    FROM quests q
    LEFT JOIN characters c ON c.id = q.character_id
    LEFT JOIN regions r ON r.id = c.region_id
    LEFT JOIN user_regions ur ON ur.region_id = c.region_id AND ur.user_id = ?
    LEFT JOIN user_quests uq ON uq.quest_id = q.id AND uq.user_id = ?
  `

  const bindings: unknown[] = [userId, userId]

  if (regionId) {
    const fullRegionId = REGION_ID_MAP[regionId]
    query += ` WHERE c.region_id = ?`
    bindings.push(fullRegionId)
  }

  query += ` ORDER BY q.category, q.id`

  const { results } = await env.DB.prepare(query)
    .bind(...bindings)
    .all<{
      id: string
      name_de: string
      name_en: string
      description_de: string
      description_en: string
      category: string
      points_reward: number
      tier_thresholds: string
      character_id: string | null
      character_region_id: string | null
      character_name: string | null
      region_name: string | null
      region_unlocked: number
      completed: number
      completed_at: string | null
    }>()

  if (!results || results.length === 0) {
    return JSON.stringify({
      success: true,
      quests: [],
      message: regionId
        ? `No quests found in region ${regionId}`
        : 'No quests available',
    })
  }

  const quests = results.map((q) => {
    // Parse tier thresholds to extract tier count
    let tier = 1
    try {
      const thresholds = JSON.parse(q.tier_thresholds) as number[]
      tier = thresholds.length > 0 ? 1 : 1
    } catch {
      // default
    }

    // A narrative quest requires its character's region to be unlocked.
    // Non-narrative quests (skill/achievement/etc.) are always available at tier 1.
    const hasCharacter = !!q.character_id
    const available = hasCharacter ? q.region_unlocked === 1 : true

    return {
      quest_id: q.id,
      name_de: q.name_de,
      name_en: q.name_en,
      description_de: q.description_de,
      description_en: q.description_en,
      category: q.category,
      tier,
      points_reward: q.points_reward,
      character_id: q.character_id,
      character_name: q.character_name,
      region_id: q.character_region_id ? q.character_region_id.replace('region_', '') : null,
      region_name: q.region_name,
      available,
      completed: q.completed === 1,
      completed_at: q.completed_at,
    }
  })

  return JSON.stringify({
    success: true,
    quests,
    total: quests.length,
    available_count: quests.filter((q) => q.available).length,
    completed_count: quests.filter((q) => q.completed).length,
  })
}

async function activateQuest(ctx: ToolContext, questId: string): Promise<string> {
  const { env, userId, send } = ctx

  const { questRow, character } = await resolveQuestAndCharacter(ctx, questId)

  if (!character) {
    return JSON.stringify({
      error: {
        code: 'NOT_FOUND',
        message: `Quest/character ${questId} not found`,
      },
    })
  }

  // Check if the character's region is unlocked
  const regionUnlocked = await env.DB.prepare(
    `SELECT unlocked_at FROM user_regions WHERE user_id = ? AND region_id = ?`,
  )
    .bind(userId, character.region_id)
    .first<{ unlocked_at: string }>()

  if (!regionUnlocked) {
    return JSON.stringify({
      error: {
        code: 'REGION_LOCKED',
        message: `Region ${character.region_name} must be unlocked before talking to ${character.name}`,
      },
    })
  }

  // Record interaction start
  const interactionId = newId()
  await env.DB.prepare(
    `INSERT INTO character_interactions (id, user_id, character_id, interaction_type, created_at)
     VALUES (?, ?, ?, 'conversation', ?)`,
  )
    .bind(interactionId, userId, character.id, nowSec())
    .run()

  // Initialize or update relationship
  await env.DB.prepare(
    `INSERT INTO user_character_relationships (user_id, character_id, relationship_level, interactions_count, last_interaction_at)
     VALUES (?, ?, 0, 1, datetime('now'))
     ON CONFLICT (user_id, character_id)
     DO UPDATE SET
       interactions_count = interactions_count + 1,
       last_interaction_at = datetime('now')`,
  )
    .bind(userId, character.id)
    .run()

  // Prefer the code-defined character's voice_id when available (spec R18a):
  // the ElevenLabs voice used must match the character, not the region.
  const codeCharacter = getCharacter(character.id)
  const activeVoiceId = codeCharacter?.voice_id || character.voice_unlock

  // Persist session state atomically
  await updateSessionCharacterState(env.DB, userId, {
    active_character: character.id,
    active_quest: questRow?.id ?? questId,
    current_region: character.region_id,
    active_voice_id: activeVoiceId,
  })

  // Notify WS client so handler can refresh local vars and UI
  send({
    type: 'character_state',
    character_id: character.id,
    voice_id: activeVoiceId,
    quest_id: questRow?.id ?? questId,
    region: character.region_id.replace('region_', ''),
  })

  // Parse grading weights
  let gradingWeights: Record<string, number> = {}
  try {
    gradingWeights = JSON.parse(character.grading_weights)
  } catch {
    // Use empty object if parsing fails
  }

  // Generate intro text in character voice
  const introText = `Du triffst ${character.name} in ${character.region_name}.

${character.personality_description}

Spezialisierung: ${character.specialty}

${character.name} freut sich, mit dir zu sprechen! Diese Konversation wird besonders auf folgende Aspekte achten: ${Object.entries(gradingWeights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k)
    .join(', ')}.

Sag Hallo!`

  return JSON.stringify({
    success: true,
    quest_activated: questRow?.id ?? questId,
    character: {
      id: character.id,
      name: character.name,
      age: character.age,
      region: character.region_id.replace('region_', ''),
      personality: character.personality_description,
      specialty: character.specialty,
      voice_id: activeVoiceId,
    },
    interaction_id: interactionId,
    intro_text: introText,
    grading_weights: gradingWeights,
    instructions:
      'Session state updated. Speak as this character. Use quest conditions injector for grading rules.',
  })
}

async function completeQuest(ctx: ToolContext, questId: string): Promise<string> {
  const { env, userId, send, conversationHistory } = ctx

  const { questRow, character } = await resolveQuestAndCharacter(ctx, questId)

  if (!character) {
    return JSON.stringify({
      error: {
        code: 'NOT_FOUND',
        message: `Quest/character ${questId} not found`,
      },
    })
  }

  // Get the most recent interaction
  const interaction = await env.DB.prepare(
    `SELECT id, created_at, score, metadata
     FROM character_interactions
     WHERE user_id = ? AND character_id = ? AND interaction_type = 'conversation'
     ORDER BY created_at DESC
     LIMIT 1`,
  )
    .bind(userId, character.id)
    .first<{ id: string; created_at: number; score: number | null; metadata: string | null }>()

  if (!interaction) {
    return JSON.stringify({
      error: {
        code: 'NOT_FOUND',
        message: `No active conversation with ${character.name}`,
      },
    })
  }

  // Parse grading weights (default to balanced if malformed)
  let rawWeights: Record<string, number>
  try {
    rawWeights = JSON.parse(character.grading_weights || '{}')
  } catch {
    rawWeights = {}
  }
  const weights: GradingWeights = {
    comprehension: rawWeights.comprehension ?? 0.15,
    fluency: rawWeights.fluency ?? 0.15,
    grammar: rawWeights.grammar ?? 0.15,
    vocabulary: rawWeights.vocabulary ?? 0.15,
    pronunciation: rawWeights.pronunciation ?? 0.15,
    confidence: rawWeights.confidence ?? 0.10,
    cultural_awareness: rawWeights.cultural_awareness ?? 0.15,
  }

  // Grade the conversation via Claude (with retry + neutral fallback)
  let overallScore = 5
  let strengths: string[] = []
  let weaknesses: string[] = []
  let reasoning = 'Grading unavailable.'

  if (env.ANTHROPIC_API_KEY) {
    const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
    const messages: Anthropic.MessageParam[] = conversationHistory ?? []

    let graded = false
    for (let attempt = 0; attempt <= GRADING_MAX_RETRIES; attempt++) {
      try {
        const grade = await gradeConversation(
          anthropic,
          messages,
          character.name,
          character.specialty,
          character.personality_description,
          weights,
        )
        overallScore = grade.overall_score
        strengths = grade.strengths
        weaknesses = grade.weaknesses
        reasoning = grade.reasoning
        graded = true
        break
      } catch (err) {
        console.error(
          `[quests.complete] grading attempt ${attempt + 1} failed:`,
          err instanceof Error ? err.message : err,
        )
      }
    }

    if (!graded) {
      // Neutral fallback per spec R17: 5/10 across all metrics
      overallScore = 5
      strengths = ['Completed the conversation']
      weaknesses = ['Detailed feedback unavailable this round']
      reasoning = 'Grading service unavailable; applied neutral fallback.'
    }
  }

  // Map overall score (0-10) to relationship delta per spec R16
  const deltaInfo = calculateRelationshipDelta(overallScore)
  const relationshipDelta = deltaInfo.delta

  // Update relationship with clamping (0-100)
  if (relationshipDelta !== 0) {
    await env.DB.prepare(
      `UPDATE user_character_relationships
       SET relationship_level = MAX(0, MIN(100, relationship_level + ?))
       WHERE user_id = ? AND character_id = ?`,
    )
      .bind(relationshipDelta, userId, character.id)
      .run()
  }

  // Update interaction with final score (0-10 canonical scale)
  await env.DB.prepare(
    `UPDATE character_interactions
     SET score = ?
     WHERE id = ?`,
  )
    .bind(overallScore, interaction.id)
    .run()

  // Mark user_quests complete for narrative quests
  if (questRow) {
    await env.DB
      .prepare(
        `INSERT INTO user_quests (id, user_id, quest_id, progress, completed, completed_at)
         VALUES (?, ?, ?, 100, 1, datetime('now'))
         ON CONFLICT DO NOTHING`,
      )
      .bind(newId(), userId, questRow.id)
      .run()
      .catch((err) => console.warn('[quests.complete] user_quests upsert failed:', err))
  }

  // Switch session state back to Iris (keep current_region)
  await updateSessionCharacterState(env.DB, userId, {
    active_character: IRIS_CHARACTER_ID,
    active_quest: null,
    active_voice_id: IRIS_VOICE_ID,
  })

  // Notify client of the switch back to Iris
  send({
    type: 'character_state',
    character_id: IRIS_CHARACTER_ID,
    voice_id: IRIS_VOICE_ID,
    quest_id: null,
    region: character.region_id.replace('region_', ''),
  })

  const relationshipChangeText =
    relationshipDelta > 0
      ? `Deine Beziehung zu ${character.name} hat sich um ${relationshipDelta} Punkt${relationshipDelta > 1 ? 'e' : ''} verbessert!`
      : relationshipDelta < 0
        ? `Deine Beziehung zu ${character.name} hat sich um ${Math.abs(relationshipDelta)} Punkt${Math.abs(relationshipDelta) > 1 ? 'e' : ''} verschlechtert.`
        : 'Deine Beziehung ist unverändert geblieben.'

  const strengthsText =
    strengths.length > 0 ? `Stärken: ${strengths.join('; ')}.` : ''
  const weaknessesText =
    weaknesses.length > 0 ? `Zum Üben: ${weaknesses.join('; ')}.` : ''

  const debriefText = `Iris: Wie war dein Gespräch mit ${character.name}?

Gesamtbewertung: ${overallScore.toFixed(1)}/10 (${deltaInfo.tier}).
${relationshipChangeText}

${strengthsText}
${weaknessesText}

Möchtest du über das Gespräch sprechen, oder sollen wir weitermachen?`

  return JSON.stringify({
    success: true,
    quest_completed: questRow?.id ?? questId,
    character_name: character.name,
    conversation_score: Math.round(overallScore * 10),
    overall_score: overallScore,
    relationship_delta: relationshipDelta,
    relationship_tier: deltaInfo.tier,
    grading: {
      overall_score: overallScore,
      strengths,
      weaknesses,
      reasoning,
    },
    debrief_text: debriefText,
    instructions:
      'Session state cleared. Returned to Iris. User can now reflect on conversation or continue.',
  })
}

async function getQuestDetails(ctx: ToolContext, questId: string): Promise<string> {
  const { env, userId } = ctx

  const { questRow, character } = await resolveQuestAndCharacter(ctx, questId)

  if (!character) {
    return JSON.stringify({
      error: {
        code: 'NOT_FOUND',
        message: `Quest/character ${questId} not found`,
      },
    })
  }

  // Check region unlocked + load relationship
  const statusRow = await env.DB.prepare(
    `SELECT
       CASE WHEN ur.user_id IS NOT NULL THEN 1 ELSE 0 END as region_unlocked,
       COALESCE(ucr.relationship_level, 0) as relationship_level,
       COALESCE(ucr.interactions_count, 0) as interactions_count,
       ucr.last_interaction_at
     FROM characters c
     LEFT JOIN user_regions ur ON ur.region_id = c.region_id AND ur.user_id = ?
     LEFT JOIN user_character_relationships ucr ON ucr.character_id = c.id AND ucr.user_id = ?
     WHERE c.id = ?`,
  )
    .bind(userId, userId, character.id)
    .first<{
      region_unlocked: number
      relationship_level: number
      interactions_count: number
      last_interaction_at: string | null
    }>()

  // Get interaction history
  const { results: history } = await env.DB.prepare(
    `SELECT interaction_type, score, created_at
     FROM character_interactions
     WHERE user_id = ? AND character_id = ?
     ORDER BY created_at DESC
     LIMIT 10`,
  )
    .bind(userId, character.id)
    .all<{ interaction_type: string; score: number | null; created_at: number }>()

  return JSON.stringify({
    success: true,
    quest: {
      quest_id: questRow?.id ?? character.id,
      name_de: questRow?.name_de ?? character.name,
      name_en: questRow?.name_en ?? character.name,
      character_id: character.id,
      character_name: character.name,
      age: character.age,
      region: character.region_id.replace('region_', ''),
      region_name: character.region_name,
      personality: character.personality_description,
      specialty: character.specialty,
      voice_id: getCharacter(character.id)?.voice_id || character.voice_unlock,
      available: (statusRow?.region_unlocked ?? 0) === 1,
      relationship_level: statusRow?.relationship_level ?? 0,
      interactions_count: statusRow?.interactions_count ?? 0,
      last_interaction: statusRow?.last_interaction_at ?? null,
    },
    history: history || [],
  })
}
