import { describe, it, expect, beforeEach } from 'vitest'
import { regionsTool } from '../../worker/tools/regions'
import { questsTool } from '../../worker/tools/quests'
import {
  createGamificationDb,
  seedGamification,
  unlockRegion,
  makeCtx,
  getRawDb,
} from '../helpers/gamification-mock'

// Integration tests covering atomic cross-tool state changes and the
// sequential-region-enforcement spec from
// agent/specs/local.gamification-engagement-system.md
describe('regions + quests integration', () => {
  let db: D1Database
  let ctx: any

  beforeEach(() => {
    db = createGamificationDb()
    seedGamification(db, 'test-user')
    ctx = makeCtx(db, 'test-user')
  })

  it('sequential-region-enforcement: cannot activate Bavaria quest if Berlin incomplete', async () => {
    // Berlin is unlocked but not completed. Bavaria region is NOT unlocked.
    // Attempting to activate a Bavaria quest MUST fail with REGION_LOCKED.
    const listResult = JSON.parse(
      await regionsTool.execute({ action: 'list' }, ctx),
    )
    const bavaria = listResult.regions.find((r: any) => r.id === 'bavaria')
    expect(bavaria.unlocked).toBe(false)

    const activate = JSON.parse(
      await questsTool.execute({ action: 'activate', quest_id: 'char_bavaria' }, ctx),
    )
    expect(activate.error).toBeDefined()
    expect(activate.error.code).toBe('REGION_LOCKED')

    // Travel to Bavaria also fails
    const travel = JSON.parse(
      await regionsTool.execute({ action: 'travel', region_id: 'bavaria' }, ctx),
    )
    expect(travel.error.code).toBe('REGION_LOCKED')
  })

  it('after Berlin completes and Bavaria unlocks, travel + activate succeed', async () => {
    // Simulate Berlin completion + Bavaria unlock
    unlockRegion(db, 'test-user', 'region_berlin', true)
    unlockRegion(db, 'test-user', 'region_bavaria')

    const travel = JSON.parse(
      await regionsTool.execute({ action: 'travel', region_id: 'bavaria' }, ctx),
    )
    expect(travel.success).toBe(true)
    expect(travel.region.voice_id).toBe('bavaria_voice')

    const activate = JSON.parse(
      await questsTool.execute({ action: 'activate', quest_id: 'char_bavaria' }, ctx),
    )
    expect(activate.success).toBe(true)
    expect(activate.character.region).toBe('bavaria')
    expect(activate.character.voice_id).toBe('bavaria_voice')
  })

  it('quests.activate switches character + quest + region + voice atomically', async () => {
    const result = JSON.parse(
      await questsTool.execute({ action: 'activate', quest_id: 'char_berlin' }, ctx),
    )
    // All 4 pieces of state present in single response:
    expect(result.character.id).toBe('char_berlin') // active_character
    expect(result.quest_activated).toBe('char_berlin') // active_quest
    expect(result.character.region).toBe('berlin') // current_region
    expect(result.character.voice_id).toBe('berlin_voice') // voice_id

    // DB state: interaction + relationship created in the same call
    const raw = getRawDb(db)
    const rowCount = raw
      .prepare(
        `SELECT
          (SELECT COUNT(*) FROM character_interactions WHERE character_id = 'char_berlin') AS ic,
          (SELECT COUNT(*) FROM user_character_relationships WHERE character_id = 'char_berlin') AS rc`,
      )
      .get() as any
    expect(rowCount.ic).toBe(1)
    expect(rowCount.rc).toBe(1)
  })

  it('full flow: list -> travel -> activate -> complete', async () => {
    // List
    const list = JSON.parse(await regionsTool.execute({ action: 'list' }, ctx))
    expect(list.regions.find((r: any) => r.id === 'berlin').unlocked).toBe(true)

    // Travel
    const travel = JSON.parse(
      await regionsTool.execute({ action: 'travel', region_id: 'berlin' }, ctx),
    )
    expect(travel.success).toBe(true)

    // Activate
    const activate = JSON.parse(
      await questsTool.execute({ action: 'activate', quest_id: 'char_berlin' }, ctx),
    )
    expect(activate.success).toBe(true)

    // Complete -> grading triggers, relationship updates
    const complete = JSON.parse(
      await questsTool.execute({ action: 'complete', quest_id: 'char_berlin' }, ctx),
    )
    expect(complete.success).toBe(true)
    expect(complete.relationship_delta).toBeGreaterThan(0)
    expect(complete.debrief_text).toBeTruthy()
  })
})
