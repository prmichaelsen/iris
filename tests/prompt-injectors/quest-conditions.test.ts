import { describe, it, expect } from 'vitest'
import { QuestConditionsInjector } from '../../worker/prompt-injectors/injectors/quest-conditions'
import type { PromptInjectorContext } from '../../worker/prompt-injectors/types'

function ctx(overrides: Partial<PromptInjectorContext>): PromptInjectorContext {
  return {
    userId: 'u1',
    activeCharacterId: 'karl',
    currentRegion: 'berlin',
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
    const result = await injector.inject(
      ctx({ activeCharacterId: 'karl', activeQuestId: 'erste_bestellung' }),
    )
    expect(result).not.toBeNull()
    expect(result!.content).toMatch(/3-Strike/i)
    expect(result!.content).toContain('Strike 3')
    expect(result!.content).toContain('NÄCHSTER')
  })

  it('returns generic template for unknown quest', async () => {
    const result = await injector.inject(
      ctx({ activeCharacterId: 'mila', activeQuestId: 'some_other_quest' }),
    )
    expect(result).not.toBeNull()
    expect(result!.content).toContain('some_other_quest')
  })
})
