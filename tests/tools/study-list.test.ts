import { describe, it, expect } from 'vitest'
import { effectivePriority } from '../../worker/tools/study-list'

const NOW = 1_800_000_000

function row(overrides: Partial<Parameters<typeof effectivePriority>[0]> = {}) {
  return {
    user_id: 'u1',
    lemma: 'gerade',
    gloss: 'already',
    notes: null,
    base_priority: 0.65,
    last_touched_at: NOW,
    added_at: NOW,
    uses_by_iris: 0,
    uses_by_user: 0,
    clarifications_requested: 0,
    ...overrides,
  }
}

describe('effectivePriority decay', () => {
  it('returns base_priority when last_touched_at === now', () => {
    const p = effectivePriority(row({ base_priority: 0.65, last_touched_at: NOW }), NOW)
    expect(p).toBeCloseTo(0.65, 5)
  })

  it('decays 0.01 per day', () => {
    const oneDay = 86400
    const p = effectivePriority(
      row({ base_priority: 0.65, last_touched_at: NOW - oneDay * 5 }),
      NOW,
    )
    expect(p).toBeCloseTo(0.6, 5)
  })

  it('clamps to 0 (no negative priority)', () => {
    const oneDay = 86400
    const p = effectivePriority(
      row({ base_priority: 0.1, last_touched_at: NOW - oneDay * 500 }),
      NOW,
    )
    expect(p).toBe(0)
  })

  it('clamps to 1.0 (no priority above max)', () => {
    // Simulate a manually set priority above 1.0 — effective should cap
    const p = effectivePriority(
      row({ base_priority: 1.5, last_touched_at: NOW }),
      NOW,
    )
    expect(p).toBe(1.0)
  })

  it('a 7-day-old add drops from 0.65 to 0.58', () => {
    const sevenDays = 86400 * 7
    const p = effectivePriority(
      row({ base_priority: 0.65, last_touched_at: NOW - sevenDays }),
      NOW,
    )
    expect(p).toBeCloseTo(0.58, 5)
  })

  it('a 30-day-old untouched word lands at 0.35', () => {
    const thirtyDays = 86400 * 30
    const p = effectivePriority(
      row({ base_priority: 0.65, last_touched_at: NOW - thirtyDays }),
      NOW,
    )
    expect(p).toBeCloseTo(0.35, 5)
  })

  it('uses_by_iris boost would raise base_priority before storage (integration)', () => {
    // Simulating: start 0.65, +0.02 iris bump = 0.67; fresh touch
    const p = effectivePriority(
      row({ base_priority: 0.67, last_touched_at: NOW }),
      NOW,
    )
    expect(p).toBeCloseTo(0.67, 5)
  })
})
