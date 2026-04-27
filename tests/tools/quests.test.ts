import { describe, it, expect, beforeEach } from 'vitest'
import { questsTool } from '../../worker/tools/quests'
import {
  createGamificationDb,
  seedGamification,
  unlockRegion,
  makeCtx,
  getRawDb,
} from '../helpers/gamification-mock'

describe('quests tool', () => {
  let db: D1Database
  let ctx: any

  beforeEach(() => {
    db = createGamificationDb()
    seedGamification(db, 'test-user')
    ctx = makeCtx(db, 'test-user')
  })

  describe('action: list', () => {
    it('returns all characters as quests', async () => {
      const result = JSON.parse(await questsTool.execute({ action: 'list' }, ctx))
      expect(result.success).toBe(true)
      expect(result.total).toBe(8)
      expect(result.available_count).toBe(1) // only Berlin is unlocked
    })

    it('filters by region_id', async () => {
      const result = JSON.parse(
        await questsTool.execute({ action: 'list', region_id: 'berlin' }, ctx),
      )
      expect(result.total).toBe(1)
      expect(result.quests[0].region).toBe('berlin')
    })

    it('marks locked-region quests unavailable', async () => {
      const result = JSON.parse(
        await questsTool.execute({ action: 'list', region_id: 'bavaria' }, ctx),
      )
      expect(result.total).toBe(1)
      expect(result.quests[0].available).toBe(false)
    })
  })

  describe('action: activate', () => {
    it('activates quest for unlocked region, returns intro text and character info', async () => {
      const result = JSON.parse(
        await questsTool.execute({ action: 'activate', quest_id: 'char_berlin' }, ctx),
      )
      expect(result.success).toBe(true)
      expect(result.quest_activated).toBe('char_berlin')
      expect(result.character.voice_id).toBe('berlin_voice')
      expect(result.character.region).toBe('berlin')
      expect(result.intro_text).toContain('Char_Berlin')
      expect(result.interaction_id).toBeTruthy()
      expect(result.grading_weights).toMatchObject({ vocabulary: 0.4 })
    })

    it('creates interaction record and relationship row atomically', async () => {
      await questsTool.execute({ action: 'activate', quest_id: 'char_berlin' }, ctx)
      const raw = getRawDb(db)
      const interactions = raw
        .prepare(`SELECT * FROM character_interactions WHERE character_id = 'char_berlin'`)
        .all()
      expect(interactions).toHaveLength(1)
      const rel = raw
        .prepare(
          `SELECT * FROM user_character_relationships WHERE user_id = 'test-user' AND character_id = 'char_berlin'`,
        )
        .get() as any
      expect(rel.interactions_count).toBe(1)
    })

    it('fails when region is locked (sequential-region-enforcement: Bavaria requires Berlin)', async () => {
      const result = JSON.parse(
        await questsTool.execute({ action: 'activate', quest_id: 'char_bavaria' }, ctx),
      )
      expect(result.error).toBeDefined()
      expect(result.error.code).toBe('REGION_LOCKED')
      expect(result.error.message).toMatch(/Bayern|must be unlocked/)
    })

    it('allows Bavaria activation once its region is unlocked', async () => {
      unlockRegion(db, 'test-user', 'region_bavaria')
      const result = JSON.parse(
        await questsTool.execute({ action: 'activate', quest_id: 'char_bavaria' }, ctx),
      )
      expect(result.success).toBe(true)
    })

    it('returns NOT_FOUND for invalid quest_id', async () => {
      const result = JSON.parse(
        await questsTool.execute({ action: 'activate', quest_id: 'does_not_exist' }, ctx),
      )
      expect(result.error.code).toBe('NOT_FOUND')
    })

    it('returns INVALID_INPUT when quest_id missing', async () => {
      const result = JSON.parse(await questsTool.execute({ action: 'activate' }, ctx))
      expect(result.error.code).toBe('INVALID_INPUT')
    })
  })

  describe('action: complete', () => {
    beforeEach(async () => {
      // Activate first so there is an interaction to complete
      await questsTool.execute({ action: 'activate', quest_id: 'char_berlin' }, ctx)
    })

    it('returns debrief text and relationship_delta', async () => {
      const result = JSON.parse(
        await questsTool.execute({ action: 'complete', quest_id: 'char_berlin' }, ctx),
      )
      expect(result.success).toBe(true)
      expect(result.quest_completed).toBe('char_berlin')
      expect(result.debrief_text).toContain('Char_Berlin')
      expect(typeof result.relationship_delta).toBe('number')
      // Default placeholder score is 0.75 -> delta = 2
      expect(result.relationship_delta).toBe(2)
      expect(result.conversation_score).toBe(75)
    })

    it('updates relationship level by delta', async () => {
      await questsTool.execute({ action: 'complete', quest_id: 'char_berlin' }, ctx)
      const raw = getRawDb(db)
      const rel = raw
        .prepare(
          `SELECT relationship_level FROM user_character_relationships WHERE character_id = 'char_berlin'`,
        )
        .get() as any
      expect(rel.relationship_level).toBe(2)
    })

    it('returns NOT_FOUND when no active conversation exists', async () => {
      unlockRegion(db, 'test-user', 'region_hamburg')
      const result = JSON.parse(
        await questsTool.execute({ action: 'complete', quest_id: 'char_hamburg' }, ctx),
      )
      expect(result.error.code).toBe('NOT_FOUND')
    })

    it('returns INVALID_INPUT when quest_id missing', async () => {
      const result = JSON.parse(await questsTool.execute({ action: 'complete' }, ctx))
      expect(result.error.code).toBe('INVALID_INPUT')
    })
  })

  describe('action: details', () => {
    it('returns full quest info with history', async () => {
      const result = JSON.parse(
        await questsTool.execute({ action: 'details', quest_id: 'char_berlin' }, ctx),
      )
      expect(result.success).toBe(true)
      expect(result.quest.quest_id).toBe('char_berlin')
      expect(result.quest.voice_id).toBe('berlin_voice')
      expect(result.quest.available).toBe(true)
      expect(Array.isArray(result.history)).toBe(true)
    })

    it('returns NOT_FOUND for invalid quest_id', async () => {
      const result = JSON.parse(
        await questsTool.execute({ action: 'details', quest_id: 'nope' }, ctx),
      )
      expect(result.error.code).toBe('NOT_FOUND')
    })

    it('returns INVALID_INPUT when quest_id missing', async () => {
      const result = JSON.parse(await questsTool.execute({ action: 'details' }, ctx))
      expect(result.error.code).toBe('INVALID_INPUT')
    })
  })

  describe('invalid action', () => {
    it('returns INVALID_ACTION', async () => {
      const result = JSON.parse(await questsTool.execute({ action: 'mystery' }, ctx))
      expect(result.error.code).toBe('INVALID_ACTION')
    })
  })

  describe('tool registration', () => {
    it('has name "quests"', () => {
      expect(questsTool.tool.name).toBe('quests')
    })
    it('exposes list/activate/complete/details actions', () => {
      const schema = questsTool.tool.input_schema as any
      expect(schema.properties.action.enum).toEqual([
        'list',
        'activate',
        'complete',
        'details',
      ])
    })
  })
})
