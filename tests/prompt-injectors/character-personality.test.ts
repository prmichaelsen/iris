import { describe, it, expect } from 'vitest'
import { CharacterPersonalityInjector } from '../../worker/prompt-injectors/injectors/character-personality'
import type { PromptInjectorContext } from '../../worker/prompt-injectors/types'

function ctx(overrides: Partial<PromptInjectorContext>): PromptInjectorContext {
  return {
    userId: 'u1',
    activeCharacterId: 'iris',
    currentRegion: 'default',
    ...overrides,
  }
}

describe('CharacterPersonalityInjector', () => {
  const injector = new CharacterPersonalityInjector()

  it('canInject returns false when activeCharacterId is "iris"', () => {
    expect(injector.canInject(ctx({ activeCharacterId: 'iris' }))).toBe(false)
  })

  it('canInject returns true for non-iris characters', () => {
    expect(injector.canInject(ctx({ activeCharacterId: 'karl' }))).toBe(true)
    expect(injector.canInject(ctx({ activeCharacterId: 'mila' }))).toBe(true)
  })

  it('inject() returns null for unknown character', async () => {
    const result = await injector.inject(ctx({ activeCharacterId: 'nonexistent' }))
    expect(result).toBeNull()
  })
})
