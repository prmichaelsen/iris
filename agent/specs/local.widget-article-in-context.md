# Widget System — Article-in-Context Delta Spec

> **🤖 Agent Directive**: This is an implementation-ready delta specification. Implement the article-in-context widget type following the architecture established in Phase 1 (flashcard-matching). The Behavior Table is the proofing surface; the Tests section is the executable contract.

**Namespace**: local
**Version**: 1.0.0
**Created**: 2026-04-27
**Last Updated**: 2026-04-27
**Status**: Draft — awaiting review
**Depends on**: Phase 1 widget system (local.widget-system-phase1.md)

---

**Purpose**: Add the `article-in-context` widget type to test German article declension across all four cases (nominative, accusative, dative, genitive) in natural sentences, with optional multiple-choice or freeform input modes.

**Source**: User request + ArticleInContextWidget type definition

**Delta**: Extends Phase 1 widget infrastructure to support Claude-generated article drills that test the full German case system in context.

**Scope**:
- **In scope**: article-in-context widget type; Claude Haiku content generation for sentence + blanked article; D1 caching of generated content; freeform and multiple_choice modes; case filtering (optional `cases` param); hint display (optional)
- **Out of scope**: Non-German languages; preposition hints beyond the case hint; gender-only drills (use gender-pick widget); article-free languages

---

## Requirements

- **R1**: Claude can call an `article_drill` tool with `{ mode: 'freeform' | 'multiple_choice', count?: number, cefr_level?: string, cases?: string[] }` during a conversation
- **R2**: For each drill item, the server generates a sentence using Claude Haiku (3.5) with a blanked article at the specified CEFR level, focusing on the requested cases (defaults to all 4 cases)
- **R3**: Generated sentences are cached in D1 (`article_sentences` table) keyed by `(cefr_level, case, language)` to avoid redundant Haiku calls for repeated drills
- **R4**: In `freeform` mode, the user types the article; the server accepts any casing and trims whitespace (e.g. "dem", "DEM", " dem " all correct)
- **R5**: In `multiple_choice` mode, the server provides 4 options: the correct declined article + 3 distractors from the same noun gender's declension table but different cases
- **R6**: The `expected` field (server-side only) contains the correct declined article (e.g. "dem", "einer", "des")
- **R7**: Optional `hint` field displays the case and gender (e.g. "dative, masculine") if requested via tool parameter `hints: true` (default false)
- **R8**: Generated sentences include the noun with article placeholder: "Ich gebe ___ Mann das Buch." — blank is the article to fill
- **R9**: The widget payload includes `sentence` (with blank), `noun` (e.g. "Mann"), `gender` (m/f/n), `case` (nom/acc/dat/gen), and either `options` (multiple_choice) or no options (freeform)
- **R10**: Grading is case-insensitive and trims whitespace; freeform mode accepts both definite and indefinite articles if grammatically valid (e.g. "dem" or "einem" both correct if context allows)
- **R11**: User answers are persisted in `user_article_progress` table with SM-2 scoring per (noun, case, gender) tuple
- **R12**: If no target language is selected, the tool call is rejected with "Please select a language first"
- **R13**: If target language is not German, the tool call is rejected with "Article drills are only supported for German"
- **R14**: Content generation prompt instructs Haiku to produce CEFR-appropriate sentences with the target case and to blank the article (not the noun)
- **R15**: Cache hit rate is tracked: if a sentence exists in D1 for (cefr_level, case, language), reuse it; otherwise generate and cache

---

## Interfaces / Data Shapes

### ArticleInContextWidget (already defined in widgets.ts)

```typescript
export interface ArticleInContextWidget extends WidgetBase {
  type: 'article-in-context'
  sentence: string        // "Ich gebe ___ Mann das Buch."
  noun: string            // "Mann"
  gender: 'm' | 'f' | 'n'
  case: 'nom' | 'acc' | 'dat' | 'gen'
  hint?: string           // "dative, masculine" (optional)
  options?: string[]      // ["dem", "den", "der", "des"] for multiple_choice mode
  mode: 'freeform' | 'multiple_choice'
  cefr_level: string
}
```

