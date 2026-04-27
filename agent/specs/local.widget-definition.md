# Widget Type — Definition (Phase 2 Delta)

> **Type**: Delta spec extending local.widget-system-phase1.md
> **Widget**: `definition`
> **Purpose**: Test active vocabulary recall (German → English) with freeform text grading by Claude

**Namespace**: local
**Version**: 1.0.0
**Created**: 2026-04-27
**Status**: Draft — awaiting implementation

---

## Purpose

Add the `definition` widget type: shows a German word (e.g. "die Abfahrt"), optionally spoken aloud via TTS, and prompts the user to type the English meaning. Server sends the user's answer + expected meaning to Claude for grading, which tolerates synonyms, paraphrases, and partial answers.

**Key Differences from Related Widgets**:
- **vs. flashcard-freeform**: `definition` has an optional `speak` param to test listening comprehension; flashcard-freeform always shows text
- **vs. comprehension**: `comprehension` is audio-ONLY (no text shown); `definition` shows text when `speak=false`
- **vs. flashcard-matching**: `definition` is freeform text, not multiple choice

---

## Requirements

- **R1**: Claude can call a `definition` tool with `{ speak?: boolean, count?: number, cefr_level?: string }`
- **R2**: If `speak=true`, the server generates TTS audio for the word via `elevenlabs.text_to_speech()` and sends an audio URL with the widget (client plays automatically)
- **R3**: If `speak=false` (default), the widget shows the German word as text with no audio
- **R4**: The server queries D1 for vocab items (same batching + CEFR logic as flashcard-matching) and sends one `definition` widget containing all cards
- **R5**: Each card includes the German `word` (display text), the `gloss_en` as server-side `expected_meaning` (not sent to client), and optionally `audio_url`
- **R6**: Client renders cards sequentially: user sees word or hears audio, types English meaning in a text input, submits, advances to next card
- **R7**: After all cards, client sends `widget_response` with all freeform answers back to server
- **R8**: Server sends a Claude grading request: "Grade these vocabulary answers. User was asked for the English meaning of each German word. Accept synonyms, paraphrases, and partial answers. For each card, return correct: true/false and feedback (1 sentence max)."
- **R9**: Claude grades each answer and returns structured JSON: `{ card_id, correct, feedback }`
- **R10**: Server computes score, updates SM-2, sends `widget_result` with per-card grading + feedback to client
- **R11**: Server feeds a text summary to Claude as the tool_result: "User scored 7/10: Abfahrt ✓ (correct), Schule ✗ (you wrote 'school building' but expected 'school'), ..."
- **R12**: Widget persists with full payload + response + result + Claude's grading feedback
- **R13**: If `speak=true` and TTS fails, fallback to text display (log warning, do not block widget)
- **R14**: Grading prompt includes the expected meaning so Claude can assess semantic equivalence

---

## Interfaces / Data Shapes

### Widget Payload (server → client)

```typescript
interface DefinitionCard {
  card_id: string
  word: string          // "die Abfahrt"
  audio_url?: string    // present if speak=true and TTS succeeded
}

interface DefinitionWidget extends WidgetBase {
  type: 'definition'
  cards: DefinitionCard[]
  cefr_level: string
  speak: boolean        // true = audio mode, false = text mode
}
```

### Widget Response (client → server)

```typescript
interface DefinitionAnswer {
  card_id: string
  answer: string        // user's freeform text: "departure"
}

interface DefinitionResponse {
  type: 'widget_response'
  widget_id: string
  answers: DefinitionAnswer[]
}
```

### Widget Result (server → client)

```typescript
interface DefinitionCardResult {
  card_id: string
  word: string
  user_answer: string
  expected_meaning: string   // revealed after grading (gloss_en)
  correct: boolean
  feedback: string           // Claude's 1-sentence feedback
}

interface DefinitionResult {
  type: 'widget_result'
  widget_id: string
  widget_type: 'definition'
  score: number
  total: number
  cards: DefinitionCardResult[]
}
```

### Claude Tool Definition

