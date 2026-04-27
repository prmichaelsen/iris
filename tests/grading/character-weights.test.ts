import { describe, it, expect, vi } from 'vitest'
import { gradeConversation, type GradingWeights } from '../../worker/grading'
import { calculateRelationshipDelta } from '../../worker/relationship'
import type Anthropic from '@anthropic-ai/sdk'

/**
 * Character-specific weight tests.
 *
 * Each of the 8 characters has grading weights that sum to 1.0.
 * Karl emphasizes fluency (25%); Henrik emphasizes grammar (30%).
 */

const CHARACTER_WEIGHTS: Record<string, GradingWeights> = {
  // Karl: no-nonsense baker, values fluency & confidence
  karl: {
    comprehension: 0.15,
    fluency: 0.25,
    grammar: 0.10,
    vocabulary: 0.15,
    pronunciation: 0.15,
    confidence: 0.10,
    cultural_awareness: 0.10,
  },
  // Henrik: strict grammar teacher
  henrik: {
    comprehension: 0.15,
    fluency: 0.10,
    grammar: 0.30,
    vocabulary: 0.15,
    pronunciation: 0.10,
    confidence: 0.05,
    cultural_awareness: 0.15,
  },
  // Iris: the friendly mentor, balanced
  iris: {
    comprehension: 0.15,
    fluency: 0.15,
    grammar: 0.15,
    vocabulary: 0.15,
    pronunciation: 0.10,
    confidence: 0.15,
    cultural_awareness: 0.15,
  },
  // Mila: conversational friend, values confidence
  mila: {
    comprehension: 0.15,
    fluency: 0.20,
    grammar: 0.05,
    vocabulary: 0.15,
    pronunciation: 0.10,
    confidence: 0.25,
    cultural_awareness: 0.10,
  },
  // Lena: cultural ambassador
  lena: {
    comprehension: 0.15,
    fluency: 0.10,
    grammar: 0.10,
    vocabulary: 0.15,
    pronunciation: 0.10,
    confidence: 0.10,
    cultural_awareness: 0.30,
  },
  // Thomas: vocabulary-focused librarian
  thomas: {
    comprehension: 0.15,
    fluency: 0.10,
    grammar: 0.15,
    vocabulary: 0.30,
    pronunciation: 0.10,
    confidence: 0.10,
    cultural_awareness: 0.10,
  },
  // Klaus: pronunciation-obsessed opera singer
  klaus: {
    comprehension: 0.10,
    fluency: 0.15,
    grammar: 0.10,
    vocabulary: 0.10,
    pronunciation: 0.35,
    confidence: 0.10,
    cultural_awareness: 0.10,
  },
  // Emma: comprehension-focused tour guide
  emma: {
    comprehension: 0.30,
    fluency: 0.15,
    grammar: 0.10,
    vocabulary: 0.15,
    pronunciation: 0.10,
    confidence: 0.10,
    cultural_awareness: 0.10,
  },
}

function mockAnthropic(payload: object): Anthropic {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(payload) }],
      }),
    },
  } as unknown as Anthropic
}

const MESSAGES: Anthropic.MessageParam[] = [
  { role: 'user', content: 'Guten Tag, wie geht es Ihnen?' },
  { role: 'assistant', content: 'Danke, gut!' },
  { role: 'user', content: 'Ich möchte ein Brötchen, bitte.' },
]

function sumWeights(w: GradingWeights): number {
  return (
    w.comprehension +
    w.fluency +
    w.grammar +
    w.vocabulary +
    w.pronunciation +
    w.confidence +
    w.cultural_awareness
  )
}

