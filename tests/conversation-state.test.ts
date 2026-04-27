import { describe, it, expect, beforeEach } from 'vitest'
import {
  getOrCreateConversationState,
  incrementStrike,
  resetStrikes,
  endConversation,
  recordUserResponse,
  getConversationState,
  clearConversationState,
  getCharacterTimerConfig,
  characterUsesTimer,
} from '../worker/conversation-state'

describe('conversation-state', () => {
  const convId = 'test-conv-1'

  beforeEach(() => {
    clearConversationState(convId)
    clearConversationState('karl-conv')
    clearConversationState('iris-conv')
    clearConversationState('missing-conv')
  })

  describe('init / getOrCreateConversationState', () => {
    it('creates state with 0 strikes', () => {
      const s = getOrCreateConversationState(convId, 'karl')
      expect(s.strikes).toBe(0)
      expect(s.maxStrikes).toBe(3)
      expect(s.ended).toBe(false)
      expect(s.activeCharacterId).toBe('karl')
      expect(s.lastUserResponseAt).toBeNull()
    })

    it('returns same state on re-init for same conversation', () => {
      const s1 = getOrCreateConversationState(convId, 'karl')
      s1.strikes = 2
      const s2 = getOrCreateConversationState(convId, 'karl')
      expect(s2.strikes).toBe(2)
      expect(s1).toBe(s2)
    })

    it('stores active quest id when provided', () => {
      const s = getOrCreateConversationState(convId, 'karl', 'quest-abc')
      expect(s.activeQuestId).toBe('quest-abc')
    })
  })

  describe('incrementStrike', () => {
    it('adds 1 strike', () => {
      getOrCreateConversationState(convId, 'karl')
      const s = incrementStrike(convId)!
      expect(s.strikes).toBe(1)
      expect(s.ended).toBe(false)
    })

    it('returns null for unknown conversation', () => {
      expect(incrementStrike('missing-conv')).toBeNull()
    })

    it('1 strike: conversation continues', () => {
      getOrCreateConversationState(convId, 'karl')
      const s = incrementStrike(convId)!
      expect(s.strikes).toBe(1)
      expect(s.ended).toBe(false)
    })

    it('2 strikes: conversation continues', () => {
      getOrCreateConversationState(convId, 'karl')
      incrementStrike(convId)
      const s = incrementStrike(convId)!
      expect(s.strikes).toBe(2)
      expect(s.ended).toBe(false)
    })

    it('3 strikes: quest fails, ended=true, endReason=failure', () => {
      getOrCreateConversationState(convId, 'karl')
      incrementStrike(convId)
      incrementStrike(convId)
      const s = incrementStrike(convId)!
      expect(s.strikes).toBe(3)
      expect(s.ended).toBe(true)
      expect(s.endReason).toBe('failure')
    })
  })

  describe('getConversationState (getStrikes equivalent)', () => {
    it('returns current strike count', () => {
      getOrCreateConversationState(convId, 'karl')
      incrementStrike(convId)
      incrementStrike(convId)
      expect(getConversationState(convId)!.strikes).toBe(2)
    })

    it('returns null for unknown conversation', () => {
      expect(getConversationState('missing-conv')).toBeNull()
    })
  })

  describe('resetStrikes', () => {
    it('resets strikes back to 0', () => {
      getOrCreateConversationState(convId, 'karl')
      incrementStrike(convId)
      incrementStrike(convId)
      resetStrikes(convId)
      expect(getConversationState(convId)!.strikes).toBe(0)
    })
  })

  describe('endConversation', () => {
    it('marks ended with given reason', () => {
      getOrCreateConversationState(convId, 'karl')
      endConversation(convId, 'success')
      const s = getConversationState(convId)!
      expect(s.ended).toBe(true)
      expect(s.endReason).toBe('success')
    })
  })

  describe('recordUserResponse', () => {
    it('sets lastUserResponseAt to a timestamp', () => {
      getOrCreateConversationState(convId, 'karl')
      const before = Date.now()
      recordUserResponse(convId)
      const after = Date.now()
      const t = getConversationState(convId)!.lastUserResponseAt!
      expect(t).toBeGreaterThanOrEqual(before)
      expect(t).toBeLessThanOrEqual(after)
    })
  })

  describe('clearConversationState', () => {
    it('removes the stored state entirely', () => {
      getOrCreateConversationState(convId, 'karl')
      clearConversationState(convId)
      expect(getConversationState(convId)).toBeNull()
    })
  })

  describe('timer configuration per character', () => {
    it('Karl default: 5000ms', () => {
      expect(getCharacterTimerConfig('karl')).toBe(5000)
      expect(characterUsesTimer('karl')).toBe(true)
    })

    it('Iris default: null (no timer)', () => {
      expect(getCharacterTimerConfig('iris')).toBeNull()
      expect(characterUsesTimer('iris')).toBe(false)
    })

    it('unknown character: null', () => {
      expect(getCharacterTimerConfig('unknown-char')).toBeNull()
      expect(characterUsesTimer('unknown-char')).toBe(false)
    })
  })
})
