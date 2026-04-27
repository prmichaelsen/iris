/**
 * Attention Score Calculation
 *
 * Calculates how frequently pen pals send letters based on user engagement.
 * Higher attention score = more frequent letters.
 *
 * Formula (per spec R12):
 *   (letters_sent * 3) + (letters_read * 1) + (recommendations_engaged * 2) - (days_since_last * 0.5)
 *
 * Score ranges map to letter frequency:
 * - <10: 1 letter every 14 days
 * - 10-30: 1 letter every 7-10 days
 * - 30-60: 1 letter every 4-6 days
 * - 60-100: 1 letter every 2-4 days
 * - 100+: 1 letter every 1-3 days
 *
 * Max 3 letters/week across all pen pals enforced externally.
 */

export interface AttentionScoreInput {
  /** Number of letters user has sent to this pen pal */
  letters_sent: number

  /** Number of letters user has read from this pen pal */
  letters_read: number

  /**
   * Number of recommendations (books/films/music) the user has engaged with.
   * Weighted 2x per spec R12. Defaults to 0 when no engagement-tracking
   * table exists yet (M10 placeholder; full tracking lands with M11).
   */
  engaged_count?: number

  /** Days since last interaction (letter sent or read) */
  days_since_last: number
}

export interface LetterFrequency {
  /** Minimum days between letters */
  min_days: number

  /** Maximum days between letters */
  max_days: number

  /** Descriptive label for this frequency */
  label: string
}

/**
 * Calculate attention score for a pen pal relationship
 *
 * @param input - Engagement metrics
 * @returns Attention score (0-infinity, typically 0-150)
 */
export function calculateAttentionScore(input: AttentionScoreInput): number {
  const { letters_sent, letters_read, days_since_last } = input
  const engaged_count = input.engaged_count ?? 0

  // Formula (spec R12): engagement gains - recency penalty
  const score =
    (letters_sent * 3) +
    (letters_read * 1) +
    (engaged_count * 2) -
    (days_since_last * 0.5)

  // Floor at 0 (negative scores don't make sense)
  return Math.max(0, score)
}

/**
 * Map attention score to letter frequency range
 *
 * @param score - Attention score from calculateAttentionScore
 * @returns Frequency range and label
 */
export function scoreToFrequency(score: number): LetterFrequency {
  if (score < 10) {
    return { min_days: 14, max_days: 14, label: 'rare' }
  }
  if (score < 30) {
    return { min_days: 7, max_days: 10, label: 'occasional' }
  }
  if (score < 60) {
    return { min_days: 4, max_days: 6, label: 'regular' }
  }
  if (score < 100) {
    return { min_days: 2, max_days: 4, label: 'frequent' }
  }
  // 100+
  return { min_days: 1, max_days: 3, label: 'very_frequent' }
}

/**
 * Determine if it's time to send a new letter
 *
 * @param score - Current attention score
 * @param days_since_last_letter - Days since pen pal last sent a letter
 * @returns True if a letter should be sent
 */
export function shouldSendLetter(score: number, days_since_last_letter: number): boolean {
  const freq = scoreToFrequency(score)

  // Use random value within the frequency range for natural variation
  const targetDays = freq.min_days + Math.random() * (freq.max_days - freq.min_days)

  return days_since_last_letter >= targetDays
}

/**
 * Calculate days since last interaction from timestamp
 *
 * @param last_interaction_at - ISO timestamp of last interaction
 * @returns Days elapsed (rounded down)
 */
export function daysSince(last_interaction_at: string | null): number {
  if (!last_interaction_at) {
    return 999 // Large number if never interacted
  }

  const lastDate = new Date(last_interaction_at)
  const now = new Date()
  const diffMs = now.getTime() - lastDate.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  return Math.floor(diffDays)
}