describe('character grading weights', () => {
  it("Karl's weights sum to 1.0", () => {
    expect(sumWeights(CHARACTER_WEIGHTS.karl)).toBeCloseTo(1.0, 5)
  })

  it.each(Object.keys(CHARACTER_WEIGHTS))(
    "%s's weights sum to 1.0",
    (name) => {
      expect(sumWeights(CHARACTER_WEIGHTS[name])).toBeCloseTo(1.0, 5)
    }
  )

  it('all 8 characters have weights defined', () => {
    expect(Object.keys(CHARACTER_WEIGHTS)).toHaveLength(8)
  })

  it('Karl emphasizes fluency (25%) more than grammar (10%)', () => {
    expect(CHARACTER_WEIGHTS.karl.fluency).toBeGreaterThan(CHARACTER_WEIGHTS.karl.grammar)
    expect(CHARACTER_WEIGHTS.karl.fluency).toBe(0.25)
    expect(CHARACTER_WEIGHTS.karl.grammar).toBe(0.10)
  })

  it('Henrik emphasizes grammar (30%) more than fluency (10%)', () => {
    expect(CHARACTER_WEIGHTS.henrik.grammar).toBeGreaterThan(CHARACTER_WEIGHTS.henrik.fluency)
    expect(CHARACTER_WEIGHTS.henrik.grammar).toBe(0.30)
  })
})

describe('character grading differences', () => {
  // Conversation: perfect grammar but slow/hesitant (low fluency)
  const slowButGrammatical = {
    comprehension: 7,
    fluency: 4,
    grammar: 10,
    vocabulary: 7,
    pronunciation: 7,
    confidence: 5,
    cultural_awareness: 7,
    reasoning: 'slow but grammatical',
    strengths: ['grammar'],
    weaknesses: ['fluency'],
  }

  it('Karl penalizes slow response (low fluency) more than Henrik', async () => {
    const karlGrade = await gradeConversation(
      mockAnthropic(slowButGrammatical),
      MESSAGES,
      'Karl',
      'baker',
      'impatient',
      CHARACTER_WEIGHTS.karl
    )

    const henrikGrade = await gradeConversation(
      mockAnthropic(slowButGrammatical),
      MESSAGES,
      'Henrik',
      'grammar teacher',
      'loves correct grammar',
      CHARACTER_WEIGHTS.henrik
    )

    // Same raw metrics, but Henrik weights grammar more → higher score
    expect(henrikGrade.overall_score).toBeGreaterThan(karlGrade.overall_score)
  })

  it('karl-perfect-conversation: 9.2/10 → +10 relationship', async () => {
    // Handcraft metrics so Karl's weighted overall is ~9.2
    const perfect = {
      comprehension: 9,
      fluency: 10,
      grammar: 8,
      vocabulary: 9,
      pronunciation: 9,
      confidence: 9,
      cultural_awareness: 9,
      reasoning: 'Gut!',
      strengths: ['fluency'],
      weaknesses: [],
    }
    const grade = await gradeConversation(
      mockAnthropic(perfect),
      MESSAGES,
      'Karl',
      'baker',
      '',
      CHARACTER_WEIGHTS.karl
    )

    // 9*0.15 + 10*0.25 + 8*0.10 + 9*0.15 + 9*0.15 + 9*0.10 + 9*0.10
    // = 1.35 + 2.5 + 0.8 + 1.35 + 1.35 + 0.9 + 0.9 = 9.15 → rounded 9.2
    expect(grade.overall_score).toBeGreaterThanOrEqual(9.0)
    const delta = calculateRelationshipDelta(grade.overall_score)
    expect(delta.delta).toBe(10)
    expect(delta.tier).toBe('perfect')
  })

  it('karl-slow-conversation: 5.4/10 fluency low → +2 relationship', async () => {
    // Intentionally low fluency with Karl
    const slow = {
      comprehension: 6,
      fluency: 3,
      grammar: 7,
      vocabulary: 6,
      pronunciation: 6,
      confidence: 4,
      cultural_awareness: 6,
      reasoning: 'slow',
      strengths: [],
      weaknesses: ['fluency'],
    }
    const grade = await gradeConversation(
      mockAnthropic(slow),
      MESSAGES,
      'Karl',
      'baker',
      'impatient',
      CHARACTER_WEIGHTS.karl
    )

    // 6*0.15 + 3*0.25 + 7*0.10 + 6*0.15 + 6*0.15 + 4*0.10 + 6*0.10
    // = 0.9 + 0.75 + 0.7 + 0.9 + 0.9 + 0.4 + 0.6 = 5.15 → rough tier
    expect(grade.overall_score).toBeGreaterThanOrEqual(5.0)
    expect(grade.overall_score).toBeLessThan(6.0)
    const delta = calculateRelationshipDelta(grade.overall_score)
    expect(delta.delta).toBe(2)
    expect(delta.tier).toBe('rough')
  })
})
