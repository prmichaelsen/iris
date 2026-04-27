/**
 * Character Personality Injector
 *
 * Loads and injects the character's base personality, specialty, and instructions.
 * Only runs when activeCharacterId is NOT 'iris' (Iris uses BASE_PROMPT).
 */

import type { PromptInjector, PromptInjectorContext, PromptInjectorResult } from '../types';
import { getCharacter } from '../../characters';

export class CharacterPersonalityInjector implements PromptInjector {
  readonly id = 'character-personality';
  readonly name = 'Character Personality';
  readonly description = 'Injects character base personality, specialty, and additional instructions';
  readonly enabledByDefault = true;

  canInject(context: PromptInjectorContext): boolean {
    // Only inject for non-Iris characters
    // Iris uses the existing BASE_PROMPT
    return context.activeCharacterId !== 'iris';
  }

  async inject(context: PromptInjectorContext): Promise<PromptInjectorResult | null> {
    const { activeCharacterId } = context;

    // Load character definition
    const character = getCharacter(activeCharacterId);
    if (!character) {
      console.error(`Character not found: ${activeCharacterId}`);
      return null;
    }

    // Build character personality prompt
    const content = `You are ${character.name}, a ${character.age}-year-old ${character.profession_de} from ${character.region_id}.

${character.personality_description}

${character.specialty ? `Your specialty: ${character.specialty}` : ''}

${character.additional_instructions || ''}`;

    return {
      content,
      priority: 1.0, // Highest priority - character identity comes first
      title: 'Character Identity',
      required: true,
    };
  }
}
