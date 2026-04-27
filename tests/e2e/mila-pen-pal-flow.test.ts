/**
 * End-to-end tests for the Mila pen pal flow.
 *
 * Uses an in-memory orchestrator that mirrors the production worker logic
 * using the real functions from worker/src/attention.ts + worker/src/letters.ts.
 * Claude API calls are mocked. This validates the SPEC-level behavior: unlock,
 * first-letter scheduling, gift delivery, attention decay, dormant pause, and
 * idempotent unlock on duplicate quest completion.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  calculateAttentionScore,
  scoreToFrequency,
} from '../../worker/src/attention'
import { generateLetter, determineOccasion } from '../../worker/src/letters'
import { mila } from '../../worker/characters/mila'

// --- In-memory test harness -------------------------------------------------

interface PenPalRecord {
  user_id: string
  character_id: string
  unlocked_at: number
  letters_sent: number
  letters_read: number
  last_interaction_at: string | null
}

interface LetterRecord {
  id: string
  user_id: string
  character_id: string
  content: string
  occasion: string
  gift?: { name_en: string; description_en: string }
  scheduled_for: number
  sent_at: number | null
}

interface NotificationRecord {
  user_id: string
  kind: string
  payload: Record<string, unknown>
}

interface CollectionRecord {
  user_id: string
  sticker_id: string
  acquired_at: number
}

class Store {
  penPals = new Map<string, PenPalRecord>()
  letters: LetterRecord[] = []
  notifications: NotificationRecord[] = []
  collection: CollectionRecord[] = []
  userActivity = new Map<string, number>() // user_id -> last-active epoch ms
  quests = new Map<string, Set<string>>() // user_id -> completed subquests

  key(u: string, c: string) {
    return `${u}:${c}`
  }
}

const MS_PER_DAY = 24 * 60 * 60 * 1000
const MAX_LETTERS_PER_WEEK = 3
const DORMANT_THRESHOLD_DAYS = 8

/** Mock Claude client */
function mockAnthropic(text = 'Liebe Freundin! — Mila') {
  const create = vi.fn().mockResolvedValue({ content: [{ type: 'text', text }] })
  return { messages: { create } } as any
}

/** Unlock a pen pal via quest completion. Idempotent by (user, character). */
function unlockPenPal(store: Store, user_id: string, character_id: string, subquest: string): { created: boolean } {
  const completed = store.quests.get(user_id) ?? new Set<string>()
  completed.add(subquest)
  store.quests.set(user_id, completed)

  const key = store.key(user_id, character_id)
  if (store.penPals.has(key)) {
    return { created: false }
  }
  store.penPals.set(key, {
    user_id,
    character_id,
    unlocked_at: Date.now(),
    letters_sent: 0,
    letters_read: 0,
    last_interaction_at: null,
  })
  // Schedule first letter within 24h
  const scheduled_for = Date.now() + Math.floor(Math.random() * 24) * 60 * 60 * 1000
  store.letters.push({
    id: `letter-${store.letters.length + 1}`,
    user_id,
    character_id,
    content: '',
    occasion: 'first_contact',
    scheduled_for,
    sent_at: null,
  })
  return { created: true }
}

/** Select pen pals eligible for a letter this week, cap 3 by attention score. */
function selectWeeklyLetters(store: Store, user_id: string): PenPalRecord[] {
  const pals = [...store.penPals.values()].filter((p) => p.user_id === user_id)
  const scored = pals.map((p) => ({
    pal: p,
    score: calculateAttentionScore({
      letters_sent: p.letters_sent,
      letters_read: p.letters_read,
      days_since_last: p.last_interaction_at
        ? Math.floor((Date.now() - new Date(p.last_interaction_at).getTime()) / MS_PER_DAY)
        : 0,
    }),
  }))
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_LETTERS_PER_WEEK)
    .map((s) => s.pal)
}

