import { describe, it, expect } from 'vitest'
import {
  getCharacter,
  getAllCharacters,
  characterExists,
} from '../../worker/characters'

describe('character registry', () => {
  it('getCharacter("iris") returns the Iris definition', () => {
    const iris = getCharacter('iris')
    expect(iris).toBeDefined()
    expect(iris?.id).toBe('iris')
    expect(iris?.name).toBe('Iris')
    expect(iris?.voice_id).toBeTruthy()
  })

  it('getCharacter("nonexistent") returns undefined', () => {
    expect(getCharacter('nonexistent')).toBeUndefined()
    expect(getCharacter('')).toBeUndefined()
  })

  it('getAllCharacters() returns an array of all registered characters', () => {
    const all = getAllCharacters()
    expect(Array.isArray(all)).toBe(true)
    expect(all.length).toBeGreaterThanOrEqual(1)
    const ids = all.map((c) => c.id)
    expect(ids).toContain('iris')
  })

  it('characterExists("iris") returns true', () => {
    expect(characterExists('iris')).toBe(true)
  })

  it('characterExists for unknown id returns false', () => {
    expect(characterExists('karl')).toBe(false)
    expect(characterExists('nonexistent')).toBe(false)
  })
})
