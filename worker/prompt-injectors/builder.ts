/**
 * Prompt builder that orchestrates injectors
 */

import type {
  PromptInjectorContext,
  PromptInjectorResult,
  PromptInjectionConfig,
} from './types';
import { executeInjectors } from './registry';

export interface BuildSystemPromptOptions {
  context: PromptInjectorContext;
  config?: PromptInjectionConfig;
}

export interface BuildSystemPromptResult {
  prompt: string;
  toolFilters: Array<NonNullable<PromptInjectorResult['toolFilter']>>;
}

/**
 * Build a system prompt using registered injectors.
 * Returns the prompt string and any tool filters declared by injectors.
 */
export async function buildSystemPrompt(options: BuildSystemPromptOptions): Promise<BuildSystemPromptResult> {
  const { context, config } = options;

  // Execute all enabled injectors
  const results = await executeInjectors(context, config);

  // Build the final prompt
  const sections = results.map(result => {
    if (config?.includeTitles && result.title) {
      return `# ${result.title}\n\n${result.content}`;
    }
    return result.content;
  });

  // Collect tool filters from injector results
  const toolFilters = results
    .map(r => r.toolFilter)
    .filter((f): f is NonNullable<PromptInjectorResult['toolFilter']> => !!f);

  // Join sections with double newlines
  const separator = '\n\n';
  return {
    prompt: sections.join(separator),
    toolFilters,
  };
}

/**
 * Apply tool filters from injectors to a tools array.
 * - Allow lists are unioned across injectors
 * - Deny lists are unioned across injectors
 * - Deny always wins over allow
 */
export function applyToolFilters<T extends { name: string }>(
  tools: T[],
  toolFilters: Array<NonNullable<PromptInjectorResult['toolFilter']>>,
): T[] {
  if (toolFilters.length === 0) return tools;

  // Union all allow and deny lists
  const allowSet = new Set<string>();
  const denySet = new Set<string>();
  let hasAllow = false;

  for (const filter of toolFilters) {
    if (filter.allow) {
      hasAllow = true;
      for (const name of filter.allow) allowSet.add(name);
    }
    if (filter.deny) {
      for (const name of filter.deny) denySet.add(name);
    }
  }

  return tools.filter(tool => {
    // Check deny first — deny always wins
    for (const denied of denySet) {
      if (tool.name === denied || tool.name.endsWith(`_${denied}`) || tool.name.endsWith(`/${denied}`)) {
        return false;
      }
    }

    // If no allow lists specified, allow everything not denied
    if (!hasAllow) return true;

    // Check if tool matches any allow entry
    for (const allowed of allowSet) {
      if (tool.name === allowed || tool.name.endsWith(`_${allowed}`) || tool.name.endsWith(`/${allowed}`)) {
        return true;
      }
    }

    return false;
  });
}
