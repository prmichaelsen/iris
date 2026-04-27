/**
 * Character System Types
 *
 * Defines the structure for multi-character conversations in Iris.
 * Each character has a unique personality, voice, and teaching specialty.
 */

export interface Character {
  /** Unique character identifier (e.g., 'iris', 'karl', 'mila') */
  id: string

  /** Display name */
  name: string

  /** Age (optional - Iris doesn't have one) */
  age?: number

  /** Region/location this character is associated with */
  region: string

  /** Personality description for system prompt */
  personality: string

  /** Teaching specialty or focus area */
  specialty: string

  /** ElevenLabs voice ID for TTS */
  voice_id: string

  /** Optional additional prompt instructions specific to this character */
  additional_instructions?: string
}

/**
 * Session state tracking for character switching
 */
export interface SessionCharacterState {
  /** Currently active character ID */
  active_character: string

  /** Currently active quest (if any) */
  active_quest: string | null

  /** Current region */
  current_region: string

  /** Active voice ID (synced with active_character) */
  active_voice_id: string
}
