import { describe, it, expect } from 'vitest'
import { ConversationEndDetectorInjector } from '../../worker/prompt-injectors/injectors/conversation-end-detector'
import type { PromptInjectorContext } from '../../worker/prompt-injectors/types'

function ctx(overrides: Partial<PromptInjectorContext>): PromptInjectorContext {
  return {
    userId: 'u1',
    activeCharacterId: 'karl',
    currentRegion: 'berlin',
    ...overrides,
  }
}

describe('ConversationEndDetectorInjector', () => {
  const injector = new ConversationEndDetectorInjector()

  it("canInject returns false for Iris (don't detect end for Iris)", () => {
    expect(injector.canInject(ctx({ activeCharacterId: 'iris' }))).toBe(false)
  })

  it('canInject returns true for non-Iris characters', () => {
    expect(injector.canInject(ctx({ activeCharacterId: 'karl' }))).toBe(true)
  })

  it('content differs between quest mode and casual mode', async () => {
    const questResult = await injector.inject(
      ctx({ activeCharacterId: 'karl', activeQuestId: 'erste_bestellung' }),
    )
    const casualResult = await injector.inject(
      ctx({ activeCharacterId: 'karl', activeQuestId: undefined }),
    )
    expect(questResult).not.toBeNull()
    expect(casualResult).not.toBeNull()
    expect(questResult!.content).not.toBe(casualResult!.content)
    expect(questResult!.content).toMatch(/Quest Mode/i)
    expect(questResult!.content).toContain('erste_bestellung')
    expect(casualResult!.content).toMatch(/Casual Conversation Mode/i)
  })

  it('content includes goodbye phrases (Tschüss, Auf Wiedersehen, etc.)', async () => {
    const result = await injector.inject(ctx({ activeCharacterId: 'karl' }))
    expect(result).not.toBeNull()
    const content = result!.content
    expect(content).toContain('Tschüss')
    expect(content).toContain('Auf Wiedersehen')
    expect(content).toContain('Bis später')
    expect(content).toContain('Ciao')
  })
})
