import Anthropic from '@anthropic-ai/sdk'
import type { ToolContext, ToolRegistration } from './shared'

// Import all tool registrations
import { flashcardMatchingTool } from './flashcard-matching'
// Future: import { genderPickTool } from './gender-pick'
// Future: import { definitionTool } from './definition'
// etc.

const TOOL_REGISTRY: ToolRegistration[] = [
  flashcardMatchingTool,
]

export function getTools(targetLang: { code: string } | null): Anthropic.Tool[] {
  if (!targetLang) return []
  return TOOL_REGISTRY.map((r) => r.tool)
}

export async function executeToolCall(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<string> {
  const reg = TOOL_REGISTRY.find((r) => r.tool.name === name)
  if (!reg) return `Unknown tool: ${name}`
  return reg.execute(input, ctx)
}

export type { ToolContext, ToolRegistration } from './shared'
export { pickVocab, updateSm2, newId, nowSec, type Env, type VocabCard, type PendingWidget } from './shared'
