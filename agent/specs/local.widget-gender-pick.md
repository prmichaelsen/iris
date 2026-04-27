# Gender Pick Widget — Delta Spec (Phase 2)

> **🤖 Agent Directive**: This is a delta specification building on Phase 1 (flashcard-matching). Implement ONLY the differences documented here; all core widget infrastructure (WebSocket protocol, SM-2 scoring, persistence, timeout, cancel, retake) is already in place.

**Namespace**: local
**Version**: 1.0.0
**Created**: 2026-04-27
**Status**: Draft — awaiting review
**Extends**: `local.widget-system-phase1.md`

---

**Purpose**: Add a `gender-pick` widget that tests German noun gender knowledge by showing a bare noun (no article) and asking the user to select der/die/das from three buttons.

**Source**: User specification + `shared/types/widgets.ts` (GenderPickWidget)

**Scope**:
- **In scope**: `gender-pick` widget type end-to-end; batch mode (10 nouns per session); server-side grading (exact match); SM-2 progress updates; eligibility filtering (only nouns with non-null article)
- **Out of scope**: Hint system; sentence context; article-in-context mode (separate widget type); plural gender testing; audio pronunciation

---

## Delta Summary

**What's new**:
- **Widget type**: `gender-pick`
- **Tool parameter**: `mode: 'gender-pick'` in the `flashcard` tool
- **Vocab eligibility**: Only `vocab_items` rows where `article IS NOT NULL` and `part_of_speech = 'noun'`
- **Grading**: User selects from `['der', 'die', 'das']`; correct answer is `vocab_items.article` column (server-side)
- **Card display**: Shows only the bare noun (e.g., "Abfahrt"); no article, no sentence, no hint

**What's reused from Phase 1**:
- Widget infrastructure (WebSocket messages, persistence, timeout, cancel, retake)
- Batch mode (default 10 cards, min 1, max 20)
- SM-2 scoring (correct → increase ease + extend interval; incorrect → reset interval + decrease ease)
- CEFR level filtering
- Tool call flow (Claude → server → client → response → grading → result → tool_result)

---

## Requirements

- **R1**: Claude can call the `flashcard` tool with `{ mode: 'gender-pick', count?: number, cefr_level?: string }`
- **R2**: The server queries D1 for `count` nouns (default 10, min 1, max 20) where `article IS NOT NULL` at the specified CEFR level
- **R3**: Each card contains only the bare noun (stripped of article); no distractors, no options array
- **R4**: The client renders each card with three buttons: "der", "die", "das"
- **R5**: After the last card, the client sends a `widget_response` with all answers (each answer is `'der' | 'die' | 'das'`)
- **R6**: The server grades each answer by comparing the user's selection against `vocab_items.article` (exact string match)
- **R7**: The server updates `user_vocab_progress` with SM-2 scoring (reusing Phase 1 logic)
- **R8**: The server sends a `widget_result` with per-card results and the revealed correct articles
- **R9**: The server feeds a text summary to Claude: "User scored 7/10: Abfahrt (die) ✓, Tisch (der) ✗, ..."
- **R10**: If fewer eligible nouns exist than `count`, the server fills the batch with due-for-review nouns, then already-seen nouns (same logic as Phase 1)
- **R11**: If no eligible nouns exist for the target language, the tool call is rejected with a tool_result error: "No nouns with gender data available for [language]"
- **R12**: Completed `gender-pick` widgets persist as `WidgetContentBlock` with full payload + response + result
- **R13**: Retake button regenerates the same nouns with a new widget_id

---

## Interfaces / Data Shapes

### Widget Type (shared/types/widgets.ts — already defined)

```typescript
export interface GenderPickWidget extends WidgetBase {
  type: 'gender-pick'
  cards: GenderPickCard[]
  cefr_level: string
}

export interface GenderPickCard {
  card_id: string
  noun: string  // bare noun, no article (e.g., "Abfahrt")
}
```

### Widget Response (client → server)

```typescript
export interface GenderPickAnswer {
  card_id: string
  selected_article: 'der' | 'die' | 'das'
}

export interface GenderPickResponse {
  type: 'widget_response'
  widget_id: string
  answers: GenderPickAnswer[]
}
```

### Widget Result (server → client, after grading)

