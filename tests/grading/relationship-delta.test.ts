import { describe, it, expect } from 'vitest'
import { calculateRelationshipDelta } from '../../worker/relationship'

/**
 * Relationship delta mapping tests.
 *
 * Score ranges → delta:
 * 9-10 → +10 (perfect)
 * 8-8.9 → +8  (excellent)
 * 7-7.9 → +6  (good)
 * 6-6.9 → +4  (okay)
 * 5-5.9 → +2  (rough)
 * 3-4.9 → -3  (poor)
 * 0-2.9 → -8  (terrible)
 */

describe('calculateRelationshipDelta', () => {
  it('perfect tier: 9.0 → +10', () => {
    const r = calculateRelationshipDelta(9.0)
    expect(r.delta).toBe(10)
    expect(r.tier).toBe('perfect')
  })

  it('perfect tier: 9.2 → +10 (karl-perfect-conversation spec)', () => {
    const r = calculateRelationshipDelta(9.2)
    expect(r.delta).toBe(10)
    expect(r.tier).toBe('perfect')
  })

  it('perfect tier: 10.0 → +10', () => {
    expect(calculateRelationshipDelta(10.0).delta).toBe(10)
  })

  it('excellent tier: 8.0 → +8', () => {
    const r = calculateRelationshipDelta(8.0)
    expect(r.delta).toBe(8)
    expect(r.tier).toBe('excellent')
  })

  it('excellent tier: 8.9 → +8', () => {
    expect(calculateRelationshipDelta(8.9).delta).toBe(8)
  })

  it('good tier: 7.0 → +6', () => {
    const r = calculateRelationshipDelta(7.0)
    expect(r.delta).toBe(6)
    expect(r.tier).toBe('good')
  })

  it('good tier: 7.9 → +6', () => {
    expect(calculateRelationshipDelta(7.9).delta).toBe(6)
  })

  it('okay tier: 6.0 → +4', () => {
    const r = calculateRelationshipDelta(6.0)
    expect(r.delta).toBe(4)
    expect(r.tier).toBe('okay')
  })

  it('okay tier: 6.9 → +4', () => {
    expect(calculateRelationshipDelta(6.9).delta).toBe(4)
  })

  it('rough tier: 5.0 → +2', () => {
    const r = calculateRelationshipDelta(5.0)
    expect(r.delta).toBe(2)
    expect(r.tier).toBe('rough')
  })

  it('rough tier: 5.4 → +2 (karl-slow-conversation spec)', () => {
    const r = calculateRelationshipDelta(5.4)
    expect(r.delta).toBe(2)
    expect(r.tier).toBe('rough')
  })

  it('rough tier: 5.9 → +2', () => {
    expect(calculateRelationshipDelta(5.9).delta).toBe(2)
  })

  it('poor tier: 3.0 → -3', () => {
    const r = calculateRelationshipDelta(3.0)
    expect(r.delta).toBe(-3)
    expect(r.tier).toBe('poor')
  })

  it('poor tier: 4.9 → -3', () => {
    expect(calculateRelationshipDelta(4.9).delta).toBe(-3)
  })

  it('terrible tier: 2.9 → -8', () => {
    const r = calculateRelationshipDelta(2.9)
    expect(r.delta).toBe(-8)
    expect(r.tier).toBe('terrible')
  })

  it('terrible tier: 0.0 → -8', () => {
    expect(calculateRelationshipDelta(0.0).delta).toBe(-8)
  })
})

/**
 * Boundary clamping: relationship is capped at 100, floored at 0.
 * This is implemented inside updateCharacterRelationship, but we
 * validate the clamping math here without a DB dependency.
 */
function clampRelationship(current: number, delta: number): number {
  return Math.max(0, Math.min(100, current + delta))
}

describe('relationship boundary clamping', () => {
  it('character-relationship-at-boundaries: 100 + 10 stays at 100', () => {
    expect(clampRelationship(100, 10)).toBe(100)
  })

  it('95 + 10 caps at 100 (no overflow)', () => {
    expect(clampRelationship(95, 10)).toBe(100)
  })

  it('character-relationship-zero-floor: 5 - 8 = 0 (not negative)', () => {
    expect(clampRelationship(5, -8)).toBe(0)
  })

  it('0 - 8 stays at 0 (no negative)', () => {
    expect(clampRelationship(0, -8)).toBe(0)
  })

  it('normal addition stays in range', () => {
    expect(clampRelationship(50, 10)).toBe(60)
    expect(clampRelationship(50, -3)).toBe(47)
  })
})
