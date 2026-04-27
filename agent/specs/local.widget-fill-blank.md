# Widget System — Fill-Blank Spec (Delta)

> **🤖 Agent Directive**: This is an implementation-ready delta specification extending the Widget System Phase 1 foundation. Build against the Behavior Table and Tests sections; do not invent behavior not covered here.

**Namespace**: local
**Version**: 1.0.0
**Created**: 2026-04-27
**Last Updated**: 2026-04-27
**Status**: Draft — awaiting review
**Extends**: `local.widget-system-phase1.md`

---

**Purpose**: Add `fill-blank` widget type to the Iris Worker, enabling Claude to invoke a `fill_blank` tool that generates a German sentence with one word replaced by "___". The user types the missing word to test grammar and vocabulary in context. Supports optional focus modes (verbs, articles, prepositions, mixed).

**Source**: User request + `shared/types/widgets.ts` (FillBlankWidget definition)

**Scope**:
- **In scope**: `fill-blank` widget type end-to-end; Claude tool (`fill_blank`); server-side content generation from `vocab_examples`; text input grading with normalization (case-insensitive, ä/ae/ö/oe/ü/ue/ß/ss); focus parameter (verbs, articles, prepositions, mixed); SM-2 progress updates; widget persistence
- **Out of scope**: Multi-blank sentences; audio playback of sentence; hint generation beyond what's stored in tool input; custom user-provided sentences

---

## Requirements

