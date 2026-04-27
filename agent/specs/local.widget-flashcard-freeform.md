# Widget Spec: flashcard-freeform

**References**: local.widget-system-phase1.md (shared infra)
**Status**: Draft

## What's New (vs flashcard-matching)

- **Freeform text input**: User types the English meaning instead of selecting from multiple choice
- **Fuzzy grading**: Case-insensitive, trimmed comparison with synonym table for common variants
- **Claude fallback grading**: If fuzzy match fails but answer is semantically close, Claude grades with explanation
- **Single card per widget**: One word at a time (not a batch); tool can be called multiple times per turn
- **Reference answer**: The `gloss_en` field from `vocab_items` is the canonical correct answer

## Card Shape

### Widget Payload (server → client)

```typescript
interface FlashcardFreeformWidget extends WidgetBase {
  type: 'flashcard-freeform'
  word: string          // "die Abfahrt"
  audio?: boolean       // future: include TTS audio URL (Phase 2)
  cefr_level: string    // "A1"
}
```

### Widget Response (client → server)

```typescript
interface FlashcardFreeformResponse {
  type: 'widget_response'
  widget_id: string
  answer: string        // user's typed input, e.g., "leaving" or "departure"
}
```

### Widget Result (server → client)

```typescript
interface FlashcardFreeformResult {
  type: 'widget_result'
  widget_id: string
  widget_type: 'flashcard-freeform'
  word: string
  correct_answer: string      // the gloss_en from vocab_items
  user_answer: string          // what the user typed
  correct: boolean
  grading_method: 'exact' | 'fuzzy' | 'claude'
  claude_explanation?: string  // if grading_method='claude', why it was marked correct/incorrect
}
```

## Grading

### Grading Pipeline

1. **Normalize inputs**: `trim()`, `toLowerCase()` on both user answer and `gloss_en`
2. **Exact match**: If normalized strings match, correct = true, method = 'exact'
3. **Fuzzy match**: Check synonym table (see below); if match, correct = true, method = 'fuzzy'
4. **Claude fallback**: If no fuzzy match, call Claude Haiku with prompt:
   ```
   Grade this German vocabulary answer.
   Word: {word}
   Correct answer: {gloss_en}
   User's answer: {user_answer}
   Is the user's answer semantically equivalent? Answer with JSON:
   { "correct": true/false, "explanation": "..." }
   ```
   Parse JSON response; correct = response.correct, method = 'claude', claude_explanation = response.explanation

### Synonym Table (hardcoded in worker)

```typescript
const SYNONYMS: Record<string, string[]> = {
  // Common German → English glosses with known variants
  'departure': ['leaving', 'going away', 'exit'],
  'arrival': ['coming', 'arriving'],
  'work': ['job', 'labor'],
  'school': ['schooling'],
  'breakfast': ['morning meal'],
  'lunch': ['midday meal', 'dinner'],  // BE/AE ambiguity
  'dinner': ['supper', 'evening meal'],
  'car': ['automobile', 'vehicle'],
  'train': ['railway'],
  'platform': ['rail platform'],
  // Add more as needed based on user data
}
```

If `gloss_en` is a key in SYNONYMS, check if normalized `user_answer` is in the array. Also check reverse: if `user_answer` is a key, check if `gloss_en` is in its array.

### SM-2 Update

Same as flashcard-matching: correct answers increase ease + interval, incorrect answers reset interval + decrease ease.

## Tool Definition

```typescript
{
  name: 'flashcard',
  description: 'Start a flashcard exercise. Use mode=freeform for open-ended answers; user types the English meaning.',
  input_schema: {
    type: 'object',
    properties: {
      mode: { 
        type: 'string', 
        enum: ['matching', 'freeform'], 
        description: 'Quiz mode. matching = multiple choice, freeform = type the answer.' 
      },
      count: { 
        type: 'integer', 
        minimum: 1, 
        maximum: 20, 
        description: 'Number of cards (for matching). Ignored for freeform (always 1).' 
      },
      cefr_level: { 
        type: 'string', 
        enum: ['A1', 'A2', 'B1'], 
        description: 'Target CEFR level. Omit to use user\'s current level.' 
      },
    },
    required: ['mode'],
  },
}
```

