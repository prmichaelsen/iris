---
slug: tool-call-leaks-into-tts
type: bugfix
status: open
created: 2026-05-06
severity: high
---

# Tool call JSON leaks into TTS response

## Symptom

When Claude emits `tool_use`-shaped JSON in the text channel (instead of going
through the SDK tool-use mechanism), the worker forwards that JSON straight
into `streamTTS`. The user hears Iris read raw JSON aloud (`"name": "quests",
"input": ...`). Jarring, especially for non-technical users.

## Root cause

Two-layer problem:

1. **Prompt layer** — Claude occasionally treats tool calls as text content
   rather than emitting them via the tool-use SDK channel. This is a prompting
   bug; needs investigation in `worker/buildSystemPromptAsync` and any
   examples in the system prompt that might teach Claude that text-channel
   JSON is acceptable.
2. **Worker layer** — `streamTTS` is called unconditionally on
   `fullAssistantText` at three sites. There is no guard to skip TTS when
   the text is JSON-shaped.

## Affected sites

`worker/index.ts` calls to `streamTTS(fullAssistantText, ...)`:

- `runTurn` end-of-turn TTS (~line 610)
- Quest-failure path in the `timeout` handler (~line 736)
- `widget_retake` handler (~line 803)

(Line numbers drift; grep `streamTTS\(` in `worker/index.ts`.)

## Fix

**Short-term (defensive):** guard each `streamTTS` call with
`!isJson(text.trim())`. `shared/utils.ts` already exports `isJson`. One-line
× 3 sites; eliminates the audible-JSON symptom even when the prompt layer
slips. Cross-referenced in
`agent/design/local.content-blocks-architecture.md` as a documented mitigation.

**Long-term (root):** iterate the system prompt until canonical "should fire
a tool" inputs reliably produce SDK `tool_use` blocks rather than
text-channel JSON. Eval: 20+ canonical prompts, count text-channel-JSON
emissions; target zero. See
`agent/design/local.content-blocks-architecture.md` line 180.

## Don't

- Don't strip JSON from text before TTS — that masks the prompt bug. Skip
  the TTS call entirely when the text is JSON-shaped, so the symptom is
  silent failure rather than corrupted audio.

## Related

- `agent/design/local.content-blocks-architecture.md` — broader content-blocks
  refactor that touches this same code path
- `shared/utils.ts` `isJson` — already-existing helper
