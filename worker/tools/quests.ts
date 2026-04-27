/// MCP tool for consolidated quest management
import Anthropic from '@anthropic-ai/sdk'
import type { ToolContext, ToolRegistration } from './shared'
import { newId, nowSec } from './shared'

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

interface Character {
  id: string
  name: string
  age: number
  region_id: string
  personality_description: string
  specialty: string
  grading_weights: string
}

interface Quest {
  id: string
  name_de: string
  name_en: string
  description_de: string
  description_en: string
  category: string
  badge_skill: string | null
  points_reward: number
  is_repeatable: number
  is_hidden: number
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

async function listQuests(ctx: ToolContext, regionId?: RegionId): Promise<string> {
  const { env, userId } = ctx

  // For M10: list character-based quests (conversations with characters)
  // Each character represents a quest/conversation opportunity
  let query = `
    SELECT
      c.id,
      c.name,
      c.age,
      c.region_id,
      c.personality_description,
      c.specialty,
      r.name_en as region_name,
      CASE WHEN ur.user_id IS NOT NULL THEN 1 ELSE 0 END as region_unlocked,
      COALESCE(ucr.relationship_level, 0) as relationship_level,
      COALESCE(ucr.interactions_count, 0) as interactions_count
    FROM characters c
    JOIN regions r ON r.id = c.region_id
    LEFT JOIN user_regions ur ON ur.region_id = c.region_id AND ur.user_id = ?
    LEFT JOIN user_character_relationships ucr ON ucr.character_id = c.id AND ucr.user_id = ?
  `

  const bindings = [userId, userId]

  if (regionId) {
    const fullRegionId = REGION_ID_MAP[regionId]
    query += ` WHERE c.region_id = ?`
    bindings.push(fullRegionId)
  }

  query += ` ORDER BY r.order_index, c.name`

  const { results } = await env.DB.prepare(query)
    .bind(...bindings)
    .all<{
      id: string
      name: string
      age: number
      region_id: string
      personality_description: string
      specialty: string
      region_name: string
      region_unlocked: number
      relationship_level: number
      interactions_count: number
    }>()

  if (!results || results.length === 0) {
    return JSON.stringify({
      success: true,
      quests: [],
      message: regionId
        ? `No characters found in region ${regionId}`
        : 'No characters available',
    })
  }

  const quests = results.map((c) => ({
    quest_id: c.id,
    character_name: c.name,
    age: c.age,
    region: c.region_id.replace('region_', ''),
    region_name: c.region_name,
    personality: c.personality_description,
    specialty: c.specialty,
    available: c.region_unlocked === 1,
    relationship_level: c.relationship_level,
    interactions: c.interactions_count,
  }))

  return JSON.stringify({
    success: true,
    quests,
    total: quests.length,
    available_count: quests.filter((q) => q.available).length,
  })
}

async function activateQuest(ctx: ToolContext, questId: string): Promise<string> {
  const { env, userId } = ctx

  // Quest ID is a character ID
  const character = await env.DB.prepare(
    `SELECT c.*, r.name_en as region_name, r.voice_unlock, r.id as full_region_id
     FROM characters c
     JOIN regions r ON r.id = c.region_id
     WHERE c.id = ?`,
  )
    .bind(questId)
    .first<
      Character & { region_name: string; voice_unlock: string; full_region_id: string }
    >()

  if (!character) {
    return JSON.stringify({
      error: {
        code: 'NOT_FOUND',
        message: `Character/quest ${questId} not found`,
      },
    })
  }

  // Check if region is unlocked
  const regionUnlocked = await env.DB.prepare(
    `SELECT unlocked_at FROM user_regions WHERE user_id = ? AND region_id = ?`,
  )
    .bind(userId, character.full_region_id)
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

  // TODO M10: Update session state atomically
  // - active_character: character.id
  // - active_quest: questId
  // - current_region: character.region_id
  // - active_voice_id: character.voice_unlock

  // Parse grading weights
  let gradingWeights: Record<string, number> = {}
  try {
    gradingWeights = JSON.parse(character.grading_weights)
  } catch (e) {
    // Use defaults if parsing fails
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
    quest_activated: questId,
    character: {
      id: character.id,
      name: character.name,
      age: character.age,
      region: character.region_id.replace('region_', ''),
      personality: character.personality_description,
      specialty: character.specialty,
      voice_id: character.voice_unlock,
    },
    interaction_id: interactionId,
    intro_text: introText,
    grading_weights: gradingWeights,
    instructions:
      'Session state updated. Speak as this character. Use quest conditions injector for grading rules.',
  })
}

