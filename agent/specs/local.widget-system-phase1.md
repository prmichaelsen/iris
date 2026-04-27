# Widget System — Phase 1 Spec (Flashcard-Matching MVP)

> **🤖 Agent Directive**: This is an implementation-ready specification. The Behavior Table is the proofing surface; the Tests section is the executable contract. Build against these; do not invent behavior not covered here. Unresolved scenarios are flagged `undefined` in the Behavior Table and linked to Open Questions.

**Namespace**: local
**Version**: 1.0.0
**Created**: 2026-04-27
**Last Updated**: 2026-04-27
**Status**: Draft — awaiting review

---

**Purpose**: Add Claude tool-use to the Iris Worker so Claude can invoke a `flashcard` tool that produces an interactive matching quiz widget rendered inline in the chat, with server-side grading, SM-2 progress updates, and full persistence for replay/retake.

**Source**: `--from-design agent/design/local.widget-system.md` + interactive clarification

**Scope**:
- **In scope**: `flashcard-matching` widget type end-to-end; all 11 widget types defined as TypeScript types; batch mode (10 cards per session); server-side grading; SM-2 progress updates; widget persistence for history replay and retake; WebSocket protocol extensions
- **Out of scope**: All other widget types (flashcard-freeform, dictation, comprehension, fill-blank, gender-pick, article-in-context, pluralization, conjugation, definition, sentence-order); TTS audio for flashcard words (Phase 2); "exercises" top-level menu; user-steered drill generation; lesson tool

---

## Requirements

