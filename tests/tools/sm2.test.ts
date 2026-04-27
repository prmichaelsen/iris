import { describe, it, expect } from 'vitest'

// SM-2 scoring logic extracted for testability.
// Must match the implementation in worker/tools/shared.ts.
function sm2Update(
  correct: boolean,
  prev: { ease: number; interval_days: number },
): { ease: number; interval_days: number } {
  if (correct) {
    const newInterval =
      prev.interval_days === 0 ? 1 : prev.interval_days === 1 ? 6 : Math.round(prev.interval_days * prev.ease)
    const newEase = Math.max(1.3, prev.ease + 0.1)
    return { interval_days: newInterval, ease: newEase }
  }
  return { interval_days: 0, ease: Math.max(1.3, prev.ease - 0.2) }
}

describe('SM-2 scoring', () => {
  it('correct first time: interval 0→1, ease 2.5→2.6', () => {
    const r = sm2Update(true, { ease: 2.5, interval_days: 0 })
    expect(r.interval_days).toBe(1)
    expect(r.ease).toBeCloseTo(2.6)
  })

  it('correct second time: interval 1→6, ease 2.6→2.7', () => {
    const r = sm2Update(true, { ease: 2.6, interval_days: 1 })
    expect(r.interval_days).toBe(6)
    expect(r.ease).toBeCloseTo(2.7)
  })

  it('correct subsequent: interval = round(6 * 2.7) = 16', () => {
    const r = sm2Update(true, { ease: 2.7, interval_days: 6 })
    expect(r.interval_days).toBe(16)
    expect(r.ease).toBeCloseTo(2.8)
  })

  it('incorrect resets interval to 0, decreases ease', () => {
    const r = sm2Update(false, { ease: 2.5, interval_days: 16 })
    expect(r.interval_days).toBe(0)
    expect(r.ease).toBeCloseTo(2.3)
  })

  it('ease never drops below 1.3', () => {
    const r = sm2Update(false, { ease: 1.3, interval_days: 0 })
    expect(r.interval_days).toBe(0)
    expect(r.ease).toBe(1.3)
  })

  it('ease floor with value near floor', () => {
    const r = sm2Update(false, { ease: 1.4, interval_days: 3 })
    expect(r.ease).toBeCloseTo(1.3)
  })

  it('many correct in sequence grows interval exponentially', () => {
    let state = { ease: 2.5, interval_days: 0 }
    const intervals: number[] = []
    for (let i = 0; i < 8; i++) {
      state = sm2Update(true, state)
      intervals.push(state.interval_days)
    }
    expect(intervals[0]).toBe(1)
    expect(intervals[1]).toBe(6)
    expect(intervals[intervals.length - 1]).toBeGreaterThan(100)
  })

  it('incorrect after long streak resets to 0', () => {
    let state = { ease: 3.0, interval_days: 200 }
    state = sm2Update(false, state)
    expect(state.interval_days).toBe(0)
    expect(state.ease).toBeCloseTo(2.8)
  })
})
