import { describe, it, expect } from 'vitest'
import { QuestConditionsInjector } from '../../worker/prompt-injectors/injectors/quest-conditions'
import type { PromptInjectorContext } from '../../worker/prompt-injectors/types'

/**
 * Minimal mock of the subset of D1Database that QuestConditionsInjector
 * uses (prepare/bind/first). Returns rows keyed by the SQL prefix so
 * different queries can return different shapes.
 */
function mockDb(rows: Record<string, any>): D1Database {
  return {
    prepare(sql: string) {
      const match = Object.keys(rows).find((k) => sql.includes(k))
      const row = match ? rows[match] : null
      return {
        bind: () => ({
          first: async () => row,
        }),
      } as any
    },
  } as unknown as D1Database
}

function ctx(overrides: Partial<PromptInjectorContext>): PromptInjectorContext {
  return {
    userId: 'u1',
    activeCharacterId: 'karl',
    currentRegion: 'berlin',
    db: mockDb({}),
    ...overrides,
  }
}

describe('QuestConditionsInjector', () => {
  const injector = new QuestConditionsInjector()

  it('canInject returns false when activeQuestId is undefined', () => {
    expect(injector.canInject(ctx({ activeQuestId: undefined }))).toBe(false)
  })

  it('canInject returns true when activeQuestId is set', () => {
    expect(injector.canInject(ctx({ activeQuestId: 'erste_bestellung' }))).toBe(true)
  })

  it("Karl's erste_bestellung includes 3-strike system in content", async () => {
    const db = mockDb({
      'FROM quests': {
        id: 'erste_bestellung',
        name_en: 'First Order',
        character_id: 'char_karl_baker',
        success_criteria: JSON.stringify({ timer_seconds: 5, max_timeouts: 3 }),
      },
      'FROM user_character_relationships': { relationship_level: 30 },
    })
    const result = await injector.inject(
      ctx({ activeCharacterId: 'char_karl_baker', activeQuestId: 'erste_bestellung', db }),
    )
    expect(result).not.toBeNull()
    expect(result!.content).toMatch(/3-Strike/i)
    expect(result!.content).toContain('Strike 3')
    expect(result!.content).toContain('NÄCHSTER')
  })

  it('returns generic template for unknown quest (falls back when row found)', async () => {
    const db = mockDb({
      'FROM quests': {
        id: 'some_other_quest',
        name_en: 'Some Other Quest',
        character_id: null,
        success_criteria: null,
      },
    })
    const result = await injector.inject(
      ctx({ activeCharacterId: 'mila', activeQuestId: 'some_other_quest', db }),
    )
    expect(result).not.toBeNull()
    expect(result!.content).toContain('some_other_quest')
  })
})
