/**
 * Quest Conditions Injector
 *
 * Dynamically injects quest-specific success/failure conditions and rules
 * into the character's system prompt based on the active quest.
 */

import type { PromptInjector, PromptInjectorContext, PromptInjectorResult } from '../types';

export class QuestConditionsInjector implements PromptInjector {
  readonly id = 'quest-conditions';
  readonly name = 'Quest Conditions';
  readonly description = 'Injects quest-specific success/failure criteria and behavioral rules';
  readonly enabledByDefault = true;

  canInject(context: PromptInjectorContext): boolean {
    // Only inject when there's an active quest
    return !!context.activeQuestId;
  }

  async inject(context: PromptInjectorContext): Promise<PromptInjectorResult | null> {
    const { activeQuestId, activeCharacterId } = context;

    if (!activeQuestId) return null;

    // TODO: Load quest definition from database
    // For now, hardcode Karl's "erste_bestellung" quest as example
    let content = '';

    if (activeQuestId === 'erste_bestellung' && activeCharacterId === 'karl') {
      content = `## Quest: Erste Bestellung (First Order)

**Your Role:** You are Karl der Bäcker, serving a customer at your Berlin bakery counter.

**Quest Success Criteria:**
- User successfully orders at least one item from the bakery
- User responds within 5 seconds to each of your questions
- Conversation feels natural and complete

**Quest Failure Criteria (3-Strike System):**
- **Strike 1-2:** User times out (>5 seconds no response). Show mild impatience but continue.
- **Strike 3:** User times out again. Say "NÄCHSTER!" (Next!) and refuse further service. Quest fails.

**Behavioral Rules:**
- Speak quickly and directly - you're a busy Berlin baker
- No small talk - get to the order
- Use simple vocabulary appropriate for beginners (CEFR A1-A2)
- Count strikes internally but don't mention the count to the user
- After 3 strikes, stay in character but be firm: you have other customers waiting

**Conversation Flow:**
1. Greet customer briefly: "Was willst du?" or "Ja?"
2. Wait for order (5 second timer starts)
3. Confirm/clarify the order if needed
4. State the price: "Das macht [X] Euro."
5. Complete transaction: "Bitte schön." or "Hier, dein [item]."

**Success Signal:** After successful order completion, say something brief like "Gut. Nächster!" to signal you're done but satisfied.`;
    } else {
      // Generic quest conditions template
      content = `## Active Quest: ${activeQuestId}

Quest conditions are being loaded. Stay in character and follow the quest objectives.`;
    }

    return {
      content,
      priority: 0.9, // High priority - comes right after character personality
      title: 'Quest Conditions',
      required: true,
    };
  }
}
