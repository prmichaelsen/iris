/**
 * Quests Tool
 *
 * Handles quest completion, conversation grading, and Iris debrief generation.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { ToolContext, ToolRegistration } from './shared';
import { newId } from './shared';
import { gradeConversation, type GradingWeights } from '../grading';
import { calculateRelationshipDelta, updateCharacterRelationship } from '../relationship';

interface Character {
  id: string;
  name: string;
  specialty: string;
  personality_description: string;
  grading_weights: string; // JSON string
}

/**
 * Generate Iris debrief message based on conversation grade
 */
function generateIrisDebrief(
  characterName: string,
  overallScore: number,
  strengths: string[],
  weaknesses: string[],
  relationshipDelta: number
): string {
  const tier =
    overallScore >= 9.0
      ? 'amazing'
      : overallScore >= 8.0
        ? 'great'
        : overallScore >= 7.0
          ? 'good'
          : overallScore >= 6.0
            ? 'decent'
            : overallScore >= 5.0
              ? 'rough'
              : overallScore >= 3.0
                ? 'tough'
                : 'very difficult';

  // Pick primary strength and weakness
  const primaryStrength = strengths[0] ?? 'your effort';
  const primaryWeakness = weaknesses[0] ?? 'some areas need practice';

  // Relationship change context
  const relationshipMsg =
    relationshipDelta > 0
      ? `${characterName} warmed up to you!`
      : relationshipDelta < 0
        ? `${characterName} was a bit frustrated.`
        : `${characterName} was neutral about the chat.`;

  return `Hey! ${characterName} thought that was ${tier}. They liked ${primaryStrength}! But ${primaryWeakness}. They gave you ${overallScore}/10.

${relationshipMsg}

What do you want to do?`;
}

/**
 * Tool: quests
 *
 * Actions:
 * - complete: Grade conversation, update relationship, trigger Iris debrief
 */
export const questsTool: ToolRegistration = {
  tool: {
    name: 'quests',
    description: 'Complete a quest after conversation ends. Grades conversation and updates character relationship.',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['complete'],
          description: 'Action to perform',
        },
        quest_id: {
          type: 'string',
          description: 'Quest ID (e.g., "erste_bestellung")',
        },
        character_id: {
          type: 'string',
          description: 'Character ID (e.g., "karl")',
        },
      },
      required: ['action', 'quest_id', 'character_id'],
    },
  },
  execute: async (input: Record<string, unknown>, ctx: ToolContext): Promise<string> => {
    const action = input.action as string;
    const questId = input.quest_id as string;
    const characterId = input.character_id as string;

    if (action !== 'complete') {
      return JSON.stringify({
        error: {
          code: 'INVALID_ACTION',
          message: `Unknown action: ${action}`,
        },
      });
    }

    try {
      // Get character data
      const character = await ctx.env.DB.prepare(
        `SELECT id, name, specialty, personality_description, grading_weights
         FROM characters
         WHERE id = ?`
      )
        .bind(characterId)
        .first<Character>();

      if (!character) {
        return JSON.stringify({
          error: {
            code: 'CHARACTER_NOT_FOUND',
            message: `Character not found: ${characterId}`,
          },
        });
      }

      // Parse grading weights
      let gradingWeights: GradingWeights;
      try {
        gradingWeights = JSON.parse(character.grading_weights);
      } catch (error) {
        console.error('[quests] Failed to parse grading_weights:', error);
        return JSON.stringify({
          error: {
            code: 'INVALID_WEIGHTS',
            message: 'Failed to parse character grading weights',
          },
        });
      }

      // Get conversation history from context
      const messages = ctx.conversationHistory;

      if (!messages || messages.length === 0) {
        return JSON.stringify({
          error: {
            code: 'NO_CONVERSATION',
            message: 'No conversation history to grade',
          },
        });
      }

      // Grade the conversation
      const anthropic = new Anthropic({ apiKey: ctx.env.ANTHROPIC_API_KEY });

      const characterExpectations = `${character.personality_description}. Specialty: ${character.specialty}.`;

      const grade = await gradeConversation(
        anthropic,
        messages,
        character.name,
        character.specialty,
        characterExpectations,
        gradingWeights
      );

      // Calculate relationship delta
      const relationshipResult = calculateRelationshipDelta(grade.overall_score);

      // Update character relationship
      const { newLevel, previousLevel } = await updateCharacterRelationship(
        ctx.env.DB,
        ctx.userId,
        characterId,
        relationshipResult.delta
      );

      // Store conversation grade in character_interactions table
      const interactionId = newId();
      const transcript = messages
        .map(m => {
          const speaker = m.role === 'user' ? 'User' : character.name;
          const text = typeof m.content === 'string'
            ? m.content
            : m.content
                .filter((block): block is Anthropic.TextBlockParam => block.type === 'text')
                .map(block => block.text)
                .join(' ');
          return `${speaker}: ${text}`;
        })
        .join('\n\n');

      const metadata = JSON.stringify({
        quest_id: questId,
        scores: grade.metrics,
        overall_score: grade.overall_score,
        reasoning: grade.reasoning,
        strengths: grade.strengths,
        weaknesses: grade.weaknesses,
        relationship_delta: relationshipResult.delta,
        relationship_tier: relationshipResult.tier,
        previous_relationship: previousLevel,
        new_relationship: newLevel,
      });

      await ctx.env.DB.prepare(
        `INSERT INTO character_interactions
           (id, user_id, character_id, interaction_type, topic, score, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
        .bind(
          interactionId,
          ctx.userId,
          characterId,
          'conversation',
          questId,
          grade.overall_score,
          metadata
        )
        .run();

      // Generate Iris debrief
      const irisDebrief = generateIrisDebrief(
        character.name,
        grade.overall_score,
        grade.strengths,
        grade.weaknesses,
        relationshipResult.delta
      );

      // Return success with debrief
      return JSON.stringify({
        success: true,
        quest_id: questId,
        grade: {
          overall_score: grade.overall_score,
          metrics: grade.metrics,
          reasoning: grade.reasoning,
          strengths: grade.strengths,
          weaknesses: grade.weaknesses,
        },
        relationship: {
          character: character.name,
          delta: relationshipResult.delta,
          tier: relationshipResult.tier,
          previous_level: previousLevel,
          new_level: newLevel,
        },
        iris_debrief: irisDebrief,
        next_actions: [
          { label: 'Retry Quest', action: 'retry_quest', quest_id: questId },
          { label: 'Review Vocabulary', action: 'review_vocabulary', quest_id: questId },
          { label: 'Free Practice', action: 'free_practice', character_id: characterId },
        ],
      });
    } catch (error) {
      console.error('[quests] Failed to complete quest:', error);
      return JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to complete quest',
          details: { error: error instanceof Error ? error.message : String(error) },
        },
      });
    }
  },
};
