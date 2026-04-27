# Widget Conjugation — Delta Spec

> **🤖 Agent Directive**: This is a delta specification extending the Phase 1 Widget System. The Behavior Table is the proofing surface; implement against these requirements. Unresolved scenarios are flagged `undefined` and linked to Open Questions.

**Namespace**: local
**Version**: 1.0.0
**Created**: 2026-04-27
**Last Updated**: 2026-04-27
**Status**: Draft — awaiting review
**Parent Spec**: `agent/specs/local.widget-system-phase1.md`

---

**Purpose**: Add the `conjugation` widget type to drill German verb conjugation across tenses, including irregular verbs, separable prefix handling, and Perfekt compound forms (auxiliary + participle). Claude-powered fallback grading handles edge cases.

**Source**: User request + Phase 1 widget system architecture

**Scope**:
- **In scope**: `conjugation` widget type end-to-end; `conjugate` Claude tool with configurable tenses + subjects; Haiku-powered conjugation table generation with D1 caching in `vocab_conjugations`; exact-match and Claude fallback grading; separable prefix word order validation; Perfekt auxiliary selection (haben/sein); SM-2 progress tracking per verb-tense-subject triple
- **Out of scope**: Subjunctive tenses (Konjunktiv I/II); Imperativ; compound tenses beyond Perfekt; multi-verb sentences; reflexive verb special handling; pronunciation feedback; batch mode (conjugation is one card per tool call)

---

## Requirements

- **R1**: Claude can call a `conjugate` tool with `{ verb: string, tenses?: string[], subjects?: string[], count?: number }` during a voice conversation
- **R2**: Default `tenses` is `['Präsens']`; allowed: `Präsens`, `Präteritum`, `Perfekt`, `Futur I`
- **R3**: Default `subjects` is `['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie']` (all 6); user can filter to subset
- **R4**: Default `count` is 1 (one card per tool call); min 1, max 10 for batch mode (future Phase 2 enhancement)
- **R5**: Server queries D1 `vocab_conjugations` for cached conjugation table keyed by `verb` (infinitive form, e.g. "fahren" or "abfahren")
- **R6**: If no cache exists, server calls Haiku with a `generate_conjugation_table` tool to generate the full table (6 subjects × 4 tenses = 24 forms + auxiliary for Perfekt), then writes to `vocab_conjugations` with 1-year TTL
- **R7**: Server randomly selects one (subject, tense) pair from the requested `subjects` × `tenses` cross product
- **R8**: Server sends a `widget` message containing: `verb` (infinitive), `subject`, `tense`, optional `context_sentence`, `cefr_level`; does NOT include `correct_answer`
- **R9**: Client renders: "fahren, ich, Präsens" as the prompt; text input for user's answer; submit button
- **R10**: User types the conjugated form (e.g. "fahre" or "ich fahre ab" for separable verbs); client sends `widget_response` with the user's text
- **R11**: Server grades: first checks exact string match (case-insensitive, whitespace-normalized) against cached conjugation; if mismatch, calls Claude 4.7 Sonnet with the conjugation table as context and asks for a boolean grade + explanation
- **R12**: For separable prefix verbs (e.g. "abfahren"), correct answer format for non-compound tenses is "fahre ab" (split); for Perfekt: "bin abgefahren" (prefix rejoins in participle)
- **R13**: For Perfekt tense, correct answer must include auxiliary (haben/sein) + past participle (e.g. "bin gefahren" for "fahren, ich, Perfekt"); Claude grading allows flexible word order ("gefahren bin" accepted if natural)
- **R14**: Server sends `widget_result` with `correct: boolean`, `correct_answer: string`, `explanation?: string` (from Claude fallback if used)
- **R15**: Server updates `user_vocab_progress` with SM-2 scoring, keyed by `vocab_item_id` (verb infinitive) + tense + subject (compound key for fine-grained tracking)
- **R16**: Widget persists in chat history as a `WidgetContentBlock` with full payload + response + result
- **R17**: If target language is not German, tool call rejects with error: "Conjugation drills are only available for German"
- **R18**: If the verb is not found in `vocab_items`, Haiku generates the conjugation table anyway (accepts any valid German infinitive, not just curriculum vocab)
- **R19**: If Haiku fails to generate a valid conjugation table (malformed response, timeout), tool call rejects with error: "Could not generate conjugation for [verb]"
- **R20**: If user's answer is empty or whitespace-only, graded as incorrect (no Claude fallback call needed)