### Article Response (client → server)

```typescript
interface ArticleInContextResponse {
  type: 'widget_response'
  widget_id: string
  answer: string          // freeform: user-typed article; multiple_choice: selected option string
}
```

### Article Result (server → client, after grading)

```typescript
interface ArticleInContextResult {
  type: 'widget_result'
  widget_id: string
  widget_type: 'article-in-context'
  correct: boolean
  expected: string        // "dem"
  user_answer: string     // "dem"
  explanation?: string    // "Correct! 'dem' is the dative masculine article."
}
```

### D1 Schema — article_sentences Table

```sql
CREATE TABLE article_sentences (
  id TEXT PRIMARY KEY,  -- UUID
  language TEXT NOT NULL,
  cefr_level TEXT NOT NULL,
  case TEXT NOT NULL,  -- nom/acc/dat/gen
  gender TEXT NOT NULL,  -- m/f/n
  noun TEXT NOT NULL,
  article TEXT NOT NULL,  -- correct declined article
  sentence TEXT NOT NULL,  -- sentence with ___ placeholder
  created_at INTEGER NOT NULL,
  UNIQUE(language, cefr_level, case, gender, noun)
)
```

### D1 Schema — user_article_progress Table

```sql
CREATE TABLE user_article_progress (
  id TEXT PRIMARY KEY,  -- UUID
  user_id TEXT NOT NULL,
  language TEXT NOT NULL,
  noun TEXT NOT NULL,
  gender TEXT NOT NULL,  -- m/f/n
  case TEXT NOT NULL,  -- nom/acc/dat/gen
  ease REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  due_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  UNIQUE(user_id, language, noun, gender, case)
)
```

### Claude Tool Definition

```typescript
{
  name: 'article_drill',
  description: 'Start an article declension drill. Tests German article usage (der/die/das/den/dem/des/etc) in natural sentences across all 4 cases. Use when the user wants to practice articles, cases, or grammar.',
  input_schema: {
    type: 'object',
    properties: {
      mode: { 
        type: 'string', 
        enum: ['freeform', 'multiple_choice'], 
        description: 'freeform: user types the article. multiple_choice: 4 options shown. Default: freeform.' 
      },
      count: { 
        type: 'integer', 
        minimum: 1, 
        maximum: 20, 
        description: 'Number of sentences. Default 5.' 
      },
      cefr_level: { 
        type: 'string', 
        enum: ['A1', 'A2', 'B1'], 
        description: 'Target CEFR level for sentence complexity. Default: user\'s current level.' 
      },
      cases: {
        type: 'array',
        items: { type: 'string', enum: ['nom', 'acc', 'dat', 'gen'] },
        description: 'Which cases to focus on. Default: all 4 cases.'
      },
      hints: {
        type: 'boolean',
        description: 'Show case and gender hints. Default: false.'
      }
    },
    required: ['mode'],
  },
}
```

### Content Generation Prompt (Haiku 3.5)

```typescript
const prompt = `Generate a German sentence at CEFR level ${cefrLevel} that uses a ${gender} noun in the ${case} case.

Requirements:
- The sentence must be natural and contextually correct
- The noun must clearly require the ${case} case (e.g., accusative after direct object verbs, dative after "mit", genitive for possession)
- Replace the article with "___" (three underscores)
- Sentence length: 5-12 words for A1, 8-15 words for A2, 10-20 words for B1
- Avoid complex subordinate clauses for A1

Output format (JSON):
{
  "sentence": "Ich gebe ___ Mann das Buch.",
  "noun": "Mann",
  "article": "dem",
  "gender": "m",
  "case": "dat"
}
`
```

---

## Behavior Table

