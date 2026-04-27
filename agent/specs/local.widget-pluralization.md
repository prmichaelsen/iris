# Widget System — Pluralization Widget (Delta Spec)

> **Delta to**: `local.widget-system-phase1.md` — extends the widget system with the `pluralization` widget type for German plural formation practice.

**Namespace**: local
**Version**: 1.0.0
**Created**: 2026-04-27
**Last Updated**: 2026-04-27
**Status**: Draft — awaiting review

---

**Purpose**: Add the `pluralization` widget type to Iris, enabling users to practice German plural formation through free-form text input. Shows a German noun with its article in singular form, user types the plural form, system grades via exact match after normalization.

**Scope**:
- **In scope**: `pluralization` widget type end-to-end; server-side plural generation via Haiku on first encounter; D1 storage (`plural_de` column on `vocab_items` or separate `vocab_plurals` table); free-form text input grading with normalization; hint system showing plural rule patterns; SM-2 progress updates; widget persistence and retake
- **Out of scope**: Languages other than German; audio TTS for noun pronunciation; alternative answer validation (synonyms, typos); batch mode (one noun at a time, not 10)

---

## Requirements

- **R1**: Claude can call a `pluralization` tool with `{ count?: number, cefr_level?: string }` during a voice conversation
- **R2**: The server queries D1 for `count` nouns (default 1, min 1, max 5) at the specified CEFR level; nouns must have a grammatical gender (der/die/das)
- **R3**: On first encounter of a noun, if `plural_de` is null, the server calls Haiku (claude-haiku-4) to generate the plural form and caches it in D1
- **R4**: The server sends a `widget` message containing the noun in singular form with its article (e.g., "das Kind"), optionally with a `hint` describing the plural rule (e.g., "-er with umlaut")
- **R5**: The widget does NOT include the correct plural form in the payload
- **R6**: The client renders a text input where the user types the plural form (full form including article, e.g., "die Kinder")
- **R7**: After the user submits, the client sends a `widget_response` message with the user's answer
- **R8**: The server grades the answer:
  - Case-insensitive comparison on the noun portion
  - Article must be "die" (correct plural article in German)
  - Normalization: trim whitespace, collapse multiple spaces, strip diacritics for comparison (but preserve in display)
  - Exact match required after normalization