/** User activity-aware letter send. Pauses for dormant users. */
function isUserDormant(store: Store, user_id: string): boolean {
  const last = store.userActivity.get(user_id)
  if (!last) return false
  const days = (Date.now() - last) / MS_PER_DAY
  return days >= DORMANT_THRESHOLD_DAYS
}

async function sendLetter(
  store: Store,
  user_id: string,
  character_id: string,
  anthropic: any,
  gift?: { name_en: string; description_en: string; sticker_id: string },
) {
  if (isUserDormant(store, user_id)) return null

  const pal = store.penPals.get(store.key(user_id, character_id))!
  const occasion = determineOccasion(pal.letters_sent, !!gift)

  const content = await generateLetter(
    {
      pen_pal: {
        character_id: mila.id,
        name: mila.name,
        personality: mila.personality,
        topics: ['street art', 'Kreuzberg'],
      },
      occasion,
      gift: gift ? { name_en: gift.name_en, description_en: gift.description_en } : undefined,
    },
    anthropic,
  )

  const record: LetterRecord = {
    id: `letter-${store.letters.length + 1}`,
    user_id,
    character_id,
    content,
    occasion,
    gift: gift ? { name_en: gift.name_en, description_en: gift.description_en } : undefined,
    scheduled_for: Date.now(),
    sent_at: Date.now(),
  }
  store.letters.push(record)
  pal.letters_sent += 1
  pal.last_interaction_at = new Date().toISOString()

  if (gift) {
    store.collection.push({
      user_id,
      sticker_id: gift.sticker_id,
      acquired_at: Date.now(),
    })
    store.notifications.push({
      user_id,
      kind: 'gift_received',
      payload: { from: character_id, sticker_id: gift.sticker_id },
    })
  }

  return record
}

// --- Tests ------------------------------------------------------------------

describe('E2E: pen-pal-unlock', () => {
  let store: Store
  beforeEach(() => {
    store = new Store()
  })

  it('Tier-2 quest completion creates Mila pen pal and schedules first letter', () => {
    const result = unlockPenPal(store, 'u1', 'mila', 'mila_gallery_inspiration')
    expect(result.created).toBe(true)

    const pal = store.penPals.get('u1:mila')
    expect(pal).toBeDefined()
    expect(pal!.letters_sent).toBe(0)

    const scheduled = store.letters.filter((l) => l.user_id === 'u1' && l.character_id === 'mila')
    expect(scheduled).toHaveLength(1)
    expect(scheduled[0].occasion).toBe('first_contact')

    const hoursUntilSend = (scheduled[0].scheduled_for - pal!.unlocked_at) / (1000 * 60 * 60)
    expect(hoursUntilSend).toBeGreaterThanOrEqual(0)
    expect(hoursUntilSend).toBeLessThanOrEqual(24)
  })
})

describe('E2E: pen-pal-unlock-duplicate (idempotent)', () => {
  it('double-triggering quest completion does not create a duplicate record', () => {
    const store = new Store()
    const r1 = unlockPenPal(store, 'u1', 'mila', 'mila_gallery_inspiration')
    const r2 = unlockPenPal(store, 'u1', 'mila', 'mila_gallery_inspiration')

    expect(r1.created).toBe(true)
    expect(r2.created).toBe(false)
    expect(store.penPals.size).toBe(1)
    // Only one first-contact letter scheduled
    const first = store.letters.filter((l) => l.occasion === 'first_contact')
    expect(first).toHaveLength(1)
  })
})