| # | Scenario | Expected Behavior | Tests |
|---|----------|-------------------|-------|
| 1 | User says "practice articles," Claude calls article_drill | Server generates 5 sentences (default count), sends batch widget | `happy-path-article-drill` |
| 2 | User completes all 5 drills and submits | Server grades, sends results, updates SM-2 | `happy-path-grade-articles` |
| 3 | Claude calls article_drill with mode=freeform | Widget has no `options` field; user types answer | `freeform-mode-no-options` |
| 4 | Claude calls article_drill with mode=multiple_choice | Widget has `options` array with 4 choices | `multiple-choice-mode-has-options` |
| 5 | User answers "dem" (correct) in freeform mode | Graded as correct | `freeform-correct-answer` |
| 6 | User answers " DEM " (correct, with whitespace and caps) | Graded as correct (case-insensitive, trimmed) | `freeform-case-insensitive` |
| 7 | User selects correct option in multiple_choice mode | Graded as correct | `multiple-choice-correct` |
| 8 | User selects wrong option in multiple_choice mode | Graded as incorrect, expected answer revealed | `multiple-choice-incorrect` |
| 9 | Claude calls article_drill with cases=['dat','acc'] | All generated sentences use only dative or accusative case | `case-filtering-respected` |
| 10 | Claude calls article_drill with hints=true | Widget includes `hint` field with case and gender | `hints-enabled` |
| 11 | Claude calls article_drill with hints=false (default) | Widget has no `hint` field | `hints-disabled-default` |
| 12 | Server generates sentence for A1 dative masculine | Haiku call made, result cached in `article_sentences` table | `content-generation-and-cache` |
| 13 | Server generates same drill again (A1 dative masculine) | Cache hit: reuses sentence from D1, no Haiku call | `content-cache-hit` |
| 14 | Claude calls article_drill but no target language | Tool rejected: "Please select a language first" | `rejects-no-language` |
| 15 | Claude calls article_drill but target language is French | Tool rejected: "Article drills are only supported for German" | `rejects-non-german` |
| 16 | User answers correctly | `user_article_progress` updated with SM-2 (ease +0.1, interval grows) | `sm2-correct-article` |
| 17 | User answers incorrectly | `user_article_progress` updated with SM-2 (interval reset to 0) | `sm2-incorrect-article` |
| 18 | Sentence cached in D1 has expired (>30 days old) | Re-generate sentence with fresh Haiku call | `cache-expiry-regenerates` |
| 19 | Multiple_choice distractors | 3 distractors from same gender's declension table but different cases | `distractors-same-gender-different-case` |
| 20 | Freeform mode: user types "einem" for dative masculine | If context allows indefinite article, graded as correct | `freeform-indefinite-accepted` |
| 21 | Freeform mode: user types nonsense "xyz" | Graded as incorrect | `freeform-nonsense-rejected` |
| 22 | User disconnects mid-drill (no response within 300s) | Widget times out, no progress recorded | `timeout-300s-article-drill` |
| 23 | Page refresh after completed article drill | Widget shown in completed state with results | `refresh-shows-completed-article` |
| 24 | User clicks "retake" on completed article drill | New widget with freshly generated sentences | `retake-article-drill` |
| 25 | Claude calls article_drill with count=1 | Exactly 1 sentence generated | `explicit-count-1` |
| 26 | Claude calls article_drill with count=20 | Exactly 20 sentences generated | `explicit-count-max` |
| 27 | Claude calls article_drill with count=0 | Tool rejected: "count must be between 1 and 20" | `rejects-count-zero-article` |
| 28 | Claude calls article_drill with count=25 | Tool rejected: "count must be between 1 and 20" | `rejects-count-over-max-article` |
| 29 | Tool result fed to Claude is text summary | "User scored 4/5: sentence 1 ✓, sentence 2 ✗, ..." | `tool-result-text-summary-article` |
| 30 | Widget persisted as ContentBlock with full lifecycle | D1 `messages` table contains payload + response + result | `article-widget-persisted` |

---

## Behavior (Step-by-Step)

### Tool Call Flow

1. User asks to practice articles. Claude calls `article_drill({ mode: 'freeform', count: 5, cases: ['dat', 'acc'] })`
2. Server validates:
   - Target language is German
   - Count is 1-20
   - Cases array is valid
