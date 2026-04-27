# Widget Dictation — Delta Spec

> **🤖 Agent Directive**: This is an implementation-ready specification. The Behavior Table is the proofing surface; the Tests section is the executable contract. Build against these; do not invent behavior not covered here. Unresolved scenarios are flagged `undefined` in the Behavior Table and linked to Open Questions.

**Namespace**: local
**Version**: 1.0.0
**Created**: 2026-04-27
**Last Updated**: 2026-04-27
**Status**: Draft — awaiting review

---

**Purpose**: Add `dictation` widget type to the Iris worker. User hears a German word or short phrase via TTS audio. NO text is shown during playback. User types what they heard in German. Tests spelling + listening comprehension.

**Source**: Widget system Phase 1 + user directive

**Scope**:
- **In scope**: `dictation` widget type end-to-end; TTS audio generation via Cloudflare AI; Levenshtein-based grading with German normalization (ä/ae, ö/oe, ü/ue, ß/ss, case-insensitive, whitespace trimmed); replay audio button; server-side expected answer storage; SM-2 progress updates; widget persistence
- **Out of scope**: Batch mode (dictation is single-card per widget); sentence-level dictation (only words/short phrases up to 4 words); multi-language TTS (German only for now); audio speed control

---

## Requirements

- **R1**: Claude can call a `dictation` tool with `{ count?: number, cefr_level?: string }` during a voice conversation
- **R2**: The server executes the tool by querying D1 for `count` vocab items (default 1, min 1, max 5) at the specified CEFR level (or the user's current level if omitted), constrained by the user's active lesson/language
- **R3**: For each vocab item, the server generates TTS audio using Cloudflare AI (`@cf/kokoro/v1` model) with German pronunciation
- **R4**: The server sends audio as base64-encoded MP3 via a `tts_audio` message BEFORE the widget payload
- **R5**: The server sends a `widget` message containing the widget payload; the `expected` field (correct German text) is NOT included in this payload
- **R6**: The client plays the audio automatically on widget load, then displays a text input field (no text hint) and a replay button
- **R7**: User can tap the replay button to hear the audio again (no limit on replays)
- **R8**: After the user types their answer and submits, the client sends a `widget_response` message with the user's typed text
- **R9**: The server grades the answer using Levenshtein distance with German normalization (ä→ae, ö→oe, ü→ue, ß→ss, case-insensitive, trim whitespace)
- **R10**: Grading threshold: distance ≤ 2 for words ≤ 8 chars, ≤ 3 for longer words = correct
- **R11**: The server computes a score, updates `user_vocab_progress` with SM-2 scoring, and sends a `widget_result` message with the revealed correct answer
- **R12**: The server feeds a text summary of results back to Claude as the tool_result: "User heard 'Abfahrt' and typed 'Abfart' — close! Correct: Abfahrt"
- **R13**: The full widget payload (expected text, user's answer, grading result, audio URL if persisted) is persisted as a `ContentBlock` on the assistant message in D1
- **R14**: When the client loads conversation history containing a dictation widget, it renders the widget in its "completed" state (expected text shown, user's answer shown, correctness revealed, replay button active)
- **R15**: Completed widgets in history display a "retake" button that re-sends the same vocab item as a new widget (new widget_id, same word, new TTS audio generated, new response expected)
- **R16**: If the user disconnects mid-widget (no `widget_response` within 120 seconds), the server times out the widget, records no progress
- **R17**: If the user changes language while a widget is pending, the pending widget is cancelled
- **R18**: If no target language is selected (`targetLang` is null), the tool call is rejected with a tool_result error: "Please select a language first"
- **R19**: The Claude tool definition for `dictation` is included in the tools array passed to `anthropic.messages.stream()` when the user has a target language selected
- **R20**: If TTS generation fails (Cloudflare AI error, quota exceeded, network timeout), the tool call fails gracefully with error message, no widget is sent

---

## Interfaces / Data Shapes

### Widget Type (shared/types/widgets.ts — already defined)

```typescript
export interface DictationWidget extends WidgetBase {
  type: 'dictation'
  audio: true
  cefr_level: string
}
```

### Expanded DictationWidget (runtime-only, not in public payload)

```typescript
interface DictationWidgetInternal extends DictationWidget {
  expected: string  // server-side only, not sent to client
  vocab_id: number  // for SM-2 update
  audio_base64: string  // base64 MP3, sent in separate tts_audio message
}
```

### Widget Response (client → server)

```typescript
interface DictationResponse {
  type: 'widget_response'
  widget_id: string
  answer: string
}
```

### Widget Result (server → client, after grading)

```typescript
interface DictationResult {
  type: 'widget_result'
  widget_id: string
  widget_type: 'dictation'
  score: number        // 0 or 1
  total: number        // always 1
  correct: boolean
  expected: string     // revealed after grading
  user_answer: string
  distance: number     // Levenshtein distance after normalization
}
```

### TTS Audio Message (server → client, before widget)

```typescript
interface TTSAudioMessage {
  type: 'tts_audio'
  widget_id: string
  audio_base64: string  // base64-encoded MP3
  language: string      // 'de' for German
}
```

### Persisted Widget ContentBlock (in D1 messages table)

```typescript
interface WidgetContentBlock {
  type: 'widget'
  widget_type: 'dictation'
  widget_id: string
  payload: DictationWidget
  response?: DictationResponse | null
  result?: DictationResult | null
  status: 'active' | 'completed' | 'timed_out' | 'cancelled'
  audio_url?: string  // optional: if audio is persisted to R2 for long-term storage
}
```

### WebSocket Protocol Extensions

```typescript
// Server → Client (added to existing ServerMessage union)
| { type: 'tts_audio'; widget_id: string; audio_base64: string; language: string }

// Client → Server (added to existing ClientMessage handling)
| { type: 'widget_response'; widget_id: string; answer: string }
```

### Claude Tool Definition

```typescript
{
  name: 'dictation',
  description: 'Start a dictation exercise. The user hears a German word or short phrase via audio (no text shown) and types what they heard. Tests spelling and listening comprehension. Use when the user wants to practice listening or spelling.',
  input_schema: {
    type: 'object',
    properties: {
      count: { type: 'integer', minimum: 1, maximum: 5, description: 'Number of words. Default 1.' },
      cefr_level: { type: 'string', enum: ['A1', 'A2', 'B1'], description: 'Target CEFR level. Omit to use the user\'s current level.' },
    },
    required: [],
  },
}
```

### Levenshtein Grading Function

```typescript
function normalizeGerman(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

function gradeDictation(expected: string, userAnswer: string): { correct: boolean; distance: number } {
  const normalizedExpected = normalizeGerman(expected)
  const normalizedAnswer = normalizeGerman(userAnswer)
  const distance = levenshteinDistance(normalizedExpected, normalizedAnswer)
  const threshold = normalizedExpected.length <= 8 ? 2 : 3
  return { correct: distance <= threshold, distance }
}
```

---

## Behavior Table

| # | Scenario | Expected Behavior | Tests |
|---|----------|-------------------|-------|
| 1 | User says "let's practice listening," Claude calls dictation tool | Server generates 1 card, generates TTS audio, sends tts_audio then widget to client | `happy-path-dictation-single` |
| 2 | User types correct answer and submits | Server grades, sends result with revealed expected text, updates SM-2, feeds summary to Claude | `happy-path-grade-correct` |
| 3 | User types answer with minor typo (distance ≤ threshold) | Graded as correct | `minor-typo-accepted` |
| 4 | User types answer with major errors (distance > threshold) | Graded as incorrect | `major-errors-rejected` |
| 5 | Claude calls dictation with explicit count=3 | Server generates exactly 3 widgets sequentially (one at a time, not batched) | `explicit-count-respected` |
| 6 | Claude calls dictation with explicit cefr_level=A2 | Server picks vocab from A2 only | `explicit-cefr-level` |
| 7 | Claude calls dictation with no count | Server defaults to 1 widget | `default-count-is-1` |
| 8 | Claude calls dictation with no cefr_level | Server uses the user's current CEFR level | `default-cefr-from-user-progress` |
| 9 | Claude calls dictation with count=0 | Tool rejected: "count must be between 1 and 5" | `rejects-count-zero` |
| 10 | Claude calls dictation with count=10 | Tool rejected: "count must be between 1 and 5" | `rejects-count-over-max` |
| 11 | Claude calls dictation but no target language selected | Tool rejected: "Please select a language first" | `rejects-no-target-language` |
| 12 | Zero vocab items exist for the target language | Tool rejected: "No vocabulary available for [language]" | `rejects-empty-vocab` |
| 13 | TTS generation fails (Cloudflare AI error) | Tool rejected with error message, no widget sent | `handles-tts-failure` |
| 14 | User disconnects mid-widget (no response within 120s) | Server times out, records no progress, feeds timeout to Claude | `timeout-120s-no-progress` |
| 15 | User changes language while widget is pending | Server cancels widget, sends widget_cancel, records no progress | `cancel-on-language-change` |
| 16 | User sends widget_response with wrong widget_id | Response ignored (logged as warning) | `ignores-wrong-widget-id` |
| 17 | User sends widget_response with empty answer | Graded as incorrect (distance = length of expected) | `empty-answer-scored-wrong` |
| 18 | User sends widget_response after timeout already fired | Response ignored (widget already resolved) | `ignores-response-after-timeout` |
| 19 | Page refresh after completed widget | History loads with widget in completed state (expected text, user's answer, correctness visible, replay button active) | `refresh-shows-completed-widget` |
| 20 | User clicks "retake" on a completed widget in history | Client sends a retake request; server generates a new widget with the same vocab item, new TTS audio, new widget_id | `retake-generates-new-widget` |
| 21 | SM-2 update on correct answer (first time) | interval_days: 0→1, ease: 2.5→2.6 | `sm2-correct-first-time` |
| 22 | SM-2 update on incorrect answer | interval_days → 0, ease: max(1.3, prev-0.2) | `sm2-incorrect-resets-interval` |
| 23 | Widget payload does NOT include expected field | Client cannot know the answer before responding | `no-answer-in-widget-payload` |
| 24 | Widget result DOES include expected field | Client renders revealed answer after grading | `answer-revealed-in-result` |
| 25 | Tool result fed to Claude is a text summary, not structured data | Claude sees "User heard 'Abfahrt' and typed 'Abfart' — close! Correct: Abfahrt" | `tool-result-is-text-summary` |
| 26 | Widget persisted as ContentBlock with full payload + response + result | D1 messages row contains the complete widget lifecycle | `widget-persisted-as-content-block` |
| 27 | User clicks replay button during active widget | Audio plays again (same audio_base64) | `replay-button-works` |
| 28 | User clicks replay button in completed widget from history | Audio plays again (from persisted audio_url or cached audio_base64) | `replay-in-history-works` |
| 29 | German normalization: "Müller" typed as "Mueller" | Graded as correct (distance = 0 after normalization) | `normalization-ue-correct` |
| 30 | German normalization: "Straße" typed as "Strasse" | Graded as correct (distance = 0 after normalization) | `normalization-ss-correct` |
| 31 | German normalization: "Käse" typed as "kaese" | Graded as correct (distance = 0 after normalization, case-insensitive) | `normalization-ae-case-correct` |
| 32 | Threshold for short word (≤ 8 chars): distance = 2 | Graded as correct | `threshold-short-word-boundary` |
| 33 | Threshold for short word (≤ 8 chars): distance = 3 | Graded as incorrect | `threshold-short-word-exceeded` |
| 34 | Threshold for long word (> 8 chars): distance = 3 | Graded as correct | `threshold-long-word-boundary` |
| 35 | Threshold for long word (> 8 chars): distance = 4 | Graded as incorrect | `threshold-long-word-exceeded` |
| 36 | Multi-word phrase (up to 4 words): "die große Frau" | TTS audio generated for full phrase, graded as single unit | `multi-word-phrase-supported` |

---

## Behavior (Step-by-Step)

### Tool Call Flow

1. User speaks (or types). Server transcribes, pushes to Claude with `tools: [dictationTool, ...]`
2. Claude streams response. If it includes a `tool_use` block for `dictation`:
   a. Server validates parameters (count, cefr_level, target language)
   b. Server queries D1 for `count` vocab items: unseen first, then due-for-review, then already-seen, at the target CEFR level
   c. For each item:
      i. Server generates a `widget_id` (opaque, unique)
      ii. Server calls Cloudflare AI TTS API with the German text (`@cf/kokoro/v1`, voice: German female)
      iii. Server receives MP3 audio, encodes as base64
      iv. Server sends `{ type: 'tts_audio', widget_id, audio_base64, language: 'de' }` over WS
      v. Server sends `{ type: 'widget', widget: { type: 'dictation', widget_id, audio: true, cefr_level } }` over WS — does NOT include `expected`
      vi. Server starts a 120s timeout timer for this widget_id
      vii. Client receives tts_audio message, buffers audio
      viii. Client receives widget message, plays audio, renders text input + replay button
3. User types answer, clicks submit
4. Client sends `{ type: 'widget_response', widget_id, answer: '<user_typed_text>' }`
5. Server receives response:
   a. Matches `widget_id` to the pending widget; ignores if not found or already resolved
   b. Grades answer using Levenshtein distance with German normalization
   c. Computes correctness based on threshold
   d. Updates `user_vocab_progress` via SM-2 (correct or incorrect)
   e. Sends `{ type: 'widget_result', widget_id, widget_type: 'dictation', score: 0 or 1, total: 1, correct, expected, user_answer, distance }`
   f. Persists the full widget lifecycle (payload + response + result + audio_base64 or audio_url) as a ContentBlock on the assistant message in D1
   g. Builds a text summary and returns it as the `tool_result` content to Claude
   h. Claude loop continues
6. If count > 1, repeat steps 2c-2h for the next vocab item

### Timeout Flow

1. 120s passes with no `widget_response`
2. Server cancels the timer, builds a timeout tool_result: "Widget timed out — user did not respond within 2 minutes"
3. No SM-2 updates
4. Widget is persisted in "timed_out" state (no response, no result)
5. Claude loop continues with the timeout result

### Cancel Flow (Language Change)

1. Client sends `{ type: 'language', code, name, english }`
2. Server detects a pending widget
3. Server sends `{ type: 'widget_cancel', widget_id, reason: 'Language changed' }`
4. Server cancels the timeout timer, builds a cancelled tool_result
5. No SM-2 updates
6. Widget is persisted in "cancelled" state
7. Claude loop continues

### Replay Flow

1. User clicks replay button (during active widget or in history)
2. Client plays the audio from the buffered `audio_base64` (active) or persisted `audio_url` (history)
3. No server round-trip required

---

## Acceptance Criteria

- [ ] **AC1**: User can say "test my listening" or "dictation exercise" and Claude invokes the dictation tool without explicit instructions
- [ ] **AC2**: Audio plays automatically when the widget loads, before the text input is shown
- [ ] **AC3**: User can replay the audio multiple times by clicking the replay button
- [ ] **AC4**: Minor typos (1-2 character differences, normalized) are accepted as correct
- [ ] **AC5**: Major errors (3+ character differences for short words, 4+ for long words) are rejected
- [ ] **AC6**: German characters (ä, ö, ü, ß) can be typed as ae, oe, ue, ss without penalty
- [ ] **AC7**: After grading, the expected German text is revealed along with the user's typed answer
- [ ] **AC8**: Page refresh after completing a dictation widget shows the widget in its completed state in chat history, with replay button active
- [ ] **AC9**: Clicking "retake" on a completed widget starts a new session with the same word but freshly generated TTS audio
- [ ] **AC10**: Words the user gets wrong reappear sooner in future sessions (SM-2 interval reset to 0)
- [ ] **AC11**: Claude reacts to the score naturally in conversation ("Sehr gut! You got 'Abfahrt' perfectly")
- [ ] **AC12**: The widget payload sent to the client does not contain the expected answer
- [ ] **AC13**: If no target language is selected, Claude's tool call fails gracefully and Claude explains
- [ ] **AC14**: If TTS generation fails, the tool call fails gracefully with an error message visible to Claude

---

## Tests

### Base Cases

The core dictation behavior contract.

#### Test: happy-path-dictation-single (covers R1, R2, R3, R4, R5, R6)

**Given**: User has target language = German (deu), CEFR level A1 has 678 vocab items, user has seen 0

**When**: Claude calls `dictation({})`

**Then** (assertions):
- **tts-audio-sent**: Server sends exactly 1 `tts_audio` message over WS with `audio_base64` (non-empty string) and `language: 'de'`
- **widget-sent-after-audio**: Server sends exactly 1 `widget` message AFTER the tts_audio message
- **widget-type-dictation**: Widget has `type: 'dictation'`
- **no-expected-field**: Widget payload does not contain `expected` field
- **audio-true**: Widget has `audio: true`
- **cefr-level-set**: Widget has `cefr_level: 'A1'`

#### Test: happy-path-grade-correct (covers R8, R9, R10, R11, R12, R13)

**Given**: Client has received a dictation widget for the word "Abfahrt"

**When**: User types "Abfahrt" and submits

**Then** (assertions):
- **result-sent**: Server sends exactly 1 `widget_result` message
- **score-1**: `widget_result.score` is 1
- **total-1**: `widget_result.total` is 1
- **correct-true**: `widget_result.correct` is true
- **expected-revealed**: `widget_result.expected` is "Abfahrt"
- **user-answer-echoed**: `widget_result.user_answer` is "Abfahrt"
- **distance-0**: `widget_result.distance` is 0
- **sm2-updated**: `user_vocab_progress` row exists for the vocab item with updated `ease`, `interval_days`, `due_at`, `last_seen_at`
- **tool-result-text**: The tool_result content fed to Claude is a string containing "Abfahrt" and indicates correct answer
- **persisted**: D1 `messages` table contains a row with `content` including a `WidgetContentBlock` with `payload`, `response`, and `result` all populated

#### Test: minor-typo-accepted (covers R9, R10)

**Given**: Client has received a dictation widget for the word "Abfahrt"

**When**: User types "Abfart" (1 character off)

**Then** (assertions):
- **correct-true**: `widget_result.correct` is true
- **distance-1**: `widget_result.distance` is 1

#### Test: major-errors-rejected (covers R9, R10)

**Given**: Client has received a dictation widget for the word "Abfahrt"

**When**: User types "Anfart" (2 substitutions)

**Then** (assertions):
- **correct-false**: `widget_result.correct` is false
- **distance-2-or-more**: `widget_result.distance` >= 2 (depends on exact Levenshtein calculation)

#### Test: explicit-count-respected (covers R1, R2)

**Given**: Target language selected

**When**: Claude calls `dictation({ count: 3 })`

**Then** (assertions):
- **three-widgets**: Server sends 3 separate tts_audio + widget pairs (sequentially, not batched)
- **each-unique**: Each widget has a distinct `widget_id`

#### Test: explicit-cefr-level (covers R2)

**Given**: Target language selected, A2 has 1400 vocab items

**When**: Claude calls `dictation({ cefr_level: 'A2' })`

**Then** (assertions):
- **widget-cefr-a2**: Widget has `cefr_level: 'A2'`
- **word-from-a2**: The expected word (server-side) comes from a vocab_item with `cefr_level='A2'`

#### Test: default-count-is-1 (covers R2)

**Given**: Target language selected

**When**: Claude calls `dictation({})` with no `count` field

**Then** (assertions):
- **one-widget**: Server sends exactly 1 widget

#### Test: default-cefr-from-user-progress (covers R2)

**Given**: User has seen all A1 words (all have `user_vocab_progress` rows), none of A2

**When**: Claude calls `dictation({})` with no `cefr_level`

**Then** (assertions):
- **picks-lowest-unseen-or-due**: Widget word is from A1 (due for review) or A2 (unseen), preferring unseen A2

#### Test: no-answer-in-widget-payload (covers R5)

**Given**: Server generates a dictation widget

**When**: Widget message is sent to client

**Then** (assertions):
- **no-expected**: JSON payload does not contain key `expected` at any nesting level

#### Test: answer-revealed-in-result (covers R11)

**Given**: Server has graded a dictation widget

**When**: `widget_result` message is sent

**Then** (assertions):
- **has-expected**: Result has `expected` (string)
- **has-user-answer**: Result has `user_answer` (string)

#### Test: tool-result-is-text-summary (covers R12)

**Given**: Server has graded a dictation widget

**When**: Tool result is fed back to Claude

**Then** (assertions):
- **is-string**: The tool_result content is a plain string, not structured JSON
- **contains-expected-word**: String contains the expected German word
- **contains-user-answer**: String contains what the user typed
- **contains-correctness**: String indicates correct or incorrect

#### Test: widget-persisted-as-content-block (covers R13)

**Given**: A dictation widget has been completed (graded)

**When**: The assistant message is persisted to D1

**Then** (assertions):
- **content-is-array**: Message `content` is a `ContentBlock[]`, not a plain string
- **has-widget-block**: Array contains a block with `type: 'widget'`
- **has-payload**: Widget block has `payload` matching the original widget
- **has-response**: Widget block has `response` matching the user's answer
- **has-result**: Widget block has `result` matching the grading output

#### Test: refresh-shows-completed-widget (covers R14)

**Given**: User completed a dictation widget in a previous session

**When**: User reconnects (page refresh), server sends `history` message

**Then** (assertions):
- **widget-in-history**: History includes the assistant message with the widget ContentBlock
- **client-renders-completed**: Client renders the widget in completed state (expected text shown, user's answer shown, correctness revealed, replay button active)

### Edge Cases

Boundaries, error handling, timeout, normalization.

#### Test: rejects-count-zero (covers R2)

**Given**: Target language selected

**When**: Claude calls `dictation({ count: 0 })`

**Then** (assertions):
- **tool-error**: Tool result is an error string: "count must be between 1 and 5"
- **no-widget-sent**: No `widget` or `tts_audio` message sent to client

#### Test: rejects-count-over-max (covers R2)

**Given**: Target language selected

**When**: Claude calls `dictation({ count: 10 })`

**Then** (assertions):
- **tool-error**: Tool result is an error string: "count must be between 1 and 5"

#### Test: rejects-no-target-language (covers R18)

**Given**: `targetLang` is null (no language selected)

**When**: Claude calls `dictation({})`

**Then** (assertions):
- **tool-error**: Tool result is an error string: "Please select a language first"
- **no-widget-sent**: No `widget` message sent to client
- **no-sm2-writes**: No rows inserted/updated in `user_vocab_progress`

#### Test: rejects-empty-vocab (covers R12)

**Given**: Target language = Japanese (jpn), zero vocab items exist for jpn in D1

**When**: Claude calls `dictation({})`

**Then** (assertions):
- **tool-error**: Tool result is an error string: "No vocabulary available for Japanese"

#### Test: handles-tts-failure (covers R20)

**Given**: Target language selected, Cloudflare AI TTS API returns error (e.g. 500 status)

**When**: Claude calls `dictation({})`

**Then** (assertions):
- **tool-error**: Tool result is an error string containing "TTS generation failed" or similar
- **no-widget-sent**: No `widget` or `tts_audio` message sent to client
- **no-sm2-writes**: No rows inserted/updated in `user_vocab_progress`

#### Test: timeout-120s-no-progress (covers R16)

**Given**: Server sent a dictation widget to the client

**When**: 120 seconds pass with no `widget_response`

**Then** (assertions):
- **no-sm2-writes**: No `user_vocab_progress` row updated for this widget's vocab
- **tool-result-timeout**: Tool result fed to Claude contains "timed out"
- **widget-persisted-timed-out**: Widget ContentBlock has `response: null`, `result: null`, `status: 'timed_out'`
- **claude-loop-continues**: Claude streaming loop resumes and can produce a text response

#### Test: cancel-on-language-change (covers R17)

**Given**: Server sent a dictation widget, user has not yet responded

**When**: Client sends `{ type: 'language', code: 'fra', name: 'Français', english: 'French' }`

**Then** (assertions):
- **cancel-sent**: Server sends `{ type: 'widget_cancel', widget_id, reason: 'Language changed' }`
- **no-sm2-writes**: No progress updates
- **timer-cleared**: The 120s timeout is cancelled
- **tool-result-cancelled**: Tool result fed to Claude contains "cancelled"

#### Test: ignores-wrong-widget-id (covers R8)

**Given**: Server has a pending widget with `widget_id = "abc123"`

**When**: Client sends `widget_response` with `widget_id = "xyz999"`

**Then** (assertions):
- **ignored**: No grading occurs, no error sent to client
- **logged**: Server logs a warning

#### Test: empty-answer-scored-wrong (covers R8, R9)

**Given**: Widget for the word "Abfahrt" (length 7)

**When**: Client sends `widget_response` with `answer: ""`

**Then** (assertions):
- **correct-false**: `widget_result.correct` is false
- **distance-7**: `widget_result.distance` is 7 (equal to length of expected)

#### Test: ignores-response-after-timeout (covers R16)

**Given**: Widget timed out (120s passed, timeout result already sent to Claude)

**When**: Client sends `widget_response` for that widget_id

**Then** (assertions):
- **ignored**: No grading, no SM-2 update, no widget_result sent
- **no-double-tool-result**: Claude does not receive a second tool_result

#### Test: retake-generates-new-widget (covers R15)

**Given**: User completed a dictation widget for the word "Abfahrt"

**When**: User clicks "retake" on the completed widget

**Then** (assertions):
- **new-widget-id**: New widget has a different `widget_id`
- **same-word**: New widget is for the same vocab word "Abfahrt"
- **new-audio**: New TTS audio is generated (fresh call to Cloudflare AI)
- **independent-grading**: Grading the retake does not overwrite the original widget's result in history

#### Test: sm2-correct-first-time (covers R11, R21)

**Given**: Vocab item has no `user_vocab_progress` row (defaults: ease=2.5, interval_days=0)

**When**: User answers correctly

**Then** (assertions):
- **interval-1**: `interval_days` = 1
- **ease-2.6**: `ease` = 2.6
- **due-tomorrow**: `due_at` = now + 86400

#### Test: sm2-incorrect-resets-interval (covers R11, R22)

**Given**: Vocab item has ease=2.5, interval_days=16

**When**: User answers incorrectly

**Then** (assertions):
- **interval-0**: `interval_days` = 0
- **ease-2.3**: `ease` = max(1.3, 2.5 - 0.2) = 2.3

#### Test: replay-button-works (covers R7, R27)

**Given**: Client has received a dictation widget and audio has been buffered

**When**: User clicks the replay button

**Then** (assertions):
- **audio-replays**: Audio plays from the buffered `audio_base64` (client-side only, no server round-trip)

#### Test: replay-in-history-works (covers R7, R28)

**Given**: User has a completed dictation widget in chat history

**When**: User clicks the replay button in the history widget

**Then** (assertions):
- **audio-replays**: Audio plays from the persisted audio data (either `audio_url` from R2 or cached `audio_base64`)

#### Test: normalization-ue-correct (covers R9, R29)

**Given**: Widget for the word "Müller"

**When**: User types "Mueller"

**Then** (assertions):
- **correct-true**: `widget_result.correct` is true
- **distance-0**: `widget_result.distance` is 0 (after normalization Müller → mueller, Mueller → mueller)

#### Test: normalization-ss-correct (covers R9, R30)

**Given**: Widget for the word "Straße"

**When**: User types "Strasse"

**Then** (assertions):
- **correct-true**: `widget_result.correct` is true
- **distance-0**: `widget_result.distance` is 0 (after normalization Straße → strasse, Strasse → strasse)

#### Test: normalization-ae-case-correct (covers R9, R31)

**Given**: Widget for the word "Käse"

**When**: User types "kaese"

**Then** (assertions):
- **correct-true**: `widget_result.correct` is true
- **distance-0**: `widget_result.distance` is 0 (after normalization + case folding: Käse → kaese, kaese → kaese)

#### Test: threshold-short-word-boundary (covers R10, R32)

**Given**: Widget for a 6-character word "Schule"

**When**: User types "Scule" (distance = 1 after normalization, but let's say "Shule" = distance 2 exactly)

**Then** (assertions):
- **correct-true**: `widget_result.correct` is true (6 chars ≤ 8, threshold = 2, distance = 2)

#### Test: threshold-short-word-exceeded (covers R10, R33)

**Given**: Widget for a 6-character word "Schule"

**When**: User types "Shle" (distance = 3 after removing 2 chars)

**Then** (assertions):
- **correct-false**: `widget_result.correct` is false (6 chars ≤ 8, threshold = 2, distance = 3 > 2)

#### Test: threshold-long-word-boundary (covers R10, R34)

**Given**: Widget for a 12-character word "Entschuldigung" (actually 14, but using a 12-char example)

**When**: User types an answer with distance = 3 after normalization

**Then** (assertions):
- **correct-true**: `widget_result.correct` is true (12 chars > 8, threshold = 3, distance = 3)

#### Test: threshold-long-word-exceeded (covers R10, R35)

**Given**: Widget for a 12-character word

**When**: User types an answer with distance = 4 after normalization

**Then** (assertions):
- **correct-false**: `widget_result.correct` is false (12 chars > 8, threshold = 3, distance = 4 > 3)

#### Test: multi-word-phrase-supported (covers R36)

**Given**: Vocab item is a 3-word phrase "die große Frau"

**When**: Server generates TTS audio and widget

**Then** (assertions):
- **audio-generated**: TTS audio is generated for the full phrase "die große Frau"
- **grading-as-single-unit**: When user types "die grosse Frau", grading treats the entire phrase as one string (normalized, distance calculated for entire phrase)
- **correct-if-within-threshold**: Phrase length > 8, threshold = 3, minor typos accepted

---

## Non-Goals

- Batch mode (dictation widgets are sent one at a time, even if count > 1)
- Sentence-level dictation (only words or short phrases up to ~4 words; longer sentences will be a future enhancement)
- Multi-language TTS (German only for now; French, Spanish, etc. will be added in future phases)
- Audio speed control (play at 0.75x, 1.25x speeds — future enhancement)
- Audio persistence to R2 (audio is sent as base64 in tts_audio message; long-term R2 storage is optional and not required for MVP)
- "Exercises" top-level menu with dictation history browsing (future feature)
- Partial credit scoring (e.g. "90% correct" — only binary correct/incorrect for now)
- Hint button (e.g. "show first letter" — future enhancement)

---

## Open Questions

- **OQ-1**: Should audio be persisted to R2 for long-term storage, or is in-message base64 + ephemeral caching sufficient? Leaning toward ephemeral for MVP, R2 for history replay optimization in Phase 2.
- **OQ-2**: Should the replay button show a count of how many times the user replayed (for analytics)? Leaning toward no for MVP (adds UI noise).
- **OQ-3**: Should the threshold scale dynamically based on word complexity (e.g. compound words, diacritics)? Leaning toward fixed thresholds for MVP, smarter thresholds in Phase 2.
- **OQ-4**: Should multi-word phrases be limited to 4 words, or should we support arbitrary sentence length? Leaning toward 4-word cap for MVP (TTS quality degrades for long sentences; use comprehension widget for full sentences).
- **OQ-5**: Should we show the user's distance score in the result UI (e.g. "Distance: 2")? Leaning toward no (too technical; just show correct/incorrect and reveal the expected answer).

---

## Related Artifacts

- **Phase 1 Spec**: `agent/specs/local.widget-system-phase1.md` (shared infrastructure)
- **Widget Types**: `shared/types/widgets.ts` (DictationWidget interface)
- **Design**: `agent/design/local.widget-system.md`
- **Audit**: `agent/reports/audit-1-scenecraft-tool-architecture.md`
- **Schema**: `migrations/0003_curriculum_schema.sql` (vocab_items, user_vocab_progress)
- **Data**: `migrations/0004_seed_goethe.sql` (4,870 vocab items)

---

**Status**: Draft — awaiting review
**Recommendation**: Review Behavior Table, confirm or resolve Open Questions, then implement after Phase 1 ships
**Related Documents**: `agent/specs/local.widget-system-phase1.md`, `shared/types/widgets.ts`