```typescript
export interface GenderPickResult {
  type: 'widget_result'
  widget_id: string
  widget_type: 'gender-pick'
  score: number
  total: number
  cards: GenderPickCardResult[]
}

export interface GenderPickCardResult {
  card_id: string
  noun: string
  correct_article: 'der' | 'die' | 'das'  // revealed after grading
  selected_article: 'der' | 'die' | 'das'
  correct: boolean
}
```

### Persisted Widget ContentBlock (in D1 messages table)

```typescript
export interface WidgetContentBlock {
  type: 'widget'
  widget_type: 'gender-pick'
  widget_id: string
  payload: GenderPickWidget  // original widget (no correct answers)
  response?: GenderPickResponse  // user's answers (null if timed out)
  result?: GenderPickResult  // grading results (null if timed out)
  status: 'active' | 'completed' | 'timed_out' | 'cancelled'
}
```

### Claude Tool Definition (extended)

```typescript
{
  name: 'flashcard',
  description: 'Start a flashcard exercise. Modes: matching (vocab translation), gender-pick (German noun gender). Use when the user wants to practice, drill, or review.',
  input_schema: {
    type: 'object',
    properties: {
      mode: {
        type: 'string',
        enum: ['matching', 'gender-pick'],
        description: 'Quiz mode. matching: translate vocab; gender-pick: choose der/die/das for German nouns.',
      },
      count: { type: 'integer', minimum: 1, maximum: 20, description: 'Number of cards. Default 10.' },
      cefr_level: { type: 'string', enum: ['A1', 'A2', 'B1'], description: 'Target CEFR level. Omit to use the user\'s current level.' },
    },
    required: ['mode'],
  },
}
```

---

## Behavior Table (Delta Only)

New scenarios specific to `gender-pick`. All Phase 1 scenarios (timeout, cancel, SM-2, persistence, retake) apply unchanged.

| # | Scenario | Expected Behavior | Tests |
|---|----------|-------------------|-------|
| 1 | User says "let's practice gender," Claude calls flashcard with mode='gender-pick' | Server generates 10 noun cards, sends batch widget to client | `happy-path-gender-pick-batch` |
| 2 | User completes all 10 cards and submits | Server grades, sends result with revealed articles, updates SM-2, feeds summary to Claude | `happy-path-grade-gender-pick` |
| 3 | Server queries for eligible nouns | Only nouns where `article IS NOT NULL` are selected | `filters-nouns-with-article` |
| 4 | Server queries for eligible nouns | Only nouns where `part_of_speech = 'noun'` are selected | `filters-nouns-by-pos` |
| 5 | Widget payload includes bare noun (no article) | Card has `noun: "Abfahrt"`, not `noun: "die Abfahrt"` | `strips-article-from-display` |
| 6 | Widget payload does NOT include correct_article | Client cannot know the answer before responding | `no-answer-in-widget-payload` |
| 7 | User selects "die" for "Abfahrt" (correct) | Card scored as correct | `correct-gender-match` |
| 8 | User selects "der" for "Abfahrt" (incorrect, correct is "die") | Card scored as incorrect | `incorrect-gender-mismatch` |
| 9 | Grading compares selected_article against vocab_items.article (exact string match) | Case-sensitive exact match: "die" === "die" → correct; "Die" === "die" → incorrect | `grading-exact-match` |
| 10 | Fewer eligible nouns than count | Server fills batch with due-for-review nouns, then already-seen nouns | `fills-batch-with-review-nouns` |
| 11 | Zero eligible nouns for the target language | Tool rejected: "No nouns with gender data available for [language]" | `rejects-no-eligible-nouns` |
| 12 | Target language is not German (e.g., French) | Tool rejected: "Gender-pick mode is only available for German" | `rejects-non-german-language` |
| 13 | Tool result fed to Claude is a text summary | Claude sees "User scored 7/10: Abfahrt (die) ✓, Tisch (der) ✗, ..." | `tool-result-is-text-summary` |
| 14 | Client sends widget_response with invalid selected_article (e.g., "le") | That card scored as incorrect | `invalid-article-scored-wrong` |
| 15 | Client sends widget_response with too few answers | Missing cards scored as incorrect | `partial-response-scored-as-wrong` |
| 16 | User clicks retake on a completed gender-pick widget | Client sends retake request; server generates new widget with same nouns, new widget_id | `retake-generates-new-gender-widget` |

---

## Behavior (Step-by-Step)

### Tool Call Flow (Delta)

