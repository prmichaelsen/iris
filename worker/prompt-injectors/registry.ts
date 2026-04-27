/**
 * Prompt injector registry
 * Manages all available prompt injectors and executes them in priority order
 */

import type {
  PromptInjector,
  PromptInjectorContext,
  PromptInjectorResult,
  PromptInjectionConfig,
} from './types';

// Registry of all available injectors
const injectorRegistry = new Map<string, PromptInjector>();

/**
 * Register a prompt injector
 */
export function registerInjector(injector: PromptInjector): void {
  injectorRegistry.set(injector.id, injector);
}

/**
 * Get a registered injector by ID
 */
export function getInjector(id: string): PromptInjector | undefined {
  return injectorRegistry.get(id);
}

/**
 * Get all registered injectors
 */
export function getAllInjectors(): PromptInjector[] {
  return Array.from(injectorRegistry.values());
}

/**
 * Execute all enabled injectors and return their results in priority order
 */
export async function executeInjectors(
  context: PromptInjectorContext,
  config?: PromptInjectionConfig,
): Promise<PromptInjectorResult[]> {
  const injectors = getAllInjectors();

  // Filter injectors based on config
  const enabledInjectors = injectors.filter(injector => {
    // If explicitly disabled, skip
    if (config?.disabledInjectors?.includes(injector.id)) {
      return false;
    }

    // If enabledInjectors list provided, only include those
    if (config?.enabledInjectors) {
      return config.enabledInjectors.includes(injector.id);
    }

    // Otherwise, use injector's default
    return injector.enabledByDefault;
  });

  // Execute injectors and collect results
  const results: PromptInjectorResult[] = [];
  for (const injector of enabledInjectors) {
    // Check if injector can run
    if (injector.canInject) {
      const canRun = await injector.canInject(context);
      if (!canRun) continue;
    }

    // Execute injector
    const result = await injector.inject(context);
    if (result) {
      results.push(result);
    }
  }

  // Sort by priority (highest first)
  results.sort((a, b) => b.priority - a.priority);

  return results;
}
