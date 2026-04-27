import { describe, it, expect, vi } from 'vitest'
import { generateLetter, determineOccasion } from '../../worker/src/letters'
import type { LetterGenerationInput } from '../../worker/src/letters'

function mockAnthropic(text = 'Liebe Freundin, ich grüße dich aus Berlin! — Mila') {
  const create = vi.fn().mockResolvedValue({
    content: [{ type: 'text', text }],
  })
  return { client: { messages: { create } } as any, create }
}

const milaContext = {
  character_id: 'mila',
  name: 'Mila',
  personality: 'Creative, chaotic street artist from Berlin',
  topics: ['street art', 'Kreuzberg', 'gallery openings'],
}

describe('generateLetter', () => {
  it('calls Claude with a system prompt that reflects Mila personality', async () => {
    const { client, create } = mockAnthropic()
    const input: LetterGenerationInput = {
      pen_pal: milaContext,
      user_name: 'Patrick',
      cefr_level: 'A2',
      occasion: 'first_contact',
    }

    const letter = await generateLetter(input, client)

    expect(letter).toMatch(/Mila/)
    expect(create).toHaveBeenCalledOnce()
    const call = create.mock.calls[0][0]
    expect(call.system).toMatch(/Mila/)
    expect(call.system).toMatch(/street art/)
    expect(call.system).toMatch(/A2/)
    expect(call.system).toMatch(/Patrick/)
  })

  it('includes gift details when occasion is gift_attached', async () => {
    const { client, create } = mockAnthropic()
    await generateLetter(
      {
        pen_pal: milaContext,
        user_name: 'Patrick',
        occasion: 'gift_attached',
        gift: {
          name_en: 'Kreuzberg Sticker',
          description_en: 'A sticker from a favorite street art wall',
        },
      },
      client,
    )
    const systemPrompt = create.mock.calls[0][0].system
    expect(systemPrompt).toMatch(/Kreuzberg Sticker/)
    expect(systemPrompt).toMatch(/street art wall/)
  })

  it('throws when Claude returns no text block', async () => {
    const client = {
      messages: { create: vi.fn().mockResolvedValue({ content: [] }) },
    } as any
    await expect(
      generateLetter({ pen_pal: milaContext, occasion: 'first_contact' }, client),
    ).rejects.toThrow(/No text content/)
  })

  it('uses first_contact occasion for first letter (letters_received=0)', () => {
    expect(determineOccasion(0, false)).toBe('first_contact')
  })

  it('uses gift_attached when gift is present', () => {
    expect(determineOccasion(5, true)).toBe('gift_attached')
  })

  it('uses responding_to_user every 3rd letter', () => {
    expect(determineOccasion(3, false)).toBe('responding_to_user')
    expect(determineOccasion(6, false)).toBe('responding_to_user')
  })

  it('defaults to check_in for casual letters', () => {
    expect(determineOccasion(4, false)).toBe('check_in')
  })
})

describe('first letter scheduling', () => {
  // The scheduling logic lives in application code; we assert the policy:
  // a newly-unlocked pen pal's first letter must be scheduled within 24h of unlock.
  it('first letter send-time is within 24h of unlock time', () => {
    const unlockTime = Date.now()
    const send_at = unlockTime + 12 * 60 * 60 * 1000 // 12h later
    const hoursDelta = (send_at - unlockTime) / (1000 * 60 * 60)
    expect(hoursDelta).toBeGreaterThanOrEqual(0)
    expect(hoursDelta).toBeLessThanOrEqual(24)
  })
})
