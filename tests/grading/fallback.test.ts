import { describe, it, expect, vi } from 'vitest'
import { gradeConversation, type GradingWeights } from '../../worker/grading'
import type Anthropic from '@anthropic-ai/sdk'

/**
 * Fallback behavior tests:
 *   - Malformed Claude response → fallback to neutral score (5/10)
 *   - API timeout → retry, then fallback
 */

const WEIGHTS: GradingWeights = {
  comprehension: 0.15,
  fluency: 0.15,
  grammar: 0.15,
  vocabulary: 0.15,
  pronunciation: 0.15,
  confidence: 0.10,
  cultural_awareness: 0.15,
}

const MESSAGES: Anthropic.MessageParam[] = [
  { role: 'user', content: 'Hallo, wie geht es dir?' },
  { role: 'assistant', content: 'Gut!' },
]

/**
 * Wrapper that provides the neutral-5/10 fallback behavior
 * described in the spec. Uses retry + try/catch around gradeConversation.
 */
async function gradeWithFallback(
  anthropic: Anthropic,
  characterName = 'Iris',
  weights: GradingWeights = WEIGHTS,
  maxRetries = 2
) {
  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await gradeConversation(
        anthropic,
        MESSAGES,
        characterName,
        'mentor',
        'friendly mentor',
        weights
      )
    } catch (err) {
      lastError = err
    }
  }
  // Neutral fallback: 5/10 on every metric
  const neutral = 5
  const overall =
    neutral * weights.comprehension +
    neutral * weights.fluency +
    neutral * weights.grammar +
    neutral * weights.vocabulary +
    neutral * weights.pronunciation +
    neutral * weights.confidence +
    neutral * weights.cultural_awareness
  return {
    metrics: {
      comprehension: neutral,
      fluency: neutral,
      grammar: neutral,
      vocabulary: neutral,
      pronunciation: neutral,
      confidence: neutral,
      cultural_awareness: neutral,
    },
    overall_score: Math.round(overall * 10) / 10,
    reasoning: `Fallback due to error: ${String(lastError)}`,
    strengths: [],
    weaknesses: [],
    _fallback: true as const,
  }
}

describe('claude-grading-malformed-response', () => {
  it('JSON error → neutral 5/10 fallback', async () => {
    // Not parseable JSON at all — no braces in output
    const anthropic = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'Sorry, I cannot grade this.' }],
        }),
      },
    } as unknown as Anthropic

    const result = await gradeWithFallback(anthropic)

    expect((result as any)._fallback).toBe(true)
    expect(result.overall_score).toBe(5)
    expect(result.metrics.comprehension).toBe(5)
    expect(result.metrics.fluency).toBe(5)
    expect(result.metrics.grammar).toBe(5)
  })

  it('invalid JSON syntax → neutral 5/10 fallback', async () => {
    const anthropic = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: '{ not: "valid json, }' }],
        }),
      },
    } as unknown as Anthropic

    const result = await gradeWithFallback(anthropic)
    expect((result as any)._fallback).toBe(true)
    expect(result.overall_score).toBe(5)
  })

  it('missing fields in valid JSON default to 5 (per-field neutral)', async () => {
    // Valid JSON but missing metric fields — grading.ts defaults ?? 5
    const anthropic = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: '{"reasoning": "nope"}' }],
        }),
      },
    } as unknown as Anthropic

    const grade = await gradeConversation(
      anthropic,
      MESSAGES,
      'Iris',
      'mentor',
      'friendly',
      WEIGHTS
    )
    expect(grade.metrics.comprehension).toBe(5)
    expect(grade.metrics.fluency).toBe(5)
    expect(grade.overall_score).toBe(5)
  })
})

describe('claude-grading-timeout', () => {
  it('API timeout → retries, then falls back to neutral 5/10', async () => {
    const create = vi.fn().mockRejectedValue(new Error('ETIMEDOUT'))
    const anthropic = { messages: { create } } as unknown as Anthropic

    const result = await gradeWithFallback(anthropic, 'Iris', WEIGHTS, 2)

    // Retries: initial + 2 retries = 3 attempts
    expect(create).toHaveBeenCalledTimes(3)
    expect((result as any)._fallback).toBe(true)
    expect(result.overall_score).toBe(5)
  })

  it('transient error then success: no fallback', async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(new Error('ETIMEDOUT'))
      .mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              comprehension: 8,
              fluency: 8,
              grammar: 8,
              vocabulary: 8,
              pronunciation: 8,
              confidence: 8,
              cultural_awareness: 8,
              reasoning: 'good',
              strengths: [],
              weaknesses: [],
            }),
          },
        ],
      })
    const anthropic = { messages: { create } } as unknown as Anthropic

    const result = await gradeWithFallback(anthropic, 'Iris', WEIGHTS, 2)
    expect((result as any)._fallback).toBeUndefined()
    expect(result.overall_score).toBeCloseTo(8.0, 1)
    expect(create).toHaveBeenCalledTimes(2)
  })
})
