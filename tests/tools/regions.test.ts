import { describe, it, expect, beforeEach } from 'vitest'
import { regionsTool } from '../../worker/tools/regions'
import {
  createGamificationDb,
  seedGamification,
  unlockRegion,
  makeCtx,
} from '../helpers/gamification-mock'

describe('regions tool', () => {
  let db: D1Database
  let ctx: any

  beforeEach(() => {
    db = createGamificationDb()
    seedGamification(db, 'test-user')
    ctx = makeCtx(db, 'test-user')
  })

  describe('action: list', () => {
    it('returns all 8 regions with unlocked status', async () => {
      const result = JSON.parse(await regionsTool.execute({ action: 'list' }, ctx))
      expect(result.success).toBe(true)
      expect(result.total).toBe(8)
      expect(result.regions).toHaveLength(8)
      // Berlin unlocked by default, others locked
      expect(result.unlocked_count).toBe(1)
      const berlin = result.regions.find((r: any) => r.id === 'berlin')
      expect(berlin.unlocked).toBe(true)
      const bavaria = result.regions.find((r: any) => r.id === 'bavaria')
      expect(bavaria.unlocked).toBe(false)
    })

    it('reflects additional unlocked regions', async () => {
      unlockRegion(db, 'test-user', 'region_bavaria')
      const result = JSON.parse(await regionsTool.execute({ action: 'list' }, ctx))
      expect(result.unlocked_count).toBe(2)
    })

    it('returns regions in order_index order', async () => {
      const result = JSON.parse(await regionsTool.execute({ action: 'list' }, ctx))
      const ids = result.regions.map((r: any) => r.id)
      expect(ids[0]).toBe('berlin')
      expect(ids[1]).toBe('bavaria')
    })

    it('flags bonus regions', async () => {
      const result = JSON.parse(await regionsTool.execute({ action: 'list' }, ctx))
      const austria = result.regions.find((r: any) => r.id === 'austria')
      expect(austria.is_bonus).toBe(true)
      const berlin = result.regions.find((r: any) => r.id === 'berlin')
      expect(berlin.is_bonus).toBe(false)
    })
  })

  describe('action: travel', () => {
    it('succeeds for unlocked region', async () => {
      const result = JSON.parse(
        await regionsTool.execute({ action: 'travel', region_id: 'berlin' }, ctx),
      )
      expect(result.success).toBe(true)
      expect(result.region.id).toBe('berlin')
      expect(result.region.voice_id).toBe('berlin_voice')
    })

    it('fails for locked region', async () => {
      const result = JSON.parse(
        await regionsTool.execute({ action: 'travel', region_id: 'bavaria' }, ctx),
      )
      expect(result.error).toBeDefined()
      expect(result.error.code).toBe('REGION_LOCKED')
    })

    it('returns error when region_id missing', async () => {
      const result = JSON.parse(await regionsTool.execute({ action: 'travel' }, ctx))
      expect(result.error).toBeDefined()
      expect(result.error.code).toBe('INVALID_INPUT')
    })
  })

  describe('action: info', () => {
    it('returns region details with characters', async () => {
      const result = JSON.parse(
        await regionsTool.execute({ action: 'info', region_id: 'berlin' }, ctx),
      )
      expect(result.success).toBe(true)
      expect(result.region.id).toBe('berlin')
      expect(result.region.voice_id).toBe('berlin_voice')
      expect(result.characters).toHaveLength(1)
      expect(result.characters[0].id).toBe('char_berlin')
    })

    it('shows locked=false for Berlin, true for bavaria via unlocked flag', async () => {
      const berlin = JSON.parse(
        await regionsTool.execute({ action: 'info', region_id: 'berlin' }, ctx),
      )
      expect(berlin.region.unlocked).toBe(true)

      const bav = JSON.parse(
        await regionsTool.execute({ action: 'info', region_id: 'bavaria' }, ctx),
      )
      expect(bav.region.unlocked).toBe(false)
    })

    it('returns error when region_id missing', async () => {
      const result = JSON.parse(await regionsTool.execute({ action: 'info' }, ctx))
      expect(result.error).toBeDefined()
      expect(result.error.code).toBe('INVALID_INPUT')
    })

    it('includes progress percentage', async () => {
      unlockRegion(db, 'test-user', 'region_hamburg', true)
      const result = JSON.parse(
        await regionsTool.execute({ action: 'info', region_id: 'hamburg' }, ctx),
      )
      expect(result.region.progress.percentage).toBe(100)
    })
  })

  describe('invalid action', () => {
    it('returns INVALID_ACTION for unknown action', async () => {
      const result = JSON.parse(
        await regionsTool.execute({ action: 'unknown' }, ctx),
      )
      expect(result.error.code).toBe('INVALID_ACTION')
    })
  })

  describe('tool registration', () => {
    it('has name "regions"', () => {
      expect(regionsTool.tool.name).toBe('regions')
    })
    it('lists list/travel/info actions', () => {
      const schema = regionsTool.tool.input_schema as any
      expect(schema.properties.action.enum).toEqual(['list', 'travel', 'info'])
    })
    it('requires action param', () => {
      const schema = regionsTool.tool.input_schema as any
      expect(schema.required).toContain('action')
    })
  })
})