- **R9**: The server sends a `widget_result` message with the grading outcome, the correct plural form revealed, and optional explanation
- **R10**: The server updates `user_vocab_progress` with SM-2 scoring (correct → increase ease + extend interval; incorrect → reset interval + decrease ease)
- **R11**: The server feeds a text summary of results back to Claude as the tool_result: "User correctly pluralized 'das Kind' → 'die Kinder' ✓" or "User answered 'der Kinder' for 'das Kind', correct: 'die Kinder' ✗"
- **R12**: The full widget payload (noun, user's answer, grading result, correct answer) is persisted as a `ContentBlock` on the assistant message in D1
- **R13**: When the client loads conversation history containing a completed pluralization widget, it renders the widget in completed state (showing singular, what the user typed, whether it was correct, the correct answer revealed)
- **R14**: Completed widgets in history display a "retake" button that re-sends the same noun as a new widget (new widget_id, new response expected)
- **R15**: If the user's CEFR level has no nouns with gender, the tool call is rejected with a tool_result error: "No nouns available at this CEFR level"
- **R16**: If no target language is selected (`targetLang` is null), the tool call is rejected with a tool_result error: "Please select a language first"
- **R17**: If the target language is not German, the tool call is rejected with a tool_result error: "Pluralization widget only supports German"
- **R18**: If the user disconnects mid-widget (no `widget_response` within 300 seconds), the server times out the widget, records no progress, and feeds a timeout result to Claude
- **R19**: If the user changes language while a widget is pending, the pending widget is cancelled (server sends `widget_cancel`, records no progress)
- **R20**: The Claude tool definition for `pluralization` is included in the tools array when the user has German selected as target language

---

## Interfaces / Data Shapes

### Pluralization Widget (extends shared/types/widgets.ts)

```typescript
interface PluralizationWidget extends WidgetBase {
  type: 'pluralization'
  noun: string        // singular form with article, e.g. "das Kind"
  hint?: string       // optional plural rule, e.g. "-er with umlaut"
  cefr_level: string
}

interface PluralizationResponse {
  type: 'widget_response'
  widget_id: string
  answer: string      // user's typed plural form, e.g. "die Kinder"
}

interface PluralizationResult {
  type: 'widget_result'
  widget_id: string
  widget_type: 'pluralization'
  correct: boolean
  user_answer: string
  correct_answer: string
  explanation?: string  // optional hint on why (e.g., "Plural uses umlaut: Kind → Kinder")
}
```

### D1 Schema Extension

**Option A: Add column to vocab_items**

```sql
ALTER TABLE vocab_items ADD COLUMN plural_de TEXT NULL;
```

**Option B: Separate table (preferred for extensibility)**

```sql
CREATE TABLE vocab_plurals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vocab_item_id INTEGER NOT NULL REFERENCES vocab_items(id),
  plural_form TEXT NOT NULL,
  plural_rule TEXT NULL,  -- e.g. "-er", "-en", "umlaut + -e"
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(vocab_item_id)
);

CREATE INDEX idx_vocab_plurals_vocab_item_id ON vocab_plurals(vocab_item_id);
```

### WebSocket Protocol Extensions

```typescript
// Server → Client (added to ServerMessage union)
| { type: 'widget'; widget: PluralizationWidget }
| { type: 'widget_result'; ...PluralizationResult }

// Client → Server (added to ClientMessage handling)
| { type: 'widget_response'; widget_id: string; answer: string }
```

### Claude Tool Definition

```typescript
{
  name: 'pluralization',
  description: 'Start a German noun pluralization exercise. Shows a singular noun with its article; user types the plural form. Use when the user wants to practice German plural formation.',
  input_schema: {
    type: 'object',
    properties: {
      count: { type: 'integer', minimum: 1, maximum: 5, description: 'Number of nouns to practice. Default 1.' },
      cefr_level: { type: 'string', enum: ['A1', 'A2', 'B1'], description: 'Target CEFR level. Omit to use the user\'s current level.' },
    },
    required: [],
  },
}
```

### Haiku Prompt for Plural Generation

```typescript
const pluralPrompt = `You are a German language expert. Given a German noun in singular form with its article, provide the plural form.

Noun: ${singularNoun}

Respond with a JSON object:
{
  "plural": "die [plural form]",
  "rule": "[brief description of the plural rule, e.g. '-er with umlaut', '-en', 'no change', 'umlaut only']"
}

Examples:
- das Kind → { "plural": "die Kinder", "rule": "-er with umlaut" }
- die Frau → { "plural": "die Frauen", "rule": "-en" }
- der Lehrer → { "plural": "die Lehrer", "rule": "no change" }
- das Buch → { "plural": "die Bücher", "rule": "-er with umlaut (Buch → Bücher)" }`
```

---

## Behavior Table

| # | Scenario | Expected Behavior | Tests |
|---|----------|-------------------|-------|
| 1 | User says "quiz me on plurals," Claude calls pluralization tool | Server generates 1 noun widget, sends to client | `happy-path-pluralization-single` |
| 2 | User types correct plural form and submits | Server grades as correct, reveals answer, updates SM-2, feeds summary to Claude | `happy-path-correct-answer` |
| 3 | User types incorrect plural form | Server grades as incorrect, reveals correct answer, resets SM-2 interval | `happy-path-incorrect-answer` |
| 4 | User types plural with wrong article (e.g., "der Kinder") | Graded as incorrect (article must be "die") | `wrong-article-is-incorrect` |
| 5 | User types plural with correct content but wrong capitalization (e.g., "die kinder") | Graded as correct (case-insensitive on noun) | `case-insensitive-on-noun` |
| 6 | User types plural with extra whitespace (e.g., "die  Kinder ") | Normalized and graded as correct | `whitespace-normalized` |
| 7 | Claude calls pluralization with explicit count=3 | Server generates exactly 3 noun widgets in sequence | `explicit-count-respected` |
| 8 | Claude calls pluralization with explicit cefr_level=A2 | Server picks nouns from A2 only | `explicit-cefr-level` |
| 9 | Claude calls pluralization with no count | Server defaults to 1 noun | `default-count-is-1` |
| 10 | Claude calls pluralization with no cefr_level | Server uses the user's current CEFR level | `default-cefr-from-user-progress` |
| 11 | Claude calls pluralization with count=0 | Tool rejected: "count must be between 1 and 5" | `rejects-count-zero` |
| 12 | Claude calls pluralization with count=10 | Tool rejected: "count must be between 1 and 5" | `rejects-count-over-max` |
| 13 | Claude calls pluralization but no target language selected | Tool rejected: "Please select a language first" | `rejects-no-target-language` |
| 14 | Claude calls pluralization with target language = French | Tool rejected: "Pluralization widget only supports German" | `rejects-non-german-language` |
| 15 | Noun has no cached plural in D1 | Server calls Haiku to generate plural, caches in D1, then sends widget | `generates-plural-via-haiku` |
| 16 | Noun has cached plural in D1 | Server uses cached plural, no Haiku call | `uses-cached-plural` |
| 17 | Haiku returns malformed JSON | Server logs error, retries once, then fails tool call with error | `haiku-json-parse-error-retry` |
| 18 | Haiku call times out (>10s) | Server fails tool call with error: "Failed to generate plural form" | `haiku-timeout-fails-gracefully` |
| 19 | No nouns with gender at the CEFR level | Tool rejected: "No nouns available at this CEFR level" | `rejects-no-nouns-available` |
| 20 | User disconnects mid-widget (no response within 300s) | Server times out, records no progress, feeds timeout to Claude | `timeout-300s-no-progress` |
| 21 | User changes language while widget is pending | Server cancels widget, sends widget_cancel, records no progress | `cancel-on-language-change` |
| 22 | User sends widget_response with wrong widget_id | Response ignored (logged as warning) | `ignores-wrong-widget-id` |
| 23 | User sends widget_response with empty answer | Graded as incorrect | `empty-answer-is-incorrect` |
| 24 | User sends widget_response after timeout already fired | Response ignored (widget already resolved) | `ignores-response-after-timeout` |
| 25 | Page refresh after completed widget | History loads with widget in completed state (singular, user's answer, correct answer visible) | `refresh-shows-completed-widget` |
| 26 | User clicks "retake" on a completed widget in history | Client sends retake request; server generates new widget with same noun, new widget_id | `retake-generates-new-widget` |
| 27 | SM-2 update on correct answer (first time) | interval_days: 0→1, ease: 2.5→2.6 | `sm2-correct-first-time` |
| 28 | SM-2 update on incorrect answer | interval_days → 0, ease: max(1.3, prev-0.2) | `sm2-incorrect-resets-interval` |
| 29 | Widget payload does NOT include correct_answer | Client cannot know the answer before responding | `no-answer-in-widget-payload` |
| 30 | Widget result DOES include correct_answer | Client renders revealed answer after grading | `answer-revealed-in-result` |
| 31 | Tool result fed to Claude is a text summary, not structured data | Claude sees "User correctly pluralized 'das Kind' → 'die Kinder' ✓" | `tool-result-is-text-summary` |
| 32 | Widget persisted as ContentBlock with full payload + response + result | D1 messages row contains the complete widget lifecycle | `widget-persisted-as-content-block` |
| 33 | Retake widget tracks as a separate entry in user_vocab_progress | Each retake is a new scoring event | `retake-creates-new-progress-entry` |
| 34 | Hint is provided when available | Widget includes `hint` field with plural rule pattern | `hint-displayed-when-available` |
| 35 | Hint is omitted when not cached | Widget `hint` field is undefined | `hint-omitted-when-unavailable` |

---

## Behavior (Step-by-Step)

### Tool Call Flow

1. User speaks (or types). Server transcribes, pushes to Claude with `tools: [..., pluralizationTool, ...]`
2. Claude streams response. If it includes a `tool_use` block for `pluralization`:
   a. Server validates parameters (count, cefr_level, target language = German)
   b. Server queries D1 for `count` nouns (vocab_items with grammatical gender) at the target CEFR level
   c. For each noun:
      - Check if `plural_de` (or `vocab_plurals` row) exists
      - If missing, call Haiku with singular form to generate plural + rule, cache in D1
      - If Haiku fails, retry once; if still fails, skip this noun and pick next
   d. Server generates a `widget_id` (opaque, unique)
   e. Server sends `{ type: 'widget', widget: { type: 'pluralization', widget_id, noun: 'das Kind', hint: '-er with umlaut', cefr_level: 'A1' } }` over WS
   f. Server starts a 300s timeout timer for this widget_id
3. Client receives the widget message, renders the noun with a text input field
4. User types the plural form → client sends `{ type: 'widget_response', widget_id, answer: 'die Kinder' }`
5. Server receives response:
   a. Matches `widget_id` to the pending widget; ignores if not found or already resolved
   b. Normalizes the user's answer (trim, lowercase noun portion, check article is "die")
   c. Compares normalized answer to cached plural
   d. Grades as correct or incorrect
   e. Updates `user_vocab_progress` via SM-2
   f. Sends `{ type: 'widget_result', widget_id, correct: true, user_answer: 'die Kinder', correct_answer: 'die Kinder', explanation: '-er with umlaut' }`
   g. Persists the full widget lifecycle (payload + response + result) as a ContentBlock on the assistant message in D1
   h. Builds a text summary and returns it as the `tool_result` content to Claude
   i. Claude loop continues

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

- [ ] **AC1**: User can say "test me on plurals" and Claude invokes the pluralization tool without explicit instructions
- [ ] **AC2**: A single noun with article (e.g., "das Kind") renders in the chat with a text input field
- [ ] **AC3**: User types a plural form and submits; system grades and reveals the correct answer with explanation
- [ ] **AC4**: Correct answers (case-insensitive on noun, article must be "die") are scored as correct and increase SM-2 interval
- [ ] **AC5**: Incorrect answers reset SM-2 interval to 0
- [ ] **AC6**: Page refresh after completing a widget shows the widget in its completed state in chat history
- [ ] **AC7**: Clicking "retake" on a completed widget starts a new session with the same noun
- [ ] **AC8**: Claude reacts to the result naturally in conversation ("Richtig! 'das Kind' → 'die Kinder'")
- [ ] **AC9**: The widget payload sent to the client does not contain the correct plural form
- [ ] **AC10**: If no target language is selected, or target language is not German, Claude's tool call fails gracefully and Claude explains

---

## Non-Goals

- TTS audio for noun pronunciation (Phase 2)
- Languages other than German (pluralization rules are language-specific)
- Alternative answer validation (typo correction, synonyms)
- Batch mode (multiple nouns in one widget)
- User-steered drill generation via custom prompts
- Internationalization of the widget UI chrome (English-only for now)

---

## Open Questions

- **OQ-1**: Should the hint always be shown, or only on request (e.g., user clicks "show hint")?
- **OQ-2**: Should the grading be strict on diacritics (e.g., "Buch" vs "Buch"), or should we normalize them for comparison? Leaning toward normalizing for grading but preserving in display.
- **OQ-3**: Should we support partial credit for getting the noun right but the article wrong (e.g., "der Kinder" → 50% credit)? Leaning toward no (all-or-nothing grading for simplicity).
- **OQ-4**: Should the Haiku prompt include context (e.g., CEFR level, English gloss) to improve accuracy? Leaning toward yes.

---

## Related Artifacts

- **Design**: `agent/design/local.widget-system.md`
- **Phase 1 Spec**: `agent/specs/local.widget-system-phase1.md`
- **Types**: `shared/types/widgets.ts`
- **Schema**: `migrations/0003_curriculum_schema.sql` (vocab_items, user_vocab_progress)
- **Data**: `migrations/0004_seed_goethe.sql` (4,870 vocab items)

---

**Status**: Draft — awaiting review
**Recommendation**: Review Behavior Table, confirm or resolve Open Questions, decide on D1 schema (Option A vs B), then implement
**Related Documents**: `agent/specs/local.widget-system-phase1.md`, `agent/design/local.widget-system.md`
