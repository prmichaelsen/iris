import { describe, it, expect, beforeEach } from 'vitest'
import type {
  PromptInjector,
  PromptInjectorContext,
  PromptInjectorResult,
} from '../../worker/prompt-injectors/types'

// Import the side-effecting index to ensure default injectors are registered.
import '../../worker/prompt-injectors'

import {
  registerInjector,
  getInjector,
  getAllInjectors,
  executeInjectors,
} from '../../worker/prompt-injectors/registry'

function makeInjector(overrides: Partial<PromptInjector> & { id: string }): PromptInjector {
  return {
    id: overrides.id,
    name: overrides.name ?? overrides.id,
    description: overrides.description ?? '',
    enabledByDefault: overrides.enabledByDefault ?? true,
    canInject: overrides.canInject,
    inject:
      overrides.inject ??
      (async (): Promise<PromptInjectorResult | null> => ({
        content: `from ${overrides.id}`,
        priority: 0.5,
      })),
  }
}

const baseContext: PromptInjectorContext = {
  userId: 'u1',
  activeCharacterId: 'iris',
  currentRegion: 'default',
}

describe('prompt injector registry', () => {
  it('registerInjector() adds to the registry', () => {
    const inj = makeInjector({ id: 'test-register-1' })
    registerInjector(inj)
    expect(getInjector('test-register-1')).toBe(inj)
  })

  it('getAllInjectors() includes registered injectors', () => {
    const inj = makeInjector({ id: 'test-register-2' })
    registerInjector(inj)
    const all = getAllInjectors()
    expect(all.map((i) => i.id)).toContain('test-register-2')
  })

  it('executeInjectors() respects canInject() conditions', async () => {
    registerInjector(
      makeInjector({
        id: 'test-cannot',
        canInject: () => false,
        inject: async () => ({ content: 'should not appear', priority: 0.5 }),
      }),
    )
    registerInjector(
      makeInjector({
        id: 'test-can',
        canInject: () => true,
        inject: async () => ({ content: 'should appear', priority: 0.5 }),
      }),
    )
    const results = await executeInjectors(baseContext, {
      enabledInjectors: ['test-cannot', 'test-can'],
    })
    const contents = results.map((r) => r.content)
    expect(contents).toContain('should appear')
    expect(contents).not.toContain('should not appear')
  })

  it('executeInjectors() filters by config.disabledInjectors', async () => {
    registerInjector(
      makeInjector({
        id: 'test-disabled',
        inject: async () => ({ content: 'disabled content', priority: 0.5 }),
      }),
    )
    registerInjector(
      makeInjector({
        id: 'test-enabled',
        inject: async () => ({ content: 'enabled content', priority: 0.5 }),
      }),
    )
    const results = await executeInjectors(baseContext, {
      enabledInjectors: ['test-disabled', 'test-enabled'],
      disabledInjectors: ['test-disabled'],
    })
    const contents = results.map((r) => r.content)
    expect(contents).toContain('enabled content')
    expect(contents).not.toContain('disabled content')
  })

  it('results are sorted by priority descending', async () => {
    registerInjector(
      makeInjector({
        id: 'test-prio-low',
        inject: async () => ({ content: 'low', priority: 0.1 }),
      }),
    )
    registerInjector(
      makeInjector({
        id: 'test-prio-high',
        inject: async () => ({ content: 'high', priority: 0.9 }),
      }),
    )
    registerInjector(
      makeInjector({
        id: 'test-prio-mid',
        inject: async () => ({ content: 'mid', priority: 0.5 }),
      }),
    )
    const results = await executeInjectors(baseContext, {
      enabledInjectors: ['test-prio-low', 'test-prio-high', 'test-prio-mid'],
    })
    const contents = results.map((r) => r.content)
    expect(contents).toEqual(['high', 'mid', 'low'])
  })
})
