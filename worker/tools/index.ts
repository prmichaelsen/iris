import Anthropic from '@anthropic-ai/sdk'
import type { ToolContext, ToolRegistration } from './shared'

import { flashcardTool } from './flashcard'
import { flashcardFreeformTool } from './flashcard-freeform'
import { executeGenderPick } from './gender-pick'
import { definitionTool } from './definition'
import { fillBlankTool } from './fill-blank'
import { setContextTool, viewProgressTool, debugStateTool } from './gamification'
import { regionsTool } from './regions'
import { questsTool } from './quests'
import { sendPenPalLetterTool, checkPenPalAttentionTool } from './pen-pals'
import { studyListTool } from './study-list'

const TOOL_REGISTRY: ToolRegistration[] = [
  flashcardTool,
  flashcardFreeformTool,
  definitionTool,
  fillBlankTool,
  setContextTool,
  viewProgressTool,
  debugStateTool,
  regionsTool,
  questsTool,
  sendPenPalLetterTool,
  checkPenPalAttentionTool,
  studyListTool,
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
  if (name === 'flashcard') {
    const mode = input.mode as string
    if (mode === 'gender-pick') {
      return executeGenderPick(input, ctx)
    } else if (mode === 'matching') {
      return flashcardTool.execute(input, ctx)
    } else {
      return `Unknown flashcard mode: ${mode}`
    }
  }
  const reg = TOOL_REGISTRY.find((r) => r.tool.name === name)
  if (!reg) return `Unknown tool: ${name}`
  return reg.execute(input, ctx)
}

export type { ToolContext, ToolRegistration } from './shared'
export { pickVocab, updateSm2, newId, nowSec, type Env, type VocabCard, type PendingWidget } from './shared'
