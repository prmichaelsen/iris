import type { Character } from './types'
import { iris } from './iris'

/**
 * Character Registry
 *
 * Central repository for all available characters.
 * Future characters (Karl, Mila, etc.) will be added here.
 */

const characters = new Map<string, Character>([
  ['iris', iris],
  // Future characters:
  // ['karl', karl],
  // ['mila', mila],
  // ['lena', lena],
  // ['thomas', thomas],
  // ['klaus', klaus],
  // ['emma', emma],
])

/**
 * Get a character by ID
 *
 * @param id - Character identifier (e.g., 'iris', 'karl')
 * @returns Character definition, or undefined if not found
 */
export function getCharacter(id: string): Character | undefined {
  return characters.get(id)
}

/**
 * Get all available characters
 *
 * @returns Array of all registered characters
 */
export function getAllCharacters(): Character[] {
  return Array.from(characters.values())
}

/**
 * Check if a character exists
 *
 * @param id - Character identifier
 * @returns True if character is registered
 */
export function characterExists(id: string): boolean {
  return characters.has(id)
}

// Re-export types
export type { Character, SessionCharacterState } from './types'