```typescript
{
  name: 'definition',
  description: 'Start a definition drill. Shows German words (or speaks them aloud) and asks the user to type the English meaning. Tests active vocabulary recall. Use when the user wants to practice word meanings, test their vocabulary, or work on listening comprehension.',
  input_schema: {
    type: 'object',
    properties: {
      speak: { 
        type: 'boolean', 
        description: 'If true, speak the word via TTS (tests listening + meaning). If false (default), show the word as text (tests reading + meaning).' 
      },
      count: { 
        type: 'integer', 
        minimum: 1, 
        maximum: 20, 
        description: 'Number of words. Default 10.' 
      },
      cefr_level: { 
        type: 'string', 
        enum: ['A1', 'A2', 'B1'], 
        description: 'Target CEFR level. Omit to use the user\'s current level.' 
      },
    },
    required: [],
  },
}
```

### Claude Grading Request

```typescript
// Server sends to Claude (standard messages.create, no streaming):
{
  model: 'claude-sonnet-4.7',
  max_tokens: 4096,
  messages: [
    {
      role: 'user',
      content: `Grade these German vocabulary answers. For each card, the user was asked to provide the English meaning of a German word.

Accept as correct:
- Exact matches
- Synonyms (e.g., "departure" ≈ "leaving")
- Paraphrases (e.g., "the act of departing")
- Partial answers if they capture the core meaning

Reject as incorrect:
- Completely unrelated words
- Wrong part of speech (e.g., verb for a noun) unless contextually acceptable

Return JSON array: [{ card_id: string, correct: boolean, feedback: string }]
Feedback should be 1 sentence max, friendly tone.

Cards:
${cards.map(c => `- card_id: ${c.card_id}, word: "${c.word}", expected: "${c.expected_meaning}", user_answer: "${c.user_answer}"`).join('\n')}

Output JSON only, no markdown.`
    }
  ]
}
```

### Server-Side State (not sent to client until grading)

```typescript
interface DefinitionCardServerState {
  card_id: string
  vocab_id: number          // for SM-2 update
  word: string
  expected_meaning: string  // gloss_en
  audio_url?: string
}
```

---

## Behavior Table