- **R1**: Claude can call a `flashcard` tool with `{ mode: 'matching', count?: number, cefr_level?: string }` during a voice conversation
- **R2**: The server executes the tool by querying D1 for `count` vocab items (default 10, min 1, max 20) at the specified CEFR level (or the user's current level if omitted), constrained by the user's active lesson/language
- **R3**: For each vocab item, the server selects 3 distractor options from the same CEFR level, ensuring no duplicate options and the correct answer is not repeated
- **R4**: The server sends a single `widget` message containing the full batch of cards to the client; the `correct_index` and `correct_answer` are NOT included in this payload
- **R5**: The client renders the cards sequentially: one card at a time, user picks an option, advances to the next card, until all cards are answered
- **R6**: After the last card, the client sends a single `widget_response` message with all answers back to the server
- **R7**: The server grades each answer, computes a score, updates `user_vocab_progress` with SM-2 scoring (correct → increase ease + extend interval; incorrect → reset interval + decrease ease), and sends a `widget_result` message with per-card results and the revealed correct answers
- **R8**: The server feeds a text summary of results back to Claude as the tool_result: "User scored 7/10: Abfahrt ✓, Schule ✓, Arbeit ✗, ..." so Claude can react naturally
- **R9**: The full widget payload (cards, user's answers, per-card results, score) is persisted as a `ContentBlock` on the assistant message in D1, so it survives page refresh and can be replayed or retaken
- **R10**: When the client loads conversation history containing a widget, it renders the widget in its "completed" state (showing each card, what the user picked, whether it was right, the correct answer revealed)
- **R11**: Completed widgets in history display a "retake" button that re-sends the same card set as a new widget (new widget_id, same vocab items + distractors, new response expected)
- **R12**: If the user's CEFR level has fewer remaining unseen words than `count`, the server repeats already-seen vocab (prioritizing words due for review via SM-2 `due_at`) to fill the batch
- **R13**: If no target language is selected (`targetLang` is null), the tool call is rejected with a tool_result error: "Please select a language first"
- **R14**: If the user disconnects mid-widget (no `widget_response` within 300 seconds), the server times out the widget, records no progress, and feeds a timeout result to Claude
- **R15**: If the user changes language while a widget is pending, the pending widget is cancelled (server sends `widget_cancel` to the client, records no progress)
- **R16**: All 11 widget types are defined as TypeScript types in a shared `types/widgets.ts` file, but only `flashcard-matching` is implemented in Phase 1
- **R17**: The Claude tool definition for `flashcard` is included in the tools array passed to `anthropic.messages.stream()` when the user has a target language selected
- **R18**: The streaming tool-use loop supports up to 10 tool iterations per user turn (matching scenecraft's pattern), with text deltas streamed as existing `response_text` messages

---

## Interfaces / Data Shapes

### Widget Types (shared/types/widgets.ts)

```typescript
interface WidgetBase {
  widget_id: string
}

interface FlashcardMatchingWidget extends WidgetBase {
  type: 'flashcard-matching'
  cards: FlashcardMatchingCard[]
  cefr_level: string
}

interface FlashcardMatchingCard {
  card_id: string
  word: string        // "die Abfahrt"
  options: string[]   // ["departure", "arrival", "flight", "platform"] — 4 options, shuffled
}

// (10 other widget interfaces defined but not implemented — see design doc)

type Widget =
  | FlashcardMatchingWidget
  | FlashcardFreeformWidget
  | DictationWidget
  | ComprehensionWidget
  | FillBlankWidget
  | GenderPickWidget
  | ArticleInContextWidget
  | PluralizationWidget
  | ConjugationWidget
  | DefinitionWidget
  | SentenceOrderWidget
```

### Widget Response (client → server)

```typescript
interface FlashcardMatchingResponse {
  type: 'widget_response'
  widget_id: string
  answers: { card_id: string; selected_index: number }[]
}
```

### Widget Result (server → client, after grading)

```typescript
interface FlashcardMatchingResult {
  type: 'widget_result'
  widget_id: string
  score: number              // e.g. 7
  total: number              // e.g. 10
  cards: FlashcardMatchingCardResult[]
}

interface FlashcardMatchingCardResult {
  card_id: string
  word: string
  correct_answer: string     // revealed after grading
  correct_index: number      // revealed after grading
  selected_index: number     // what the user picked
  correct: boolean
}
```

### Widget Cancel (server → client)

```typescript
interface WidgetCancel {
  type: 'widget_cancel'
  widget_id: string
  reason: string
}
```

### Persisted Widget ContentBlock (in D1 messages table)

```typescript
interface WidgetContentBlock {
  type: 'widget'
  widget_type: 'flashcard-matching'
  widget_id: string
  payload: FlashcardMatchingWidget  // original widget (no answers)
  response?: FlashcardMatchingResponse  // user's answers (null if timed out)
  result?: FlashcardMatchingResult  // grading results (null if timed out)
}
```

### WebSocket Protocol Extensions

```typescript
// Server → Client (added to existing ServerMessage union)
| { type: 'widget'; widget: FlashcardMatchingWidget }
| { type: 'widget_result'; ...FlashcardMatchingResult }
| { type: 'widget_cancel'; widget_id: string; reason: string }

// Client → Server (added to existing ClientMessage handling)
| { type: 'widget_response'; widget_id: string; answers: { card_id: string; selected_index: number }[] }
```

### Claude Tool Definition

```typescript
{
  name: 'flashcard',
  description: 'Start a flashcard exercise. The server generates matching-mode cards from the user\'s vocabulary at their CEFR level. Use when the user wants to practice, drill, or review vocabulary.',
  input_schema: {
    type: 'object',
    properties: {
      mode: { type: 'string', enum: ['matching'], description: 'Quiz mode. Phase 1: only matching is supported.' },
      count: { type: 'integer', minimum: 1, maximum: 20, description: 'Number of cards. Default 10.' },
      cefr_level: { type: 'string', enum: ['A1', 'A2', 'B1'], description: 'Target CEFR level. Omit to use the user\'s current level.' },
    },
    required: ['mode'],
  },
}
```

### SM-2 Scoring Function

```typescript
function sm2Update(correct: boolean, prev: { ease: number; interval_days: number }): { ease: number; interval_days: number } {
  if (correct) {
    const newInterval = prev.interval_days === 0 ? 1
      : prev.interval_days === 1 ? 6
      : Math.round(prev.interval_days * prev.ease)
    const newEase = Math.max(1.3, prev.ease + 0.1)
    return { interval_days: newInterval, ease: newEase }
  }
  return { interval_days: 0, ease: Math.max(1.3, prev.ease - 0.2) }
}
```

---

## Behavior Table

| # | Scenario | Expected Behavior | Tests |
|---|----------|-------------------|-------|
| 1 | User says "let's practice vocab," Claude calls flashcard tool | Server generates 10 cards, sends batch widget to client | `happy-path-flashcard-batch` |
| 2 | User completes all 10 cards and submits | Server grades, sends result with revealed answers, updates SM-2, feeds summary to Claude | `happy-path-grade-and-persist` |
| 3 | Claude calls flashcard with explicit count=5 | Server generates exactly 5 cards | `explicit-count-respected` |
| 4 | Claude calls flashcard with explicit cefr_level=A2 | Server picks vocab from A2 only (distractors also from A2) | `explicit-cefr-level` |
| 5 | Claude calls flashcard with no count | Server defaults to 10 cards | `default-count-is-10` |
| 6 | Claude calls flashcard with no cefr_level | Server uses the user's current CEFR level (lowest level with unseen words, or lowest level with due words) | `default-cefr-from-user-progress` |
| 7 | Claude calls flashcard with count=0 | Tool rejected: "count must be between 1 and 20" | `rejects-count-zero` |
| 8 | Claude calls flashcard with count=25 | Tool rejected: "count must be between 1 and 20" | `rejects-count-over-max` |
| 9 | Claude calls flashcard but no target language selected | Tool rejected: "Please select a language first" | `rejects-no-target-language` |
| 10 | Claude calls flashcard with mode != 'matching' | Tool rejected: "Only matching mode is supported in Phase 1" | `rejects-unsupported-mode` |
| 11 | Fewer unseen words than count at the CEFR level | Server fills batch with due-for-review words, then random already-seen words | `fills-batch-with-review-words` |
| 12 | Zero vocab items exist for the target language | Tool rejected: "No vocabulary available for [language]" | `rejects-empty-vocab` |
| 13 | Distractor generation: correct answer must not appear in distractors | Each card has exactly 4 unique options including the correct one | `distractors-are-unique` |
| 14 | Distractor generation: fewer than 3 other words at the same CEFR level | Distractors sourced from adjacent CEFR levels | `distractors-fallback-adjacent-level` |
| 15 | User disconnects mid-widget (no response within 300s) | Server times out, records no progress, feeds timeout to Claude | `timeout-300s-no-progress` |
| 16 | User changes language while widget is pending | Server cancels widget, sends widget_cancel, records no progress | `cancel-on-language-change` |
| 17 | User sends a voice message while widget is pending | Voice message is queued; widget takes priority; voice processed after widget resolves or times out | `voice-queued-during-widget` |
| 18 | User sends widget_response with wrong widget_id | Response ignored (logged as warning) | `ignores-wrong-widget-id` |
| 19 | User sends widget_response with too few answers | Server grades only provided answers; missing cards scored as incorrect | `partial-response-scored-as-wrong` |
| 20 | User sends widget_response with selected_index out of bounds | That card scored as incorrect | `out-of-bounds-index-scored-wrong` |
| 21 | User sends widget_response after timeout already fired | Response ignored (widget already resolved) | `ignores-response-after-timeout` |
| 22 | Page refresh during active widget | On reconnect, server replays history; active widget is NOT re-sent (it timed out or was cancelled during disconnect) | `refresh-during-widget-shows-history` |
| 23 | Page refresh after completed widget | History loads with widget in completed state (cards, answers, results, score visible) | `refresh-shows-completed-widget` |
| 24 | User clicks "retake" on a completed widget in history | Client sends a retake request; server generates a new widget with the same vocab items but freshly shuffled options and a new widget_id | `retake-generates-new-widget` |
| 25 | SM-2 update on correct answer (first time) | interval_days: 0→1, ease: 2.5→2.6 | `sm2-correct-first-time` |
| 26 | SM-2 update on correct answer (second time, interval=1) | interval_days: 1→6, ease: 2.6→2.7 | `sm2-correct-second-time` |
| 27 | SM-2 update on correct answer (subsequent, interval=6, ease=2.7) | interval_days: round(6*2.7)=16, ease: 2.7→2.8 | `sm2-correct-subsequent` |
| 28 | SM-2 update on incorrect answer | interval_days → 0, ease: max(1.3, prev-0.2) | `sm2-incorrect-resets-interval` |
| 29 | SM-2 ease floor | Ease never drops below 1.3, even after many incorrect answers | `sm2-ease-floor` |
| 30 | Widget payload does NOT include correct_index or correct_answer | Client cannot know the answer before responding | `no-answer-in-widget-payload` |
| 31 | Widget result DOES include correct_index and correct_answer | Client renders revealed answers after grading | `answer-revealed-in-result` |
| 32 | Tool result fed to Claude is a text summary, not structured data | Claude sees "User scored 7/10: Abfahrt ✓, Schule ✗, ..." | `tool-result-is-text-summary` |
| 33 | Multiple flashcard tool calls in one turn | Each executes sequentially; max 10 tool iterations per turn | `multiple-tools-per-turn` |
| 34 | Widget persisted as ContentBlock with full payload + response + result | D1 messages row contains the complete widget lifecycle | `widget-persisted-as-content-block` |
| 35 | Retake widget tracks as a separate entry in user_vocab_progress | Each retake is a new scoring event; previous scores are not overwritten | `retake-creates-new-progress-entry` |

---

## Behavior (Step-by-Step)

### Tool Call Flow

1. User speaks (or types). Server transcribes, pushes to Claude with `tools: [flashcardTool, ...]`
2. Claude streams response. If it includes a `tool_use` block for `flashcard`:
   a. Server validates parameters (mode, count, cefr_level, target language)
   b. Server queries D1 for vocab items: unseen first, then due-for-review, then already-seen, at the target CEFR level
   c. For each item, server picks 3 distractors (same CEFR level preferred, adjacent levels as fallback), shuffles options, records correct_index server-side
   d. Server generates a `widget_id` (opaque, unique)
   e. Server sends `{ type: 'widget', widget: { type: 'flashcard-matching', widget_id, cards: [...], cefr_level } }` over WS — cards contain `word` and `options` but NOT `correct_index`
   f. Server starts a 300s timeout timer for this widget_id
3. Client receives the widget message, renders the first card
4. User taps an option → client shows next card → repeat until all cards answered
5. Client sends `{ type: 'widget_response', widget_id, answers: [{ card_id, selected_index }, ...] }`
6. Server receives response:
   a. Matches `widget_id` to the pending widget; ignores if not found or already resolved
   b. Grades each card (compare `selected_index` against the server-side `correct_index`)
   c. Computes score (correct_count / total)
   d. Updates `user_vocab_progress` for each card via SM-2
   e. Sends `{ type: 'widget_result', widget_id, score, total, cards: [{ card_id, word, correct_answer, correct_index, selected_index, correct }, ...] }`
   f. Persists the full widget lifecycle (payload + response + result) as a ContentBlock on the assistant message in D1
   g. Builds a text summary and returns it as the `tool_result` content to Claude
   h. Claude loop continues (Claude may respond with text, call another tool, or end_turn)

### Timeout Flow

1. 300s passes with no `widget_response`
2. Server cancels the timer, builds a timeout tool_result: "Widget timed out — user did not respond within 5 minutes"
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

---

## Acceptance Criteria

- [ ] **AC1**: User can say "quiz me" or "let's practice" and Claude invokes the flashcard tool without explicit instructions
- [ ] **AC2**: A batch of 10 cards renders as a sequential flow in the chat — one card visible at a time, with a progress indicator (e.g., "3 / 10")
- [ ] **AC3**: After the last card, a summary screen shows score + per-card results with revealed correct answers
- [ ] **AC4**: Page refresh after completing a widget shows the widget in its completed state in chat history
- [ ] **AC5**: Clicking "retake" on a completed widget starts a new session with the same words but freshly shuffled options
- [ ] **AC6**: Words the user gets wrong reappear sooner in future flashcard sessions (SM-2 interval reset to 0)
- [ ] **AC7**: Words the user gets right space out in future sessions (SM-2 interval grows)
- [ ] **AC8**: Claude reacts to the score naturally in conversation ("Gut gemacht! 8 von 10...")
- [ ] **AC9**: The widget payload sent to the client does not contain the correct answer
- [ ] **AC10**: If no target language is selected, Claude's tool call fails gracefully and Claude explains

---

## Tests

### Base Cases

The core flashcard-matching behavior contract.

#### Test: happy-path-flashcard-batch (covers R1, R2, R3, R4, R5)

**Given**: User has target language = German (deu), CEFR level A1 has 678 vocab items, user has seen 0

**When**: Claude calls `flashcard({ mode: 'matching' })`

**Then** (assertions):
- **widget-sent**: Server sends exactly 1 `widget` message over WS
- **card-count-10**: Widget contains `cards` array of length 10
- **each-card-has-4-options**: Every card has `options` array of length 4
- **no-correct-index**: No card object contains a `correct_index` or `correct_answer` field
- **unique-options**: Within each card, all 4 option strings are distinct
- **word-from-vocab**: Each card's `word` field matches a `display` value from `vocab_items` where `language='deu'` and `cefr_level='A1'`

#### Test: happy-path-grade-and-persist (covers R6, R7, R8, R9)

**Given**: Client has received a 10-card widget and user has selected answers for all 10

**When**: Client sends `widget_response` with 10 answers (7 correct, 3 incorrect)

**Then** (assertions):
- **result-sent**: Server sends exactly 1 `widget_result` message
- **score-7**: `widget_result.score` is 7
- **total-10**: `widget_result.total` is 10
- **correct-answers-revealed**: Each card in `widget_result.cards` contains `correct_answer` (string) and `correct_index` (number)
- **per-card-grading**: Exactly 7 cards have `correct: true`, 3 have `correct: false`
- **sm2-updated**: `user_vocab_progress` rows exist for all 10 vocab items with updated `ease`, `interval_days`, `due_at`, `last_seen_at`
- **tool-result-text**: The tool_result content fed to Claude is a string matching pattern "User scored 7/10: <word> ✓, <word> ✗, ..."
- **persisted**: D1 `messages` table contains a row with `content` including a `WidgetContentBlock` with `payload`, `response`, and `result` all populated

#### Test: explicit-count-respected (covers R2)

**Given**: Target language selected

**When**: Claude calls `flashcard({ mode: 'matching', count: 5 })`

**Then** (assertions):
- **card-count-5**: Widget contains `cards` array of length 5

#### Test: explicit-cefr-level (covers R2)

**Given**: Target language selected, A2 has 1400 vocab items

**When**: Claude calls `flashcard({ mode: 'matching', cefr_level: 'A2' })`

**Then** (assertions):
- **all-cards-a2**: Every card's word comes from a vocab_item with `cefr_level='A2'`
- **distractors-a2**: Distractors are sourced from A2 vocab (English glosses of other A2 words)

#### Test: default-count-is-10 (covers R2)

**Given**: Target language selected

**When**: Claude calls `flashcard({ mode: 'matching' })` with no `count` field

**Then** (assertions):
- **card-count-10**: Widget contains 10 cards

#### Test: default-cefr-from-user-progress (covers R2)

**Given**: User has seen all A1 words (all have `user_vocab_progress` rows), none of A2

**When**: Claude calls `flashcard({ mode: 'matching' })` with no `cefr_level`

**Then** (assertions):
- **picks-lowest-unseen**: Cards are from A1 (due for review) or A2 (unseen), preferring unseen A2 over reviewed A1

#### Test: no-answer-in-widget-payload (covers R4)

**Given**: Server generates a flashcard widget

**When**: Widget message is sent to client

**Then** (assertions):
- **no-correct-index**: JSON payload does not contain key `correct_index` at any nesting level
- **no-correct-answer**: JSON payload does not contain key `correct_answer` at any nesting level

#### Test: answer-revealed-in-result (covers R7)

**Given**: Server has graded a widget response

**When**: `widget_result` message is sent

**Then** (assertions):
- **has-correct-index**: Every card in `cards[]` has `correct_index` (number)
- **has-correct-answer**: Every card in `cards[]` has `correct_answer` (string)

#### Test: tool-result-is-text-summary (covers R8)

**Given**: Server has graded a widget

**When**: Tool result is fed back to Claude

**Then** (assertions):
- **is-string**: The tool_result content is a plain string, not structured JSON
- **contains-score**: String contains "N/M" where N=correct, M=total
- **contains-per-word**: String contains each word followed by ✓ or ✗

#### Test: widget-persisted-as-content-block (covers R9)

**Given**: A flashcard widget has been completed (graded)

**When**: The assistant message is persisted to D1

**Then** (assertions):
- **content-is-array**: Message `content` is a `ContentBlock[]`, not a plain string
- **has-widget-block**: Array contains a block with `type: 'widget'`
- **has-payload**: Widget block has `payload` matching the original widget
- **has-response**: Widget block has `response` matching the user's answers
- **has-result**: Widget block has `result` matching the grading output

#### Test: refresh-shows-completed-widget (covers R10)

**Given**: User completed a flashcard widget in a previous session

**When**: User reconnects (page refresh), server sends `history` message

**Then** (assertions):
- **widget-in-history**: History includes the assistant message with the widget ContentBlock
- **client-renders-completed**: Client renders the widget in completed state (cards shown with user's picks, correct answers revealed, score displayed)

#### Test: multiple-tools-per-turn (covers R18)

**Given**: Claude decides to call `flashcard` twice in one turn

**When**: Both tool calls execute

**Then** (assertions):
- **sequential-execution**: Second widget is sent only after first widget resolves
- **both-graded**: Both widget results are fed back to Claude
- **max-10-iterations**: If Claude attempts more than 10 tool calls in one turn, the loop breaks and returns to the user

### Edge Cases

Boundaries, error handling, concurrency, timeout.

#### Test: rejects-count-zero (covers R2)

**Given**: Target language selected

**When**: Claude calls `flashcard({ mode: 'matching', count: 0 })`

**Then** (assertions):
- **tool-error**: Tool result is an error string: "count must be between 1 and 20"
- **no-widget-sent**: No `widget` message sent to client

#### Test: rejects-count-over-max (covers R2)

**Given**: Target language selected

**When**: Claude calls `flashcard({ mode: 'matching', count: 25 })`

**Then** (assertions):
- **tool-error**: Tool result is an error string: "count must be between 1 and 20"

#### Test: rejects-no-target-language (covers R13)

**Given**: `targetLang` is null (no language selected)

**When**: Claude calls `flashcard({ mode: 'matching' })`

**Then** (assertions):
- **tool-error**: Tool result is an error string: "Please select a language first"
- **no-widget-sent**: No `widget` message sent to client
- **no-sm2-writes**: No rows inserted/updated in `user_vocab_progress`

#### Test: rejects-unsupported-mode (covers R17)

**Given**: Target language selected

**When**: Claude calls `flashcard({ mode: 'freeform' })`

**Then** (assertions):
- **tool-error**: Tool result is an error string containing "Only matching mode is supported"

#### Test: rejects-empty-vocab (covers R12, R13)

**Given**: Target language = Japanese (jpn), zero vocab items exist for jpn in D1

**When**: Claude calls `flashcard({ mode: 'matching' })`

**Then** (assertions):
- **tool-error**: Tool result is an error string: "No vocabulary available for Japanese"

#### Test: fills-batch-with-review-words (covers R12)

**Given**: User has target CEFR A1, only 3 unseen words remain, 5 words are due for review (due_at <= now), 670 words seen but not yet due

**When**: Claude calls `flashcard({ mode: 'matching', count: 10 })`

**Then** (assertions):
- **batch-full**: Widget contains 10 cards
- **unseen-first**: 3 of the cards are the unseen words
- **due-next**: 5 of the cards are the due-for-review words
- **fill-remaining**: 2 cards are from the seen-but-not-due pool

#### Test: distractors-are-unique (covers R3)

**Given**: Any flashcard widget generated

**When**: Inspecting each card's options

**Then** (assertions):
- **no-duplicates**: `new Set(card.options).size === card.options.length` for every card
- **correct-included**: The correct answer (English gloss of the vocab item) appears exactly once in options

#### Test: distractors-fallback-adjacent-level (covers R3)

**Given**: Target CEFR level has only 2 vocab items total (e.g. a hypothetical scenario or a language with sparse data)

**When**: Server generates distractors for a card

**Then** (assertions):
- **still-4-options**: Card has 4 options
- **adjacent-sourced**: Missing distractors are sourced from adjacent CEFR levels (A1→A2, A2→A1 or B1)

#### Test: timeout-300s-no-progress (covers R14)

**Given**: Server sent a widget to the client

**When**: 300 seconds pass with no `widget_response`

**Then** (assertions):
- **no-sm2-writes**: No `user_vocab_progress` rows updated for this widget's vocab
- **tool-result-timeout**: Tool result fed to Claude contains "timed out"
- **widget-persisted-timed-out**: Widget ContentBlock has `response: null`, `result: null`, status = 'timed_out'
- **claude-loop-continues**: Claude streaming loop resumes and can produce a text response

#### Test: cancel-on-language-change (covers R15)

**Given**: Server sent a widget, user has not yet responded

**When**: Client sends `{ type: 'language', code: 'fra', name: 'Français', english: 'French' }`

**Then** (assertions):
- **cancel-sent**: Server sends `{ type: 'widget_cancel', widget_id, reason: 'Language changed' }`
- **no-sm2-writes**: No progress updates
- **timer-cleared**: The 300s timeout is cancelled
- **tool-result-cancelled**: Tool result fed to Claude contains "cancelled"

#### Test: voice-queued-during-widget (covers R17)

**Given**: A widget is pending (waiting for `widget_response`)

**When**: Client sends a binary audio frame (voice recording)

**Then** (assertions):
- **not-processed-immediately**: Audio is NOT transcribed while widget is pending
- **processed-after-resolve**: After widget resolves (response, timeout, or cancel), the queued audio is processed as a normal voice turn

#### Test: ignores-wrong-widget-id (covers R4)

**Given**: Server has a pending widget with `widget_id = "abc123"`

**When**: Client sends `widget_response` with `widget_id = "xyz999"`

**Then** (assertions):
- **ignored**: No grading occurs, no error sent to client
- **logged**: Server logs a warning

#### Test: partial-response-scored-as-wrong (covers R6)

**Given**: Widget has 10 cards

**When**: Client sends `widget_response` with only 6 answers

**Then** (assertions):
- **6-graded**: 6 cards graded based on selected_index
- **4-wrong**: 4 missing cards scored as incorrect
- **sm2-updated-all**: All 10 vocab items get SM-2 updates (6 based on actual answer, 4 as incorrect)

#### Test: out-of-bounds-index-scored-wrong (covers R6)

**Given**: A card has 4 options (indices 0-3)

**When**: Client sends `selected_index: 7` for that card

**Then** (assertions):
- **scored-wrong**: That card is scored as incorrect
- **no-crash**: Server does not throw; other cards are graded normally

#### Test: ignores-response-after-timeout (covers R14)

**Given**: Widget timed out (300s passed, timeout result already sent to Claude)

**When**: Client sends `widget_response` for that widget_id

**Then** (assertions):
- **ignored**: No grading, no SM-2 update, no widget_result sent
- **no-double-tool-result**: Claude does not receive a second tool_result

#### Test: retake-generates-new-widget (covers R11)

**Given**: User completed a flashcard widget with words [Abfahrt, Schule, Arbeit, ...]

**When**: User clicks "retake" on the completed widget

**Then** (assertions):
- **new-widget-id**: New widget has a different `widget_id`
- **same-words**: New widget contains the same vocab words
- **reshuffled**: Options order may differ from the original
- **independent-grading**: Grading the retake does not overwrite the original widget's result in history

#### Test: sm2-correct-first-time (covers R7)

**Given**: Vocab item has no `user_vocab_progress` row (defaults: ease=2.5, interval_days=0)

**When**: User answers correctly

**Then** (assertions):
- **interval-1**: `interval_days` = 1
- **ease-2.6**: `ease` = 2.6
- **due-tomorrow**: `due_at` = now + 86400

#### Test: sm2-correct-second-time (covers R7)

**Given**: Vocab item has ease=2.6, interval_days=1

**When**: User answers correctly

**Then** (assertions):
- **interval-6**: `interval_days` = 6
- **ease-2.7**: `ease` = 2.7

#### Test: sm2-correct-subsequent (covers R7)

**Given**: Vocab item has ease=2.7, interval_days=6

**When**: User answers correctly

**Then** (assertions):
- **interval-16**: `interval_days` = round(6 * 2.7) = 16
- **ease-2.8**: `ease` = 2.8

#### Test: sm2-incorrect-resets-interval (covers R7)

**Given**: Vocab item has ease=2.5, interval_days=16

**When**: User answers incorrectly

**Then** (assertions):
- **interval-0**: `interval_days` = 0
- **ease-2.3**: `ease` = max(1.3, 2.5 - 0.2) = 2.3

#### Test: sm2-ease-floor (covers R7)

**Given**: Vocab item has ease=1.3, interval_days=0

**When**: User answers incorrectly

**Then** (assertions):
- **ease-stays-1.3**: `ease` = max(1.3, 1.3 - 0.2) = 1.3 (floor, does not go to 1.1)

#### Test: retake-creates-new-progress-entry (covers R11)

**Given**: User completed original widget, vocab "Abfahrt" was scored correct (ease=2.6, interval=1)

**When**: User retakes and gets "Abfahrt" wrong this time

**Then** (assertions):
- **ease-updated**: `ease` is now max(1.3, 2.6 - 0.2) = 2.4
- **interval-reset**: `interval_days` = 0
- **original-preserved**: The original widget's result in chat history still shows ✓ for Abfahrt

---

## Non-Goals

- TTS audio for flashcard words (Phase 2)
- Widget types other than `flashcard-matching` (Phases 2-6)
- "Exercises" top-level menu with drill history and retake browsing (future feature)
- User-steered drill generation via custom prompts (future feature)
- Lesson activation/management tool (future feature)
- Batch summary screen as a separate route/page (summary renders inline in chat)
- Internationalization of the widget UI chrome (English-only for now)

---

## Open Questions

- **OQ-1**: Should the progress indicator during the card sequence be "3 / 10" (current card) or "3 of 10 correct" (running score)? Leaning toward "3 / 10" (position) since showing the running score might stress the user.
- **OQ-2**: Should the retake button be visible immediately on completed widgets, or should it appear on hover/tap (less visual noise)?
- **OQ-3**: When Claude calls flashcard and the user hasn't spoken yet (first turn), should the tool call work or should it require at least one conversational exchange first? Currently specified as: works if target language is set, regardless of conversation history.
- **OQ-4**: For the "exercises" top-level menu (future), should completed widgets be queryable as a separate D1 table, or is filtering the `messages` table by ContentBlock type sufficient?

---

## Related Artifacts

- **Design**: `agent/design/local.widget-system.md`
- **Audit**: `agent/reports/audit-1-scenecraft-tool-architecture.md`
- **Schema**: `migrations/0003_curriculum_schema.sql` (vocab_items, user_vocab_progress)
- **Data**: `migrations/0004_seed_goethe.sql` (4,870 vocab items)

---

**Status**: Draft — awaiting review
**Recommendation**: Review Behavior Table, confirm or resolve Open Questions, then implement
**Related Documents**: `agent/design/local.widget-system.md`, `agent/reports/audit-1-scenecraft-tool-architecture.md`
