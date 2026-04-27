# Widget System — Comprehension Widget Delta Spec

> **🤖 Agent Directive**: This is a delta specification that extends Phase 1. Read `local.widget-system-phase1.md` for shared infrastructure (WebSocket protocol, persistence, tool-use loop, SM-2 scoring). This spec defines only the unique behavior of the `comprehension` widget type.

**Namespace**: local
**Version**: 1.0.0
**Created**: 2026-04-27
**Last Updated**: 2026-04-27
**Status**: Draft — awaiting review
**Extends**: `local.widget-system-phase1.md`

---

**Purpose**: Add the `comprehension` tool to Iris so Claude can test listening comprehension by playing a German word/phrase via TTS and asking the user to type the English meaning. No text is shown — audio only. Grading uses Claude to evaluate semantic equivalence, tolerating synonyms and paraphrases.

**Source**: User request for comprehension widget delta spec

**Scope**:
- **In scope**: `comprehension` widget type end-to-end; TTS audio generation and delivery; Claude-based semantic grading; partial credit; replay button; server-side expected meaning; batch mode (1-10 questions per session)
- **Out of scope**: Showing the German text (audio-only); dictation (where user types the German word — that's a separate widget type); showing the user's answer history (that's a chat history feature)

---

## Unique Requirements (Delta)

- **R1**: Claude can call a `comprehension` tool with `{ count?: number, cefr_level?: string }` during a voice conversation
- **R2**: The server executes the tool by querying D1 for `count` vocab items (default 5, min 1, max 10) at the specified CEFR level (or the user's current level if omitted), constrained by the user's active lesson/language
- **R3**: For each vocab item, the server generates TTS audio for the German word/phrase using the same TTS engine as the voice tutor (e.g., Deepgram or ElevenLabs)
- **R4**: The server sends the TTS audio to the client BEFORE sending the widget payload, via a new `tts_audio` message containing the audio URL or inline base64-encoded audio
- **R5**: The server sends a single `widget` message containing the batch of questions; each question includes the `audio_id` (linking to the TTS audio) but NO text of the German word
- **R6**: The client renders questions sequentially: plays the audio, shows a text input for the English meaning, user types their answer, advances to next question
- **R7**: Each question card displays a "replay" button that replays the TTS audio for that question
- **R8**: After the last question, the client sends a single `widget_response` message with all answers back to the server
- **R9**: The server grades each answer using Claude by calling the Anthropic API with a grading prompt that compares the user's answer to the `expected_meaning` (the `gloss_en` field from `vocab_items`), tolerating synonyms, paraphrases, and partial credit
- **R10**: The grading prompt instructs Claude to return structured JSON: `{ correct: boolean, score: number, feedback: string }` where `score` is 0.0 to 1.0 (partial credit allowed)
- **R11**: The server computes a final score by summing the per-question scores and dividing by the total (e.g., 3.5/5 = 70%)
- **R12**: The server updates `user_vocab_progress` with SM-2 scoring: score >= 0.7 counts as "correct", score < 0.7 counts as "incorrect"
- **R13**: The server sends a `widget_result` message with per-question results (user's answer, expected meaning, Claude's feedback, score)
- **R14**: The server feeds a text summary of results back to Claude as the tool_result: "User scored 3.5/5 (70%): Abfahrt → 'departure' ✓ (1.0), Schule → 'place to learn' ✓ (0.8), Arbeit → 'working' ✗ (0.4)..."
- **R15**: The full widget payload (questions, TTS audio references, user's answers, per-question results, score) is persisted as a `WidgetContentBlock` in D1, so it survives page refresh and can be replayed or retaken
- **R16**: When the client loads conversation history containing a completed comprehension widget, it renders the widget in "completed" state (showing each question, the user's typed answer, the expected meaning, Claude's feedback, and the score)
- **R17**: Completed widgets in history display a "retake" button that re-sends the same vocab items as a new widget (new widget_id, new TTS audio, new response expected)
- **R18**: If the TTS service fails for any question, that question is skipped (server logs an error, does not send a card for that vocab item, adjusts count accordingly)
- **R19**: If Claude grading fails for any question, that question is scored as 0.0 with feedback "Grading unavailable"

---

## Interfaces / Data Shapes (Delta)

### ComprehensionWidget (from shared/types/widgets.ts)

```typescript
export interface ComprehensionCard {
  card_id: string
  audio_id: string  // reference to the TTS audio file/URL
  // NO "word" field — user must listen, not read
}

export interface ComprehensionWidget extends WidgetBase {
  type: 'comprehension'
  cards: ComprehensionCard[]
  cefr_level: string
}

export interface ComprehensionAnswer {
  card_id: string
  answer: string  // user's typed English meaning
}

export interface ComprehensionResponse {
  type: 'widget_response'
  widget_id: string
  answers: ComprehensionAnswer[]
}

export interface ComprehensionCardResult {
  card_id: string
  word: string                // revealed after grading
  expected_meaning: string    // revealed after grading
  user_answer: string
  score: number               // 0.0 to 1.0
  correct: boolean            // score >= 0.7
  feedback: string            // Claude's explanation
  audio_id: string            // so client can replay in results
}

export interface ComprehensionResult {
  type: 'widget_result'
  widget_id: string
  widget_type: 'comprehension'
  score: number               // sum of per-card scores
  total: number               // number of cards
  cards: ComprehensionCardResult[]
}
```

### TTS Audio Message (server → client)

```typescript
interface TTSAudioMessage {
  type: 'tts_audio'
  audio_id: string
  url?: string        // if using external storage (e.g., R2)
  data?: string       // base64-encoded audio if inline
  format: 'mp3' | 'opus' | 'wav'
}
```

### Claude Grading Prompt

```typescript
const gradingPrompt = `You are grading a language learning exercise. The user heard a German word/phrase and typed the English meaning.

German word: "${vocabItem.display}"
Expected meaning: "${vocabItem.gloss_en}"
User's answer: "${userAnswer}"

Evaluate whether the user's answer matches the expected meaning. Tolerate synonyms, paraphrases, and minor spelling errors. Award partial credit if the answer is close but incomplete.

Respond with JSON only (no markdown, no explanation outside the JSON):
{
  "correct": true or false (true if score >= 0.7),
  "score": 0.0 to 1.0,
  "feedback": "Brief explanation (1-2 sentences)"
}

Examples:
- Expected: "departure", User: "leaving" → { "correct": true, "score": 1.0, "feedback": "Perfect — 'leaving' is a synonym for 'departure'." }
- Expected: "school", User: "place to learn" → { "correct": true, "score": 0.8, "feedback": "Close — 'place to learn' is a valid paraphrase of 'school'." }
- Expected: "work", User: "working" → { "correct": false, "score": 0.4, "feedback": "Partial — 'working' is related but 'work' (noun) is the better translation." }
- Expected: "train station", User: "bus stop" → { "correct": false, "score": 0.0, "feedback": "Incorrect — 'bus stop' is a different location." }`
```

### Claude Tool Definition

```typescript
{
  name: 'comprehension',
  description: 'Start a listening comprehension exercise. The server generates questions where the user hears a German word/phrase (via TTS, no text shown) and types the English meaning. Use when the user wants to practice listening comprehension, test their understanding, or drill vocab recognition by ear.',
  input_schema: {
    type: 'object',
    properties: {
      count: { type: 'integer', minimum: 1, maximum: 10, description: 'Number of questions. Default 5.' },
      cefr_level: { type: 'string', enum: ['A1', 'A2', 'B1'], description: 'Target CEFR level. Omit to use the user\'s current level.' },
    },
    required: [],
  },
}
```

---

## Behavior Table (Delta)

Only unique behaviors are listed; shared behaviors (timeout, cancel, SM-2, persistence, retake) inherit from Phase 1.

| # | Scenario | Expected Behavior | Tests |
|---|----------|-------------------|-------|
| 1 | User says "test my listening," Claude calls comprehension tool | Server generates 5 questions, generates TTS audio for each, sends tts_audio messages, then widget | `happy-path-comprehension-batch` |
| 2 | User hears "die Abfahrt," types "departure" | Graded as correct (score 1.0) | `exact-match-correct` |
| 3 | User hears "die Schule," types "place to learn" | Graded as correct (score 0.8, partial credit) | `paraphrase-partial-credit` |
| 4 | User hears "die Arbeit," types "working" | Graded as incorrect (score 0.4, related but wrong form) | `related-but-wrong-scored-low` |
| 5 | User hears "der Bahnhof," types "bus stop" | Graded as incorrect (score 0.0, wrong meaning) | `wrong-meaning-zero-score` |
| 6 | User clicks "replay" button on a question card | Client replays the TTS audio from the audio_id | `replay-button-works` |
| 7 | User completes all questions and submits | Server grades via Claude, sends result with revealed words + meanings + feedback, updates SM-2 | `happy-path-grade-with-claude` |
| 8 | Claude calls comprehension with explicit count=3 | Server generates exactly 3 questions | `explicit-count-respected` |
| 9 | Claude calls comprehension with no count | Server defaults to 5 questions | `default-count-is-5` |
| 10 | Claude calls comprehension with count=0 | Tool rejected: "count must be between 1 and 10" | `rejects-count-zero` |
| 11 | Claude calls comprehension with count=15 | Tool rejected: "count must be between 1 and 10" | `rejects-count-over-max` |
| 12 | Claude calls comprehension but no target language selected | Tool rejected: "Please select a language first" | `rejects-no-target-language` |
| 13 | TTS service fails for one question out of 5 | Server skips that question, generates 4 cards, logs error | `tts-failure-skips-question` |
| 14 | TTS service fails for all questions | Tool rejected: "TTS audio generation failed" | `tts-failure-all-rejects-tool` |
| 15 | Claude grading fails for one question (API error) | That question scored 0.0, feedback "Grading unavailable" | `grading-failure-fallback` |
| 16 | Claude grading returns malformed JSON | That question scored 0.0, feedback "Grading unavailable", error logged | `malformed-grading-json-fallback` |
| 17 | User types nothing (empty answer) for a question | Graded as incorrect (score 0.0), feedback "No answer provided" | `empty-answer-scored-zero` |
| 18 | User types whitespace-only answer | Graded as incorrect (score 0.0), feedback "No answer provided" | `whitespace-answer-scored-zero` |
| 19 | SM-2 update: score 1.0 counts as correct | ease increases, interval extends | `sm2-high-score-correct` |
| 20 | SM-2 update: score 0.8 counts as correct | ease increases, interval extends | `sm2-partial-credit-correct` |
| 21 | SM-2 update: score 0.6 counts as incorrect | interval resets, ease decreases | `sm2-low-partial-credit-incorrect` |
| 22 | SM-2 update: score 0.0 counts as incorrect | interval resets, ease decreases | `sm2-zero-score-incorrect` |
| 23 | Final score computed as sum of per-card scores / total | e.g., (1.0 + 0.8 + 0.4 + 1.0 + 0.6) / 5 = 0.76 = 76% | `final-score-averaged-correctly` |
| 24 | Tool result fed to Claude includes per-word breakdown | "User scored 3.8/5 (76%): Abfahrt → 'departure' ✓ (1.0), ..." | `tool-result-per-word-breakdown` |
| 25 | Widget payload does NOT include the German word or expected meaning | Client cannot see the answer before responding | `no-answer-in-widget-payload` |
| 26 | Widget result DOES include word, expected_meaning, user_answer, score, feedback | Client renders revealed answers with feedback after grading | `answer-revealed-in-result` |
| 27 | Page refresh after completed widget | History shows widget with audio playable, user's answers, revealed words, feedback | `refresh-shows-completed-widget` |
| 28 | User clicks "retake" on completed widget | New widget generated with same vocab, new TTS audio, new widget_id | `retake-generates-new-widget-and-audio` |
| 29 | TTS audio stored as URL (e.g., R2 bucket) | tts_audio message contains `url` field, client fetches audio | `tts-audio-url-delivered` |
| 30 | TTS audio stored as inline base64 | tts_audio message contains `data` field, client decodes and plays | `tts-audio-inline-delivered` |

---

## Behavior (Step-by-Step)

### Tool Call Flow

1. User speaks or types. Server transcribes, pushes to Claude with `tools: [comprehensionTool, ...]`
2. Claude streams response. If it includes a `tool_use` block for `comprehension`:
   a. Server validates parameters (count, cefr_level, target language)
   b. Server queries D1 for vocab items: unseen first, then due-for-review, then already-seen, at the target CEFR level
   c. For each vocab item, server generates TTS audio (calls TTS service with the German word/phrase)
   d. Server sends `tts_audio` messages to the client (one per audio file), each with a unique `audio_id`
   e. Server generates a `widget_id` and sends `{ type: 'widget', widget: { type: 'comprehension', widget_id, cards: [{ card_id, audio_id }, ...], cefr_level } }` — NO German text or expected meaning included
   f. Server starts a 300s timeout timer for this widget_id
3. Client receives the widget message, renders the first question card with audio player + text input
4. User clicks play (or auto-plays), hears the German word, types their English answer → client shows next card → repeat until all questions answered
5. Client sends `{ type: 'widget_response', widget_id, answers: [{ card_id, answer }, ...] }`
6. Server receives response:
   a. Matches `widget_id` to the pending widget; ignores if not found or already resolved
   b. Grades each card by calling Claude with the grading prompt (user's answer vs expected meaning)
   c. Parses Claude's JSON response: `{ correct, score, feedback }`
   d. Computes final score: sum(per_card_score) / total
   e. Updates `user_vocab_progress` for each card via SM-2 (score >= 0.7 → correct, < 0.7 → incorrect)
   f. Sends `{ type: 'widget_result', widget_id, score, total, cards: [{ card_id, word, expected_meaning, user_answer, score, correct, feedback, audio_id }, ...] }`
   g. Persists the full widget lifecycle (payload + response + result) as a ContentBlock on the assistant message in D1
   h. Builds a text summary and returns it as the `tool_result` content to Claude
   i. Claude loop continues (Claude may respond with text, call another tool, or end_turn)

### TTS Failure Flow

1. Server attempts to generate TTS audio for a vocab item
2. TTS service returns an error (e.g., rate limit, network timeout, unsupported character)
3. Server logs the error, skips that vocab item, continues with remaining items
4. If all items fail, server rejects the tool call with error: "TTS audio generation failed"

### Claude Grading Failure Flow

1. Server calls Claude grading API for a question
2. API fails (e.g., timeout, 429 rate limit, malformed response)
3. Server falls back: `{ correct: false, score: 0.0, feedback: "Grading unavailable" }`
4. Continues grading remaining questions

---

## Acceptance Criteria

- [ ] **AC1**: User can say "test my listening" or "quiz me on hearing" and Claude invokes the comprehension tool
- [ ] **AC2**: A batch of 5 questions renders as a sequential flow — each card shows an audio player + text input, NO German text visible
- [ ] **AC3**: Clicking "replay" on a question card replays the TTS audio
- [ ] **AC4**: After the last question, a summary screen shows per-question results: user's answer, expected meaning, Claude's feedback, score
- [ ] **AC5**: Synonyms and paraphrases are graded as correct (e.g., "place to learn" for "school" gets score 0.8+)
- [ ] **AC6**: Related-but-wrong answers get partial credit (e.g., "working" for "work" gets score 0.3-0.5)
- [ ] **AC7**: Wrong answers get zero score (e.g., "bus stop" for "train station" gets 0.0)
- [ ] **AC8**: Words with score >= 0.7 trigger SM-2 "correct" behavior (ease increases, interval extends)
- [ ] **AC9**: Words with score < 0.7 trigger SM-2 "incorrect" behavior (interval resets, ease decreases)
- [ ] **AC10**: Page refresh after completing a widget shows the widget in completed state with audio playable
- [ ] **AC11**: Clicking "retake" on a completed widget starts a new session with the same vocab but new TTS audio
- [ ] **AC12**: Claude reacts to the score naturally in conversation, referencing specific words the user struggled with
- [ ] **AC13**: The widget payload sent to the client does NOT contain the German word or expected meaning
- [ ] **AC14**: If TTS fails for all questions, the tool call fails gracefully and Claude explains

---

## Tests

### Base Cases

#### Test: happy-path-comprehension-batch (covers R1, R2, R3, R4, R5, R6)

**Given**: User has target language = German (deu), CEFR level A1 has 678 vocab items, user has seen 0

**When**: Claude calls `comprehension({})`

**Then** (assertions):
- **widget-sent**: Server sends exactly 1 `widget` message over WS
- **tts-audio-sent**: Server sends 5 `tts_audio` messages before the widget
- **card-count-5**: Widget contains `cards` array of length 5
- **each-card-has-audio-id**: Every card has an `audio_id` field matching a sent tts_audio message
- **no-german-word**: No card object contains a `word` or `expected_meaning` field
- **vocab-from-db**: Each card's audio_id corresponds to a vocab_item from `vocab_items` where `language='deu'` and `cefr_level='A1'`

#### Test: happy-path-grade-with-claude (covers R8, R9, R10, R11, R12, R13, R14)

**Given**: Client has received a 5-question widget and user has typed answers for all 5

**When**: Client sends `widget_response` with 5 answers (one exact match, two paraphrases, one partial, one wrong)

**Then** (assertions):
- **result-sent**: Server sends exactly 1 `widget_result` message
- **grading-used-claude**: Server made 5 Claude API calls (or 1 batched call) for grading
- **scores-reasonable**: Exact match score ~1.0, paraphrases ~0.8-1.0, partial ~0.4-0.6, wrong ~0.0
- **final-score-computed**: `widget_result.score` is sum of per-card scores
- **correct-threshold-0.7**: Cards with score >= 0.7 have `correct: true`, < 0.7 have `correct: false`
- **sm2-updated**: `user_vocab_progress` rows exist for all 5 vocab items with updated ease/interval based on score >= 0.7 threshold
- **feedback-present**: Every card in `widget_result.cards` has a non-empty `feedback` string
- **tool-result-text**: Tool_result content matches pattern "User scored X/5 (Y%): <word> → '<answer>' ✓/✗ (score), ..."
- **persisted**: D1 `messages` table contains a row with a `WidgetContentBlock` with all fields populated

#### Test: exact-match-correct (covers R9)

**Given**: Expected meaning = "departure", user types "departure"

**When**: Server grades via Claude

**Then** (assertions):
- **score-1.0**: Claude returns `{ correct: true, score: 1.0, ... }`

#### Test: paraphrase-partial-credit (covers R9, R10)

**Given**: Expected meaning = "school", user types "place to learn"

**When**: Server grades via Claude

**Then** (assertions):
- **score-0.7-to-1.0**: Claude returns `{ correct: true, score: 0.7-1.0, feedback: "Close — ..." }`

#### Test: related-but-wrong-scored-low (covers R9)

**Given**: Expected meaning = "work" (noun), user types "working" (verb/gerund)

**When**: Server grades via Claude

**Then** (assertions):
- **score-0.3-to-0.6**: Claude returns `{ correct: false, score: 0.3-0.6, feedback: "Partial — ..." }`

#### Test: wrong-meaning-zero-score (covers R9)

**Given**: Expected meaning = "train station", user types "bus stop"

**When**: Server grades via Claude

**Then** (assertions):
- **score-0.0**: Claude returns `{ correct: false, score: 0.0, feedback: "Incorrect — ..." }`

#### Test: replay-button-works (covers R7)

**Given**: Client has rendered a comprehension question card with audio_id "abc123"

**When**: User clicks "replay" button

**Then** (assertions):
- **audio-replayed**: Client plays the audio from the tts_audio message matching audio_id "abc123"

#### Test: explicit-count-respected (covers R2)

**Given**: Target language selected

**When**: Claude calls `comprehension({ count: 3 })`

**Then** (assertions):
- **card-count-3**: Widget contains 3 cards
- **tts-audio-sent-3**: Server sends 3 tts_audio messages

#### Test: default-count-is-5 (covers R2)

**Given**: Target language selected

**When**: Claude calls `comprehension({})` with no `count` field

**Then** (assertions):
- **card-count-5**: Widget contains 5 cards

### Edge Cases

#### Test: rejects-count-zero (covers R2)

**Given**: Target language selected

**When**: Claude calls `comprehension({ count: 0 })`

**Then** (assertions):
- **tool-error**: Tool result is an error string: "count must be between 1 and 10"
- **no-widget-sent**: No `widget` message sent

#### Test: rejects-count-over-max (covers R2)

**Given**: Target language selected

**When**: Claude calls `comprehension({ count: 15 })`

**Then** (assertions):
- **tool-error**: Tool result is an error string: "count must be between 1 and 10"

#### Test: rejects-no-target-language (covers R12)

**Given**: `targetLang` is null

**When**: Claude calls `comprehension({})`

**Then** (assertions):
- **tool-error**: Tool result is an error string: "Please select a language first"
- **no-widget-sent**: No `widget` message sent

#### Test: tts-failure-skips-question (covers R18)

**Given**: Server queries 5 vocab items, TTS service fails for item #3

**When**: Server generates the widget

**Then** (assertions):
- **card-count-4**: Widget contains 4 cards (item #3 skipped)
- **error-logged**: Server logs TTS error for item #3
- **remaining-cards-valid**: Cards 1,2,4,5 have valid audio_ids

#### Test: tts-failure-all-rejects-tool (covers R18)

**Given**: Server queries 5 vocab items, TTS service fails for all 5

**When**: Server attempts to generate the widget

**Then** (assertions):
- **tool-error**: Tool result is an error string: "TTS audio generation failed"
- **no-widget-sent**: No `widget` message sent

#### Test: grading-failure-fallback (covers R19)

**Given**: Server grades 5 questions, Claude API times out on question #2

**When**: Server grades the response

**Then** (assertions):
- **question-2-fallback**: Card #2 has `{ correct: false, score: 0.0, feedback: "Grading unavailable" }`
- **other-questions-graded**: Cards 1,3,4,5 have Claude-generated scores/feedback

#### Test: malformed-grading-json-fallback (covers R19)

**Given**: Claude grading returns non-JSON response (e.g., plain text "The answer is correct")

**When**: Server parses the response

**Then** (assertions):
- **fallback-applied**: `{ correct: false, score: 0.0, feedback: "Grading unavailable" }`
- **error-logged**: Server logs JSON parse error

#### Test: empty-answer-scored-zero (covers R8)

**Given**: User submits widget_response with one card having `answer: ""`

**When**: Server grades

**Then** (assertions):
- **score-0.0**: That card has `{ correct: false, score: 0.0, feedback: "No answer provided" }`
- **no-claude-call**: Server does not call Claude for empty answers (optimization)

#### Test: whitespace-answer-scored-zero (covers R8)

**Given**: User submits `answer: "   \n  "`

**When**: Server grades

**Then** (assertions):
- **score-0.0**: Treated as empty, scored 0.0

#### Test: sm2-high-score-correct (covers R12)

**Given**: User's answer scores 1.0

**When**: SM-2 update runs

**Then** (assertions):
- **treated-as-correct**: ease increases, interval extends (same as flashcard correct)

#### Test: sm2-partial-credit-correct (covers R12)

**Given**: User's answer scores 0.8

**When**: SM-2 update runs

**Then** (assertions):
- **treated-as-correct**: ease increases, interval extends

#### Test: sm2-low-partial-credit-incorrect (covers R12)

**Given**: User's answer scores 0.6

**When**: SM-2 update runs

**Then** (assertions):
- **treated-as-incorrect**: interval resets to 0, ease decreases

#### Test: sm2-zero-score-incorrect (covers R12)

**Given**: User's answer scores 0.0

**When**: SM-2 update runs

**Then** (assertions):
- **treated-as-incorrect**: interval resets to 0, ease decreases

#### Test: final-score-averaged-correctly (covers R11)

**Given**: 5 cards with scores [1.0, 0.8, 0.4, 1.0, 0.6]

**When**: Server computes final score

**Then** (assertions):
- **score-3.8**: `widget_result.score` = 3.8
- **total-5**: `widget_result.total` = 5
- **percentage-76**: Tool result mentions "76%" or "3.8/5"

#### Test: tool-result-per-word-breakdown (covers R14)

**Given**: Server has graded all questions

**When**: Tool result is fed to Claude

**Then** (assertions):
- **contains-per-word**: String contains each word followed by user's answer and score: "Abfahrt → 'departure' ✓ (1.0), Schule → 'place to learn' ✓ (0.8), ..."

#### Test: no-answer-in-widget-payload (covers R5)

**Given**: Server generates a comprehension widget

**When**: Widget message is sent to client

**Then** (assertions):
- **no-word**: JSON payload does not contain key `word` at any nesting level
- **no-expected-meaning**: JSON payload does not contain key `expected_meaning` at any nesting level

#### Test: answer-revealed-in-result (covers R13)

**Given**: Server has graded a widget response

**When**: `widget_result` message is sent

**Then** (assertions):
- **has-word**: Every card in `cards[]` has `word` (string)
- **has-expected-meaning**: Every card in `cards[]` has `expected_meaning` (string)
- **has-user-answer**: Every card has `user_answer` (string)
- **has-feedback**: Every card has `feedback` (string)

#### Test: refresh-shows-completed-widget (covers R16)

**Given**: User completed a comprehension widget in a previous session

**When**: User reconnects (page refresh), server sends `history` message

**Then** (assertions):
- **widget-in-history**: History includes the assistant message with the widget ContentBlock
- **client-renders-completed**: Client renders the widget in completed state (audio playable, user's answers shown, expected meanings revealed, feedback displayed)

#### Test: retake-generates-new-widget-and-audio (covers R17)

**Given**: User completed a comprehension widget with words [Abfahrt, Schule, Arbeit]

**When**: User clicks "retake" on the completed widget

**Then** (assertions):
- **new-widget-id**: New widget has a different `widget_id`
- **same-words**: New widget contains the same vocab words
- **new-audio-ids**: New `audio_id` values (TTS regenerated)
- **independent-grading**: Grading the retake does not overwrite the original widget's result

#### Test: tts-audio-url-delivered (covers R4)

**Given**: Server stores TTS audio in R2 bucket

**When**: Server sends tts_audio message

**Then** (assertions):
- **url-present**: Message has `url` field (e.g., "https://iris-tts.r2.dev/abc123.mp3")
- **data-absent**: Message has no `data` field
- **client-fetches**: Client can fetch and play the audio from the URL

#### Test: tts-audio-inline-delivered (covers R4)

**Given**: Server generates TTS audio and base64-encodes it

**When**: Server sends tts_audio message

**Then** (assertions):
- **data-present**: Message has `data` field (base64 string)
- **url-absent**: Message has no `url` field
- **client-decodes**: Client can decode and play the audio

---

## Non-Goals

- Showing the German word before the user answers (defeats the purpose of listening comprehension)
- Dictation exercises where the user types the German word (that's a separate `dictation` widget type)
- Multiple-choice options for the English meaning (this is free-form text input)
- Grammar grading (e.g., "the work" vs "work" — Claude is instructed to be lenient)
- Pronunciation scoring (audio input, not text input)
- Storing a history of the user's answer attempts before final submission (single submission only)

---

## Open Questions

- **OQ-1**: Should the replay button be visible immediately or only on hover? Leaning toward always visible for accessibility.
- **OQ-2**: Should the server cache Claude grading responses to avoid re-grading identical answers (e.g., user retakes and types "departure" again)? Leaning toward no (not worth the complexity; Claude API is fast enough).
- **OQ-3**: Should TTS audio be generated on-demand or pre-generated for the entire vocab corpus? Leaning toward on-demand (lower storage cost, supports dynamic pronunciation updates).
- **OQ-4**: Should the client auto-play the first question's audio, or wait for user to click play? Leaning toward auto-play (less friction).
- **OQ-5**: What's the UX for a grading failure on a single question in a batch? Currently specified as "Grading unavailable" — should the user be given a chance to re-submit that question? Leaning toward no (just score it 0 and move on).

---

## Related Artifacts

- **Phase 1 Spec**: `agent/specs/local.widget-system-phase1.md`
- **Widget Types**: `shared/types/widgets.ts`
- **Design**: `agent/design/local.widget-system.md`
- **Schema**: `migrations/0003_curriculum_schema.sql` (vocab_items, user_vocab_progress)
- **Data**: `migrations/0004_seed_goethe.sql` (4,870 vocab items with gloss_en)

---

**Status**: Draft — awaiting review
**Recommendation**: Review Behavior Table, confirm or resolve Open Questions, then implement alongside TTS audio generation
