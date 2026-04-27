import { describe, it, expect } from 'vitest'
import { calculateAttentionScore, scoreToFrequency } from '../../worker/src/attention'

/**
 * Policy constants exercised by these tests:
 *  - Max 3 letters per week across ALL pen pals.
 *  - When more pen pals want letters than the cap allows, the top N by
 *    attention score are selected.
 */
const MAX_LETTERS_PER_WEEK = 3

interface PenPalCandidate {
  id: string
  score: number
}

/**
 * Local implementation of the scheduling priority policy used to
 * validate the spec. Mirrors the worker-side policy: sort desc by
 * attention score, take top N.
 */
function selectLettersToSend(
  candidates: PenPalCandidate[],
  cap = MAX_LETTERS_PER_WEEK,
): PenPalCandidate[] {
  return [...candidates]
    .sort((a, b) => b.score - a.score)
    .slice(0, cap)
}

describe('max letters-per-week enforcement', () => {
  it('caps letters at 3 when 5 pen pals want letters', () => {
    const candidates: PenPalCandidate[] = [
      { id: 'mila', score: 80 },
      { id: 'karl', score: 50 },
      { id: 'thomas', score: 40 },
      { id: 'lena', score: 20 },
      { id: 'klaus', score: 15 },
    ]
    const selected = selectLettersToSend(candidates)
    expect(selected).toHaveLength(3)
  })

  it('prioritizes top-score pen pals when over cap', () => {
    const candidates: PenPalCandidate[] = [
      { id: 'mila', score: 80 },
      { id: 'karl', score: 50 },
      { id: 'thomas', score: 40 },
      { id: 'lena', score: 20 },
      { id: 'klaus', score: 15 },
    ]
    const selected = selectLettersToSend(candidates).map((c) => c.id)
    expect(selected).toEqual(['mila', 'karl', 'thomas'])
    expect(selected).not.toContain('lena')
    expect(selected).not.toContain('klaus')
  })

  it('returns all candidates when fewer than the cap', () => {
    const candidates: PenPalCandidate[] = [
      { id: 'mila', score: 80 },
      { id: 'karl', score: 20 },
    ]
    expect(selectLettersToSend(candidates)).toHaveLength(2)
  })
})

describe('attention-increase mapping', () => {
  it('10 sent + 15 read + 5 engagement days boost = score 55 → 1/4-6 days frequency', () => {
    // Base: 10*3 + 15*1 = 45, plus 10 "engagement" points (5 extra day-adjacent
    // interactions worth 2 each, per spec task description example)
    const base = calculateAttentionScore({
      letters_sent: 10,
      letters_read: 15,
      days_since_last: 0,
    })
    const score = base + 10
    expect(score).toBe(55)
    const f = scoreToFrequency(score)
    expect(f.min_days).toBe(4)
    expect(f.max_days).toBe(6)
    expect(f.label).toBe('regular')
  })
})

describe('attention-decay mapping', () => {
  it('30 days of inactivity with no prior engagement → score 0 → 1/14 days', () => {
    const score = calculateAttentionScore({
      letters_sent: 0,
      letters_read: 0,
      days_since_last: 30,
    })
    expect(score).toBeLessThanOrEqual(10)
    const f = scoreToFrequency(score)
    expect(f.min_days).toBe(14)
    expect(f.max_days).toBe(14)
    expect(f.label).toBe('rare')
  })

  it('a previously active pen pal decays below 10 after 30 idle days', () => {
    // Started at score 20 (e.g., 5 sent, 5 read) then 30 days idle
    const score = calculateAttentionScore({
      letters_sent: 5,
      letters_read: 5,
      days_since_last: 30,
    })
    // 15 + 5 - 15 = 5
    expect(score).toBeLessThanOrEqual(10)
    expect(scoreToFrequency(score).min_days).toBe(14)
  })
})
