/**
 * Character System Types
 *
 * Defines the structure for multi-character conversations in Iris.
 * Each character has a unique personality, voice, and teaching specialty.
 *
 * Canonical field names match the spec in
 * agent/specs/local.gamification-engagement-system.md (Character interface).
 */

export interface GradingWeights {
  comprehension: number
  fluency: number
  grammar: number
  vocabulary: number
  pronunciation: number
  confidence: number
  cultural_awareness: number
}

export interface DifficultyScaling {
  base_difficulty: number
  increases_with_relationship: boolean
  adaptive_vocabulary: boolean
  adaptive_grammar: boolean
}

export interface Character {
  /** Unique character identifier (e.g., 'iris', 'char_karl_baker', 'mila') */
  id: string

  /** Display name */
  name: string

  /** Age (optional - Iris doesn't have one) */
  age?: number

  /** Region ID this character is associated with (e.g., 'region_berlin', 'default') */
  region_id: string

  /** German profession/role */
  profession_de?: string

  /** English profession/role */
  profession_en?: string

  /** Personality description (used in system prompt) */
  personality: string

  /** Teaching specialty or focus area */
  specialty: string

  /** Language style descriptor (e.g., 'fast_berlin_dialect') */
  language_style?: string

  /** ElevenLabs voice ID for TTS */
  voice_id: string

  /** Descriptive voice traits (non-functional metadata) */
  voice_characteristics?: string[]

  /** Weighted grading preferences for Claude scoring */
  grading_weights?: GradingWeights

  /** Relationship tier thresholds (e.g., [20, 40, 60, 80, 100]) */
  tier_thresholds?: number[]

  /** Relationship tier names (e.g., ['hostile', 'cold', 'neutral', 'friendly', 'family']) */
  tier_names?: string[]

  /** Difficulty scaling behavior */
  difficulty_scaling?: DifficultyScaling

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
