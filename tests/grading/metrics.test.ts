import { describe, it, expect, vi } from 'vitest'
import { gradeConversation, type GradingWeights } from '../../worker/grading'
import type Anthropic from '@anthropic-ai/sdk'

/**
 * Metrics tests: 7-metric scoring and weighted overall calculation.
 */

// Karl's weights emphasize fluency
const KARL_WEIGHTS: GradingWeights = {
  comprehension: 0.15,
  fluency: 0.25,
  grammar: 0.10,
  vocabulary: 0.15,
  pronunciation: 0.15,
  confidence: 0.10,
  cultural_awareness: 0.10,
}

function mockAnthropic(jsonPayload: object | string): Anthropic {
  const text = typeof jsonPayload === 'string' ? jsonPayload : JSON.stringify(jsonPayload)
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text }],
      }),
    },
  } as unknown as Anthropic
}

const baseMessages: Anthropic.MessageParam[] = [
  { role: 'user', content: 'Guten Tag, ich möchte Brot kaufen, bitte.' },
  { role: 'assistant', content: 'Natürlich!' },
  { role: 'user', content: 'Wie viel kostet das?' },
]

describe('grading metrics', () => {
  it('returns all 7 metrics from Claude response', async () => {
    const anthropic = mockAnthropic({
      comprehension: 8,
      fluency: 7,
      grammar: 9,
      vocabulary: 8,
      pronunciation: 7,
      confidence: 6,
      cultural_awareness: 9,
      reasoning: 'Solid work',
      strengths: ['grammar'],
      weaknesses: ['confidence'],
    })

    const grade = await gradeConversation(
      anthropic,
      baseMessages,
      'Karl',
      'baker',
      'Karl is a no-nonsense baker.',
      KARL_WEIGHTS
    )

    expect(grade.metrics.comprehension).toBe(8)
    expect(grade.metrics.fluency).toBe(7)
    expect(grade.metrics.grammar).toBe(9)
    expect(grade.metrics.vocabulary).toBe(8)
    expect(grade.metrics.pronunciation).toBe(7)
    expect(grade.metrics.confidence).toBe(6)
    expect(grade.metrics.cultural_awareness).toBe(9)
  })

  it('calculates weighted overall score correctly', async () => {
    const anthropic = mockAnthropic({
      comprehension: 10,
      fluency: 10,
      grammar: 10,
      vocabulary: 10,
      pronunciation: 10,
      confidence: 10,
      cultural_awareness: 10,
      reasoning: 'perfect',
      strengths: [],
      weaknesses: [],
    })

    const grade = await gradeConversation(
      anthropic,
      baseMessages,
      'Karl',
      'baker',
      'baker',
      KARL_WEIGHTS
    )

    // 10 * (sum of weights 1.0) = 10
    expect(grade.overall_score).toBe(10)
  })

  it('weighted average reflects weight emphasis (Karl fluency 25%)', async () => {
    const anthropic = mockAnthropic({
      comprehension: 5,
      fluency: 10, // maxed
      grammar: 5,
      vocabulary: 5,
      pronunciation: 5,
      confidence: 5,
      cultural_awareness: 5,
      reasoning: '',
      strengths: [],
      weaknesses: [],
    })

    const grade = await gradeConversation(
      anthropic,
      baseMessages,
      'Karl',
      'baker',
      'baker',
      KARL_WEIGHTS
    )

    // 5*0.75 + 10*0.25 = 3.75 + 2.5 = 6.25
    expect(grade.overall_score).toBeCloseTo(6.25, 1)
  })

  it('rounds overall score to 1 decimal place', async () => {
    const anthropic = mockAnthropic({
      comprehension: 7,
      fluency: 8,
      grammar: 6,
      vocabulary: 7,
      pronunciation: 8,
      confidence: 6,
      cultural_awareness: 7,
      reasoning: '',
      strengths: [],
      weaknesses: [],
    })

    const grade = await gradeConversation(
      anthropic,
      baseMessages,
      'Karl',
      'baker',
      'baker',
      KARL_WEIGHTS
    )

    // Ensure at most 1 decimal place
    const decimals = (grade.overall_score.toString().split('.')[1] ?? '').length
    expect(decimals).toBeLessThanOrEqual(1)
  })

  it('handles empty user transcript with zeros', async () => {
    const anthropic = mockAnthropic({})
    const grade = await gradeConversation(
      anthropic,
      [{ role: 'assistant', content: 'Hallo!' }],
      'Karl',
      'baker',
      'baker',
      KARL_WEIGHTS
    )

    expect(grade.overall_score).toBe(0)
    expect(grade.metrics.comprehension).toBe(0)
    expect(grade.weaknesses).toContain('Did not speak')
  })
})