---

## Interfaces / Data Shapes

### Widget Type (extends shared/types/widgets.ts)

```typescript
export interface ConjugationWidget extends WidgetBase {
  type: 'conjugation'
  verb: string              // infinitive, e.g. "fahren" or "abfahren"
  subject: string           // e.g. "ich"
  tense: string             // e.g. "Präsens"
  context_sentence?: string // future: sentence with blank for conjugated verb
  cefr_level: string
}
```

### Widget Response (client → server)

```typescript
export interface ConjugationResponse {
  type: 'widget_response'
  widget_id: string
  answer: string  // user's typed conjugation, e.g. "fahre" or "bin gefahren"
}
```

### Widget Result (server → client)

```typescript
export interface ConjugationResult {
  type: 'widget_result'
  widget_id: string
  widget_type: 'conjugation'
  correct: boolean
  correct_answer: string
  user_answer: string
  explanation?: string  // present if Claude fallback was used
  grading_method: 'exact' | 'claude'
}
```

### Database Schema: vocab_conjugations (new D1 table)

```sql
CREATE TABLE vocab_conjugations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  verb TEXT NOT NULL,            -- infinitive, e.g. "fahren"
  language TEXT NOT NULL,        -- e.g. "deu"
  conjugation_table TEXT NOT NULL, -- JSON: { [subject_tense]: "form", ... }
  auxiliary TEXT,                -- "haben" or "sein" (for Perfekt)
  is_separable BOOLEAN,          -- true if verb has separable prefix
  separable_prefix TEXT,         -- e.g. "ab" for "abfahren"
  generated_at INTEGER NOT NULL, -- Unix timestamp
  expires_at INTEGER NOT NULL,   -- generated_at + 31536000 (1 year)
  UNIQUE(verb, language)
);

CREATE INDEX idx_conjugations_expires ON vocab_conjugations(expires_at);
```

### Conjugation Table JSON Format

```json
{
  "ich_Präsens": "fahre",
  "du_Präsens": "fährst",
  "er/sie/es_Präsens": "fährt",
  "wir_Präsens": "fahren",
  "ihr_Präsens": "fahrt",
  "sie/Sie_Präsens": "fahren",
  "ich_Präteritum": "fuhr",
  "du_Präteritum": "fuhrst",
  "...": "...",
  "ich_Perfekt": "bin gefahren",
  "...": "...",
  "ich_Futur I": "werde fahren",
  "...": "...",
  "auxiliary": "sein",
  "is_separable": false
}
```

### Claude Tool Definition

```typescript
{
  name: 'conjugate',
  description: 'Start a verb conjugation drill. Tests the user on German verb forms across tenses (Präsens, Präteritum, Perfekt, Futur I) and subjects. Use when the user wants to practice conjugation or mentions a specific verb.',
  input_schema: {
    type: 'object',
    properties: {
      verb: { 
        type: 'string', 
        description: 'German verb infinitive to drill, e.g. "fahren" or "abfahren". Must be a valid German verb.' 
      },
      tenses: { 
        type: 'array', 
        items: { enum: ['Präsens', 'Präteritum', 'Perfekt', 'Futur I'] },
        description: 'Tenses to include. Default: [Präsens].' 
      },
      subjects: { 
        type: 'array', 
        items: { enum: ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie'] },
        description: 'Subjects to include. Default: all 6 subjects.' 
      },
      count: { 
        type: 'integer', 
        minimum: 1, 
        maximum: 10, 
        description: 'Number of cards. Phase 2 feature; currently only 1 supported.' 
      },
    },
    required: ['verb'],
  },
}
```

### Haiku Tool Definition (generate_conjugation_table)

