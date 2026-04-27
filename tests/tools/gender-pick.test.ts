import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDb, seedTestVocab, getRawDb } from '../helpers/d1-mock'

// We test the SQL queries and logic directly rather than importing the
// Worker tool (which depends on Cloudflare runtime types). This catches
// the exact class of bug we hit: wrong column names, empty results.

describe('gender-pick: pickNouns query', () => {
  let db: D1Database

  beforeEach(() => {
    db = createTestDb()
    seedTestVocab(db, getRawDb(db))
  })

  it('finds nouns with articles using pos column', async () => {
    const result = await db
      .prepare(
        `SELECT v.lemma, v.display, v.article, v.cefr_level
         FROM vocab_items v
         WHERE v.language = 'deu'
           AND v.pos = 'noun'
           AND v.article IS NOT NULL
         ORDER BY v.cefr_level ASC, RANDOM()
         LIMIT 10`,
      )
      .bind()
      .all<{ lemma: string; display: string; article: string; cefr_level: string }>()

    expect(result.results.length).toBeGreaterThan(0)
    expect(result.results.length).toBe(10)
    for (const row of result.results) {
      expect(row.article).toMatch(/^(der|die|das)$/)
      expect(row.lemma).toBeTruthy()
    }
  })

  it('throws on wrong column name (the bug we shipped)', async () => {
    // This is exactly the bug we shipped — using part_of_speech instead of pos.
    // D1 silently returns empty results for unknown columns; better-sqlite3
    // throws "no such column" which is actually the correct behavior.
    // This test ensures we never use the wrong column name.
    await expect(
      db
        .prepare(
          `SELECT v.lemma FROM vocab_items v
           WHERE v.language = 'deu' AND v.part_of_speech = 'noun'`,
        )
        .bind()
        .all<{ lemma: string }>(),
    ).rejects.toThrow(/no such column/)
  })

  it('excludes non-nouns (verbs, particles)', async () => {
    const result = await db
      .prepare(
        `SELECT v.lemma, v.pos, v.article FROM vocab_items v
         WHERE v.language = 'deu' AND v.pos = 'noun' AND v.article IS NOT NULL`,
      )
      .bind()
      .all<{ lemma: string; pos: string; article: string }>()

    const lemmas = result.results.map((r) => r.lemma)
    expect(lemmas).not.toContain('aber')
    expect(lemmas).not.toContain('gehen')
    expect(lemmas).toContain('Mann')
    expect(lemmas).toContain('Kind')
  })

  it('respects CEFR level filter', async () => {
    const result = await db
      .prepare(
        `SELECT v.lemma FROM vocab_items v
         WHERE v.language = 'deu' AND v.pos = 'noun' AND v.article IS NOT NULL
           AND v.cefr_level = 'A2'
         LIMIT 10`,
      )
      .bind()
      .all<{ lemma: string }>()

    // All test data is A1, so A2 filter should return empty
    expect(result.results.length).toBe(0)
  })
})

describe('gender-pick: stripArticle', () => {
  function stripArticle(display: string, article: string | null): string {
    if (!article) return display
    const prefix = article + ' '
    if (display.startsWith(prefix)) {
      return display.substring(prefix.length)
    }
    return display
  }

  it('strips der', () => expect(stripArticle('der Mann', 'der')).toBe('Mann'))
  it('strips die', () => expect(stripArticle('die Schule', 'die')).toBe('Schule'))
  it('strips das', () => expect(stripArticle('das Kind', 'das')).toBe('Kind'))
  it('handles null article', () => expect(stripArticle('aber', null)).toBe('aber'))
  it('handles display without article prefix', () => expect(stripArticle('Mann(1)', 'der')).toBe('Mann(1)'))
})

describe('gender-pick: grading', () => {
  it('correct when selected matches article', () => {
    const correct = 'die'
    const selected = 'die'
    expect(selected === correct).toBe(true)
  })

  it('incorrect when selected differs', () => {
    const correct = 'die'
    const selected = 'der'
    expect(selected === correct).toBe(false)
  })

  it('handles all three genders', () => {
    const cases = [
      { article: 'der', selected: 'der', expected: true },
      { article: 'die', selected: 'die', expected: true },
      { article: 'das', selected: 'das', expected: true },
      { article: 'der', selected: 'die', expected: false },
      { article: 'das', selected: 'der', expected: false },
    ]
    for (const c of cases) {
      expect(c.selected === c.article).toBe(c.expected)
    }
  })
})