3. For each of the 5 drills:
   a. Server picks a case from the `cases` array (random or round-robin)
   b. Server picks a gender (m/f/n) randomly
   c. Server checks D1 `article_sentences` for cached sentence matching (cefr_level, case, gender, language='deu')
   d. If cache miss or cache expired (>30 days):
      - Generate sentence via Haiku 3.5 with the content generation prompt
      - Parse JSON response: `{ sentence, noun, article, gender, case }`
      - Insert into `article_sentences` table
   e. If cache hit: reuse cached sentence
4. Server constructs `ArticleInContextWidget`:
   - `type: 'article-in-context'`
   - `mode: 'freeform'` (or 'multiple_choice')
   - `sentence`, `noun`, `gender`, `case` from generated/cached content
   - If `hints: true`, add `hint: "${case}, ${gender}"`
   - If `mode === 'multiple_choice'`, generate 4 options: correct article + 3 distractors from same gender's declension table
5. Server generates `widget_id`, sends widget to client
6. Client renders sentence with blank, user fills in answer (or picks option)
7. Client sends `widget_response` with `answer: string`
8. Server grades:
   - Normalize answer (trim, lowercase)
   - Compare against `expected` (also normalized)
   - Freeform: accept indefinite articles if grammatically valid (check against both definite and indefinite declension tables)
   - Multiple_choice: exact match after normalization
9. Server computes result, updates `user_article_progress` via SM-2
10. Server sends `widget_result` with `correct`, `expected`, `user_answer`, optional `explanation`
11. Server persists widget lifecycle as ContentBlock
12. Server builds text summary, returns as `tool_result` to Claude

### Content Generation Logic

1. Pick case from `cases` array (or random if not specified)
2. Pick random gender (m/f/n)
3. Check cache: `SELECT * FROM article_sentences WHERE language='deu' AND cefr_level=? AND case=? AND gender=? ORDER BY RANDOM() LIMIT 1`
4. If no rows or `created_at < (now - 30 days)`:
   - Call Haiku 3.5 with prompt
   - Parse JSON
   - Validate: sentence contains "___", noun matches gender
   - Insert into `article_sentences`
5. Construct widget from generated/cached data

### Distractor Generation (Multiple Choice)

1. Correct article: e.g. "dem" (dative masculine definite)
2. Declension table for masculine definite:
   - nom: "der"
   - acc: "den"
   - dat: "dem"
   - gen: "des"
3. Pick 3 other entries from this table: ["der", "den", "des"]
4. Shuffle all 4 options
5. Record correct index server-side (not sent to client until grading)

---

## Acceptance Criteria

- [ ] **AC1**: User can say "practice articles" or "drill dative case" and Claude invokes the article_drill tool
- [ ] **AC2**: Freeform mode accepts user-typed articles and grades case-insensitively with whitespace trimming
- [ ] **AC3**: Multiple-choice mode presents 4 options and grades based on selection
- [ ] **AC4**: Sentences are generated at the appropriate CEFR level (A1: simple, B1: complex)
- [ ] **AC5**: Cache hit rate for repeated drills is >80% (sentences reused from D1)
- [ ] **AC6**: Hints (case + gender) are shown only when `hints: true` is passed
- [ ] **AC7**: Case filtering works: `cases: ['dat']` produces only dative sentences
- [ ] **AC8**: SM-2 progress tracking updates per (noun, case, gender) tuple
- [ ] **AC9**: Non-German languages are rejected gracefully
- [ ] **AC10**: Completed article drills can be retaken with freshly generated sentences

---

## Tests

### Base Cases

#### Test: happy-path-article-drill (covers R1, R2, R3, R8, R9)

**Given**: User has target language = German (deu), CEFR level A1

**When**: Claude calls `article_drill({ mode: 'freeform', count: 5 })`

**Then** (assertions):
- **widget-sent**: Server sends exactly 1 `widget` message
- **drill-count-5**: Widget contains 5 sub-items (or batch structure TBD — may be 5 sequential widgets)
- **sentence-has-blank**: Each sentence contains "___"
- **no-expected-in-payload**: Widget payload does not contain `expected` field
- **cache-writes**: 5 new rows inserted into `article_sentences` (or fewer if cache hits)

#### Test: happy-path-grade-articles (covers R4, R10, R11)

**Given**: Client has received an article drill widget and user has answered all 5