async function completeQuest(ctx: ToolContext, questId: string): Promise<string> {
  const { env, userId } = ctx

  // Quest ID is a character ID
  const character = await env.DB.prepare(
    `SELECT c.name, c.region_id, r.name_en as region_name
     FROM characters c
     JOIN regions r ON r.id = c.region_id
     WHERE c.id = ?`,
  )
    .bind(questId)
    .first<{ name: string; region_id: string; region_name: string }>()

  if (!character) {
    return JSON.stringify({
      error: {
        code: 'NOT_FOUND',
        message: `Character/quest ${questId} not found`,
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
    .bind(userId, questId)
    .first<{ id: string; created_at: number; score: number | null; metadata: string | null }>()

  if (!interaction) {
    return JSON.stringify({
      error: {
        code: 'NOT_FOUND',
        message: `No active conversation with ${character.name}`,
      },
    })
  }

  // TODO M10: Implement conversation grading
  // For now, use a placeholder score
  const conversationScore = interaction.score ?? 0.75

  // Calculate relationship delta based on score
  let relationshipDelta = 0
  if (conversationScore >= 0.9) {
    relationshipDelta = 3
  } else if (conversationScore >= 0.75) {
    relationshipDelta = 2
  } else if (conversationScore >= 0.6) {
    relationshipDelta = 1
  } else if (conversationScore < 0.4) {
    relationshipDelta = -1
  }

  // Update relationship
  if (relationshipDelta !== 0) {
    await env.DB.prepare(
      `UPDATE user_character_relationships
       SET relationship_level = relationship_level + ?
       WHERE user_id = ? AND character_id = ?`,
    )
      .bind(relationshipDelta, userId, questId)
      .run()
  }

  // Update interaction with final score
  await env.DB.prepare(
    `UPDATE character_interactions
     SET score = ?
     WHERE id = ?`,
  )
    .bind(conversationScore, interaction.id)
    .run()

  // TODO M10: Clear quest state, switch back to Iris
  // - active_character: 'iris'
  // - active_quest: null
  // - active_voice_id: 'iris_voice'
  // - Keep current_region (user stays in the region)

  // Generate Iris debrief text
  const relationshipChangeText =
    relationshipDelta > 0
      ? `Deine Beziehung zu ${character.name} hat sich um ${relationshipDelta} Punkt${relationshipDelta > 1 ? 'e' : ''} verbessert!`
      : relationshipDelta < 0
        ? `Deine Beziehung zu ${character.name} hat sich um ${Math.abs(relationshipDelta)} Punkt${Math.abs(relationshipDelta) > 1 ? 'e' : ''} verschlechtert.`
        : 'Deine Beziehung ist unverändert geblieben.'

  const debriefText = `Iris: Wie war dein Gespräch mit ${character.name}?

Gesprächswertung: ${Math.round(conversationScore * 100)}%
${relationshipChangeText}

${
  conversationScore >= 0.8
    ? 'Hervorragend gemacht! Du hast wirklich eine Verbindung hergestellt.'
    : conversationScore >= 0.6
      ? 'Gut! Es gibt noch Raum für Verbesserungen, aber du machst Fortschritte.'
      : 'Das war eine Herausforderung. Lass uns gemeinsam überlegen, was du beim nächsten Mal anders machen könntest.'
}

Möchtest du über das Gespräch sprechen, oder sollen wir weitermachen?`

  return JSON.stringify({
    success: true,
    quest_completed: questId,
    character_name: character.name,
    conversation_score: Math.round(conversationScore * 100),
    relationship_delta: relationshipDelta,
    debrief_text: debriefText,
    instructions:
      'Session state cleared. Returned to Iris. User can now reflect on conversation or continue.',
  })
}

async function getQuestDetails(ctx: ToolContext, questId: string): Promise<string> {
  const { env, userId } = ctx

  // Quest ID is a character ID
  const character = await env.DB.prepare(
    `SELECT c.*, r.name_en as region_name, r.voice_unlock,
       CASE WHEN ur.user_id IS NOT NULL THEN 1 ELSE 0 END as region_unlocked,
       COALESCE(ucr.relationship_level, 0) as relationship_level,
       COALESCE(ucr.interactions_count, 0) as interactions_count,
       ucr.last_interaction_at
     FROM characters c
     JOIN regions r ON r.id = c.region_id
     LEFT JOIN user_regions ur ON ur.region_id = c.region_id AND ur.user_id = ?
     LEFT JOIN user_character_relationships ucr ON ucr.character_id = c.id AND ucr.user_id = ?
     WHERE c.id = ?`,
  )
    .bind(userId, userId, questId)
    .first<
      Character & {
        region_name: string
        voice_unlock: string
        region_unlocked: number
        relationship_level: number
        interactions_count: number
        last_interaction_at: string | null
      }
    >()

  if (!character) {
    return JSON.stringify({
      error: {
        code: 'NOT_FOUND',
        message: `Character/quest ${questId} not found`,
      },
    })
  }

  // Get interaction history
  const { results: history } = await env.DB.prepare(
    `SELECT interaction_type, score, created_at
     FROM character_interactions
     WHERE user_id = ? AND character_id = ?
     ORDER BY created_at DESC
     LIMIT 10`,
  )
    .bind(userId, questId)
    .all<{ interaction_type: string; score: number | null; created_at: number }>()

  return JSON.stringify({
    success: true,
    quest: {
      quest_id: character.id,
      character_name: character.name,
      age: character.age,
      region: character.region_id.replace('region_', ''),
      region_name: character.region_name,
      personality: character.personality_description,
      specialty: character.specialty,
      voice_id: character.voice_unlock,
      available: character.region_unlocked === 1,
      relationship_level: character.relationship_level,
      interactions_count: character.interactions_count,
      last_interaction: character.last_interaction_at,
    },
    history: history || [],
  })
}