describe('E2E: pen-pal-gift-delivery', () => {
  it('sticker gift attached → added to collection, notification sent', async () => {
    const store = new Store()
    const anthropic = mockAnthropic('Hier ist ein kleiner Sticker für dich! — Mila')
    unlockPenPal(store, 'u1', 'mila', 'mila_gallery_inspiration')
    // Simulate first letter already delivered so the next letter isn't first_contact
    store.penPals.get('u1:mila')!.letters_sent = 1

    const letter = await sendLetter(store, 'u1', 'mila', anthropic, {
      name_en: 'Kreuzberg Sticker',
      description_en: 'A sticker from a favorite wall',
      sticker_id: 'sticker_kreuzberg_01',
    })

    expect(letter).not.toBeNull()
    expect(letter!.occasion).toBe('gift_attached')
    expect(letter!.gift?.name_en).toBe('Kreuzberg Sticker')

    expect(store.collection).toHaveLength(1)
    expect(store.collection[0].sticker_id).toBe('sticker_kreuzberg_01')

    const notif = store.notifications.find((n) => n.kind === 'gift_received')
    expect(notif).toBeDefined()
    expect((notif!.payload as any).sticker_id).toBe('sticker_kreuzberg_01')
  })
})

describe('E2E: pen-pal-attention-decay', () => {
  it('30 days no activity → score ≤ 10 and 1/14 day frequency', () => {
    const score = calculateAttentionScore({
      letters_sent: 0,
      letters_read: 0,
      days_since_last: 30,
    })
    expect(score).toBeLessThanOrEqual(10)
    const f = scoreToFrequency(score)
    expect(f.min_days).toBe(14)
    expect(f.label).toBe('rare')
  })
})

describe('E2E: pen-pal-attention-increase', () => {
  it('10 sent + 15 read (=45 base) plus 10 pt engagement → 55 → regular (4-6 days)', () => {
    const base = calculateAttentionScore({
      letters_sent: 10,
      letters_read: 15,
      days_since_last: 0,
    })
    const score = base + 10
    expect(score).toBe(55)
    const f = scoreToFrequency(score)
    expect(f.min_days).toBe(4)
    expect(f.max_days).toBe(6)
  })
})

describe('E2E: max-letters-per-week-enforcement', () => {
  it('5 pen pals want letters → only top 3 by score are selected', () => {
    const store = new Store()
    const make = (id: string, sent: number, read: number) => {
      store.penPals.set(store.key('u1', id), {
        user_id: 'u1',
        character_id: id,
        unlocked_at: Date.now(),
        letters_sent: sent,
        letters_read: read,
        last_interaction_at: new Date().toISOString(),
      })
    }
    make('mila', 10, 15) // score 45
    make('karl', 8, 10) // score 34
    make('thomas', 5, 10) // score 25
    make('lena', 2, 3) // score 9
    make('klaus', 1, 1) // score 4

    const selected = selectWeeklyLetters(store, 'u1').map((p) => p.character_id)
    expect(selected).toHaveLength(3)
    expect(selected).toEqual(['mila', 'karl', 'thomas'])
  })
})

describe('E2E: dormant-user-letter-pause', () => {
  it('user inactive ≥ 8 days → no letters sent', async () => {
    const store = new Store()
    const anthropic = mockAnthropic()
    unlockPenPal(store, 'u1', 'mila', 'mila_gallery_inspiration')
    store.penPals.get('u1:mila')!.letters_sent = 1
    // Mark user as last active 10 days ago
    store.userActivity.set('u1', Date.now() - 10 * MS_PER_DAY)

    const result = await sendLetter(store, 'u1', 'mila', anthropic)
    expect(result).toBeNull()
    // No "sent" letters exist
    expect(store.letters.filter((l) => l.sent_at !== null)).toHaveLength(0)
  })

  it('active user (< 8 days) still receives letters', async () => {
    const store = new Store()
    const anthropic = mockAnthropic()
    unlockPenPal(store, 'u1', 'mila', 'mila_gallery_inspiration')
    store.penPals.get('u1:mila')!.letters_sent = 1
    store.userActivity.set('u1', Date.now() - 2 * MS_PER_DAY)

    const result = await sendLetter(store, 'u1', 'mila', anthropic)
    expect(result).not.toBeNull()
    expect(result!.sent_at).toBeTypeOf('number')
  })
})