**When**: Client sends `widget_response` with 5 answers (4 correct, 1 incorrect)

**Then** (assertions):
- **result-sent**: Server sends `widget_result` message(s)
- **score-4-of-5**: Total score is 4/5
- **sm2-updated**: `user_article_progress` rows exist for all 5 (noun, case, gender) tuples
- **tool-result-text**: Tool result is a string like "User scored 4/5: sentence 1 ✓, ..."

#### Test: freeform-mode-no-options (covers R4, R9)

**Given**: Claude calls `article_drill({ mode: 'freeform' })`

**When**: Widget is sent to client

**Then** (assertions):
- **no-options**: Widget payload has `mode: 'freeform'` and `options` is undefined

#### Test: multiple-choice-mode-has-options (covers R5, R9)

**Given**: Claude calls `article_drill({ mode: 'multiple_choice' })`

**When**: Widget is sent to client

**Then** (assertions):
- **has-options**: Widget payload has `options` array of length 4
- **correct-included**: The correct article appears in `options` exactly once

#### Test: freeform-case-insensitive (covers R4, R10)

**Given**: Expected answer is "dem"

**When**: User types " DEM " (with spaces and uppercase)

**Then** (assertions):
- **graded-correct**: Result has `correct: true`

#### Test: case-filtering-respected (covers R1, R2)

**Given**: Claude calls `article_drill({ mode: 'freeform', cases: ['dat', 'acc'] })`

**When**: Widget is generated

**Then** (assertions):
- **all-dat-or-acc**: Every sentence's `case` field is either 'dat' or 'acc'

#### Test: hints-enabled (covers R7)

**Given**: Claude calls `article_drill({ mode: 'freeform', hints: true })`

**When**: Widget is sent

**Then** (assertions):
- **has-hint**: Widget payload contains `hint` field matching pattern "^(nom|acc|dat|gen), (m|f|n)$"

#### Test: hints-disabled-default (covers R7)

**Given**: Claude calls `article_drill({ mode: 'freeform' })` (no hints param)

**When**: Widget is sent

**Then** (assertions):
- **no-hint**: Widget payload `hint` field is undefined

#### Test: content-generation-and-cache (covers R2, R3, R14)

**Given**: No cached sentence exists for (deu, A1, dat, m)

**When**: Server generates an article drill requiring dative masculine A1

**Then** (assertions):
- **haiku-called**: Haiku 3.5 API call logged
- **cache-written**: New row in `article_sentences` with (language='deu', cefr_level='A1', case='dat', gender='m')
- **sentence-valid**: Sentence contains "___", noun extracted, article correct for case+gender

#### Test: content-cache-hit (covers R3, R15)

**Given**: A cached sentence exists for (deu, A1, dat, m) with `created_at` < 30 days ago

**When**: Server generates another drill for dative masculine A1

**Then** (assertions):
- **no-haiku-call**: No Haiku API call logged
- **cache-reused**: Sentence from D1 used

#### Test: rejects-no-language (covers R12)

**Given**: `targetLang` is null

**When**: Claude calls `article_drill({ mode: 'freeform' })`

**Then** (assertions):
- **tool-error**: Tool result is "Please select a language first"
- **no-widget-sent**: No widget message sent

#### Test: rejects-non-german (covers R13)

**Given**: `targetLang` is 'fra' (French)

**When**: Claude calls `article_drill({ mode: 'freeform' })`

**Then** (assertions):
- **tool-error**: Tool result is "Article drills are only supported for German"

#### Test: sm2-correct-article (covers R11)

**Given**: User has no progress for (Mann, dat, m)

**When**: User answers dative masculine "Mann" correctly

**Then** (assertions):
- **interval-1**: `interval_days` = 1
- **ease-2.6**: `ease` = 2.6

#### Test: sm2-incorrect-article (covers R11)

**Given**: User has ease=2.5, interval=6 for (Mann, dat, m)

**When**: User answers incorrectly

**Then** (assertions):
- **interval-0**: `interval_days` = 0
- **ease-2.3**: `ease` = 2.3

#### Test: distractors-same-gender-different-case (covers R5)

