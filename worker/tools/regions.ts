/// MCP tool for consolidated region management
import Anthropic from '@anthropic-ai/sdk'
import type { ToolContext, ToolRegistration } from './shared'
import { updateSessionCharacterState } from '../session-state'

// Valid region IDs from seed data
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

// Map short IDs to full region_* IDs for DB queries
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

interface RegionInfo {
  id: string
  name_de: string
  name_en: string
  description_de: string
  description_en: string
  voice_unlock: string
  point_cost: number
  is_bonus: number
  unlocked: number
  completed: number
  subquests_completed: number
  subquests_total: number
}

export const regionsTool: ToolRegistration = {
  tool: {
    name: 'regions',
    description:
      "Manage region navigation and info. Actions: 'list' shows all regions with locked/unlocked status, 'travel' sets current region, 'info' shows region details (quests, voice, completion).",
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['list', 'travel', 'info'],
          description: 'Action to perform',
        },
        region_id: {
          type: 'string',
          description: "Region ID (required for 'travel' and 'info')",
          enum: VALID_REGIONS as unknown as string[],
        },
      },
      required: ['action'],
    },
  },
  execute: async (input: Record<string, unknown>, ctx: ToolContext): Promise<string> => {
    try {
      const action = input.action as string
      const regionId = input.region_id as RegionId | undefined

      switch (action) {
        case 'list':
          return await listRegions(ctx)
        case 'travel':
          if (!regionId) {
            return JSON.stringify({
              error: {
                code: 'INVALID_INPUT',
                message: "region_id is required for 'travel' action",
              },
            })
          }
          return await travelToRegion(ctx, regionId)
        case 'info':
          if (!regionId) {
            return JSON.stringify({
              error: {
                code: 'INVALID_INPUT',
                message: "region_id is required for 'info' action",
              },
            })
          }
          return await getRegionInfo(ctx, regionId)
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
          message: 'Failed to execute regions tool',
          details: { error: error instanceof Error ? error.message : String(error) },
        },
      })
    }
  },
}

async function listRegions(ctx: ToolContext): Promise<string> {
  const { env, userId } = ctx

  // Query all regions with user unlock status
  const query = `
    SELECT
      r.id,
      r.name_de,
      r.name_en,
      r.description_de,
      r.description_en,
      r.voice_unlock,
      r.point_cost,
      r.is_bonus,
      r.order_index,
      CASE WHEN ur.user_id IS NOT NULL THEN 1 ELSE 0 END as unlocked,
      COALESCE(ur.completed, 0) as completed,
      COALESCE(ur.subquests_completed, 0) as subquests_completed,
      COALESCE(ur.subquests_total, 0) as subquests_total
    FROM regions r
    LEFT JOIN user_regions ur ON ur.region_id = r.id AND ur.user_id = ?
    ORDER BY r.order_index
  `

  const { results } = await env.DB.prepare(query).bind(userId).all<RegionInfo>()

  if (!results || results.length === 0) {
    return JSON.stringify({
      error: {
        code: 'NOT_FOUND',
        message: 'No regions found',
      },
    })
  }

  // Format regions list
  const regions = results.map((r) => ({
    id: r.id.replace('region_', ''),
    name_de: r.name_de,
    name_en: r.name_en,
    description_de: r.description_de,
    description_en: r.description_en,
    voice_unlock: r.voice_unlock,
    point_cost: r.point_cost,
    is_bonus: r.is_bonus === 1,
    unlocked: r.unlocked === 1,
    completed: r.completed === 1,
    progress: r.subquests_total > 0 ? `${r.subquests_completed}/${r.subquests_total}` : '0/0',
  }))

  return JSON.stringify({
    success: true,
    regions,
    total: regions.length,
    unlocked_count: regions.filter((r) => r.unlocked).length,
  })
}