- **R1**: Claude can call a `fill_blank` tool with `{ count?: number, cefr_level?: string, focus?: 'verbs' | 'articles' | 'prepositions' | 'mixed' }` during a conversation
- **R2**: The server queries D1 for `count` vocab items (default 5, min 1, max 10) at the specified CEFR level (or user's current level), filtered by the `focus` parameter if provided
- **R3**: For each vocab item, the server selects one example sentence from `vocab_examples`, replaces the target word with "___", and stores the original word as the `expected` answer (server-side only)
- **R4**: The server sends a `widget` message with a batch of fill-blank cards; the `expected` field is NOT included in the client payload
- **R5**: The client renders cards sequentially: one sentence at a time with a text input for the blank, user types an answer, advances to the next card
- **R6**: After the last card, the client sends a `widget_response` with all typed answers
- **R7**: The server grades each answer using normalized string matching: case-insensitive, treat ä/ae, ö/oe, ü/ue, ß/ss as equivalent; updates `user_vocab_progress` with SM-2 scoring
- **R8**: The server sends a `widget_result` with per-card results including the revealed correct answer
- **R9**: The server feeds a text summary to Claude as the tool_result: "User scored 3/5: Ich gehe ___ (in) ✓, Der ___ ist... (Hund) ✗, ..."
- **R10**: The full widget is persisted as a `ContentBlock` on the assistant message
- **R11**: Completed widgets display a "retake" button
- **R12**: Focus modes filter vocab items: `verbs` → part_of_speech='verb', `articles` → part_of_speech='article', `prepositions` → part_of_speech='preposition', `mixed` or omitted → no filter
- **R13**: If no target language is selected, tool call is rejected: "Please select a language first"
- **R14**: If no vocab items have example sentences, tool rejected: "No example sentences available for this language/level/focus"
- **R15**: Widget timeout and language-change cancellation follow Phase 1 behavior (300s timeout, cancel on lang change)

---

## Interfaces / Data Shapes

### Widget Types (extends shared/types/widgets.ts)

```typescript
// Already defined in widgets.ts:
export interface FillBlankWidget extends WidgetBase {
  type: 'fill-blank'
  sentence: string
  hint?: string
  cefr_level: string
}

// Full definition for implementation:
export interface FillBlankCard {
  card_id: string
  sentence: string       // "Ich gehe ___ die Schule." (with ___ for blank)
  hint?: string         // "dative preposition" or "past participle"
  vocab_id: string      // for SM-2 lookup
}

export interface FillBlankWidget extends WidgetBase {
  type: 'fill-blank'
  cards: FillBlankCard[]
  cefr_level: string
}

export interface FillBlankAnswer {
  card_id: string
  typed_answer: string  // user's typed string (may be empty)
}

export interface FillBlankResponse {
  type: 'widget_response'
  widget_id: string
  answers: FillBlankAnswer[]
}

export interface FillBlankCardResult {
  card_id: string
  sentence: string
  expected: string      // revealed after grading
  typed_answer: string
  correct: boolean
  hint?: string
}

export interface FillBlankResult {
  type: 'widget_result'
  widget_id: string
  widget_type: 'fill-blank'
  score: number
  total: number
  cards: FillBlankCardResult[]
}
```

### Claude Tool Definition

```typescript
{
  name: 'fill_blank',
  description: 'Start a fill-in-the-blank grammar exercise. The server generates sentences with one word removed, and the user types the missing word. Use when the user wants to practice grammar, articles, prepositions, or verb conjugations in context.',
  input_schema: {
    type: 'object',
    properties: {
      count: { 
        type: 'integer', 
        minimum: 1, 
        maximum: 10, 
        description: 'Number of sentences. Default 5.' 
      },
      cefr_level: { 
        type: 'string', 
        enum: ['A1', 'A2', 'B1'], 
        description: 'Target CEFR level. Omit to use the user\'s current level.' 
      },
      focus: {
        type: 'string',
        enum: ['verbs', 'articles', 'prepositions', 'mixed'],
        description: 'Focus on a specific part of speech. Omit for mixed practice.'
      },
    },
    required: [],
  },
}
```

### Server-Side Data (NOT sent to client)

```typescript
// Server stores correct answers indexed by card_id
interface FillBlankServerState {
  widget_id: string
  cards: {
    card_id: string
    expected: string    // "in", "Hund", "gegangen"
    vocab_id: string
  }[]
  timeout: NodeJS.Timeout
}
```

### Normalization Function

```typescript
function normalizeAnswer(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
}

function answersMatch(typed: string, expected: string): boolean {
  return normalizeAnswer(typed) === normalizeAnswer(expected)
}
```

---

## Behavior Table

| # | Scenario | Expected Behavior | Tests |
|---|----------|-------------------|-------|
| 1 | User says "practice grammar," Claude calls fill_blank tool | Server generates 5 cards, sends batch widget to client | `happy-path-fill-blank-batch` |
| 2 | User completes all 5 cards and submits | Server grades, sends result with revealed answers, updates SM-2, feeds summary to Claude | `happy-path-grade-and-persist` |
| 3 | Claude calls fill_blank with explicit count=3 | Server generates exactly 3 cards | `explicit-count-respected` |
| 4 | Claude calls fill_blank with focus='verbs' | All cards target verbs (part_of_speech='verb') | `focus-verbs` |
| 5 | Claude calls fill_blank with focus='articles' | All cards target articles | `focus-articles` |
| 6 | Claude calls fill_blank with focus='prepositions' | All cards target prepositions | `focus-prepositions` |
| 7 | Claude calls fill_blank with focus='mixed' or omitted | Cards include any part of speech | `focus-mixed-default` |
| 8 | User types exact match (case-sensitive) | Graded correct | `exact-match-correct` |
| 9 | User types correct word with wrong case ("IN" for "in") | Graded correct (case-insensitive) | `case-insensitive-correct` |
| 10 | User types "ae" for "ä" | Graded correct (ä/ae equivalent) | `umlaut-ae-equivalent` |
| 11 | User types "oe" for "ö" | Graded correct | `umlaut-oe-equivalent` |
| 12 | User types "ue" for "ü" | Graded correct | `umlaut-ue-equivalent` |
| 13 | User types "ss" for "ß" | Graded correct | `eszett-ss-equivalent` |
| 14 | User types "ä" for expected "ae" | Graded correct (bidirectional) | `umlaut-bidirectional` |
| 15 | User types wrong word | Graded incorrect | `wrong-answer-incorrect` |
| 16 | User types empty string | Graded incorrect | `empty-answer-incorrect` |
| 17 | User types extra whitespace " in " | Trimmed and graded correct | `whitespace-trimmed` |
| 18 | Example sentence unavailable for a vocab item | Server skips that item, picks another | `skips-vocab-without-examples` |
| 19 | No vocab items have example sentences | Tool rejected: "No example sentences available..." | `rejects-no-examples` |
| 20 | No target language selected | Tool rejected: "Please select a language first" | `rejects-no-target-language` |
| 21 | count=0 | Tool rejected: "count must be between 1 and 10" | `rejects-count-zero` |
| 22 | count=15 | Tool rejected: "count must be between 1 and 10" | `rejects-count-over-max` |
| 23 | focus='verbs' but no verbs available | Tool rejected: "No verbs available for this level" | `rejects-no-verbs` |
| 24 | User disconnects (no response within 300s) | Server times out, records no progress | `timeout-300s-no-progress` |
| 25 | User changes language while widget pending | Server cancels widget, sends widget_cancel | `cancel-on-language-change` |
| 26 | Widget payload does NOT include expected answer | Client cannot know the answer before responding | `no-answer-in-widget-payload` |
| 27 | Widget result DOES include expected answer | Client renders revealed answer after grading | `answer-revealed-in-result` |
| 28 | Tool result fed to Claude is text summary | Claude sees "User scored 3/5: Ich gehe ___ (in) ✓, ..." | `tool-result-is-text-summary` |
| 29 | Widget persisted as ContentBlock with full lifecycle | D1 messages row contains payload + response + result | `widget-persisted-as-content-block` |
| 30 | Page refresh after completed widget | History loads widget in completed state | `refresh-shows-completed-widget` |
| 31 | User clicks "retake" | New widget with same vocab items, new widget_id | `retake-generates-new-widget` |
| 32 | SM-2 update on correct answer | SM-2 interval and ease updated per flashcard rules | `sm2-correct-update` |
| 33 | SM-2 update on incorrect answer | Interval reset, ease decreased | `sm2-incorrect-update` |

---

## Behavior (Step-by-Step)

### Tool Call Flow

1. User speaks or types. Claude includes `fill_blank` tool call
2. Server validates parameters (count, cefr_level, focus, target language)
3. Server queries D1:
   - Filter by target language, CEFR level, and focus (if provided)
   - Join `vocab_items` with `vocab_examples` (require non-null example)
   - Prioritize unseen vocab, then due-for-review, then already-seen
   - Limit to `count` items
4. For each vocab item:
   - Select one example sentence from `vocab_examples`
   - Locate the target word in the sentence (use regex or string search)
   - Replace the target word with "___"
   - Generate a `card_id` (unique, opaque)
   - Store `expected` answer server-side indexed by `card_id`
   - Optional: extract `hint` from tool parameters or vocab metadata (future enhancement)
5. Generate `widget_id`, send `{ type: 'widget', widget: { type: 'fill-blank', widget_id, cards: [...], cefr_level } }` over WS
6. Start 300s timeout timer
7. Client receives widget, renders first card (sentence with blank, text input)
8. User types answer → client shows next card → repeat until all cards answered
9. Client sends `{ type: 'widget_response', widget_id, answers: [{ card_id, typed_answer }, ...] }`
10. Server receives response:
    - Match `widget_id` to pending widget
    - For each card: `answersMatch(typed_answer, expected)`
    - Compute score
    - Update `user_vocab_progress` via SM-2
    - Send `{ type: 'widget_result', widget_id, score, total, cards: [{ card_id, sentence, expected, typed_answer, correct }, ...] }`
    - Persist as ContentBlock
    - Build text summary, return as tool_result to Claude

### Grading Logic

```typescript
for (const answer of userAnswers) {
  const serverCard = serverState.cards.find(c => c.card_id === answer.card_id)
  if (!serverCard) {
    // Invalid card_id → score as incorrect
    results.push({ correct: false, ... })
    continue
  }
  const correct = answersMatch(answer.typed_answer, serverCard.expected)
  results.push({ 
    card_id: answer.card_id,
    sentence: originalSentence,
    expected: serverCard.expected,
    typed_answer: answer.typed_answer,
    correct,
  })
  // SM-2 update for serverCard.vocab_id
  updateSM2(serverCard.vocab_id, correct)
}
```

---

## Acceptance Criteria

- [ ] **AC1**: User can say "let's practice articles" and Claude invokes `fill_blank` with `focus='articles'`
- [ ] **AC2**: A batch of 5 sentences renders sequentially with text inputs for blanks
- [ ] **AC3**: User typing "ae" for "ä" is accepted as correct
- [ ] **AC4**: User typing "ß" or "ss" are accepted as equivalent
- [ ] **AC5**: Summary screen shows per-card results with expected answer revealed
- [ ] **AC6**: Page refresh shows completed widget in history
- [ ] **AC7**: "Retake" generates new widget with same vocab, fresh card_id and widget_id
- [ ] **AC8**: Claude reacts naturally to score: "3 von 5 — gut gemacht! Let's review the ones you missed..."
- [ ] **AC9**: Widget payload does NOT contain `expected` field
- [ ] **AC10**: If no target language selected, tool call fails gracefully

---

## Tests

### Base Cases

#### Test: happy-path-fill-blank-batch (covers R1, R2, R3, R4, R5)

**Given**: User has target language = German, CEFR A1 has vocab with example sentences

**When**: Claude calls `fill_blank({ count: 5 })`

**Then** (assertions):
- **widget-sent**: Server sends exactly 1 `widget` message
- **card-count-5**: Widget contains `cards` array of length 5
- **each-card-has-blank**: Every card's `sentence` contains "___"
- **no-expected-field**: No card contains an `expected` field in the client payload
- **sentence-from-examples**: Each sentence matches a `vocab_examples.example` for a vocab item

#### Test: happy-path-grade-and-persist (covers R6, R7, R8, R9, R10)

**Given**: Client has received a 5-card fill-blank widget

**When**: Client sends `widget_response` with 5 answers (3 correct, 2 incorrect)

**Then** (assertions):
- **result-sent**: Server sends exactly 1 `widget_result` message
- **score-3**: `widget_result.score` is 3
- **total-5**: `widget_result.total` is 5
- **expected-revealed**: Each card in `widget_result.cards` contains `expected` (string)
- **per-card-grading**: Exactly 3 cards have `correct: true`, 2 have `correct: false`
- **sm2-updated**: `user_vocab_progress` rows updated for all 5 vocab items
- **tool-result-text**: Tool result is a string with "User scored 3/5: ..."
- **persisted**: D1 `messages` row contains `WidgetContentBlock` with full lifecycle

### Focus Modes

#### Test: focus-verbs (covers R12)

**Given**: Target language selected, A1 has verbs with examples

**When**: Claude calls `fill_blank({ focus: 'verbs' })`

**Then** (assertions):
- **all-verbs**: Every vocab item selected has `part_of_speech = 'verb'`

#### Test: focus-articles (covers R12)

**Given**: Target language selected, A1 has articles with examples

**When**: Claude calls `fill_blank({ focus: 'articles' })`

**Then** (assertions):
- **all-articles**: Every vocab item has `part_of_speech = 'article'`

#### Test: focus-mixed-default (covers R12)

**Given**: Target language selected

**When**: Claude calls `fill_blank({})` (no focus)

**Then** (assertions):
- **mixed-parts-of-speech**: Cards may include any part_of_speech

### Normalization

#### Test: case-insensitive-correct (covers R7)

**Given**: Expected answer is "in"

**When**: User types "IN"

**Then** (assertions):
- **correct**: Card graded as correct

#### Test: umlaut-ae-equivalent (covers R7)

**Given**: Expected answer is "Bäcker"

**When**: User types "Baecker"

**Then** (assertions):
- **correct**: Card graded as correct

#### Test: umlaut-oe-equivalent (covers R7)

**Given**: Expected answer is "schön"

**When**: User types "schoen"

**Then** (assertions):
- **correct**: Card graded as correct

#### Test: umlaut-ue-equivalent (covers R7)

**Given**: Expected answer is "über"

**When**: User types "ueber"

**Then** (assertions):
- **correct**: Card graded as correct

#### Test: eszett-ss-equivalent (covers R7)

**Given**: Expected answer is "Straße"

**When**: User types "Strasse"

**Then** (assertions):
- **correct**: Card graded as correct

#### Test: umlaut-bidirectional (covers R7)

**Given**: Expected answer is "Baecker" (stored with ae)

**When**: User types "Bäcker"

**Then** (assertions):
- **correct**: Card graded as correct (ä → ae normalization)

#### Test: whitespace-trimmed (covers R7)

**Given**: Expected answer is "in"

**When**: User types " in "

**Then** (assertions):
- **correct**: Card graded as correct (whitespace trimmed)

#### Test: empty-answer-incorrect (covers R7)

**Given**: Expected answer is "in"

**When**: User types "" (empty string)

**Then** (assertions):
- **incorrect**: Card graded as incorrect

### Edge Cases

#### Test: rejects-no-target-language (covers R13)

**Given**: `targetLang` is null

**When**: Claude calls `fill_blank({})`

**Then** (assertions):
- **tool-error**: "Please select a language first"
- **no-widget-sent**: No `widget` message sent

#### Test: rejects-no-examples (covers R14)

**Given**: Target language has vocab but zero `vocab_examples` rows

**When**: Claude calls `fill_blank({})`

**Then** (assertions):
- **tool-error**: "No example sentences available for this language/level"

#### Test: rejects-count-zero (covers R2)

**Given**: Target language selected

**When**: Claude calls `fill_blank({ count: 0 })`

**Then** (assertions):
- **tool-error**: "count must be between 1 and 10"

#### Test: rejects-count-over-max (covers R2)

**Given**: Target language selected

**When**: Claude calls `fill_blank({ count: 15 })`

**Then** (assertions):
- **tool-error**: "count must be between 1 and 10"

#### Test: rejects-no-verbs (covers R12)

**Given**: A1 has zero verbs with examples

**When**: Claude calls `fill_blank({ focus: 'verbs' })`

**Then** (assertions):
- **tool-error**: "No verbs available for this level"

#### Test: skips-vocab-without-examples (covers R3)

**Given**: 10 vocab items at A1, only 5 have example sentences

**When**: Claude calls `fill_blank({ count: 5 })`

**Then** (assertions):
- **all-have-examples**: All 5 cards use vocab items with example sentences

#### Test: timeout-300s-no-progress (covers R15)

**Given**: Server sent a fill-blank widget

**When**: 300 seconds pass with no `widget_response`

**Then** (assertions):
- **no-sm2-writes**: No progress updates
- **tool-result-timeout**: Tool result contains "timed out"

#### Test: cancel-on-language-change (covers R15)

**Given**: Fill-blank widget pending

**When**: Client sends `{ type: 'language', code: 'fra', ... }`

**Then** (assertions):
- **cancel-sent**: `{ type: 'widget_cancel', ... }` sent to client
- **no-sm2-writes**: No progress updates

---

## Non-Goals

- Multi-blank sentences (one blank per sentence)
- Audio playback of the sentence (future TTS enhancement)
- Hint generation beyond what's in tool parameters (future AI-generated hints)
- Custom user-provided sentences (future feature)

---

## Related Artifacts

- **Phase 1 Spec**: `agent/specs/local.widget-system-phase1.md`
- **Types**: `shared/types/widgets.ts`
- **Schema**: `migrations/0003_curriculum_schema.sql` (vocab_items, vocab_examples, user_vocab_progress)

---

**Status**: Draft — awaiting review
**Recommendation**: Review Behavior Table, confirm normalization rules, then implement
