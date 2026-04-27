/**
 * Conversation Grading System
 *
 * Uses Claude to grade user conversations based on 7 metrics:
 * - comprehension, fluency, grammar, vocabulary, pronunciation, confidence, cultural_awareness
 *
 * Each character has custom grading weights that determine overall score.
 */

import Anthropic from '@anthropic-ai/sdk';

export interface GradingMetrics {
  comprehension: number; // 0-10
  fluency: number; // 0-10
  grammar: number; // 0-10
  vocabulary: number; // 0-10
  pronunciation: number; // 0-10
  confidence: number; // 0-10
  cultural_awareness: number; // 0-10
}

export interface GradingWeights {
  comprehension: number; // 0-1, sums to 1.0
  fluency: number;
  grammar: number;
  vocabulary: number;
  pronunciation: number;
  confidence: number;
  cultural_awareness: number;
}

export interface ConversationGrade {
  metrics: GradingMetrics;
  overall_score: number; // 0-10, weighted average
  reasoning: string; // Claude's explanation
  strengths: string[]; // What went well
  weaknesses: string[]; // What needs work
}

/**
 * Extract user messages from conversation transcript
 */
function extractUserMessages(messages: Anthropic.MessageParam[]): string {
  return messages
    .filter(msg => msg.role === 'user')
    .map(msg => {
      if (typeof msg.content === 'string') {
        return msg.content;
      } else {
        // Extract text from content blocks
        return msg.content
          .filter((block): block is Anthropic.TextBlockParam => block.type === 'text')
          .map(block => block.text)
          .join(' ');
      }
    })
    .join('\n\n');
}

/**
 * Build Claude grading prompt
 */
function buildGradingPrompt(
  characterName: string,
  characterSpecialty: string,
  characterExpectations: string,
  userTranscript: string,
  targetLanguage: string = 'German'
): string {
  return `You are evaluating a language learning conversation between a student and ${characterName}, a ${characterSpecialty} character.

**Character Context:**
${characterExpectations}

**Student's ${targetLanguage} Transcript:**
${userTranscript}

**Your Task:**
Grade the student's performance on these 7 metrics (each scored 0-10):

1. **Comprehension** (0-10): Did they understand ${characterName} and respond appropriately?
2. **Fluency** (0-10): How smoothly did they speak? Natural pacing, minimal hesitation?
3. **Grammar** (0-10): Correct verb conjugations, article usage, word order, case endings?
4. **Vocabulary** (0-10): Appropriate word choice, variety, and accuracy?
5. **Pronunciation** (0-10): Clear articulation, good accent approximation? (Infer from transcript quality)
6. **Confidence** (0-10): Did they attempt complex structures? Take conversational risks?
7. **Cultural Awareness** (0-10): Appropriate formality (du/Sie), cultural context, idiomatic usage?

**Scoring Guidelines:**
- 9-10: Excellent, near-native quality
- 7-8: Good, competent with minor errors
- 5-6: Adequate, noticeable errors but communication works
- 3-4: Poor, frequent errors, communication struggles
- 0-2: Very poor, barely comprehensible

**Output Format (JSON):**
{
  "comprehension": <score>,
  "fluency": <score>,
  "grammar": <score>,
  "vocabulary": <score>,
  "pronunciation": <score>,
  "confidence": <score>,
  "cultural_awareness": <score>,
  "reasoning": "<1-2 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"]
}

Grade fairly but encouragingly. Focus on actionable feedback.`;
}

/**
 * Grade a conversation using Claude
 */
export async function gradeConversation(
  anthropic: Anthropic,
  messages: Anthropic.MessageParam[],
  characterName: string,
  characterSpecialty: string,
  characterExpectations: string,
  gradingWeights: GradingWeights,
  targetLanguage: string = 'German'
): Promise<ConversationGrade> {
  const userTranscript = extractUserMessages(messages);

  if (!userTranscript.trim()) {
    // No user messages to grade
    return {
      metrics: {
        comprehension: 0,
        fluency: 0,
        grammar: 0,
        vocabulary: 0,
        pronunciation: 0,
        confidence: 0,
        cultural_awareness: 0,
      },
      overall_score: 0,
      reasoning: 'No user messages to evaluate.',
      strengths: [],
      weaknesses: ['Did not speak'],
    };
  }

  const prompt = buildGradingPrompt(
    characterName,
    characterSpecialty,
    characterExpectations,
    userTranscript,
    targetLanguage
  );

  // Call Claude for grading
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  // Parse Claude's response
  const responseText = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('');

  let gradingResult: any;
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    gradingResult = JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('[grading] Failed to parse Claude response, applying neutral 5/10 fallback:', error);
    console.error('[grading] Response:', responseText);
    // Graceful fallback per spec R17: neutral 5/10 metrics + generic reasoning.
    gradingResult = {
      comprehension: 5,
      fluency: 5,
      grammar: 5,
      vocabulary: 5,
      pronunciation: 5,
      confidence: 5,
      cultural_awareness: 5,
      reasoning: 'Grading unavailable; applied neutral fallback score.',
      strengths: ['Completed the conversation'],
      weaknesses: ['Detailed feedback unavailable this round'],
    };
  }

  // Calculate weighted overall score
  const metrics: GradingMetrics = {
    comprehension: gradingResult.comprehension ?? 5,
    fluency: gradingResult.fluency ?? 5,
    grammar: gradingResult.grammar ?? 5,
    vocabulary: gradingResult.vocabulary ?? 5,
    pronunciation: gradingResult.pronunciation ?? 5,
    confidence: gradingResult.confidence ?? 5,
    cultural_awareness: gradingResult.cultural_awareness ?? 5,
  };

  const overallScore =
    metrics.comprehension * gradingWeights.comprehension +
    metrics.fluency * gradingWeights.fluency +
    metrics.grammar * gradingWeights.grammar +
    metrics.vocabulary * gradingWeights.vocabulary +
    metrics.pronunciation * gradingWeights.pronunciation +
    metrics.confidence * gradingWeights.confidence +
    metrics.cultural_awareness * gradingWeights.cultural_awareness;

  return {
    metrics,
    overall_score: Math.round(overallScore * 10) / 10, // Round to 1 decimal
    reasoning: gradingResult.reasoning ?? 'No reasoning provided',
    strengths: gradingResult.strengths ?? [],
    weaknesses: gradingResult.weaknesses ?? [],
  };
}