| # | Scenario | Expected Behavior | Test ID |
|---|----------|-------------------|---------|
| 1 | Claude calls `definition` with no params | Server generates 10 cards, text mode (speak=false), user's current CEFR level | `default-text-mode` |
| 2 | Claude calls `definition` with speak=true | Server generates TTS audio for each word, sends audio_url in widget | `speak-mode-tts` |
| 3 | User types "departure" for "die Abfahrt" | Claude grades as correct | `exact-match-correct` |
| 4 | User types "leaving" for "die Abfahrt" (expected: "departure") | Claude grades as correct (synonym) | `synonym-accepted` |
| 5 | User types "the act of departing" for "die Abfahrt" | Claude grades as correct (paraphrase) | `paraphrase-accepted` |
| 6 | User types "train station" for "die Abfahrt" (expected: "departure") | Claude grades as incorrect | `wrong-answer-rejected` |
| 7 | User submits empty string for a card | Claude grades as incorrect, feedback: "No answer provided" | `empty-answer-wrong` |
| 8 | User types partial answer "depart" for "departure" | Claude grades as correct (captures core meaning) | `partial-answer-accepted` |
| 9 | TTS fails (elevenlabs.text_to_speech throws) | Server logs warning, sends card with no audio_url, widget continues | `tts-failure-fallback-text` |
| 10 | All TTS calls fail | Widget sent in text mode (all cards have no audio_url) | `all-tts-fail-text-fallback` |
| 11 | User completes 10 cards, 8 correct | Server sends result with score=8, total=10, per-card feedback | `happy-path-grading` |
| 12 | Claude grading request returns invalid JSON | Server retries once; if still invalid, scores all as correct (graceful fallback) | `grading-json-invalid` |
| 13 | Claude grading request times out (>30s) | Server cancels, scores all as incorrect, feedback: "Grading timeout" | `grading-timeout` |
| 14 | User changes language while widget is pending | Widget cancelled (same as flashcard-matching) | `cancel-on-language-change` |
| 15 | User disconnects (no response within 300s) | Widget times out (same as flashcard-matching) | `timeout-300s` |
| 16 | Page refresh after completed widget | History shows widget with user's answers, grading results, and feedback | `refresh-shows-completed` |
| 17 | User clicks "retake" on completed widget | New widget with same words, same speak setting, new widget_id | `retake-same-words` |
| 18 | SM-2 update on correct answer | Interval/ease updated (same logic as flashcard-matching) | `sm2-correct` |
| 19 | SM-2 update on incorrect answer | Interval reset to 0, ease decreased (same logic as flashcard-matching) | `sm2-incorrect` |
| 20 | Tool result fed to Claude includes per-card feedback | Claude sees "User scored 7/10: Abfahrt ✓ (correct), Schule ✗ (you wrote X but expected Y), ..." | `tool-result-includes-feedback` |
| 21 | Widget payload does NOT include expected_meaning | Client cannot know the answer before responding | `no-answer-in-payload` |
| 22 | Widget result DOES include expected_meaning | Client renders revealed answers after grading | `answer-revealed-in-result` |
| 23 | User types answer with leading/trailing whitespace | Server trims whitespace before sending to Claude | `whitespace-trimmed` |
| 24 | User types answer in all caps: "DEPARTURE" | Claude grades case-insensitively | `case-insensitive` |
| 25 | Claude calls definition with count=1 | Server generates exactly 1 card | `explicit-count-1` |
| 26 | Claude calls definition with count=25 | Tool rejected: "count must be between 1 and 20" | `rejects-count-over-max` |
| 27 | No target language selected | Tool rejected: "Please select a language first" | `rejects-no-target-language` |
| 28 | Zero vocab items for target language | Tool rejected: "No vocabulary available for [language]" | `rejects-empty-vocab` |
| 29 | Fewer unseen words than count | Server fills batch with due-for-review words, then already-seen (same as flashcard-matching) | `fills-batch-with-review` |
| 30 | User sends widget_response with wrong widget_id | Response ignored (logged as warning) | `ignores-wrong-widget-id` |
| 31 | User sends widget_response with too few answers | Missing cards scored as incorrect | `partial-response-scored-wrong` |
| 32 | User sends widget_response after timeout | Response ignored (widget already resolved) | `ignores-response-after-timeout` |
| 33 | Claude grading returns correct=true for all cards | All SM-2 intervals increase | `grading-all-correct-sm2` |
| 34 | Claude grading returns correct=false for all cards | All SM-2 intervals reset to 0 | `grading-all-wrong-sm2` |
| 35 | Widget persisted with grading feedback | D1 messages row contains WidgetContentBlock with result.cards[].feedback | `feedback-persisted` |

---

## Behavior (Step-by-Step)

### Tool Call Flow (speak=false, text mode)

1. User asks to practice vocab definitions. Claude calls `definition({ count: 10 })`
2. Server validates params, queries D1 for 10 vocab items (unseen first, then due, then seen)
3. For each vocab item:
   - Extract `display` (German word), `gloss_en` (expected meaning)
   - Generate `card_id` (opaque UUID)
   - Store server-side state: `{ card_id, vocab_id, word, expected_meaning }`
4. Server generates `widget_id`, sends widget to client:
   ```json
   {
     "type": "widget",
     "widget": {
       "widget_id": "def-abc123",
       "type": "definition",
       "speak": false,
       "cefr_level": "A1",
       "cards": [
         { "card_id": "c1", "word": "die Abfahrt" },
         { "card_id": "c2", "word": "die Schule" },
         ...
       ]
     }
   }
   ```
5. Client renders first card: shows "die Abfahrt", text input for answer
6. User types "departure", taps next → card 2 renders
7. User completes all 10 cards, client sends `widget_response`:
   ```json
   {
     "type": "widget_response",
     "widget_id": "def-abc123",
     "answers": [
       { "card_id": "c1", "answer": "departure" },
       { "card_id": "c2", "answer": "school" },
       ...
     ]
   }
   ```
