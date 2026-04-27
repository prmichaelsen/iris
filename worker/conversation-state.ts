/**
 * Conversation state tracking for quest mechanics
 * Tracks strikes, timeouts, and other per-conversation ephemeral state
 */

export interface ConversationState {
  /** Conversation ID */
  conversationId: string

  /** Number of strikes accumulated in this conversation */
  strikes: number

  /** Maximum strikes before failure (default: 3) */
  maxStrikes: number

  /** Timestamp of last user response (for timeout detection) */
  lastUserResponseAt: number | null

  /** Whether the conversation has ended (quest complete or failed) */
  ended: boolean

  /** End reason if ended */
  endReason?: 'success' | 'failure' | 'timeout' | 'cancelled'

  /** Active character ID */
  activeCharacterId: string

  /** Active quest ID if in quest mode */
  activeQuestId?: string
}

/**
 * In-memory conversation state store
 * Lives for the lifetime of the WebSocket connection
 */
const conversationStates = new Map<string, ConversationState>()

/**
 * Initialize or get conversation state
 */
export function getOrCreateConversationState(
  conversationId: string,
  activeCharacterId: string,
  activeQuestId?: string,
): ConversationState {
  let state = conversationStates.get(conversationId)

  if (!state) {
    state = {
      conversationId,
      strikes: 0,
      maxStrikes: 3,
      lastUserResponseAt: null,
      ended: false,
      activeCharacterId,
      activeQuestId,
    }
    conversationStates.set(conversationId, state)
  }

  return state
}

/**
 * Increment strikes for timeout
 * Returns the updated state
 */
export function incrementStrike(conversationId: string): ConversationState | null {
  const state = conversationStates.get(conversationId)
  if (!state) return null

  state.strikes++

  // Check if max strikes reached
  if (state.strikes >= state.maxStrikes) {
    state.ended = true
    state.endReason = 'failure'
  }

  return state
}

/**
 * Reset strikes (e.g., after successful interaction)
 */
export function resetStrikes(conversationId: string): void {
  const state = conversationStates.get(conversationId)
  if (state) {
    state.strikes = 0
  }
}

/**
 * Mark conversation as ended
 */
export function endConversation(
  conversationId: string,
  reason: 'success' | 'failure' | 'timeout' | 'cancelled',
): void {
  const state = conversationStates.get(conversationId)
  if (state) {
    state.ended = true
    state.endReason = reason
  }
}

/**
 * Update last user response timestamp
 */
export function recordUserResponse(conversationId: string): void {
  const state = conversationStates.get(conversationId)
  if (state) {
    state.lastUserResponseAt = Date.now()
  }
}

/**
 * Get conversation state
 */
export function getConversationState(conversationId: string): ConversationState | null {
  return conversationStates.get(conversationId) || null
}

/**
 * Clear conversation state (when conversation ends or resets)
 */
export function clearConversationState(conversationId: string): void {
  conversationStates.delete(conversationId)
}

/**
 * Get character timer config (duration in ms)
 * Returns null if character doesn't use timers
 */
export function getCharacterTimerConfig(characterId: string): number | null {
  // Karl uses 5-second timer
  if (characterId === 'karl') {
    return 5000
  }

  // Other characters don't have timers (yet)
  return null
}

/**
 * Check if character uses timer pressure
 */
export function characterUsesTimer(characterId: string): boolean {
  return getCharacterTimerConfig(characterId) !== null
}