**Given**: Correct answer is "dem" (dat, m, definite)

**When**: Server generates multiple_choice options

**Then** (assertions):
- **all-masculine**: All 4 options are from masculine declension table
- **different-cases**: Distractors are from different cases (e.g. "der" nom, "den" acc, "des" gen)

#### Test: cache-expiry-regenerates (covers R3)

**Given**: Cached sentence for (deu, A1, dat, m) with `created_at` > 30 days ago

**When**: Server generates a drill for dative masculine A1

**Then** (assertions):
- **haiku-called**: Fresh Haiku call made
- **cache-updated**: `article_sentences` row updated with new `created_at`

#### Test: freeform-indefinite-accepted (covers R10)

**Given**: Correct answer is "dem" (definite dative masculine), but context allows indefinite

**When**: User types "einem" (indefinite dative masculine)

**Then** (assertions):
- **graded-correct**: Result has `correct: true` (indefinite articles accepted if valid)

#### Test: article-widget-persisted (covers R11)

**Given**: Article drill completed

**When**: Assistant message persisted to D1

**Then** (assertions):
- **has-widget-block**: ContentBlock with `type: 'widget'`, `widget_type: 'article-in-context'`
- **has-payload**: Original widget data
- **has-response**: User's answer
- **has-result**: Grading result

---

## Migration SQL

```sql
-- article_sentences table
CREATE TABLE IF NOT EXISTS article_sentences (
  id TEXT PRIMARY KEY,
  language TEXT NOT NULL,
  cefr_level TEXT NOT NULL,
  case TEXT NOT NULL,
  gender TEXT NOT NULL,
  noun TEXT NOT NULL,
  article TEXT NOT NULL,
  sentence TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(language, cefr_level, case, gender, noun)
);

CREATE INDEX idx_article_sentences_lookup ON article_sentences(language, cefr_level, case, gender);

-- user_article_progress table
CREATE TABLE IF NOT EXISTS user_article_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  language TEXT NOT NULL,
  noun TEXT NOT NULL,
  gender TEXT NOT NULL,
  case TEXT NOT NULL,
  ease REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  due_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  UNIQUE(user_id, language, noun, gender, case)
);

CREATE INDEX idx_user_article_progress_due ON user_article_progress(user_id, language, due_at);
```

---

## Non-Goals

- TTS audio for sentences (Phase 2+)
- Preposition-specific hints ("nach requires dative") — only case/gender hints
- Non-German languages (future: French partitive articles, Spanish contractions)
- Article generation for languages without articles (Japanese, Russian)
- Gender drills without case context (use `gender-pick` widget instead)
- Full sentence translation (use `comprehension` widget instead)

---

## Open Questions

- **OQ-1**: Should indefinite articles always be accepted as correct in freeform mode, or only if the Haiku prompt explicitly generates an indefinite-article context? Leaning toward: accept both definite and indefinite if grammatically valid.
- **OQ-2**: Should cache expiry be 30 days or longer? 30 days ensures fresh content but may increase Haiku costs. Consider: 90 days or never expire?
- **OQ-3**: Should distractors in multiple_choice mode include indefinite articles, or only definite? Leaning toward: only definite for simplicity, unless the correct answer is indefinite.
- **OQ-4**: Should the widget send one sentence at a time (sequential) or all 5 sentences in a batch (like flashcard-matching)? Leaning toward: batch, for consistency with Phase 1.

---

## Related Artifacts

- **Phase 1 Spec**: `agent/specs/local.widget-system-phase1.md`
- **Widget Types**: `shared/types/widgets.ts`
- **Design**: `agent/design/local.widget-system.md` (if exists)
- **Schema**: `migrations/0003_curriculum_schema.sql` (vocab_items, user_vocab_progress)

---

**Status**: Draft — awaiting review
**Recommendation**: Review Behavior Table, confirm or resolve Open Questions, then implement
**Implementation Notes**: Reuse Phase 1 infrastructure (widget persistence, SM-2 scoring, WebSocket protocol, timeout/cancel logic). Add new `article_drill` tool definition, Haiku content generation service, and D1 tables.