```typescript
{
  name: 'generate_conjugation_table',
  description: 'Generate a complete conjugation table for a German verb across 4 tenses and 6 subjects.',
  input_schema: {
    type: 'object',
    properties: {
      verb: { type: 'string', description: 'German infinitive, e.g. "fahren"' },
      subjects: { 
        type: 'array', 
        items: { type: 'string' },
        description: 'Fixed: [ich, du, er/sie/es, wir, ihr, sie/Sie]' 
      },
      tenses: { 
        type: 'array', 
        items: { type: 'string' },
        description: 'Fixed: [Präsens, Präteritum, Perfekt, Futur I]' 
      },
    },
    required: ['verb', 'subjects', 'tenses'],
  },
}
```

Haiku is expected to return tool_result as JSON:

```json
{
  "conjugations": {
    "ich_Präsens": "fahre",
    "...": "..."
  },
  "auxiliary": "sein",
  "is_separable": false,
  "separable_prefix": null
}
```

---

## Behavior Table

| # | Scenario | Expected Behavior | Tests |
|---|----------|-------------------|-------|
| 1 | User says "let's drill fahren," Claude calls conjugate tool | Server generates conjugation card, sends widget to client | `happy-path-conjugate` |
| 2 | User types correct conjugation, e.g. "fahre" for "fahren, ich, Präsens" | Exact match, graded correct, SM-2 updated | `exact-match-correct` |
| 3 | User types incorrect conjugation, e.g. "fährt" for "fahren, ich, Präsens" | Exact mismatch, graded incorrect (no Claude fallback for clear error) | `exact-match-incorrect` |
| 4 | User types near-correct with typo, e.g. "fahree" | Exact mismatch triggers Claude fallback; Claude grades as incorrect but explains typo | `claude-fallback-typo` |
| 5 | Claude calls conjugate with explicit tenses=[Perfekt, Präteritum] | Server picks one random (subject, tense) from cross product; both tenses eligible | `explicit-tenses-respected` |
| 6 | Claude calls conjugate with explicit subjects=[ich, du] | Server picks from {ich, du} only; other subjects not included | `explicit-subjects-respected` |
| 7 | Claude calls conjugate with no tenses param | Defaults to [Präsens] | `default-tense-praesens` |
| 8 | Claude calls conjugate with no subjects param | Defaults to all 6 subjects | `default-all-subjects` |
| 9 | Claude calls conjugate for a separable verb (e.g. "abfahren, ich, Präsens") | Correct answer is "fahre ab" (split); user must include prefix in correct position | `separable-verb-present-tense` |
| 10 | Separable verb in Perfekt (e.g. "abfahren, ich, Perfekt") | Correct answer is "bin abgefahren" (prefix rejoins in participle) | `separable-verb-perfekt` |
| 11 | Perfekt tense with sein auxiliary (e.g. "fahren, ich, Perfekt") | Correct answer is "bin gefahren"; "habe gefahren" is incorrect | `perfekt-auxiliary-sein` |
| 12 | Perfekt tense with haben auxiliary (e.g. "machen, ich, Perfekt") | Correct answer is "habe gemacht" | `perfekt-auxiliary-haben` |
| 13 | User types Perfekt answer with flexible word order: "gefahren bin" | Claude fallback accepts if contextually valid in spoken German | `perfekt-flexible-word-order` |
| 14 | Claude calls conjugate for non-German target language | Tool rejected: "Conjugation drills are only available for German" | `rejects-non-german` |
| 15 | Claude calls conjugate for verb not in vocab_items | Haiku generates table anyway; tool proceeds | `non-vocab-verb-accepted` |
| 16 | Conjugation table already cached in vocab_conjugations | Server reads from cache, does not call Haiku | `cache-hit-no-haiku-call` |
| 17 | Conjugation table not cached | Server calls Haiku, writes to vocab_conjugations, proceeds | `cache-miss-generates-table` |
| 18 | Haiku fails to generate table (timeout, malformed response) | Tool rejected: "Could not generate conjugation for [verb]" | `haiku-generation-failure` |
| 19 | User submits empty answer | Graded as incorrect; no Claude fallback call | `empty-answer-incorrect` |
| 20 | User submits whitespace-only answer | Normalized to empty, graded incorrect | `whitespace-only-incorrect` |
| 21 | User submits answer with leading/trailing whitespace: " fahre " | Whitespace trimmed before comparison; exact match succeeds | `whitespace-normalized` |
| 22 | User submits answer with wrong case: "Fahre" vs "fahre" | Case-insensitive comparison; exact match succeeds | `case-insensitive` |
| 23 | User submits answer missing separable prefix: "fahre" for "abfahren, ich, Präsens" | Exact mismatch; Claude fallback likely grades incorrect, explains prefix missing | `missing-separable-prefix` |
| 24 | User submits answer with prefix but wrong position: "abfahre" for "abfahren, ich, Präsens" | Exact mismatch; Claude fallback grades incorrect, explains word order | `wrong-prefix-position` |
| 25 | Claude grading fallback for edge case: user types "ich fahre" (includes subject) | Claude accepts if semantically correct, grades as correct with explanation | `claude-accepts-subject-included` |
| 26 | Widget persisted with grading_method='exact' | ContentBlock includes `grading_method: 'exact'`, no explanation field | `persist-exact-match` |
| 27 | Widget persisted with grading_method='claude' | ContentBlock includes `grading_method: 'claude'`, explanation field present | `persist-claude-fallback` |
| 28 | SM-2 update keyed by verb + tense + subject | Progress row created/updated with composite key, not just verb | `sm2-composite-key` |
| 29 | Retake button on completed conjugation widget | Client sends retake request; server generates new widget with same verb, newly randomized (subject, tense) pair | `retake-rerandomizes` |
| 30 | Vocab_conjugations row expires (expires_at < now) | Server treats as cache miss, regenerates table via Haiku | `expired-cache-regenerates` |