1. User speaks (or types). Server transcribes, pushes to Claude with updated `tools: [flashcardTool, ...]` (now supports `mode: 'gender-pick'`)
2. Claude streams response. If it includes a `tool_use` block for `flashcard` with `mode: 'gender-pick'`:
   a. Server validates parameters (mode, count, cefr_level, target language)
   b. **NEW**: Server rejects if `targetLang` is not German (`code !== 'deu'`): "Gender-pick mode is only available for German"
   c. **NEW**: Server queries D1 for nouns: `SELECT * FROM vocab_items WHERE language = 'deu' AND article IS NOT NULL AND part_of_speech = 'noun' AND cefr_level = <level> ORDER BY (prioritize unseen, then due-for-review, then already-seen) LIMIT <count>`
   d. **NEW**: If query returns zero rows: reject tool call with "No nouns with gender data available for German"
   e. **NEW**: For each noun, strip the article from the display (e.g., "die Abfahrt" → "Abfahrt") and store the correct article server-side
   f. Server generates a `widget_id` (opaque, unique)
   g. **NEW**: Server sends `{ type: 'widget', widget: { type: 'gender-pick', widget_id, cards: [{ card_id, noun }, ...], cefr_level } }` — cards contain only the bare `noun`, NOT the article
   h. Server starts a 300s timeout timer for this widget_id
3. **NEW**: Client receives the widget message, renders the first card with three buttons: "der", "die", "das"
4. **NEW**: User taps a button → client records the selection and shows next card → repeat until all cards answered
5. **NEW**: Client sends `{ type: 'widget_response', widget_id, answers: [{ card_id, selected_article: 'der' }, ...] }`
6. Server receives response:
   a. Matches `widget_id` to the pending widget; ignores if not found or already resolved
   b. **NEW**: Grades each card by comparing `selected_article` against the stored `correct_article` (exact string match)
   c. Computes score (correct_count / total)
   d. Updates `user_vocab_progress` for each card via SM-2 (reuses Phase 1 logic)
   e. **NEW**: Sends `{ type: 'widget_result', widget_id, widget_type: 'gender-pick', score, total, cards: [{ card_id, noun, correct_article, selected_article, correct }, ...] }`
   f. Persists the full widget lifecycle (payload + response + result) as a ContentBlock on the assistant message in D1
   g. **NEW**: Builds a text summary: "User scored 7/10: Abfahrt (die) ✓, Tisch (der) ✗, ..." and returns it as the `tool_result` content to Claude
   h. Claude loop continues (Claude may respond with text, call another tool, or end_turn)

### Vocab Eligibility Query (Pseudocode)

```sql
-- Prioritize unseen nouns first, then due-for-review, then already-seen
WITH ranked AS (
  SELECT
    vi.*,
    CASE
      WHEN uvp.vocab_id IS NULL THEN 1  -- unseen
      WHEN uvp.due_at <= NOW() THEN 2  -- due for review
      ELSE 3  -- already seen, not due
    END AS priority,
    COALESCE(uvp.due_at, '1970-01-01') AS due_sort
  FROM vocab_items vi
  LEFT JOIN user_vocab_progress uvp
    ON uvp.vocab_id = vi.id AND uvp.user_id = <user_id>
  WHERE vi.language = <target_language>
    AND vi.article IS NOT NULL
    AND vi.part_of_speech = 'noun'
    AND vi.cefr_level = <level>
)
SELECT * FROM ranked
ORDER BY priority ASC, due_sort ASC, RANDOM()
LIMIT <count>;
```

### Grading Logic (Pseudocode)

```typescript
function gradeGenderPick(
  cards: GenderPickCard[],
  answers: GenderPickAnswer[],
  correctArticles: Map<string, string>  // card_id → correct article (from vocab_items.article)
): GenderPickCardResult[] {
  const results: GenderPickCardResult[] = []
  for (const card of cards) {
    const answer = answers.find(a => a.card_id === card.card_id)
    const correctArticle = correctArticles.get(card.card_id)!
    const selectedArticle = answer?.selected_article || 'der'  // default to 'der' if missing (scored wrong)
    const correct = selectedArticle === correctArticle  // exact string match
    results.push({
      card_id: card.card_id,
      noun: card.noun,
      correct_article: correctArticle,
      selected_article: selectedArticle,
      correct,
    })
  }
  return results
}
```

---

## Acceptance Criteria