8. Server receives response, builds Claude grading request with all cards
9. Claude returns grading JSON: `[{ card_id: "c1", correct: true, feedback: "Perfect!" }, ...]`
10. Server parses grading, computes score (e.g., 8/10)
11. Server updates SM-2 for each vocab item based on correct/incorrect
12. Server sends `widget_result`:
    ```json
    {
      "type": "widget_result",
      "widget_id": "def-abc123",
      "widget_type": "definition",
      "score": 8,
      "total": 10,
      "cards": [
        {
          "card_id": "c1",
          "word": "die Abfahrt",
          "user_answer": "departure",
          "expected_meaning": "departure",
          "correct": true,
          "feedback": "Perfect!"
        },
        {
          "card_id": "c2",
          "word": "die Schule",
          "user_answer": "school building",
          "expected_meaning": "school",
          "correct": false,
          "feedback": "Close! The word means 'school' in general, not just the building."
        },
        ...
      ]
    }
    ```
13. Server persists widget as ContentBlock in D1
14. Server builds tool_result text: "User scored 8/10: Abfahrt ✓ (correct), Schule ✗ (you wrote 'school building' but expected 'school'), ..."
15. Claude loop continues, Claude responds: "Sehr gut! 8 von 10, you're making great progress!"

### Tool Call Flow (speak=true, audio mode)

1. Claude calls `definition({ speak: true, count: 5 })`
2. Server queries D1 for 5 vocab items
3. For each item:
   - Call `elevenlabs.text_to_speech({ text: word, voice_id: 'alice', language: 'de' })`
   - If success, store audio URL in card
   - If failure, log warning, skip audio_url field
4. Server sends widget with audio_urls:
   ```json
   {
     "type": "widget",
     "widget": {
       "widget_id": "def-xyz789",
       "type": "definition",
       "speak": true,
       "cefr_level": "A2",
       "cards": [
         { "card_id": "c1", "word": "die Abfahrt", "audio_url": "https://elevenlabs.io/..." },
         { "card_id": "c2", "word": "die Schule" }  // TTS failed, no audio_url
       ]
     }
   }
   ```
5. Client renders first card:
   - If `audio_url` present: auto-play audio, show "🔊 Listening..." (word is visible as fallback)
   - If no `audio_url`: show word as text
6. Rest of flow identical to text mode

### Grading Failure Fallback

If Claude grading fails (timeout, invalid JSON, API error):
1. Server retries once (up to 2 total attempts)
2. If still fails, server logs error and applies lenient fallback:
   - Score all non-empty answers as correct (benefit of the doubt)
   - Score empty answers as incorrect
   - Feedback: "Grading unavailable, scored leniently"
3. SM-2 updates applied based on fallback grading
4. Widget result sent to client
5. Tool_result to Claude: "User completed 10 cards (grading service unavailable, all non-empty answers marked correct)"

---

## Acceptance Criteria

- [ ] **AC1**: User can say "test my vocab definitions" and Claude invokes the definition tool
- [ ] **AC2**: Text mode (speak=false): user sees German word, types English meaning, advances to next word
- [ ] **AC3**: Audio mode (speak=true): user hears German word spoken, types English meaning
- [ ] **AC4**: Synonyms accepted: "departure" and "leaving" both graded as correct for "die Abfahrt"
- [ ] **AC5**: Paraphrases accepted: "the act of departing" graded as correct for "die Abfahrt"
- [ ] **AC6**: Wrong answers rejected: "train station" graded as incorrect for "die Abfahrt"
- [ ] **AC7**: After all cards, summary screen shows score + per-card results with user's answer, expected answer, and feedback
- [ ] **AC8**: Page refresh shows completed widget with all grading feedback
- [ ] **AC9**: Retake generates new widget with same words, same speak setting
- [ ] **AC10**: Claude reacts to score naturally: "Gut gemacht! 8 von 10, nur 2 Fehler..."
- [ ] **AC11**: TTS failure does not block widget (falls back to text)
- [ ] **AC12**: Grading failure does not block widget (lenient fallback applied)

---

## Tests

### Base Cases

#### Test: default-text-mode

**Given**: User has target language German, CEFR A1
**When**: Claude calls `definition({})`
**Then**:
- Widget has `speak: false`
- Widget has 10 cards
- No `audio_url` fields in any card
- Widget sent to client

#### Test: speak-mode-tts

**Given**: TTS service is available
**When**: Claude calls `definition({ speak: true, count: 3 })`
**Then**:
- Widget has `speak: true`
- All 3 cards have `audio_url` fields
- Audio URLs point to valid TTS endpoints