---

## Behavior (Step-by-Step)

### Tool Call Flow

1. User speaks or types, mentions a verb (e.g., "let's drill fahren"). Server transcribes, pushes to Claude with `tools: [conjugateTool, ...]`
2. Claude streams response with `tool_use` block for `conjugate`:
   a. Server validates: target language must be German; verb must be non-empty
   b. Server queries `vocab_conjugations` WHERE `verb = ? AND language = 'deu' AND expires_at > now`
   c. **Cache hit**: Load conjugation table from JSON column
   d. **Cache miss**: Call Haiku with `generate_conjugation_table` tool; parse result; INSERT into `vocab_conjugations` with 1-year expiry
   e. Server randomly selects one (subject, tense) pair from `subjects` × `tenses` cross product (defaults applied if params omitted)
   f. Server generates `widget_id`, retrieves `cefr_level` from `vocab_items` (or defaults to A1 if verb not in vocab)
   g. Server sends `{ type: 'widget', widget: { type: 'conjugation', widget_id, verb, subject, tense, cefr_level } }` over WS
   h. Server stores the correct answer server-side (from conjugation table) and starts 300s timeout
3. Client receives widget, renders: "fahren, ich, Präsens" + text input + submit button
4. User types answer, clicks submit; client sends `{ type: 'widget_response', widget_id, answer: 'fahre' }`
5. Server receives response:
   a. Normalize user answer: trim whitespace, lowercase
   b. Normalize correct answer: trim whitespace, lowercase
   c. **Exact match**: If normalized strings equal, grade as `correct: true`, `grading_method: 'exact'`
   d. **Mismatch**: If empty answer, grade as `correct: false`, `grading_method: 'exact'`
   e. **Mismatch, non-empty**: Call Claude 4.7 Sonnet with prompt:
      ```
      Verb: fahren
      Subject: ich
      Tense: Präsens
      Expected: fahre
      User answer: fahree
      Conjugation table: { ... }
      
      Is the user's answer acceptable? Consider typos, word order, and natural variations. Return { "correct": boolean, "explanation": string }.
      ```
   f. Parse Claude response; grade as `correct: [result]`, `grading_method: 'claude'`, `explanation: [text]`
   g. Update `user_vocab_progress` with SM-2 (composite key: `verb_id + tense + subject`)
   h. Send `{ type: 'widget_result', widget_id, widget_type: 'conjugation', correct, correct_answer, user_answer, explanation?, grading_method }`
   i. Persist widget as ContentBlock in D1 `messages`
   j. Build text summary tool_result: "User conjugated 'fahren' (ich, Präsens) as 'fahre' — correct! ✓" or "Incorrect. Expected 'fahre', got 'fährt'."
   k. Return tool_result to Claude; loop continues