## Behavior Table

| # | Scenario | Expected Behavior | Tests |
|---|----------|-------------------|-------|
| 36 | Claude calls flashcard with mode=freeform | Server generates 1 card, sends freeform widget to client | `freeform-single-card` |
| 37 | User types exact gloss_en (case-insensitive) | Graded correct via exact match | `exact-match-case-insensitive` |
| 38 | User types a synonym from the table | Graded correct via fuzzy match | `fuzzy-match-synonym` |
| 39 | User types a semantically equivalent phrase not in table | Claude grades, explanation included in result | `claude-fallback-correct` |
| 40 | User types a semantically unrelated answer | Claude grades incorrect, explanation included | `claude-fallback-incorrect` |
| 41 | User types answer with leading/trailing whitespace | Trimmed before grading, exact/fuzzy match still works | `trim-whitespace` |
| 42 | gloss_en is "departure", user types "leaving" | Fuzzy match via synonym table → correct | `synonym-departure-leaving` |
| 43 | gloss_en is "leaving", user types "departure" | Reverse synonym lookup → correct | `synonym-reverse-lookup` |
| 44 | User types empty string | Graded incorrect (no Claude call; empty is always wrong) | `empty-answer-incorrect` |
| 45 | User types answer >200 chars | Graded incorrect without Claude call (too long to be valid) | `too-long-answer-rejected` |
| 46 | Claude API error during grading | Server logs error, falls back to incorrect, method='claude', explanation="Grading service unavailable" | `claude-api-error-fallback` |
| 47 | Freeform widget times out (300s) | Same as matching: no SM-2 update, timed_out status | `freeform-timeout-300s` |
| 48 | User changes language while freeform widget pending | Same as matching: widget cancelled | `freeform-cancel-on-language-change` |
| 49 | User completes freeform widget (correct) | SM-2 updated per correct path, tool_result text includes word + ✓ + explanation | `freeform-sm2-correct` |
| 50 | User completes freeform widget (incorrect) | SM-2 updated per incorrect path, tool_result includes word + ✗ + explanation + revealed correct answer | `freeform-sm2-incorrect` |
| 51 | Freeform widget persisted in D1 | ContentBlock includes payload + response + result with grading_method + explanation | `freeform-persisted` |
| 52 | Retake button on completed freeform widget | New widget with same word, fresh widget_id | `freeform-retake` |
| 53 | Tool_result for freeform includes explanation | Text format: "die Abfahrt → 'leaving' ✓ (synonym for departure)" | `tool-result-explanation` |
| 54 | Count parameter ignored for freeform | `flashcard({ mode: 'freeform', count: 10 })` still generates 1 card | `freeform-ignores-count` |
| 55 | Claude grading response is malformed JSON | Server logs error, grades as incorrect, explanation="Unable to parse grading response" | `claude-json-parse-error` |
| 56 | Claude grading response missing 'correct' field | Server logs error, grades as incorrect, explanation="Invalid grading response" | `claude-missing-field` |
| 57 | User sends widget_response with missing answer field | Graded as incorrect (empty string) | `missing-answer-field` |
| 58 | Multiple freeform tool calls in one turn | Each executes sequentially (matching existing tool-use loop); max 10 iterations | `multiple-freeform-per-turn` |

## Tests

### Base Cases

#### Test: freeform-single-card (covers new behavior)

**Given**: User has target language = German, CEFR level A1 has vocab

**When**: Claude calls `flashcard({ mode: 'freeform' })`

**Then** (assertions):
- **widget-sent**: Server sends 1 `widget` message with `type: 'flashcard-freeform'`
- **single-word**: Widget has `word` field (string), no `cards` array
- **no-answer-in-payload**: Widget does not contain `correct_answer` or `gloss_en`

