/**
 * Letter Generation System
 *
 * Generates personalized letters from pen pals using Claude.
 * Letters reflect the pen pal's personality and include contextual details.
 */

import Anthropic from '@anthropic-ai/sdk'

export interface PenPalContext {
  /** Pen pal character ID */
  character_id: string

  /** Pen pal name */
  name: string

  /** Pen pal personality description */
  personality: string

  /** Topics this pen pal talks about */
  topics: string[]

  /** Previous letters in this conversation (for continuity) */
  previous_letters?: Array<{
    sender: 'user' | 'pen_pal'
    content: string
    sent_at: string
  }>
}

export interface LetterGenerationInput {
  /** Pen pal context */
  pen_pal: PenPalContext

  /** User's name (optional) */
  user_name?: string

  /** User's German level (A1, A2, B1, etc.) */
  cefr_level?: string

  /**
   * Occasion or trigger for this letter.
   * Spec-aligned values: 'first_contact', 'gift_attached', 'reconnect', 'check_in'.
   */
  occasion?: string

  /** Gift being attached (if any) */
  gift?: {
    name_en: string
    description_en: string
  }
}

/**
 * Generate a letter from a pen pal using Claude
 *
 * @param input - Letter generation parameters
 * @param anthropic - Anthropic SDK client
 * @returns Generated letter content (in German)
 */
export async function generateLetter(
  input: LetterGenerationInput,
  anthropic: Anthropic,
): Promise<string> {
  const { pen_pal, user_name, cefr_level, occasion, gift } = input

  // Build prompt based on context
  const systemPrompt = buildLetterPrompt(pen_pal, user_name, cefr_level, occasion, gift)

  // Generate letter using Claude
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: 'Write the letter now.',
      },
    ],
  })

  // Extract text from response
  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text content in Claude response')
  }

  return textBlock.text
}

/**
 * Build the system prompt for letter generation
 */
function buildLetterPrompt(
  pen_pal: PenPalContext,
  user_name?: string,
  cefr_level?: string,
  occasion?: string,
  gift?: { name_en: string; description_en: string },
): string {
  const userName = user_name || 'mein Freund'
  const level = cefr_level || 'A2'

  let prompt = `You are ${pen_pal.name}, a pen pal character. ${pen_pal.personality}

Your task: Write a personal letter in German to ${userName}, a German language learner at ${level} level.

Personality and topics:
${pen_pal.topics.map((t) => `- ${t}`).join('\n')}

Letter guidelines:
- Write entirely in German
- Keep it natural and personal (300-500 words)
- Match the ${level} level — use vocabulary and grammar appropriate for this level
- Include vivid details about your life, region, or recent experiences
- Ask 1-2 questions to encourage a response
- Show your personality through word choice and tone
- Do NOT use English or markdown formatting
`

  // Add occasion-specific instructions
  if (occasion === 'first_contact') {
    prompt += `\nOccasion: This is your FIRST letter to ${userName}. Introduce yourself warmly, explain how you got their address (through a mutual friend who runs a language exchange program), and share why you're excited to be pen pals. Mention what you hope to talk about.`
  } else if (occasion === 'gift_attached') {
    prompt += `\nOccasion: You're sending a small gift with this letter! The gift is: ${gift?.name_en} — ${gift?.description_en}. Explain what it is, why you thought of them, and what it means to you.`
  } else if (occasion === 'reconnect') {
    prompt += `\nOccasion: You're reaching out again to ${userName} after it's been quiet for a while. Acknowledge gently that some time has passed since you last heard from each other, don't guilt-trip them, share something new from your life, and invite them back into the conversation with an open question.`
  } else {
    // Default: casual check-in
    prompt += `\nOccasion: Just checking in with ${userName}. Share something interesting that happened recently in your life or region.`
  }

  // Add continuity if previous letters exist
  if (pen_pal.previous_letters && pen_pal.previous_letters.length > 0) {
    const recentLetters = pen_pal.previous_letters.slice(-3) // Last 3 letters
    prompt += `\n\nPrevious conversation context (for continuity):\n`
    recentLetters.forEach((letter, i) => {
      const sender = letter.sender === 'user' ? userName : pen_pal.name
      prompt += `\n${sender} (${letter.sent_at}):\n${letter.content.slice(0, 200)}...\n`
    })
    prompt += `\nReference earlier conversation naturally, but don't repeat yourself.`
  }

  prompt += `\n\nNow write the letter as ${pen_pal.name}. Start with "Liebe/Lieber ${userName}," and end with your signature.`

  return prompt
}

/**
 * Determine occasion for next letter based on relationship state
 *
 * @param letters_received - How many letters the user has received from this pen pal
 * @param has_gift - Whether a gift is being attached
 * @returns Occasion identifier
 */
export function determineOccasion(
  letters_received: number,
  has_gift: boolean,
): string {
  if (letters_received === 0) {
    return 'first_contact'
  }
  if (has_gift) {
    return 'gift_attached'
  }
  if (letters_received % 3 === 0) {
    return 'reconnect'
  }
  return 'check_in'
}