### Cache Expiry Flow

1. Cron job runs daily: DELETE FROM `vocab_conjugations` WHERE `expires_at < unixepoch()`
2. Next conjugate tool call for that verb triggers cache miss → Haiku regenerates

---

## Acceptance Criteria

- [ ] **AC1**: User can say "drill fahren" and Claude invokes conjugate tool without explicit instructions
- [ ] **AC2**: Widget renders cleanly: verb infinitive + subject + tense displayed, text input for user's answer
- [ ] **AC3**: Correct answers grade as correct via exact match (fast path, no Claude call)
- [ ] **AC4**: Typos and edge cases grade via Claude fallback with explanation shown in result
- [ ] **AC5**: Separable verbs (e.g., "abfahren") require correct prefix placement: "fahre ab" for Präsens, "bin abgefahren" for Perfekt
- [ ] **AC6**: Perfekt tense validates auxiliary selection: "bin gefahren" correct for motion verbs, "habe gemacht" for action verbs
- [ ] **AC7**: Conjugation tables cache in D1 for 1 year; Haiku is only called on cache miss
- [ ] **AC8**: SM-2 progress tracks per verb-tense-subject triple (fine-grained), not just per verb
- [ ] **AC9**: Retaking a conjugation widget generates a new random (subject, tense) pair from the same verb
- [ ] **AC10**: Tool rejects gracefully if target language is not German

---

## Tests

### Base Cases

#### Test: happy-path-conjugate (covers R1, R5, R7, R8, R9)

**Given**: Target language = German, verb "fahren" has cached conjugation table

**When**: Claude calls `conjugate({ verb: 'fahren' })`

**Then** (assertions):
- **widget-sent**: Server sends `widget` message with `type: 'conjugation'`
- **fields-present**: Widget has `verb='fahren'`, `subject` in {ich, du, er/sie/es, wir, ihr, sie/Sie}, `tense='Präsens'`
- **no-correct-answer**: Widget payload does NOT contain `correct_answer` field

#### Test: exact-match-correct (covers R10, R11, R14)

**Given**: Widget sent for "fahren, ich, Präsens"; correct answer is "fahre"

**When**: User submits `answer: 'fahre'`

**Then** (assertions):
- **graded-correct**: `widget_result.correct = true`
- **grading-method-exact**: `grading_method = 'exact'`
- **no-explanation**: `explanation` field absent
- **sm2-updated**: `user_vocab_progress` updated with correct=true for (fahren, Präsens, ich)

#### Test: exact-match-incorrect (covers R10, R11, R14)

**Given**: Widget sent for "fahren, ich, Präsens"; correct answer is "fahre"

**When**: User submits `answer: 'fährt'`

**Then** (assertions):
- **exact-mismatch-triggers-claude**: Claude fallback called with verb, subject, tense, expected, user answer
- **graded-incorrect**: `widget_result.correct = false`
- **grading-method-claude**: `grading_method = 'claude'`
- **explanation-present**: `explanation` field contains Claude's reasoning

#### Test: explicit-tenses-respected (covers R2, R7)

**Given**: Target language = German

**When**: Claude calls `conjugate({ verb: 'fahren', tenses: ['Perfekt', 'Präteritum'] })`

**Then** (assertions):
- **tense-from-set**: Widget `tense` is either 'Perfekt' or 'Präteritum'

#### Test: separable-verb-present-tense (covers R12)

**Given**: Widget sent for "abfahren, ich, Präsens"

**When**: User submits `answer: 'fahre ab'`

**Then** (assertions):
- **graded-correct**: `correct = true`

**When**: User submits `answer: 'abfahre'` (prefix not split)

