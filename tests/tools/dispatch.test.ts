import { describe, it, expect } from 'vitest'

// Test the dispatch logic extracted from worker/tools/index.ts.
// We can't import the actual module (Cloudflare runtime deps) so we
// replicate the dispatch logic and verify routing.

function routeToolCall(name: string, input: Record<string, unknown>): string {
  if (name === 'flashcard') {
    const mode = ((input.mode as string) || '').replace(/_/g, '-')
    if (mode === 'gender-pick') return 'genderPickTool'
    if (mode === 'matching') return 'flashcardTool'
    return `unknown-mode:${mode}`
  }
  const knownTools = ['flashcard_freeform', 'definition', 'fill_blank']
  if (knownTools.includes(name)) return name
  return `unknown-tool:${name}`
}

describe('tool dispatch routing', () => {
  it('routes flashcard matching', () => {
    expect(routeToolCall('flashcard', { mode: 'matching' })).toBe('flashcardTool')
  })

  it('routes flashcard gender-pick', () => {
    expect(routeToolCall('flashcard', { mode: 'gender-pick' })).toBe('genderPickTool')
  })

  it('rejects unknown flashcard mode', () => {
    expect(routeToolCall('flashcard', { mode: 'unknown' })).toBe('unknown-mode:unknown')
  })

  it('routes definition tool', () => {
    expect(routeToolCall('definition', {})).toBe('definition')
  })

  it('routes fill_blank tool', () => {
    expect(routeToolCall('fill_blank', {})).toBe('fill_blank')
  })

  it('rejects unknown tool', () => {
    expect(routeToolCall('nonexistent', {})).toBe('unknown-tool:nonexistent')
  })

  it('normalizes underscore to hyphen (Claude sometimes sends gender_pick)', () => {
    expect(routeToolCall('flashcard', { mode: 'gender_pick' })).toBe('genderPickTool')
  })

  it('handles empty/missing mode', () => {
    expect(routeToolCall('flashcard', {})).toBe('unknown-mode:')
    expect(routeToolCall('flashcard', { mode: '' })).toBe('unknown-mode:')
  })
})
