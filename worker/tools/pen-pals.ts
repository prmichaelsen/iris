/// MCP tools for pen pal letter system
import Anthropic from '@anthropic-ai/sdk'
import type { ToolContext, ToolRegistration } from './shared'
import { newId, nowSec } from './shared'
import { generateLetter, determineOccasion, type PenPalContext } from '../src/letters'
import { calculateAttentionScore, shouldSendLetter, daysSince } from '../src/attention'

/**
 * Tool: send_pen_pal_letter
 *
 * Sends a letter from a pen pal to the user. Includes optional gift attachment.
 * Uses Claude to generate personalized letter content based on pen pal personality.
 */
export const sendPenPalLetterTool: ToolRegistration = {
  tool: {
    name: 'send_pen_pal_letter',
    description: 'Send a letter from a pen pal to the user (with optional gift attachment)',
    input_schema: {
      type: 'object',
      properties: {
        user_id: {
          type: 'string',
          description: 'User ID',
        },
        pen_pal_id: {
          type: 'string',
          description: 'Pen pal ID (e.g., penpal_mila)',
        },
        gift_collectible_id: {
          type: 'string',
          description: 'Optional collectible ID to attach as gift',
        },
      },
      required: ['user_id', 'pen_pal_id'],
    },
  },
  execute: async (input: Record<string, unknown>, ctx: ToolContext): Promise<string> => {
    try {
      const userId = input.user_id as string
      const penPalId = input.pen_pal_id as string
      const giftCollectibleId = input.gift_collectible_id as string | undefined

      // Fetch pen pal data from DB
      const penPalResult = await ctx.env.DB.prepare(
        `SELECT pp.*, c.name, c.personality_description
         FROM pen_pals pp
         JOIN characters c ON c.id = pp.character_id
         WHERE pp.id = ?`,
      )
        .bind(penPalId)
        .first<{
          id: string
          character_id: string
          bio_en: string
          topics: string
          name: string
          personality_description: string
        }>()

      if (!penPalResult) {
        return JSON.stringify({
          error: {
            code: 'NOT_FOUND',
            message: `Pen pal not found: ${penPalId}`,
          },
        })
      }

      // Fetch user pen pal relationship
      const relationshipResult = await ctx.env.DB.prepare(
        `SELECT * FROM user_pen_pals WHERE user_id = ? AND pen_pal_id = ?`,
      )
        .bind(userId, penPalId)
        .first<{
          letters_received: number
          letters_sent: number
          relationship_level: number
        }>()

      if (!relationshipResult) {
        return JSON.stringify({
          error: {
            code: 'NOT_UNLOCKED',
            message: `User has not unlocked pen pal: ${penPalId}`,
          },
        })
      }

      // Fetch previous letters for context
      const previousLettersResult = await ctx.env.DB.prepare(
        `SELECT sender, content, sent_at
         FROM pen_pal_letters
         WHERE user_id = ? AND pen_pal_id = ?
         ORDER BY sent_at DESC
         LIMIT 3`,
      )
        .bind(userId, penPalId)
        .all<{
          sender: 'user' | 'pen_pal'
          content: string
          sent_at: string
        }>()

      const previousLetters = previousLettersResult.results || []

      // Parse topics from JSON
      const topics = JSON.parse(penPalResult.topics) as string[]

      // Build pen pal context
      const penPalContext: PenPalContext = {
        character_id: penPalResult.character_id,
        name: penPalResult.name,
        personality: penPalResult.personality_description,
        topics,
        previous_letters: previousLetters,
      }

      // Determine occasion
      const occasion = determineOccasion(
        relationshipResult.letters_received,
        !!giftCollectibleId,
      )

      // Fetch gift data if provided
      let gift: { name_en: string; description_en: string } | undefined
      if (giftCollectibleId) {
        const giftResult = await ctx.env.DB.prepare(
          `SELECT name_en, description_en FROM collectibles WHERE id = ?`,
        )
          .bind(giftCollectibleId)
          .first<{ name_en: string; description_en: string }>()

        if (giftResult) {
          gift = giftResult
        }
      }

      // Generate letter content using Claude
      const anthropic = new Anthropic({ apiKey: ctx.env.ANTHROPIC_API_KEY })
      const letterContent = await generateLetter(
        {
          pen_pal: penPalContext,
          user_name: undefined, // Could fetch from user profile
          cefr_level: 'A2', // Could fetch from user progress
          occasion,
          gift,
        },
        anthropic,
      )

      // Store letter in DB
      const letterId = newId()
      const sentAt = new Date().toISOString()

      await ctx.env.DB.prepare(
        `INSERT INTO pen_pal_letters (id, user_id, pen_pal_id, sender, content, topic, sent_at)
         VALUES (?, ?, ?, 'pen_pal', ?, NULL, ?)`,
      )
        .bind(letterId, userId, penPalId, letterContent, sentAt)
        .run()

      // Update relationship stats
      await ctx.env.DB.prepare(
        `UPDATE user_pen_pals
         SET letters_received = letters_received + 1
         WHERE user_id = ? AND pen_pal_id = ?`,
      )
        .bind(userId, penPalId)
        .run()

      // If gift attached, add to user collectibles
      if (giftCollectibleId) {
        await ctx.env.DB.prepare(
          `INSERT OR IGNORE INTO user_collectibles (user_id, collectible_id, source, metadata)
           VALUES (?, ?, 'pen_pal_gift', ?)`,
        )
          .bind(
            userId,
            giftCollectibleId,
            JSON.stringify({ letter_id: letterId, pen_pal_id: penPalId }),
          )
          .run()
      }

      return JSON.stringify({
        success: true,
        letter: {
          id: letterId,
          pen_pal_id: penPalId,
          pen_pal_name: penPalResult.name,
          content: letterContent,
          sent_at: sentAt,
          gift: giftCollectibleId
            ? {
                collectible_id: giftCollectibleId,
                name_en: gift?.name_en,
              }
            : undefined,
        },
      })
    } catch (error) {
      return JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to send pen pal letter',
          details: { error: error instanceof Error ? error.message : String(error) },
        },
      })
    }
  },
}

