import { describe, it, expect } from 'vitest'
import {
  calculateAttentionScore,
  scoreToFrequency,
  daysSince,
} from '../../worker/src/attention'

describe('calculateAttentionScore', () => {
  it('returns 0 when no engagement and no days elapsed', () => {
    expect(calculateAttentionScore({ letters_sent: 0, letters_read: 0, days_since_last: 0 })).toBe(0)
  })

  it('applies (sent * 3) + (read * 1) formula', () => {
    // 10 sent, 15 read, 0 days = 30 + 15 = 45
    expect(
      calculateAttentionScore({ letters_sent: 10, letters_read: 15, days_since_last: 0 }),
    ).toBe(45)
  })

  it('subtracts (days_since * 0.5) from the score', () => {
    // 10 sent, 10 read, 20 days => 30 + 10 - 10 = 30
    expect(
      calculateAttentionScore({ letters_sent: 10, letters_read: 10, days_since_last: 20 }),
    ).toBe(30)
  })

  it('floors negative scores at 0 (attention decay)', () => {
    // 30 days no activity, no engagement => -15 floored to 0
    expect(
      calculateAttentionScore({ letters_sent: 0, letters_read: 0, days_since_last: 30 }),
    ).toBe(0)
  })

  it('weights sent letters 3x more than read letters', () => {
    const sentOnly = calculateAttentionScore({ letters_sent: 5, letters_read: 0, days_since_last: 0 })
    const readOnly = calculateAttentionScore({ letters_sent: 0, letters_read: 5, days_since_last: 0 })
    expect(sentOnly).toBe(15)
    expect(readOnly).toBe(5)
    expect(sentOnly).toBe(readOnly * 3)
  })
})

describe('scoreToFrequency mapping', () => {
  it('maps score < 10 to 1/14 days', () => {
    const f = scoreToFrequency(5)
    expect(f.min_days).toBe(14)
    expect(f.max_days).toBe(14)
    expect(f.label).toBe('rare')
  })

  it('maps 10-30 to 1/7-10 days', () => {
    const f = scoreToFrequency(20)
    expect(f.min_days).toBe(7)
    expect(f.max_days).toBe(10)
  })

  it('maps 30-60 to 1/4-6 days', () => {
    const f = scoreToFrequency(45)
    expect(f.min_days).toBe(4)
    expect(f.max_days).toBe(6)
  })

  it('maps 60-100 to 1/2-4 days', () => {
    const f = scoreToFrequency(80)
    expect(f.min_days).toBe(2)
    expect(f.max_days).toBe(4)
  })

  it('maps 100+ to 1/1-3 days', () => {
    const f = scoreToFrequency(150)
    expect(f.min_days).toBe(1)
    expect(f.max_days).toBe(3)
    expect(f.label).toBe('very_frequent')
  })

  it('tier boundaries land in the higher tier', () => {
    expect(scoreToFrequency(10).min_days).toBe(7)
    expect(scoreToFrequency(30).min_days).toBe(4)
    expect(scoreToFrequency(60).min_days).toBe(2)
    expect(scoreToFrequency(100).min_days).toBe(1)
  })
})

describe('daysSince', () => {
  it('returns 999 when last_interaction_at is null', () => {
    expect(daysSince(null)).toBe(999)
  })

  it('computes elapsed days from an ISO timestamp', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    expect(daysSince(tenDaysAgo)).toBe(10)
  })
})