- [ ] **AC1**: User can say "let's practice genders" or "quiz me on der/die/das" and Claude invokes the flashcard tool with `mode: 'gender-pick'`
- [ ] **AC2**: A batch of 10 noun cards renders sequentially; each card shows only the bare noun (no article) with three buttons: der, die, das
- [ ] **AC3**: After the last card, a summary screen shows score + per-card results with revealed correct articles
- [ ] **AC4**: Only German nouns with non-null article values are included in the quiz
- [ ] **AC5**: Grading is exact-match: selecting "die" for "die Abfahrt" → correct; selecting "der" → incorrect
- [ ] **AC6**: Page refresh after completing a gender-pick widget shows the widget in its completed state in chat history
- [ ] **AC7**: Clicking "retake" on a completed gender-pick widget starts a new session with the same nouns
- [ ] **AC8**: SM-2 scoring applies to gender-pick widgets (wrong → reset interval; correct → extend interval)
- [ ] **AC9**: The widget payload sent to the client does not contain the correct article
- [ ] **AC10**: If no eligible nouns exist, Claude's tool call fails gracefully and Claude explains

---

## Tests

### Base Cases

#### Test: happy-path-gender-pick-batch (covers R1, R2, R3, R4)

**Given**: User has target language = German (deu), CEFR level A1 has 678 vocab items, 234 are nouns with non-null article

**When**: Claude calls `flashcard({ mode: 'gender-pick' })`

**Then** (assertions):
- **widget-sent**: Server sends exactly 1 `widget` message over WS with `type: 'gender-pick'`
- **card-count-10**: Widget contains `cards` array of length 10
- **each-card-is-noun**: Every card's noun matches a `vocab_items` row where `part_of_speech = 'noun'` and `article IS NOT NULL`
- **no-correct-article**: No card object contains a `correct_article` field
- **bare-noun-only**: Each card's `noun` field does NOT start with "der ", "die ", or "das " (article is stripped)

#### Test: happy-path-grade-gender-pick (covers R5, R6, R7, R8, R9)

**Given**: Client has received a 10-card gender-pick widget and user has selected articles for all 10

**When**: Client sends `widget_response` with 10 answers (7 correct, 3 incorrect)

**Then** (assertions):
- **result-sent**: Server sends exactly 1 `widget_result` message with `widget_type: 'gender-pick'`
- **score-7**: `widget_result.score` is 7
- **total-10**: `widget_result.total` is 10
- **correct-articles-revealed**: Each card in `widget_result.cards` contains `correct_article` ('der'|'die'|'das')
- **per-card-grading**: Exactly 7 cards have `correct: true`, 3 have `correct: false`
- **sm2-updated**: `user_vocab_progress` rows exist for all 10 vocab items with updated `ease`, `interval_days`, `due_at`, `last_seen_at`
- **tool-result-text**: The tool_result content fed to Claude is a string matching pattern "User scored 7/10: Abfahrt (die) ✓, Tisch (der) ✗, ..."

#### Test: filters-nouns-with-article (covers R2)

**Given**: Vocab items table contains 100 nouns, 40 have `article IS NULL`, 60 have `article IS NOT NULL`

**When**: Server generates a gender-pick widget

**Then** (assertions):
- **only-non-null-article**: Every selected noun comes from the 60 with non-null article

#### Test: filters-nouns-by-pos (covers R2)

**Given**: Vocab items table contains 200 words, 150 are nouns, 50 are verbs/adjectives

**When**: Server generates a gender-pick widget

**Then** (assertions):
- **only-nouns**: Every selected word comes from the 150 nouns

#### Test: strips-article-from-display (covers R3)

**Given**: Vocab item has `display = "die Abfahrt"`, `article = "die"`

**When**: Server generates a card for this noun

**Then** (assertions):
- **bare-noun**: Card's `noun` field is `"Abfahrt"` (not `"die Abfahrt"`)

#### Test: no-answer-in-widget-payload (covers R3)

**Given**: Server generates a gender-pick widget

**When**: Widget message is sent to client

**Then** (assertions):
- **no-correct-article**: JSON payload does not contain key `correct_article` at any nesting level

#### Test: correct-gender-match (covers R6)

**Given**: Card noun is "Abfahrt", correct article is "die", user selects "die"

**When**: Server grades the answer

**Then** (assertions):
- **scored-correct**: Card result has `correct: true`

