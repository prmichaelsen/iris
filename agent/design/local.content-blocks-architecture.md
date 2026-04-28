# Content Blocks Architecture

**Concept**: Persist assistant messages as ordered `ContentBlock[]` sequences with first-class tool-call lifecycle and a multimodal foundation for image/camera blocks
**Created**: 2026-04-28
**Status**: Design Specification

---

## Overview

This design replaces iris's current polymorphic-text-or-JSON message persistence with a single end-to-end content-block model. Every assistant turn becomes an ordered sequence of typed blocks (`text`, `tool_use`, `tool_result`, `widget`, `image`, `storage_image`), persisted once at end-of-turn into a new `content_blocks` JSON column on the `messages` table, and rendered in order on the client by a single block-driven dispatcher.

The immediate UX win: tool calls become visible in the chat as ambient lucide-react glyphs (`Loader2` → `Check` / `X`) that survive page refresh. The strategic win: the foundation makes image-content blocks (and the camera-translate feature long-term) drop in cleanly without another data-model rewrite.

---

## Problem Statement

Three converging problems make today's architecture untenable for the next phase of iris:

**1. Tool calls aren't persisted.** `tool_use` and `tool_result` blocks live only in the in-memory `history: Anthropic.MessageParam[]` for the connection's lifetime. End-of-turn persistence (`worker/index.ts:781-796`) only writes `text` + `WidgetContentBlock`s; tool blocks are dropped. Result: page refresh loses the tool-call trace, AI conversation continuity is broken across reloads, and the UI cannot show "this turn ran a tool" history.

**2. The current state model can't represent interleaving.** The client `Turn` is `{role, text, audio?, widgets[]}` — text and widgets in parallel slots, never interleaved with tool indicators. No place for an inline "tool ran here" glyph between two segments of streamed text. The user-visible symptom: chat appears frozen mid-sentence between Claude's iteration boundaries.

**3. Multimodal is blocked.** Image inputs are inherently content blocks, not strings. The "point camera at a Bavarian street sign and have Iris translate it" feature can't be added cleanly until the persistence layer accepts and round-trips block sequences.

Adjacent latent problems surfaced during the audit phase that fold into this work:

- **`loadHistory` parse-and-discard bug** (`worker/index.ts:1305-1321`): JSON content is parsed successfully, the result is thrown away, and the raw JSON string is returned to Anthropic. The next API call sees serialized JSON as the assistant's prior content.
- **TTS reads JSON aloud**: when Claude leaks `tool_use`-shaped JSON in the text channel (a separate prompt bug), `streamTTS` (3 sites) doesn't filter it. The audible-JSON symptom is jarring and disorienting for non-technical users.
- **Three streaming sites in worker** (`index.ts:509`, `:546`, `:670`) handle near-identical tool-loop logic with subtle divergences (the retake loop is missing the post-iteration session-refresh; the strike-3 path passes `tools` but never processes returned `tool_use` blocks).
- **`activeWidget` singleton state** is redundant — `WidgetContentBlock.status === 'active'` already encodes the same information.
- **`done` drops audio** when `finalText` is empty, so widget-only assistant turns silently lose their TTS.

---

## Solution

A single-write, end-of-turn content-block persistence model with event-driven tool-status streaming.

**Persistence shape (single-write):** Every assistant turn produces one row at `done`. The `content_blocks` JSON column holds the full ordered sequence as it actually unfolded — `[text, tool_use, tool_result, text, tool_use, tool_result, ...]` — including all per-iteration text segments and tool calls. No intermediate rows; no in-place mid-turn UPDATEs; no `is_tool_interaction` flag.

**Streaming protocol:** Two new WS event types — `tool_call` (about to execute) and `tool_result` (done, with `success`/`error` status). Live spinner / ✓ / ✗ comes from in-place patching of in-memory `tool_use` blocks when these events arrive. Refresh-survival comes from re-rendering the persisted `content_blocks` array on next load. Status of a persisted tool is derived by scanning the same row's blocks: a `tool_use` block whose matching `tool_result` block is missing → render as ✗ (the tool didn't complete before the turn ended).

