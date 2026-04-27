/**
 * Prompt Injection System
 *
 * Extensible system for injecting dynamic content into character system prompts.
 * Inspired by agentbase.me's prompt architecture.
 */

export * from './types';
export * from './builder';
export * from './registry';
export * from './injectors';

// Auto-register default injectors
import { registerInjector } from './registry';
import {
  CharacterPersonalityInjector,
  QuestConditionsInjector,
  ConversationEndDetectorInjector
} from './injectors';

// Register all default injectors
registerInjector(new CharacterPersonalityInjector());
registerInjector(new QuestConditionsInjector());
registerInjector(new ConversationEndDetectorInjector());
