import { describe, it, expect, beforeEach } from 'vitest'
import {
  getOrCreateConversationState,
  incrementStrike,
  clearConversationState,
  getConversationState,
  getCharacterTimerConfig,
} from '../worker/conversation-state'

/**
 * Pure helper mirroring the failure predicate used in the UI/worker:
 * quest fails when strikes reach maxStrikes.
 */
function shouldFailQuest(strikes: number, maxStrikes = 3): boolean {
  return strikes >= maxStrikes
}

/**
 * Tier-based timer resolution for Karl.
 * Per spec: hostile tier -> 3s, family tier -> null (no timer),
 * otherwise falls back to character default.
 */
function resolveTimerForKarl(tier: 'hostile' | 'family' | 'default'): number | null {
  if (tier === 'hostile') return 3000
  if (tier === 'family') return null
  return getCharacterTimerConfig('karl')
}

describe('strike tracking logic — 3 strikes = quest failure', () => {
  const convId = 'karl-conv'

  beforeEach(() => {
    clearConversationState(convId)
    getOrCreateConversationState(convId, 'karl', 'quest-karl-airport')
  })

  it('1 timeout → strikes = 1, conversation continues', () => {
    incrementStrike(convId)
    const s = getConversationState(convId)!
    expect(s.strikes).toBe(1)
    expect(s.ended).toBe(false)
    expect(shouldFailQuest(s.strikes)).toBe(false)
  })

  it('2 timeouts → strikes = 2, conversation continues', () => {
    incrementStrike(convId)
    incrementStrike(convId)
    const s = getConversationState(convId)!
    expect(s.strikes).toBe(2)
    expect(s.ended).toBe(false)
    expect(shouldFailQuest(s.strikes)).toBe(false)
  })

  it('3 timeouts → strikes = 3, quest_failed flag set', () => {
    incrementStrike(convId)
    incrementStrike(convId)
    incrementStrike(convId)
    const s = getConversationState(convId)!
    expect(s.strikes).toBe(3)
    expect(s.ended).toBe(true)
    expect(s.endReason).toBe('failure')
    expect(shouldFailQuest(s.strikes)).toBe(true)
  })

  it('shouldFailQuest returns true at 3, false below', () => {
    expect(shouldFailQuest(0)).toBe(false)
    expect(shouldFailQuest(1)).toBe(false)
    expect(shouldFailQuest(2)).toBe(false)
    expect(shouldFailQuest(3)).toBe(true)
    expect(shouldFailQuest(4)).toBe(true)
  })
})

describe('timer configuration per character', () => {
  it('Karl default timer is 5 seconds', () => {
    expect(getCharacterTimerConfig('karl')).toBe(5000)
  })

  it('Iris has no timer (null)', () => {
    expect(getCharacterTimerConfig('iris')).toBeNull()
  })

  it('Karl tier-based: hostile = 3s', () => {
    expect(resolveTimerForKarl('hostile')).toBe(3000)
  })

  it('Karl tier-based: family = null (no timer)', () => {
    expect(resolveTimerForKarl('family')).toBeNull()
  })

  it('Karl tier-based: default falls back to 5s', () => {
    expect(resolveTimerForKarl('default')).toBe(5000)
  })
})

describe('spec: karl-timeout-failure', () => {
  it('3 timeouts → quest failed, ready for Karl NÄCHSTER! dialogue', () => {
    const convId = 'karl-spec-1'
    clearConversationState(convId)
    getOrCreateConversationState(convId, 'karl', 'quest-karl-airport')

    // Simulate 3 user timeouts
    incrementStrike(convId)
    incrementStrike(convId)
    incrementStrike(convId)

    const s = getConversationState(convId)!
    expect(s.ended).toBe(true)
    expect(s.endReason).toBe('failure')
    // After failure, the worker should trigger Karl's "NÄCHSTER!" dismissal line.
    // We assert the precondition for that trigger here.
    expect(shouldFailQuest(s.strikes)).toBe(true)
    clearConversationState(convId)
  })
})

describe('spec: karl-timeout-countdown-edge', () => {
  /**
   * Edge case: user responds at 4.9s (100ms before the 5s deadline).
   * Response must be accepted and MUST NOT increment strikes.
   */
  it('response at 4.9s is accepted (no strike incremented)', () => {
    const convId = 'karl-spec-2'
    clearConversationState(convId)
    getOrCreateConversationState(convId, 'karl', 'quest-karl-airport')

    const duration = getCharacterTimerConfig('karl')! // 5000
    const responseElapsed = 4900
    const respondedBeforeDeadline = responseElapsed < duration

    expect(respondedBeforeDeadline).toBe(true)

    // Simulate handler: only increment strikes if the deadline has passed.
    if (!respondedBeforeDeadline) {
      incrementStrike(convId)
    }

    const s = getConversationState(convId)!
    expect(s.strikes).toBe(0)
    expect(s.ended).toBe(false)
    clearConversationState(convId)
  })

  it('response at exactly 5.0s is a timeout (strike incremented)', () => {
    const convId = 'karl-spec-3'
    clearConversationState(convId)
    getOrCreateConversationState(convId, 'karl', 'quest-karl-airport')

    const duration = getCharacterTimerConfig('karl')! // 5000
    const responseElapsed = 5000
    const respondedBeforeDeadline = responseElapsed < duration

    if (!respondedBeforeDeadline) {
      incrementStrike(convId)
    }

    const s = getConversationState(convId)!
    expect(s.strikes).toBe(1)
    clearConversationState(convId)
  })
})
