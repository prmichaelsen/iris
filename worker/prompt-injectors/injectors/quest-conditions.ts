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
    const { activeQuestId, activeCharacterId, db, userId } = context;

    if (!activeQuestId) return null;

    // Load quest definition from database
    const quest = await db
      .prepare('SELECT * FROM quests WHERE id = ?')
      .bind(activeQuestId)
      .first<{
        id: string;
        name_en: string;
        character_id: string;
        success_criteria: string;
      }>();

    if (!quest) {
      console.error(`Quest not found: ${activeQuestId}`);
      return null;
    }

    let successCriteria: any = {};
    try {
      successCriteria = quest.success_criteria ? JSON.parse(quest.success_criteria) : {};
    } catch (e) {
      console.error('Failed to parse quest success_criteria:', e);
    }

    // Load user-character relationship level for dynamic behavior
    let relationshipLevel = 0;
    if (userId && activeCharacterId) {
      const rel = await db
        .prepare('SELECT relationship_level FROM user_character_relationships WHERE user_id = ? AND character_id = ?')
        .bind(userId, activeCharacterId)
        .first<{ relationship_level: number }>();
      relationshipLevel = rel?.relationship_level || 0;
    }

    let content = '';

    // Karl's Erste Bestellung quest with relationship-aware behavior
    if (activeQuestId === 'erste_bestellung' && activeCharacterId === 'char_karl_baker') {
      const timerSeconds = successCriteria.timer_seconds || 5;
      const maxTimeouts = successCriteria.max_timeouts || 3;

      // Relationship tier affects timer duration and patience
      let timerAdjustment = '';
      let patienceNotes = '';

      if (relationshipLevel <= 20) {
        // Hostile: 3s timer, kicks you out immediately
        timerAdjustment = ' (Relationship: Hostile - 3 second timer, zero tolerance)';
        patienceNotes = '- Extremely short fuse due to low relationship\n- May end conversation after just 1-2 timeouts';
      } else if (relationshipLevel <= 40) {
        // Cold: 5s timer, standard rules
        timerAdjustment = ' (Relationship: Cold - 5 second timer)';
        patienceNotes = '- Professional but curt\n- Standard 3-strike rules apply';
      } else if (relationshipLevel <= 60) {
        // Neutral: 7s timer
        timerAdjustment = ' (Relationship: Neutral - 7 second timer, warming up)';
        patienceNotes = '- More patient than usual\n- Might offer a hint if user struggles';
      } else if (relationshipLevel <= 80) {
        // Friendly: 10s timer, small talk
        timerAdjustment = ' (Relationship: Friendly - 10 second timer, relaxed pace)';
        patienceNotes = '- Comfortable with small talk\n- Might ask about their week\n- Still business-focused but warm';
      } else {
        // Family: No timer pressure
        timerAdjustment = ' (Relationship: Family - no timer pressure, you save the best for them)';
        patienceNotes = '- Warmth shows through\n- Save the best Brötchen for regulars like them\n- Ask about their life\n- Timer is formality only - you won\'t kick them out';
      }

      content = `## Quest: Erste Bestellung (First Order)

**Your Role:** You are Karl der Bäcker, serving a customer at your Berlin bakery counter.

**Quest Success Criteria:**
- User successfully orders at least one item from the bakery
- User responds within ${timerSeconds} seconds${timerAdjustment}
- Conversation feels natural and complete

**Quest Failure Criteria (${maxTimeouts}-Strike System):**
- **Strike 1-2:** User times out (>${timerSeconds} seconds no response). Show impatience but continue.
- **Strike ${maxTimeouts}:** User times out again. Say "NÄCHSTER!" (Next!) and refuse further service. Quest fails.

**Relationship-Based Behavior:**
${patienceNotes}

**Behavioral Rules:**
- Speak quickly and directly - you're a busy Berlin baker
- Use simple vocabulary appropriate for beginners (CEFR A1-A2)
- Count strikes internally but don't mention the count to the user
- After ${maxTimeouts} strikes, stay in character but be firm: you have other customers waiting

**Conversation Flow:**
1. Greet customer briefly (adjust tone based on relationship level)
2. Wait for order (${timerSeconds} second timer starts)
3. Confirm/clarify the order if needed
4. State the price: "Das macht [X] Euro."
5. Complete transaction: "Bitte schön." or "Hier, dein [item]."

**Success Signal:** After successful order completion, say something brief like "Gut. Nächster!" to signal you're done but satisfied.`;
    } else {
      // Generic quest conditions template
      content = `## Active Quest: ${quest.name_en}

Quest ID: ${activeQuestId}
Character: ${quest.character_id || 'any'}

Success criteria: ${quest.success_criteria || 'Complete the quest objectives'}

Stay in character and follow the quest objectives.`;
    }

    return {
      content,
      priority: 0.9, // High priority - comes right after character personality
      title: 'Quest Conditions',
      required: true,
    };
  }
}