#### Test: exact-match-correct

**Given**: Widget sent with card "die Abfahrt" (expected: "departure")
**When**: User types "departure"
**Then**:
- Claude grades `correct: true`
- Feedback: "Perfect!" or similar
- SM-2 interval increases

#### Test: synonym-accepted

**Given**: Card "die Abfahrt" (expected: "departure")
**When**: User types "leaving"
**Then**:
- Claude grades `correct: true`
- Feedback: "Correct! 'Leaving' is a synonym for 'departure'." or similar

#### Test: paraphrase-accepted

**Given**: Card "die Abfahrt" (expected: "departure")
**When**: User types "the act of departing"
**Then**:
- Claude grades `correct: true`
- Feedback acknowledges paraphrase

#### Test: wrong-answer-rejected

**Given**: Card "die Abfahrt" (expected: "departure")
**When**: User types "train station"
**Then**:
- Claude grades `correct: false`
- Feedback: "Not quite. 'Abfahrt' means 'departure'." or similar
- SM-2 interval resets to 0

#### Test: empty-answer-wrong

**Given**: Card "die Abfahrt"
**When**: User submits empty string
**Then**:
- Claude grades `correct: false`
- Feedback: "No answer provided" or similar

#### Test: partial-answer-accepted

**Given**: Card "die Abfahrt" (expected: "departure")
**When**: User types "depart"
**Then**:
- Claude grades `correct: true` (captures core meaning)

#### Test: tts-failure-fallback-text

**Given**: TTS service throws error for card 2
**When**: Server generates speak=true widget
**Then**:
- Card 1 has `audio_url`
- Card 2 has no `audio_url`
- Warning logged
- Widget sent to client (not blocked)

#### Test: all-tts-fail-text-fallback

**Given**: TTS service is down (all calls fail)
**When**: Server generates speak=true widget
**Then**:
- All cards have no `audio_url`
- Widget has `speak: true` (client can detect failure)
- Widget sent to client

#### Test: happy-path-grading

**Given**: User completes 10 cards, 8 correct, 2 incorrect
**When**: Server sends grading request to Claude
**Then**:
- Claude returns 8 `correct: true`, 2 `correct: false`
- `widget_result` has `score: 8, total: 10`
- Each card has feedback
- SM-2 updated for all 10 vocab items
- Tool_result text summary sent to Claude

#### Test: no-answer-in-payload

**Given**: Server generates definition widget
**When**: Widget message sent to client
**Then**:
- JSON payload does not contain `expected_meaning` at any level
- JSON payload does not contain `gloss_en` at any level

#### Test: answer-revealed-in-result

**Given**: Server graded widget response
**When**: `widget_result` sent to client
**Then**:
- Every card has `expected_meaning` field
- Every card has `user_answer` field
- Every card has `correct` boolean
- Every card has `feedback` string

### Edge Cases

#### Test: grading-json-invalid

**Given**: Claude grading returns non-JSON or invalid structure
**When**: Server parses grading response
**Then**:
- Server retries once (max 2 attempts)
- If still invalid, lenient fallback: non-empty answers marked correct
- Widget result sent with fallback grading

#### Test: grading-timeout

**Given**: Claude grading request takes >30s
**When**: Timeout fires
**Then**:
- Request cancelled
- Lenient fallback applied
- Widget result sent
- Warning logged

#### Test: cancel-on-language-change

**Given**: Definition widget pending
**When**: Client sends `language` message
**Then**:
- `widget_cancel` sent to client
- Timeout timer cleared
- No SM-2 updates
- Widget persisted as cancelled

#### Test: timeout-300s

**Given**: Widget sent to client
**When**: 300s pass with no `widget_response`
**Then**:
- Widget times out
- No SM-2 updates
- Tool_result: "Widget timed out"
- Widget persisted as `status: 'timed_out'`

#### Test: refresh-shows-completed

**Given**: User completed definition widget in previous session
**When**: User reconnects, server sends history
**Then**:
- History includes assistant message with WidgetContentBlock
- Client renders widget in completed state
- All cards shown with user_answer, expected_meaning, correct, feedback

#### Test: retake-same-words

