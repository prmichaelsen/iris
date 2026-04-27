# Task 2: Tool-Use Streaming Loop in Worker

**Milestone**: M4 — Interactive Widgets
**Status**: Pending
**Estimated**: 2–3 hours
**Dependencies**: Task 1

## Objective

Refactor the Worker's Claude streaming to support tool-use. Currently the Worker does one `anthropic.messages.stream()` call per turn. Add a loop that handles `stop_reason === 'tool_use'`, executes tools, feeds results back, and continues streaming — max 10 iterations per turn.

## Steps

1. Define the `TOOLS` array with the `flashcard` tool definition (Claude API format)
2. Only include `flashcard` in tools when `targetLang` is set
3. Refactor the streaming section to a loop:
   - Stream Claude response, forwarding text deltas as `response_text`
   - On `finalMessage()`, check `stop_reason`
   - If `tool_use`: extract tool_use blocks, execute each, collect tool_results
   - Append assistant turn + tool_result user turn to messages
   - Loop (max 10 iterations)
   - If `end_turn` or iteration limit: break, proceed to TTS + done
4. Add a `executeToolCall(name, input, env, ws, userId, ...)` dispatcher function
5. For now, `flashcard` is the only tool — dispatcher calls `executeFlashcard()`
6. Wire tool_result text back into the messages array for Claude to see

## Verification

- [ ] Claude can call the flashcard tool and receive a result
- [ ] Text deltas before/after tool calls stream to the client
- [ ] Max 10 iterations enforced
- [ ] Non-tool responses (normal conversation) still work unchanged
- [ ] `end_turn` breaks the loop correctly