/**
 * Tool: check_pen_pal_attention
 *
 * Calculates attention score and determines if pen pal should send a letter.
 * Does not actually send — just returns score and recommendation.
 */
export const checkPenPalAttentionTool: ToolRegistration = {
  tool: {
    name: 'check_pen_pal_attention',
    description: 'Check pen pal attention score and letter frequency',
    input_schema: {
      type: 'object',
      properties: {
        user_id: {
          type: 'string',
          description: 'User ID',
        },
        pen_pal_id: {
          type: 'string',
          description: 'Pen pal ID',
        },
      },
      required: ['user_id', 'pen_pal_id'],
    },
  },
  execute: async (input: Record<string, unknown>, ctx: ToolContext): Promise<string> => {
    try {
      const userId = input.user_id as string
      const penPalId = input.pen_pal_id as string

      // Fetch relationship data
      const relationship = await ctx.env.DB.prepare(
        `SELECT letters_sent, letters_received, last_interaction_at
         FROM user_pen_pals
         WHERE user_id = ? AND pen_pal_id = ?`,
      )
        .bind(userId, penPalId)
        .first<{
          letters_sent: number
          letters_received: number
          last_interaction_at: string | null
        }>()

      if (!relationship) {
        return JSON.stringify({
          error: {
            code: 'NOT_FOUND',
            message: 'Pen pal relationship not found',
          },
        })
      }

      // Calculate days since last interaction
      const daysSinceLast = daysSince(relationship.last_interaction_at)

      // Calculate attention score
      const score = calculateAttentionScore({
        letters_sent: relationship.letters_sent,
        letters_read: relationship.letters_received, // Approximate: received ≈ read
        days_since_last: daysSinceLast,
      })

      // Get last letter sent by pen pal
      const lastLetterResult = await ctx.env.DB.prepare(
        `SELECT sent_at FROM pen_pal_letters
         WHERE user_id = ? AND pen_pal_id = ? AND sender = 'pen_pal'
         ORDER BY sent_at DESC LIMIT 1`,
      )
        .bind(userId, penPalId)
        .first<{ sent_at: string }>()

      const daysSinceLastLetter = lastLetterResult
        ? daysSince(lastLetterResult.sent_at)
        : 999

      // Determine if should send
      const shouldSend = shouldSendLetter(score, daysSinceLastLetter)

      return JSON.stringify({
        success: true,
        attention_score: score,
        days_since_last_interaction: daysSinceLast,
        days_since_last_letter: daysSinceLastLetter,
        should_send_letter: shouldSend,
      })
    } catch (error) {
      return JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to check attention',
          details: { error: error instanceof Error ? error.message : String(error) },
        },
      })
    }
  },
}
