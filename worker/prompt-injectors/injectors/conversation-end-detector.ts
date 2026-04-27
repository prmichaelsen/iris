/**
 * Conversation End Detector Injector
 *
 * Watches for goodbye salutations and instructs the character to trigger
 * the appropriate end action (quest completion or casual conversation end).
 */

import type { PromptInjector, PromptInjectorContext, PromptInjectorResult } from '../types';

export class ConversationEndDetectorInjector implements PromptInjector {
  readonly id = 'conversation-end-detector';
  readonly name = 'Conversation End Detector';
  readonly description = 'Detects goodbye salutations and triggers conversation end flow with Iris debrief';
  readonly enabledByDefault = true;

  canInject(context: PromptInjectorContext): boolean {
    // Only inject when talking to a character (not Iris herself)
    return context.activeCharacterId !== 'iris';
  }

  async inject(context: PromptInjectorContext): Promise<PromptInjectorResult | null> {
    const { activeQuestId } = context;

    const goodbyePhrases = [
      'Tschüss',
      'Auf Wiedersehen',
      'Bis später',
      'Bis bald',
      'Ciao',
      "Mach's gut",
      'Bis dann',
      'Tschau',
      'Servus', // Bavaria/Austria
      'Ade', // Southwest Germany
    ];

    const isQuestMode = !!activeQuestId;

    const content = `## Conversation End Detection

**Goodbye Salutations to Watch For:**
${goodbyePhrases.map(phrase => `- "${phrase}"`).join('\n')}

**When User Says Goodbye:**

${isQuestMode ? `
**Quest Mode (active quest: ${activeQuestId}):**
1. Respond naturally to the goodbye in character (brief, appropriate to your personality)
2. Use the tool \`quests\` with action="complete" and quest_id="${activeQuestId}"
3. This will:
   - Grade the conversation based on your character's grading weights
   - Calculate relationship change (+10 for perfect, -8 for terrible)
   - Switch control back to Iris
   - Iris will provide a debrief: "Karl thought your grammar was better! But you didn't remember the bread names. He gave you 6/10."

**Important:** You must call the tool AFTER your goodbye response, not before. The tool call ends the conversation.
` : `
**Casual Conversation Mode (no active quest):**
1. Respond naturally to the goodbye in character (brief, warm)
2. Use the tool \`conversations\` with action="end" and character_id="${context.activeCharacterId}"
3. This will:
   - Lightly grade the conversation for relationship tracking
   - Switch control back to Iris
   - Iris will provide a brief debrief: "Nice chat with ${context.activeCharacterId}! Your fluency improved 15% since last time."

**Important:** You must call the tool AFTER your goodbye response, not before. The tool call ends the conversation.
`}

**Don't End Conversation If:**
- User is just pausing or thinking ("Hmm...", "Ähm...", "Also...")
- User is asking you to wait ("Warte mal", "Moment")
- It's just a filler word, not an actual goodbye

**Your Response Pattern:**
1. Goodbye phrase → Respond in character
2. Immediately call the appropriate tool (quests.complete or conversations.end)
3. Trust that Iris will take over for the debrief`;

    return {
      content,
      priority: 0.8, // High priority - comes after quest conditions
      title: 'Conversation End Detection',
      required: true,
    };
  }
}