**Given**: User completed definition widget with words [Abfahrt, Schule, Arbeit]
**When**: User clicks "retake"
**Then**:
- New widget_id generated
- Same 3 words
- Same `speak` setting
- New response expected

#### Test: whitespace-trimmed

**Given**: Card "die Abfahrt" (expected: "departure")
**When**: User types "  departure  " (with spaces)
**Then**:
- Server trims to "departure"
- Claude grades "departure"
- Correct

#### Test: case-insensitive

**Given**: Card "die Abfahrt" (expected: "departure")
**When**: User types "DEPARTURE"
**Then**:
- Claude grades as correct (case-insensitive)

#### Test: rejects-count-over-max

**Given**: Target language selected
**When**: Claude calls `definition({ count: 25 })`
**Then**:
- Tool error: "count must be between 1 and 20"
- No widget sent

#### Test: rejects-no-target-language

**Given**: `targetLang` is null
**When**: Claude calls `definition({})`
**Then**:
- Tool error: "Please select a language first"
- No widget sent

#### Test: rejects-empty-vocab

**Given**: Target language Japanese, zero vocab items
**When**: Claude calls `definition({})`
**Then**:
- Tool error: "No vocabulary available for Japanese"

#### Test: fills-batch-with-review

**Given**: A1 has 3 unseen, 5 due, 670 seen-not-due
**When**: Claude calls `definition({ count: 10 })`
**Then**:
- 3 unseen + 5 due + 2 seen-not-due = 10 cards

#### Test: feedback-persisted

**Given**: Widget graded, result sent to client
**When**: Widget persisted to D1
**Then**:
- `content` array includes WidgetContentBlock
- `result.cards[0].feedback` contains Claude's feedback string
- Feedback survives page refresh

---

## Non-Goals

- Multi-word phrases or sentences (Phase 3: sentence-order widget)
- Image-based prompts (future: visual vocab widget)
- Multiple definitions per word (simplification: 1 gloss_en per vocab item)
- User-edited grading (all grading final, no re-grade)
- TTS voice selection (fixed voice: `alice` for German)
- Custom grading strictness (Claude's default leniency applies)

---

## Implementation Notes

### TTS Integration

- **Service**: ElevenLabs (existing `elevenlabs.text_to_speech()` utility)
- **Voice**: `alice` (German native)
- **Language param**: `'de'` (German)
- **Error handling**: Log warning, continue without audio
- **Caching**: TTS results NOT cached (Phase 1); future: cache audio URLs in vocab_items table

### Claude Grading Request

- **Model**: `claude-sonnet-4.7` (fast, high quality)
- **Max tokens**: 4096 (generous for feedback)
- **Streaming**: No (blocking grading request)
- **Timeout**: 30s (fail gracefully)
- **Retries**: 1 retry on failure (max 2 attempts)
- **Fallback**: Lenient scoring (non-empty = correct)

### SM-2 Updates

- **Logic**: Identical to flashcard-matching (see Phase 1 spec)
- **Timing**: After Claude grading returns
- **Granularity**: Per-card, per-vocab-item
- **Concurrency**: Batch update via D1 transaction

### Widget Persistence

- **Format**: Same as flashcard-matching (WidgetContentBlock)
- **Storage**: D1 `messages` table, `content` JSONB column
- **Retake**: Query by widget_id, extract vocab_ids, generate new widget

---

## Related Artifacts

- **Base spec**: `agent/specs/local.widget-system-phase1.md`
- **Types**: `shared/types/widgets.ts` (DefinitionWidget already defined)
- **Schema**: `migrations/0003_curriculum_schema.sql` (vocab_items, user_vocab_progress)
- **TTS utility**: `worker/utils/elevenlabs.ts` (assumed to exist)

---

## Status

**Draft** — ready for review and implementation

**Next Steps**:
1. Review grading prompt with product team (confirm leniency level)
2. Implement TTS integration (or stub if ElevenLabs not yet configured)
3. Implement Claude grading flow + fallback logic
4. Add definition tool to worker's tool registry
5. Add client rendering for definition widget (text input, audio player)
6. Write tests from Behavior Table
7. Deploy behind feature flag (`ENABLE_DEFINITION_WIDGET=true`)
