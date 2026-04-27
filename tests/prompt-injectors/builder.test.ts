import { describe, it, expect } from 'vitest'

// Import the side-effecting entrypoint to register default injectors.
import '../../worker/prompt-injectors'

import { buildSystemPrompt } from '../../worker/prompt-injectors/builder'
import { registerInjector } from '../../worker/prompt-injectors/registry'
import type {
  PromptInjector,
  PromptInjectorContext,
  PromptInjectorResult,
} from '../../worker/prompt-injectors/types'

function makeInjector(
  id: string,
  priority: number,
  content: string,
  toolFilter?: PromptInjectorResult['toolFilter'],
): PromptInjector {
  return {
    id,
    name: id,
    description: '',
    enabledByDefault: false,
    async inject(): Promise<PromptInjectorResult> {
      return { content, priority, title: id, toolFilter }
    },
  }
}

describe('buildSystemPrompt() orchestrator', () => {
  it('returns combined prompt with all enabled sections', async () => {
    registerInjector(makeInjector('builder-a', 0.5, 'ALPHA'))
    registerInjector(makeInjector('builder-b', 0.3, 'BETA'))

    const ctx: PromptInjectorContext = {
      userId: 'u1',
      activeCharacterId: 'iris',
      currentRegion: 'default',
    }

    const { prompt, toolFilters } = await buildSystemPrompt({
      context: ctx,
      config: { enabledInjectors: ['builder-a', 'builder-b'] },
    })

    expect(prompt).toContain('ALPHA')
    expect(prompt).toContain('BETA')
    expect(Array.isArray(toolFilters)).toBe(true)
  })

  it('includes toolFilters array collected from injector results', async () => {
    registerInjector(
      makeInjector('builder-tool-1', 0.5, 'X', { allow: ['definition'] }),
    )
    registerInjector(
      makeInjector('builder-tool-2', 0.4, 'Y', { deny: ['flashcard'] }),
    )

    const { toolFilters } = await buildSystemPrompt({
      context: {
        userId: 'u1',
        activeCharacterId: 'iris',
        currentRegion: 'default',
      },
      config: { enabledInjectors: ['builder-tool-1', 'builder-tool-2'] },
    })

    expect(toolFilters.length).toBe(2)
    const allows = toolFilters.flatMap((f) => f.allow ?? [])
    const denies = toolFilters.flatMap((f) => f.deny ?? [])
    expect(allows).toContain('definition')
    expect(denies).toContain('flashcard')
  })

  it('sections are ordered by priority (highest first)', async () => {
    registerInjector(makeInjector('builder-order-low', 0.1, 'LOW_SECTION'))
    registerInjector(makeInjector('builder-order-high', 0.9, 'HIGH_SECTION'))
    registerInjector(makeInjector('builder-order-mid', 0.5, 'MID_SECTION'))

    const { prompt } = await buildSystemPrompt({
      context: {
        userId: 'u1',
        activeCharacterId: 'iris',
        currentRegion: 'default',
      },
      config: {
        enabledInjectors: [
          'builder-order-low',
          'builder-order-high',
          'builder-order-mid',
        ],
      },
    })

    const highIdx = prompt.indexOf('HIGH_SECTION')
    const midIdx = prompt.indexOf('MID_SECTION')
    const lowIdx = prompt.indexOf('LOW_SECTION')
    expect(highIdx).toBeGreaterThanOrEqual(0)
    expect(midIdx).toBeGreaterThan(highIdx)
    expect(lowIdx).toBeGreaterThan(midIdx)
  })

  it('includes section titles when config.includeTitles is true', async () => {
    registerInjector(makeInjector('builder-title', 0.5, 'CONTENT'))

    const { prompt } = await buildSystemPrompt({
      context: {
        userId: 'u1',
        activeCharacterId: 'iris',
        currentRegion: 'default',
      },
      config: {
        enabledInjectors: ['builder-title'],
        includeTitles: true,
      },
    })

    expect(prompt).toContain('# builder-title')
    expect(prompt).toContain('CONTENT')
  })
})