**Then** (assertions):
- **graded-incorrect**: `correct = false`
- **explanation-mentions-prefix**: `explanation` contains "separable prefix" or "split"

#### Test: separable-verb-perfekt (covers R12, R13)

**Given**: Widget sent for "abfahren, ich, Perfekt"

**When**: User submits `answer: 'bin abgefahren'`

**Then** (assertions):
- **graded-correct**: `correct = true`

#### Test: perfekt-auxiliary-sein (covers R13)

**Given**: Widget sent for "fahren, ich, Perfekt"; auxiliary is "sein"

**When**: User submits `answer: 'bin gefahren'`

**Then** (assertions):
- **graded-correct**: `correct = true`

**When**: User submits `answer: 'habe gefahren'` (wrong auxiliary)

**Then** (assertions):
- **graded-incorrect**: `correct = false`

#### Test: cache-hit-no-haiku-call (covers R5, R6)

**Given**: "fahren" has cached conjugation table in `vocab_conjugations`, `expires_at > now`

**When**: Claude calls `conjugate({ verb: 'fahren' })`

**Then** (assertions):
- **no-haiku-call**: Haiku API not invoked
- **widget-generated**: Widget sent successfully

#### Test: cache-miss-generates-table (covers R5, R6)

**Given**: "laufen" has no cached conjugation table

**When**: Claude calls `conjugate({ verb: 'laufen' })`

**Then** (assertions):
- **haiku-called**: Haiku `generate_conjugation_table` tool invoked
- **cache-written**: New row in `vocab_conjugations` with `verb='laufen'`, `expires_at = now + 31536000`
- **widget-generated**: Widget sent successfully

#### Test: rejects-non-german (covers R17)

**Given**: Target language = French

**When**: Claude calls `conjugate({ verb: 'aller' })`

**Then** (assertions):
- **tool-error**: Tool result is error string: "Conjugation drills are only available for German"

#### Test: empty-answer-incorrect (covers R20)

**Given**: Widget sent

**When**: User submits `answer: ''`

**Then** (assertions):
- **graded-incorrect**: `correct = false`
- **no-claude-call**: Claude fallback not invoked

#### Test: sm2-composite-key (covers R15)

**Given**: Widget for "fahren, ich, Präsens" graded

**When**: SM-2 update executes

**Then** (assertions):
- **composite-key**: Progress row keyed by `(vocab_item_id, 'Präsens', 'ich')`
- **separate-from-other-forms**: "fahren, du, Präsens" has independent progress row

---

## Non-Goals

- Subjunctive tenses (Konjunktiv I/II) — future enhancement
- Imperativ mood — separate widget type (future)
- Reflexive verb special handling (e.g., "sich freuen") — Claude fallback can handle, but no dedicated logic
- Pronunciation feedback or TTS — Phase 2+
- Batch mode (count > 1) — Phase 2 enhancement
- Context sentences with blanks — future enhancement (context_sentence field defined but not used)

---

## Open Questions

- **OQ-1**: Should the widget display "fahren, ich, Präsens" or a full sentence with a blank ("Ich ___ nach Berlin")? Leaning toward simple prompt for Phase 1; sentence mode is Phase 2.
- **OQ-2**: Should Claude fallback grading be strict or lenient? Proposal: lenient (accept natural variations, e.g., including subject pronoun, flexible Perfekt word order).
- **OQ-3**: Should we track per-tense progress in addition to composite key? E.g., "user is good at Präsens but struggles with Perfekt" — answer: yes, composite key enables this.
- **OQ-4**: Should irregular verbs (e.g., "sein", "haben") be prioritized in curriculum, or treated same as regular verbs? Proposal: same, but future "focus on irregular" filter could use a flag in conjugation table.

---

## Related Artifacts

- **Parent Spec**: `agent/specs/local.widget-system-phase1.md`
- **Types**: `shared/types/widgets.ts`
- **Schema**: `migrations/0003_curriculum_schema.sql` (add `vocab_conjugations` table)
- **Design**: `agent/design/local.widget-system.md`

---

**Status**: Draft — awaiting review
**Recommendation**: Review Behavior Table, confirm or resolve Open Questions, then implement