#### Test: exact-match-case-insensitive (covers grading)

**Given**: Widget word = "die Abfahrt", gloss_en = "departure"

**When**: User types "DEPARTURE"

**Then** (assertions):
- **correct-true**: `result.correct` is true
- **method-exact**: `result.grading_method` is 'exact'
- **no-claude-call**: Claude API not invoked for this card

#### Test: fuzzy-match-synonym (covers grading)

**Given**: Widget word = "die Abfahrt", gloss_en = "departure", synonym table includes "leaving"

**When**: User types "leaving"

**Then** (assertions):
- **correct-true**: `result.correct` is true
- **method-fuzzy**: `result.grading_method` is 'fuzzy'
- **no-claude-call**: Claude API not invoked

#### Test: synonym-reverse-lookup (covers grading)

**Given**: Widget word = "die Arbeit", gloss_en = "work", synonym table has "work" → ["job"]

**When**: User types "job"

**Then** (assertions):
- **correct-true**: `result.correct` is true
- **method-fuzzy**: `result.grading_method` is 'fuzzy'

#### Test: claude-fallback-correct (covers grading)

**Given**: Widget word = "die Abfahrt", gloss_en = "departure"

**When**: User types "going away" (not in synonym table), Claude grades correct

**Then** (assertions):
- **correct-true**: `result.correct` is true
- **method-claude**: `result.grading_method` is 'claude'
- **explanation-present**: `result.claude_explanation` is a non-empty string
- **claude-called**: Haiku API invoked with grading prompt

#### Test: claude-fallback-incorrect (covers grading)

**Given**: Widget word = "die Abfahrt", gloss_en = "departure"

**When**: User types "breakfast" (semantically unrelated), Claude grades incorrect

**Then** (assertions):
- **correct-false**: `result.correct` is false
- **method-claude**: `result.grading_method` is 'claude'
- **explanation-present**: `result.claude_explanation` explains why it's wrong

#### Test: trim-whitespace (covers grading)

**Given**: Widget gloss_en = "departure"

**When**: User types "  departure  " (leading/trailing spaces)

**Then** (assertions):
- **correct-true**: Graded as exact match after trimming

#### Test: empty-answer-incorrect (covers edge case)

**Given**: Widget word = "die Abfahrt"

**When**: User types "" (empty string)

**Then** (assertions):
- **correct-false**: Graded incorrect
- **method-exact**: No Claude call needed; empty is always wrong

#### Test: too-long-answer-rejected (covers edge case)

**Given**: Widget word = "die Abfahrt"

**When**: User types a string >200 chars

**Then** (assertions):
- **correct-false**: Graded incorrect
- **explanation**: "Answer too long"
- **no-claude-call**: Claude not invoked

#### Test: freeform-sm2-correct (covers SM-2)

**Given**: Vocab item "die Abfahrt" has ease=2.5, interval_days=0

**When**: User answers correctly

**Then** (assertions):
- **ease-2.6**: `ease` = 2.6
- **interval-1**: `interval_days` = 1
- **due-tomorrow**: `due_at` = now + 86400

#### Test: freeform-sm2-incorrect (covers SM-2)

**Given**: Vocab item "die Abfahrt" has ease=2.5, interval_days=6

**When**: User answers incorrectly

**Then** (assertions):
- **interval-0**: `interval_days` = 0
- **ease-2.3**: `ease` = max(1.3, 2.5 - 0.2) = 2.3

#### Test: freeform-persisted (covers R9)

**Given**: User completes a freeform widget

**When**: Widget result is sent

**Then** (assertions):
- **content-block-widget**: D1 message contains WidgetContentBlock with `widget_type: 'flashcard-freeform'`
- **has-grading-method**: `result` includes `grading_method` field
- **has-explanation**: If method='claude', `result.claude_explanation` is present

#### Test: tool-result-explanation (covers R8)