#### Test: incorrect-gender-mismatch (covers R6)

**Given**: Card noun is "Abfahrt", correct article is "die", user selects "der"

**When**: Server grades the answer

**Then** (assertions):
- **scored-incorrect**: Card result has `correct: false`

#### Test: grading-exact-match (covers R6)

**Given**: Correct article is "die" (lowercase)

**When**: User selects "Die" (capitalized)

**Then** (assertions):
- **scored-incorrect**: Grading is case-sensitive; "Die" !== "die" → incorrect

#### Test: tool-result-is-text-summary (covers R9)

**Given**: Server has graded a gender-pick widget

**When**: Tool result is fed back to Claude

**Then** (assertions):
- **is-string**: The tool_result content is a plain string
- **contains-score**: String contains "N/M" where N=correct, M=total
- **contains-per-noun-with-article**: String contains each noun followed by `(<article>) ✓` or `(<article>) ✗`

### Edge Cases

#### Test: fills-batch-with-review-nouns (covers R10)

**Given**: User has target CEFR A1, only 3 unseen nouns remain, 5 nouns are due for review (due_at <= now), 226 nouns seen but not yet due

**When**: Claude calls `flashcard({ mode: 'gender-pick', count: 10 })`

**Then** (assertions):
- **batch-full**: Widget contains 10 cards
- **unseen-first**: 3 of the cards are the unseen nouns
- **due-next**: 5 of the cards are the due-for-review nouns
- **fill-remaining**: 2 cards are from the seen-but-not-due pool

#### Test: rejects-no-eligible-nouns (covers R11)

**Given**: Target language = German, but zero vocab items have `article IS NOT NULL` (hypothetical scenario or sparse data)

**When**: Claude calls `flashcard({ mode: 'gender-pick' })`

**Then** (assertions):
- **tool-error**: Tool result is an error string: "No nouns with gender data available for German"
- **no-widget-sent**: No `widget` message sent to client

#### Test: rejects-non-german-language (covers R12)

**Given**: Target language = French (fra)

**When**: Claude calls `flashcard({ mode: 'gender-pick' })`

**Then** (assertions):
- **tool-error**: Tool result is an error string: "Gender-pick mode is only available for German"
- **no-widget-sent**: No `widget` message sent to client

#### Test: invalid-article-scored-wrong (covers R6)

**Given**: A card has correct article "die"

**When**: Client sends `selected_article: "le"` (French article, invalid)

**Then** (assertions):
- **scored-wrong**: That card is scored as incorrect
- **no-crash**: Server does not throw; other cards are graded normally

#### Test: partial-response-scored-as-wrong (covers R5)

**Given**: Widget has 10 cards

**When**: Client sends `widget_response` with only 6 answers

**Then** (assertions):
- **6-graded**: 6 cards graded based on selected_article
- **4-wrong**: 4 missing cards scored as incorrect
- **sm2-updated-all**: All 10 vocab items get SM-2 updates (6 based on actual answer, 4 as incorrect)

#### Test: retake-generates-new-gender-widget (covers R13)

**Given**: User completed a gender-pick widget with nouns [Abfahrt, Tisch, Schule, ...]

**When**: User clicks "retake" on the completed widget

**Then** (assertions):
- **new-widget-id**: New widget has a different `widget_id`
- **same-nouns**: New widget contains the same nouns
- **independent-grading**: Grading the retake does not overwrite the original widget's result in history

---

## Non-Goals

- Hint system (e.g., "feminine nouns often end in -ung") — future feature
- Sentence context ("Choose the article: ___ Abfahrt ist um 9 Uhr") — separate widget type (`article-in-context`)
- Audio pronunciation of the noun — Phase 3
- Plural gender testing — separate widget type (`pluralization`)
- Mixed-language gender drills (e.g., French le/la/les) — German-only for now

---

## Related Artifacts

- **Phase 1 Spec**: `agent/specs/local.widget-system-phase1.md`
- **Widget Types**: `shared/types/widgets.ts`
- **Schema**: `migrations/0003_curriculum_schema.sql` (vocab_items.article column)
- **Data**: `migrations/0004_seed_goethe.sql` (German vocab with article values)

---

**Status**: Draft — awaiting review
**Recommendation**: Review Behavior Table and Tests, then implement server-side logic (tool handler, vocab query, grading) + client-side UI (three-button card renderer)
