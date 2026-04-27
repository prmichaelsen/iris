/// MCP tools for gamification features - enable early testing via Claude conversations
import Anthropic from '@anthropic-ai/sdk'
import type { ToolContext, ToolRegistration } from './shared'
import { nowSec } from './shared'

// Type definitions for gamification data structures

interface UserContext {
  user_id: string
  location: string
  character_id: string | null
  updated_at: string
}

interface BadgeProgress {
  skill: string
  tier: 'grey' | 'bronze' | 'silver' | 'gold' | 'diamond'
  progress: number
  threshold_next: number
}

interface ActiveQuest {
  id: string
  name_en: string
  progress: number
  target: number
}

interface ProgressSummary {
  user_id: string
  level: number
  xp_current: number
  xp_to_next_level: number
  badges: BadgeProgress[]
  active_quests: ActiveQuest[]
  points: {
    total_earned: number
    current_balance: number
  }
  mastery?: {
    mastered: number
    learning: number
    reinforcement: number
  }
}

// Valid locations enum
const VALID_LOCATIONS = [
  'berlin',
  'bavaria',
  'hamburg',
  'rhine',
  'blackforest',
  'saxony',
  'austria',
  'switzerland',
] as const

type Location = typeof VALID_LOCATIONS[number]

// Tool: set_context
export const setContextTool: ToolRegistration = {
  tool: {
    name: 'set_context',
    description: 'Set user context (location, active character) for gamification tracking',
    input_schema: {
      type: 'object',
      properties: {
        user_id: {
          type: 'string',
          description: 'User ID',
        },
        location: {
          type: 'string',
          enum: VALID_LOCATIONS as unknown as string[],
          description: 'Current region',
        },
        character_id: {
          type: 'string',
          description: 'Active character (karl, mila, etc.)',
        },
      },
      required: ['user_id', 'location'],
    },
  },
  execute: async (input: Record<string, unknown>, ctx: ToolContext): Promise<string> => {
    try {
      const userId = input.user_id as string
      const location = input.location as Location
      const characterId = input.character_id as string | undefined

      // Validate location
      if (!VALID_LOCATIONS.includes(location)) {
        return JSON.stringify({
          error: {
            code: 'INVALID_INPUT',
            message: `Invalid location: ${location}`,
            details: { valid_locations: VALID_LOCATIONS },
          },
        })
      }

      const context: UserContext = {
        user_id: userId,
        location,
        character_id: characterId || null,
        updated_at: new Date().toISOString(),
      }

      // TODO M10: Store in D1 user_context table or session
      // For M9: Return success with context (stored in memory for session)

      return JSON.stringify({
        success: true,
        context,
        message: `Context set: ${location}${characterId ? ` with ${characterId}` : ''}`,
      })
    } catch (error) {
      return JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to set context',
          details: { error: error instanceof Error ? error.message : String(error) },
        },
      })
    }
  },
}

// Tool: view_progress
export const viewProgressTool: ToolRegistration = {
  tool: {
    name: 'view_progress',
    description: 'View user gamification progress (XP, level, badges, quests)',
    input_schema: {
      type: 'object',
      properties: {
        user_id: {
          type: 'string',
          description: 'User ID',
        },
        detail_level: {
          type: 'string',
          enum: ['summary', 'full'],
          description: 'Level of detail (default: summary)',
        },
      },
      required: ['user_id'],
    },
  },
  execute: async (input: Record<string, unknown>, ctx: ToolContext): Promise<string> => {
    try {
      const userId = input.user_id as string
      const detailLevel = (input.detail_level as string) || 'summary'

      // M9: Return mock data matching OpenAPI schema
      // TODO M10+: Query D1 for real data

      const mockData: ProgressSummary = {
        user_id: userId,
        level: 5,
        xp_current: 2450,
        xp_to_next_level: 3000,
        badges: [
          { skill: 'flashcard', tier: 'bronze', progress: 45, threshold_next: 50 },
          { skill: 'dictation', tier: 'grey', progress: 8, threshold_next: 10 },
          { skill: 'conversation', tier: 'silver', progress: 67, threshold_next: 100 },
        ],
        active_quests: [
          { id: 'daily_5ex', name_en: 'Complete 5 exercises', progress: 3, target: 5 },
          { id: 'unlock_bavaria', name_en: 'Unlock Bavaria', progress: 450, target: 500 },
        ],
        points: {
          total_earned: 1250,
          current_balance: 850,
        },
      }

      if (detailLevel === 'full') {
        // Add mastery breakdown for full detail
        mockData.mastery = {
          mastered: 127,
          learning: 43,
          reinforcement: 18,
        }
      }

      return JSON.stringify(mockData)
    } catch (error) {
      return JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch progress',
          details: { error: error instanceof Error ? error.message : String(error) },
        },
      })
    }
  },
}

// Tool: debug_state
export const debugStateTool: ToolRegistration = {
  tool: {
    name: 'debug_state',
    description: 'Debug tool to inspect full gamification state for user',
    input_schema: {
      type: 'object',
      properties: {
        user_id: {
          type: 'string',
          description: 'User ID',
        },
        tables: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter to specific tables (optional)',
        },
      },
      required: ['user_id'],
    },
  },
  execute: async (input: Record<string, unknown>, ctx: ToolContext): Promise<string> => {
    try {
      const userId = input.user_id as string
      const tables = (input.tables as string[]) || [
        'user_progress',
        'user_quests',
        'user_badges',
        'user_points',
      ]

      const result: Record<string, any> = {}

      // Query D1 for real data
      for (const table of tables) {
        try {
          // Sanitize table name to prevent SQL injection
          const validTables = [
            'user_progress',
            'user_quests',
            'user_badges',
            'user_points',
            'user_vocab_progress',
            'user_lesson_progress',
            'users',
            'conversations',
            'messages',
          ]

          if (!validTables.includes(table)) {
            result[table] = { error: 'Invalid table name' }
            continue
          }

          const query = `SELECT * FROM ${table} WHERE user_id = ?`
          const { results } = await ctx.env.DB.prepare(query).bind(userId).all()
          result[table] = results || []
        } catch (error) {
          result[table] = {
            error: error instanceof Error ? error.message : String(error),
          }
        }
      }

      return JSON.stringify({
        user_id: userId,
        tables: result,
        queried_at: new Date().toISOString(),
      })
    } catch (error) {
      return JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to query debug state',
          details: { error: error instanceof Error ? error.message : String(error) },
        },
      })
    }
  },
}
