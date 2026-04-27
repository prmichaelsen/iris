import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { mila } from '../../worker/characters/mila'

describe('Mila character definition', () => {
  it('loads with correct id, name, and age', () => {
    expect(mila.id).toBe('mila')
    expect(mila.name).toBe('Mila')
    expect(mila.age).toBe(27)
  })

  it('has Berlin region and creative specialty', () => {
    expect(mila.region).toBe('berlin')
    expect(mila.specialty).toMatch(/creative/i)
  })

  it('uses the Bella ElevenLabs voice id', () => {
    expect(mila.voice_id).toBe('EXAVITQu4vr4xnSDxMaL')
  })

  it('includes additional instructions describing her personality', () => {
    expect(mila.additional_instructions).toBeDefined()
    expect(mila.additional_instructions).toMatch(/street art/i)
    expect(mila.additional_instructions).toMatch(/Berlin/i)
  })
})

describe('Mila grading weights (from seed)', () => {
  // grading_weights are stored in the seed SQL, not the TS source.
  const seedPath = join(process.cwd(), 'db', 'seeds', '003_characters.sql')
  const seed = readFileSync(seedPath, 'utf-8')

  // Extract the Mila row and its grading_weights JSON (wrapped in single quotes in SQL).
  const milaBlockMatch = seed.match(/'char_mila'[\s\S]*?'(\{[^']*vocabulary[^']*\})'\s*\)/)
  const weights = milaBlockMatch ? JSON.parse(milaBlockMatch[1]) : null

  it('parses grading_weights JSON from seed', () => {
    expect(weights).not.toBeNull()
  })

  it('matches the spec weights', () => {
    expect(weights.vocabulary).toBeCloseTo(0.25, 5)
    expect(weights.cultural_awareness).toBeCloseTo(0.15, 5)
    expect(weights.grammar).toBeCloseTo(0.2, 5)
    expect(weights.comprehension).toBeCloseTo(0.15, 5)
    expect(weights.fluency).toBeCloseTo(0.15, 5)
    expect(weights.confidence).toBeCloseTo(0.1, 5)
  })

  it('weights sum to 1.0', () => {
    const sum = Object.values(weights).reduce((a: number, b: any) => a + b, 0)
    expect(sum).toBeCloseTo(1.0, 5)
  })

  it('unlocks via mila_gallery_inspiration tier-2 quest', () => {
    const unlockMatch = seed.match(/'char_mila'[\s\S]*?'(\{[^}]*mila_gallery_inspiration[^}]*\})'/)
    expect(unlockMatch).not.toBeNull()
    const unlock = JSON.parse(unlockMatch![1])
    expect(unlock.tier).toBe(2)
    expect(unlock.subquest).toBe('mila_gallery_inspiration')
  })
})