**Given**: User completes freeform widget for "die Abfahrt", types "leaving", graded correct via fuzzy

**When**: Tool result fed to Claude

**Then** (assertions):
- **is-text**: Tool result is a plain string
- **contains-word**: String includes "die Abfahrt"
- **contains-answer**: String includes "leaving"
- **contains-checkmark**: String includes ✓
- **contains-explanation**: String includes "(synonym for departure)" or similar

#### Test: freeform-ignores-count (covers tool params)

**Given**: Target language selected

**When**: Claude calls `flashcard({ mode: 'freeform', count: 10 })`

**Then** (assertions):
- **single-card**: Widget has 1 word, not a batch

#### Test: freeform-retake (covers R11)

**Given**: User completed a freeform widget for "die Abfahrt"

**When**: User clicks "retake"

**Then** (assertions):
- **new-widget-id**: New widget has different widget_id
- **same-word**: Widget.word is "die Abfahrt"
- **independent**: New completion does not overwrite history

### Edge Cases

#### Test: freeform-timeout-300s (covers R14)

**Given**: Server sent freeform widget

**When**: 300s pass with no response

**Then** (assertions):
- **no-sm2-update**: No `user_vocab_progress` write
- **timed-out-status**: ContentBlock status = 'timed_out'

#### Test: freeform-cancel-on-language-change (covers R15)

**Given**: Freeform widget pending

**When**: Client sends `{ type: 'language', code: 'fra', ... }`

**Then** (assertions):
- **cancel-sent**: Server sends `widget_cancel`
- **no-sm2-update**: No progress written

#### Test: claude-api-error-fallback (covers error handling)

**Given**: Widget requires Claude grading

**When**: Claude API returns 500 or times out

**Then** (assertions):
- **correct-false**: Graded as incorrect
- **method-claude**: `grading_method` is 'claude'
- **explanation**: `claude_explanation` = "Grading service unavailable"
- **logged**: Server logs the API error

#### Test: claude-json-parse-error (covers error handling)

**Given**: Widget requires Claude grading

**When**: Claude returns plain text instead of JSON

**Then** (assertions):
- **correct-false**: Graded as incorrect
- **explanation**: "Unable to parse grading response"
- **logged**: Server logs parse error

#### Test: claude-missing-field (covers error handling)

**Given**: Widget requires Claude grading

**When**: Claude returns `{ "explanation": "..." }` without "correct"

**Then** (assertions):
- **correct-false**: Graded as incorrect
- **explanation**: "Invalid grading response"

#### Test: missing-answer-field (covers edge case)

**Given**: Freeform widget pending

**When**: Client sends `{ type: 'widget_response', widget_id, answer: undefined }`

**Then** (assertions):
- **correct-false**: Graded as incorrect (treated as empty string)

#### Test: multiple-freeform-per-turn (covers R18)

**Given**: Claude calls flashcard(mode='freeform') twice in one turn

**When**: Both execute

**Then** (assertions):
- **sequential**: Second widget sent only after first resolves
- **both-graded**: Both tool_results fed to Claude

## Open Questions

- **OQ-5**: Should the synonym table be persisted in D1 or hardcoded in the worker? Hardcoded for Phase 1; migrate to D1 if it grows large or needs per-language tables.
- **OQ-6**: Should Claude grading prompt include context (e.g., other common meanings of the German word)? Currently no; minimal prompt to reduce Haiku latency.
- **OQ-7**: Should we cache Claude grading responses (same word + same user answer) to avoid duplicate API calls? Not in Phase 1; revisit if latency becomes an issue.
- **OQ-8**: Should the tool definition expose freeform as a separate tool (`flashcard_freeform`) or keep it as a mode parameter? Mode parameter (current design) keeps the tool count low and mirrors natural language ("quiz me freeform style").
- **OQ-9**: Should we show the grading method (exact/fuzzy/claude) in the client UI, or only in the result payload? Payload only for Phase 1; may surface in UI as a "how was this graded?" tooltip in future.