**Worker consolidation:** The three streaming sites collapse into a single `runStreamingTurn(history, tools?, ...)` helper. The strike-3 site calls it with no tools; the retake and main sites call it with the tool list. Inside the helper: the existing tool-use loop logic plus the new `tool_call`/`tool_result` event emission and the per-iteration block-array assembly. Eliminates three latent divergences with one extraction.

**Renderer:** The `Turn` type becomes `{role, blocks, audio?}`. A single block-driven dispatcher maps each block to its component (text → `WordHoverText`, widget → existing per-type widget component, tool_use → `ToolGlyph`, tool_result → null/hidden, image → future `<img>`). Active widgets are detected by `block.status === 'active'`; the `activeWidget` singleton is removed.

**Tool glyph:** lucide-react icons (`Loader2` spinning, `Check`, `X`) wrapped in a small inline `<span>` — no name visible, never clickable. Non-technical users never see tool internals.

**Adjacent fixes that ride along:** `loadHistory` parses correctly, TTS skips JSON-shaped messages, widget-only turns retain audio, prompt audit to address the JSON-leak root cause.

**Alternatives considered and rejected:**
- *Three-row dual-write per tool round* (matching agentbase.me's pattern): mid-tool crash recovery and AI-history symmetry are nice but iris doesn't need either. Rejected — overengineered for the iris use case.
- *In-place mid-turn UPDATEs* on the assistant row's JSON column: enables persist-pending-then-update at the cost of 3+ writes per tool round. Rejected — non-technical users gain nothing from stuck-pending recovery.
- *Status field on the `tool_use` block* + cross-block lookup to render: less ergonomic than in-place patching of in-memory state. Rejected.
- *Mid-stream tool-block insertion* (the original mental model): impossible — the Anthropic SDK only exposes tool_use blocks at `stream.finalMessage()`, not mid-stream. Tools fire at iteration boundaries between text segments, not within a sentence. Rejected as a misframing.

---

## Implementation

### Block type model

`shared/types/widgets.ts` — extend the existing `ContentBlock` union:

```typescript
// Existing
export interface TextContentBlock { type: 'text'; text: string }
export interface WidgetContentBlock { type: 'widget'; widget_type, widget_id, payload, response?, result?, status }

// New
export interface ToolUseContentBlock {
  type: 'tool_use'
  id: string                          // Anthropic-assigned tool_use id
  name: string                        // tool name (e.g. 'flashcard', 'quests.activate')
  input: Record<string, unknown>      // tool arguments
}

export interface ToolResultContentBlock {
  type: 'tool_result'
  tool_use_id: string                 // matches ToolUseContentBlock.id in same row
  content: string                     // serialized result (or error message)
  is_error?: boolean
}

export interface ImageContentBlock {
  type: 'image'
  source: { type: 'base64'; media_type: string; data: string }
}

export interface StorageImageContentBlock {
  type: 'storage_image'
  url: string
  expiresAt?: number
  alt?: string
}

export type ContentBlock =
  | TextContentBlock
  | WidgetContentBlock
  | ToolUseContentBlock
  | ToolResultContentBlock
  | ImageContentBlock
  | StorageImageContentBlock
```

### WS protocol additions

```typescript
export interface ToolCallMessage   { type: 'tool_call';   tool_id: string; name: string }
export interface ToolResultMessage { type: 'tool_result'; tool_id: string; ok: boolean }
```

`tool_id` is the Anthropic-assigned `tool_use.id` — sufficient for in-memory correlation between WS events and in-flight `tool_use` blocks. No `persistedToolCallId` (no mid-tool persistence to correlate to).

### D1 schema migration (additive)

```sql
-- worker/migrations/00XX_content_blocks.sql
ALTER TABLE messages ADD COLUMN content_blocks TEXT;  -- JSON-serialized ContentBlock[]
```

The `role` CHECK constraint (`'user' | 'assistant'`) stays as-is. The legacy `content TEXT` column stays as a fallback — old rows render via synthesized single-element `[{type: 'text', text: content}]`. No backfill script; the fallback path lives forever.

### Worker: shared streaming helper

Three sites collapse into one. New helper signature (rough):

```typescript
async function runStreamingTurn(opts: {
  history: Anthropic.MessageParam[]
  systemPrompt: string
  tools?: Anthropic.Tool[]
  send: (msg: WsServerMessage) => void
  env: Env
  /* + the rest of the per-turn context iris carries */
}): Promise<{
  blocks: ContentBlock[]      // ordered sequence assembled across iterations
  text: string                // concatenated text (for TTS)
}>
```

The helper switches from iris's current `stream.on('text', ...)` higher-level API to the lower-level `for await (const event of stream)` event loop. This is necessary so that `tool_call` WS events fire at `content_block_start` for tool_use blocks — the moment Claude pivots from text to tool — rather than after `await stream.finalMessage()` resolves at the end of the iteration. The visible difference: the spinner glyph appears in continuous visual succession with the streaming text, eliminating the disconnected silent beat between "text stops" and "spinner appears" in the higher-level API. Matches agentbase.me's approach (`src/lib/chat/anthropic.ts:120` event loop).

The helper:
1. Runs the iteration loop (existing `MAX_TOOL_ITERATIONS` cap).
2. Per iteration: walks Anthropic stream events:
   - `content_block_delta` with `text_delta` → forward as `response_text` WS event; append to iteration text.
   - `content_block_start` of type `tool_use` → emit `{type: 'tool_call', tool_id, name}` immediately (input not yet complete; client doesn't need it). Track the in-progress tool_use to assemble its input from subsequent `input_json_delta` events.
   - `content_block_stop` for a tool_use → finalize the tool_use block with its accumulated input.
   - `message_delta` / `message_stop` → end of iteration.
3. After iteration completes, for each finalized tool_use block:
   - Wraps `executeToolCall(...)` in try/catch; failure → `{ok: false, content: errMsg, is_error: true}`.
   - Emits `{type: 'tool_result', tool_id: block.id, ok}` to the client.
   - Appends `tool_use` and `tool_result` blocks to the assembling `blocks: ContentBlock[]`.
4. Carries the existing session-refresh logic (character/voice/quest lifecycle) — formerly only in the main loop, now shared.
5. Returns the assembled `blocks` and concatenated `text` to the caller.

Note that `tool_call` fires *before* `executeToolCall` runs (as soon as the SDK indicates a tool is being requested), while `tool_result` fires *after* `executeToolCall` returns. The pair brackets the actual tool execution, giving the client an accurate spinner duration.

The strike-3 site calls `runStreamingTurn({tools: undefined, ...})` — no tools. The retake and main sites pass tools. End-of-turn persistence then writes one row containing the full `content_blocks` array.

### TTS suppression (drive-by fix)

Three sites currently call `streamTTS(fullAssistantText, ...)` unconditionally:

```typescript
// before
if (fullAssistantText.trim()) await streamTTS(fullAssistantText, ...)
// after
const t = fullAssistantText.trim()
if (t && !isJson(t)) await streamTTS(fullAssistantText, ...)
```

Stops the audible-JSON symptom when Claude leaks tool-shaped JSON in the text channel. Sites: `worker/index.ts:531, 598, 800`.

### Prompt audit (drive-by fix)

Investigate `worker/buildSystemPromptAsync` for guidance/examples that teach Claude that emitting tool_use-shaped JSON in the text channel is acceptable. Iterate the prompt until tool calls reliably go through the SDK tool-use mechanism. Eval-style validation: send 20+ canonical "should fire a tool" prompts, observe whether each produces an SDK tool_use block (correct) or text-channel JSON (broken).

### `loadHistory` fix

`worker/index.ts:1305-1321`: replace the parse-and-discard pattern with parse-and-use. When `content` parses as JSON, return the parsed `ContentBlock[]` (or, after this refactor, prefer the `content_blocks` column over the legacy `content` string).

### Client: block-driven renderer

`client/App.tsx`:

```typescript
type Turn = {
  role: 'user' | 'assistant'
  blocks: ContentBlock[]
  audio?: Blob
}
```

Single dispatcher replaces the current text-then-widgets rendering:

```tsx
{turn.blocks.map((block, i) => {
  switch (block.type) {
    case 'text':         return <TextBlock key={i} block={block} lang={lang} />
    case 'widget':       return <WidgetBlock key={block.widget_id} block={block} ... />
    case 'tool_use':     return <ToolGlyph key={block.id} block={block} sameRow={turn.blocks} />
    case 'tool_result':  return null  // never rendered
    case 'image':        return <img key={i} src={`data:${block.source.media_type};base64,${block.source.data}`} />
    case 'storage_image':return <img key={i} src={block.url} alt={block.alt} />
  }
})}
```

The `WidgetBlock` component absorbs the existing 5-way widget switch (`flashcard-matching`, `flashcard-freeform`, `gender-pick`, `definition`, `fill-blank`). Active state is derived from `block.status === 'active'`. The `activeWidget` singleton state is removed.

### Tool glyph

```tsx
import { Loader2, Check, X } from 'lucide-react'

function ToolGlyph({block, sameRow}: {block: ToolUseContentBlock; sameRow: ContentBlock[]}) {
  const result = sameRow.find(
    b => b.type === 'tool_result' && b.tool_use_id === block.id
  ) as ToolResultContentBlock | undefined

  // Live state takes precedence; persisted state is derived from sibling tool_result.
  const status =
    !result ? 'pending' :
    result.is_error ? 'error' :
    'success'

  if (status === 'pending') return <span className="tool-glyph tool-glyph--pending"><Loader2 size={12} /></span>
  if (status === 'success') return <span className="tool-glyph tool-glyph--success"><Check size={12} /></span>
  return <span className="tool-glyph tool-glyph--error"><X size={12} /></span>
}
```

Plus minimal CSS in `client/styles.css` (subtle muted colors, `Loader2` rotates via CSS keyframes, baseline-aligned with surrounding text). Never a `<button>`. No name attribute, no tooltip — non-technical users never see tool identity.

### WS streaming-state adapter

While a turn is in progress, the client maintains `partialBlocks: ContentBlock[]`:

| WS event | Effect on `partialBlocks` |
|---|---|
| `response_text { delta }` | append to last text block, or push a new text block if last block is non-text |
| `tool_call { tool_id, name }` | push `{type: 'tool_use', id: tool_id, name, input: {}}` |
| `tool_result { tool_id, ok }` | push `{type: 'tool_result', tool_use_id: tool_id, content: '', is_error: !ok}` |
| `widget` | push a `WidgetContentBlock` with `status: 'active'` |
| `widget_result` | mutate the matching widget block (`status: 'completed'`, set `result`) |
| `done` | finalize `partialBlocks` into a `Turn`, push to history, clear |

### Audio fix

The `done` handler in `App.tsx:124-141` currently drops audio if `finalText` is empty. After refactor, audio is retained as long as the turn produces *any* blocks (text or widget):

```typescript
if (finalText || partialBlocks.length > 0) {
  setHistory(h => [...h, {role: 'assistant', blocks: partialBlocks, audio: audio ?? undefined}])
}
```

---

## Benefits

- **Refresh-survival**: tool-call indicators (✓ / ✗) persist across page reloads, matching the rest of the chat history.
- **AI continuity**: Claude sees full prior tool exchanges on subsequent turns. No more "she forgot what the tool returned last reload."
- **Single render path**: one block-driven dispatcher replaces text-and-widgets parallel rendering. Adding new block types (image, storage_image, future memory_carousel) is a switch-case addition.
- **Multimodal foundation**: image and storage_image block types exist in the type system today. R2 plumbing and upload UI become small follow-up tasks rather than data-model rewrites.
- **Worker consolidation**: three streaming sites become one; latent inconsistencies (retake-loop session-refresh missing, strike-3 unprocessed tool blocks) are fixed for free during extraction.
- **Latent bugs cleared**: `loadHistory` parse-and-discard, widget-only-turn audio drop, audible JSON — all fixed in passing.
- **Non-technical UX preserved**: glyphs are ambient and never clickable; no implementation surface leaks to learners.
- **Subtle polish**: text mid-streaming no longer appears frozen between iterations — the spinner glyph fills the gap.

---

## Trade-offs

- **Mid-tool crashes lose the unfinished turn entirely**. Without mid-tool persistence (rejected for complexity), if the worker crashes between tool execution and end-of-turn, the partial turn is gone. Mitigation: this is the same failure mode as today's text-only turns; no regression.
- **Old rows render via fallback path forever**. No backfill script. Cost: a `content`-string-only branch in the loader and renderer for the lifetime of the project. Mitigation: branch is small and isolated; cheap to maintain.
- **Status detection on persisted "tool ran but turn ended early" rows**. A `tool_use` block with no matching `tool_result` in the same row → rendered as ✗. Loses the distinction between "errored" and "incomplete because the turn was cut short." Acceptable given non-technical user lens.
- **Adds lucide-react dependency**. ~50KB gzipped. Already a common React icon library; iris previously had no icon system. Acceptable cost.
- **Effort**: ~7-11h. Larger than the original 6-10h estimate because of the consolidation, drive-by fixes, and prompt audit. Smaller than the dual-write alternative would have been.
- **Strike-3 streaming site loses tool surface**. By design — the failure-narration message shouldn't be firing tools. Behavior was already broken (tools passed but results ignored); now it's explicit.

---

## Dependencies

**External:**
- `lucide-react` — new dependency for the tool glyph icons (`Loader2`, `Check`, `X`).

**Internal:**
- `shared/types/widgets.ts` — type union extension.
- `worker/sanitize-tool-messages.ts` — verify it correctly handles new block types when round-tripping to Anthropic's API. Likely needs a `toAnthropicBlocks()` helper that drops `widget`, `image`, `storage_image` blocks (Anthropic-incompatible) when sending history back.
- `worker/index.ts` — new `runStreamingTurn` helper, three call-site collapses.
- `client/App.tsx` — `Turn` type rewrite, single block-driven renderer.
- `client/styles.css` — `.tool-glyph` styles + spinner keyframes.

**No D1 schema breaking changes.** Migration is additive.

---

## Testing Strategy

**Unit / integration tests** (~3-4 specs):
1. **Single-tool turn**: assistant fires one tool, response renders ordered `[text, tool_use, tool_result, text]`. Verify persisted `content_blocks` matches in-memory shape.
2. **Two-round tool turn**: assistant fires two tools across two iterations. Verify all four (`tool_use`, `tool_result`) blocks land in the persisted row in correct order.
3. **Tool-error case**: tool throws; verify `tool_result.is_error: true` is persisted; renderer shows ✗ glyph; AI history reconstruction sends the error content back to Claude.
4. **Widget-only turn audio retention**: turn produces a widget block but no text; assert `turn.audio` is preserved in history.

**Manual verification** (~5 scenarios):
1. Trigger a non-widget tool (`quests.activate`); see spinner → ✓ inline.
2. Force a tool error (temporarily throw inside a tool handler); see ✗.
3. Refresh the page mid-conversation; tool glyphs render correctly in the persisted positions.
4. Trigger a widget tool; widget renders inline at the correct position relative to surrounding text/tool blocks.
5. Send a message likely to provoke JSON-leak; verify TTS does NOT read the JSON (drive-by fix).
6. Confirm legacy text-only turns still render correctly (fallback path).

**Prompt audit** (eval-style, separate from automated tests):
- Send 20+ canonical "should fire a tool" prompts.
- Measure: % of responses that fire a real SDK tool_use vs leak text-channel JSON.
- Iterate the system prompt until JSON-leak rate is near-zero.

---

## Migration Path

This is a refactor, not a behavior-change for end users. Migration is additive and low-risk:

1. Add `content_blocks TEXT` column via additive migration.
2. Land the worker side: `runStreamingTurn` helper, both end-of-turn writes (the new `content_blocks` write and the legacy `content` string), `tool_call`/`tool_result` WS events, drive-by fixes.
3. Land the client side: new `Turn` shape, block-driven renderer, partial-block streaming adapter, lucide-react glyph.
4. Soak in production. Verify legacy rows still render via the fallback path.
5. Drop the `content` string write at end-of-turn (keep the column for backwards-compat reads). Optional, future task — not required for this work to land.

No flag-gating needed; the new persistence is purely additive to old reads.

---

## Key Design Decisions

Captured from `agent/clarifications/clarification-1-content-blocks-refactor.md` (2026-04-28).

### Persistence

| Decision | Choice | Rationale |
|---|---|---|
| Row count per tool round | Single row per assistant turn, written at `done` | iris doesn't need mid-tool crash recovery or auditable tool history; non-technical users gain nothing from dual-write complexity |
| Tool status persistence | Derived from `tool_use` ↔ `tool_result` siblings in same row | No `tool_status` column needed; orphan tool_use → ✗ |
| `is_tool_interaction` flag | Not needed | No intermediate rows to flag in single-write |
| Schema change | Additive only — new `content_blocks TEXT` column | Old rows untouched; fallback path lives forever |
| Backfill | None | Fallback path is small and stable |
| `role` CHECK constraint | Unchanged (`'user' \| 'assistant'`) | Anthropic protocol-compatible without relaxation |

### WebSocket Protocol

| Decision | Choice | Rationale |
|---|---|---|
| Tool-lifecycle events | `tool_call` + `tool_result` | Aligns with Anthropic's block-type names |
| `persistedToolCallId` field | Not included | No mid-tool persistence to correlate to during streaming |
| Persist-pending-then-update | Not used; end-of-turn INSERT only | Matches single-write model; no mid-turn writes |
| Reconnect during tool call | Deferred to follow-up task | Less urgent without mid-tool persistence; orthogonal concern |
| Heartbeat for slow tools | Not included (YAGNI) | Single spinner is sufficient ambient feedback |

### Renderer & UI

| Decision | Choice | Rationale |
|---|---|---|
| Tool glyph component | lucide-react (`Loader2`, `Check`, `X`) | Established React icon library; no custom SVG/CSS spinner |
| Glyph name visibility | None — pure glyph | Non-technical users never see tool identity |
| Glyph clickability | Never | Tool I/O would overwhelm and confuse non-technical users (durable preference) |
| Status derivation (live) | In-place patching of in-memory `tool_use` block | Simpler than cross-block lookup during streaming |
| Status derivation (persisted) | Sibling `tool_result` lookup within same row | No status field needed on `tool_use` block |
| `activeWidget` singleton | Removed | Redundant with `WidgetContentBlock.status === 'active'` |
| `flashcard-freeform` props | Stay as-is, not normalized | Different prop shape reflects real semantic difference (single freeform answer vs quiz-batch with score/total) |
| Audio | Stays on Turn envelope | Block-ifying audio is overscope; bug-fix to retain it on widget-only turns |

### Worker Tool-Loop

| Decision | Choice | Rationale |
|---|---|---|
| Three streaming sites | Consolidated into one `runStreamingTurn` helper | Matches agentbase.me's single-site structure; eliminates latent divergences |
| Strike-3 call's `tools` parameter | Stripped — failure narration goes tool-less | Quest-failure messages don't need the tool surface; eliminates a class of unexpected behaviors |
| `executeToolCall` error handling | Wrap in try/catch at the splice point, produce `{is_error: true}` tool_result | Tool failures shouldn't abort the turn |
| `tool_result.content` shape | Full content persisted in JSON | AI conversation continuity across reloads requires it |

### Image / Multimodal

| Decision | Choice | Rationale |
|---|---|---|
| Image block split | Two variants: `image` (base64 inline, in-flight) and `storage_image` (URL, persisted) | Matches agentbase.me's pattern; persistence and AI-rendering decoupled |
| Image scope in this task | Type-only (option A) | Adds block types to the union; no R2 setup, no upload UI, no Anthropic vision call |
| Camera capture | Deferred to follow-up task in a later milestone | Substantial separate scope (frame sampling, throttling, multimodal calls) |

### Drive-By Fixes (in scope)

| Decision | Choice | Rationale |
|---|---|---|
| `loadHistory` parse-and-discard bug | Fixed — return parsed blocks, not raw JSON string | Adjacent to refactor; new persistence path rewrites the loader anyway |
| TTS reads JSON aloud | Fixed — guard each `streamTTS` call with `!isJson(text.trim())` | One-line × 3 sites; eliminates audible-JSON symptom |
| Prompt audit for JSON-leak root cause | Investigate `buildSystemPromptAsync`, iterate prompt | Eval-style validation, ~1-3h |
| `done` drops audio for widget-only turns | Fixed — retain audio whenever any blocks were produced | Adjacent and easy |

### Scope & Sequencing

| Decision | Choice | Rationale |
|---|---|---|
| Milestone placement | Stays in M7 (Exercises Hub & UX) | Single task; no need to elevate to a dedicated milestone given option-A image scope |
| Pipeline (chain vs direct) | Skip spec + plan; rewrite task-4 directly after this design lands | This design + audit reports are the spec; further docs would be redundant |
| Testing | Integration-style: single tool, two-round tools, error case, widget-only-turn audio | Mirrors agentbase.me's `chat-engine-tool-persistence.spec.ts` pattern |
| Effort | ~7-11h | Includes consolidation, drive-by fixes, prompt audit |

---

## Future Considerations

- **Image upload affordance**: file picker / drag-drop, base64 → R2 upload pipeline, render as `image` block in the user turn. Builds on the type-only foundation laid here.
- **Camera capture (point-and-translate)**: low-frame-rate camera stream, send keyframes as `image` blocks, Iris describes / translates what she sees ("point at a microwave → die Mikrowelle", "point at a street sign → translate it"). The original motivation; substantial standalone task.
- **Reconnect-during-tool-call**: agentbase.me's `generation_in_progress` + don't-abort-on-close + broadcast-to-all-sessions pattern. Useful for "two tabs open" UX even without mid-tool persistence.
- **Tool-result inspector** (developer-only): a dev-mode click-the-✓ panel showing tool input/output. Explicitly out of scope for end users; could land behind a debug flag for future engineering work.
- **Backfill of legacy rows**: re-encode `content`-string-only rows as `[{type: 'text', text: content}]` after a soak period. Optional cleanup; fallback path makes it non-urgent.
- **Drop the legacy `content` string write** at end-of-turn after soak. Keeps the column for backward-compat reads but lets the JSON column be the authoritative write.
- **`memory_carousel` block** (future, agentbase.me has this): if Iris gains a personalized-memory carousel UX, it slots in as another block type without architecture change.

---

**Status**: Design Specification
**Recommendation**: Rewrite task-4 (`agent/tasks/milestone-7-exercises-hub-ux/task-4-content-blocks-refactor.md`) using this design as the authoritative reference, then `@acp.proceed` task-4 to begin implementation.
**Related Documents**:
- `agent/clarifications/clarification-1-content-blocks-refactor.md` — decision capture
- `agent/reports/audit-2-message-persistence-current-state.md`
- `agent/reports/audit-3-worker-tool-loop-architecture.md`
- `agent/reports/audit-4-client-renderer-ws-state.md`
- `../agentbase.me/agent/reports/audit-6-message-persistence-content-blocks.md`
- `../agentbase.me/agent/reports/audit-7-streaming-tool-lifecycle.md`
- `../agentbase.me/agent/reports/audit-8-message-renderer-blocks.md`
- `agent/tasks/milestone-7-exercises-hub-ux/task-4-content-blocks-refactor.md` (to be rewritten)
