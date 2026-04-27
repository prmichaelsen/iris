/**
 * Sanitize Tool Messages
 *
 * Removes orphaned tool_use / tool_result blocks from a message array
 * to satisfy the Anthropic API invariants:
 *
 *   1. Each tool_result block must reference a tool_use block in the
 *      IMMEDIATELY PRECEDING assistant message.
 *   2. Each tool_use block in an assistant message must have a matching
 *      tool_result in the IMMEDIATELY FOLLOWING user message.
 *
 * This utility is designed to run as the final step before sending
 * messages to the API — after alternating-role enforcement, history
 * truncation, or any other transformation that may split tool pairs.
 */

interface GenericMessage {
  role: string
  content: unknown
}

function getContentBlocks(msg: GenericMessage): any[] {
  if (Array.isArray(msg.content)) return msg.content
  return []
}

function hasToolUseBlocks(msg: GenericMessage): boolean {
  return getContentBlocks(msg).some(b => b.type === 'tool_use')
}

function hasToolResultBlocks(msg: GenericMessage): boolean {
  return getContentBlocks(msg).some(b => b.type === 'tool_result')
}

/**
 * Sanitize messages to prevent orphaned tool_use/tool_result blocks.
 *
 * Enforces:
 * 1. Every tool_result references a tool_use in the immediately preceding
 *    assistant message (not just any message in the conversation).
 * 2. Every tool_use in an assistant message has a matching tool_result
 *    in the immediately following user message.
 * 3. Messages that become empty after filtering are removed.
 *
 * This function does NOT enforce alternating roles — that should be
 * handled separately before calling this.
 *
 * Generic over the message type so it works with both internal types
 * and the Anthropic SDK's MessageParam.
 */
export function sanitizeToolMessages<T extends GenericMessage>(messages: T[]): T[] {
  if (messages.length === 0) return messages

  let result = [...messages]

  // Pass 1: Strip unanswered tool_use blocks from assistant messages.
  // For each assistant message with tool_use, check that the immediately
  // following message is a user message with matching tool_results.
  result = removeUnansweredToolUse(result)

  // Pass 2: Remove orphaned tool_result blocks.
  // For each user message with tool_result blocks, check that each
  // tool_use_id exists in the immediately preceding assistant message.
  result = removeOrphanedToolResults(result)

  // Pass 3: Passes 1-2 can expose new issues (e.g. removing an assistant
  // message leaves a tool_result orphaned). Run both again to converge.
  result = removeUnansweredToolUse(result)
  result = removeOrphanedToolResults(result)

  return result
}

/**
 * Strip tool_use blocks from assistant messages that don't have matching
 * tool_results in the immediately following user message.
 * Removes the assistant message entirely if no content remains.
 */
function removeUnansweredToolUse<T extends GenericMessage>(messages: T[]): T[] {
  const result: T[] = []

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]

    if (msg.role === 'assistant' && hasToolUseBlocks(msg)) {
      // Collect tool_result ids from the immediately following user message
      const next = i + 1 < messages.length ? messages[i + 1] : null
      const answeredIds = new Set<string>()

      if (next && next.role === 'user') {
        for (const block of getContentBlocks(next)) {
          if (block.type === 'tool_result' && block.tool_use_id) {
            answeredIds.add(block.tool_use_id)
          }
        }
      }

      // Filter: keep tool_use blocks only if they have a matching result
      const filteredContent = getContentBlocks(msg).filter(
        (b: any) => b.type !== 'tool_use' || (b.id != null && answeredIds.has(b.id))
      )

      if (filteredContent.length === 0) continue // drop empty message
      result.push({ ...msg, content: filteredContent } as T)
    } else {
      result.push(msg)
    }
  }

  return result
}

/**
 * Remove tool_result blocks whose tool_use_id does not appear in the
 * immediately preceding assistant message.
 */
function removeOrphanedToolResults<T extends GenericMessage>(messages: T[]): T[] {
  const result: T[] = []

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]

    if (msg.role === 'user' && hasToolResultBlocks(msg)) {
      // Find the immediately preceding assistant message
      const prev = i > 0 ? messages[i - 1] : null
      const prevToolUseIds = new Set<string>()

      if (prev && prev.role === 'assistant') {
        for (const block of getContentBlocks(prev)) {
          if (block.type === 'tool_use' && block.id) {
            prevToolUseIds.add(block.id)
          }
        }
      }

      // Filter out orphaned tool_result blocks
      const filteredContent = getContentBlocks(msg).filter(
        (b: any) => b.type !== 'tool_result' || prevToolUseIds.has(b.tool_use_id!)
      )

      // Skip message entirely if all content was orphaned
      if (filteredContent.length === 0) continue

      result.push({ ...msg, content: filteredContent } as T)
    } else {
      result.push(msg)
    }
  }

  return result
}