async function travelToRegion(ctx: ToolContext, regionId: RegionId): Promise<string> {
  const { env, userId } = ctx
  const fullRegionId = REGION_ID_MAP[regionId]

  // Check if region is unlocked
  const unlockCheck = await env.DB.prepare(
    `SELECT unlocked_at FROM user_regions WHERE user_id = ? AND region_id = ?`,
  )
    .bind(userId, fullRegionId)
    .first<{ unlocked_at: string }>()

  if (!unlockCheck) {
    return JSON.stringify({
      error: {
        code: 'REGION_LOCKED',
        message: `Region ${regionId} is not unlocked yet`,
      },
    })
  }

  // Get region details
  const region = await env.DB.prepare(
    `SELECT name_de, name_en, description_de, description_en, voice_unlock
     FROM regions WHERE id = ?`,
  )
    .bind(fullRegionId)
    .first<{
      name_de: string
      name_en: string
      description_de: string
      description_en: string
      voice_unlock: string
    }>()

  if (!region) {
    return JSON.stringify({
      error: {
        code: 'NOT_FOUND',
        message: `Region ${regionId} not found`,
      },
    })
  }

  // Persist session state per spec R7: travelling updates current_region
  // and the active_voice_id (the region's unlocked voice).
  await updateSessionCharacterState(ctx.env.DB, userId, {
    current_region: fullRegionId,
    active_voice_id: region.voice_unlock,
  })

  ctx.send({
    type: 'character_state',
    character_id: undefined,
    voice_id: region.voice_unlock,
    region: regionId,
  })

  return JSON.stringify({
    success: true,
    message: `Traveled to ${region.name_en} (${region.name_de})`,
    region: {
      id: regionId,
      name_de: region.name_de,
      name_en: region.name_en,
      description_de: region.description_de,
      description_en: region.description_en,
      voice_id: region.voice_unlock,
    },
    instructions:
      'Session state updated. Use the region-specific voice and context for all interactions.',
  })
}

async function getRegionInfo(ctx: ToolContext, regionId: RegionId): Promise<string> {
  const { env, userId } = ctx
  const fullRegionId = REGION_ID_MAP[regionId]

  // Get region details with user progress
  const query = `
    SELECT
      r.id,
      r.name_de,
      r.name_en,
      r.description_de,
      r.description_en,
      r.voice_unlock,
      r.point_cost,
      r.is_bonus,
      CASE WHEN ur.user_id IS NOT NULL THEN 1 ELSE 0 END as unlocked,
      COALESCE(ur.completed, 0) as completed,
      COALESCE(ur.subquests_completed, 0) as subquests_completed,
      COALESCE(ur.subquests_total, 0) as subquests_total
    FROM regions r
    LEFT JOIN user_regions ur ON ur.region_id = r.id AND ur.user_id = ?
    WHERE r.id = ?
  `

  const region = await env.DB.prepare(query).bind(userId, fullRegionId).first<RegionInfo>()

  if (!region) {
    return JSON.stringify({
      error: {
        code: 'NOT_FOUND',
        message: `Region ${regionId} not found`,
      },
    })
  }

  // Get available quests in this region (characters in the region)
  const questsQuery = `
    SELECT c.id, c.name, c.specialty
    FROM characters c
    WHERE c.region_id = ?
    ORDER BY c.name
  `

  const { results: characters } = await env.DB.prepare(questsQuery)
    .bind(fullRegionId)
    .all<{ id: string; name: string; specialty: string }>()

  return JSON.stringify({
    success: true,
    region: {
      id: regionId,
      name_de: region.name_de,
      name_en: region.name_en,
      description_de: region.description_de,
      description_en: region.description_en,
      voice_id: region.voice_unlock,
      point_cost: region.point_cost,
      is_bonus: region.is_bonus === 1,
      unlocked: region.unlocked === 1,
      completed: region.completed === 1,
      progress: {
        subquests_completed: region.subquests_completed,
        subquests_total: region.subquests_total,
        percentage:
          region.subquests_total > 0
            ? Math.round((region.subquests_completed / region.subquests_total) * 100)
            : 0,
      },
    },
    characters: characters || [],
  })
}
