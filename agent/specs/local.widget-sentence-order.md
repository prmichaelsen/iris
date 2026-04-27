# Widget: Sentence Order — Delta Spec

> **Agent Directive**: This is a delta specification. It extends the Widget System Phase 1 spec (`local.widget-system-phase1.md`) with the sentence-order widget type. The Behavior Table is the proofing surface; the Tests section is the executable contract. Build against these; do not invent behavior not covered here.

**Namespace**: local
**Version**: 1.0.0
**Created**: 2026-04-27
**Last Updated**: 2026-04-27
**Status**: Draft — awaiting review
**Extends**: `agent/specs/local.widget-system-phase1.md` (Phase 1)

---

**Purpose**: Add a `sentence-order` widget type that drills German word order by showing shuffled German words that the user must tap/drag into the correct sequence. Tests V2 rule, verb-final in subordinate clauses, time-manner-place order, adjective order, and other German-specific syntax patterns.

**Source**: User request + widget system architecture from Phase 1

**Scope**:
- **In scope**: `sentence-order` widget type end-to-end; Claude tool with optional `focus` param for targeting specific grammar patterns; batch mode (10 sentences per session); server-side generation via Haiku with caching in D1; client UI as horizontal word chips with tap-to-build + undo
- **Out of scope**: Drag-and-drop UI (Phase 2 UX enhancement); case/punctuation transformation (accepts words as-is); multi-sentence paragraphs; translation mode (German→English order)

---

## Requirements

- **R1**: Claude can call a `sentence_order` tool with `{ count?: number, cefr_level?: string, focus?: string }` during a voice conversation
- **R2**: The `focus` parameter is optional; when provided, it guides Haiku's sentence generation (e.g., "V2 rule", "subordinate clauses", "time-manner-place", "adjective order")
- **R3**: The server uses Haiku (`claude-3-5-haiku-20241022`) to generate grammatically correct German sentences at the target CEFR level, constrained by the user's active lesson/language
- **R4**: Each generated sentence is split into word tokens (preserving punctuation attached to words, e.g., "Abfahrt," remains one token), shuffled, and sent to the client as the `words` array
- **R5**: The server computes a `correct_order` array (indices mapping shuffled positions back to the correct sequence) and stores it server-side only; NOT sent to the client
- **R6**: The server caches generated sentences in D1 (table: `sentence_order_cache`, keyed by language + CEFR level + focus + sentence hash) to avoid regenerating the same sentence
- **R7**: The client renders the shuffled words as horizontal chips; the user taps chips in order to build the sentence left-to-right; an "undo last" button removes the last tapped word
- **R8**: After the user builds the sentence (taps all words or submits), the client sends a `widget_response` with the user's ordered indices
- **R9**: The server grades by comparing the user's order to `correct_order` (exact array match required for correct)
- **R10**: The server sends a `widget_result` with per-sentence results (correct/incorrect, user's order, revealed correct order, the correct sentence string)
- **R11**: The server feeds a text summary to Claude as the tool_result: "User scored 7/10: [user sentence] → [correct sentence] ✓/✗, ..."
- **R12**: The full widget payload (sentences, user's answers, per-sentence results, score) is persisted as a `ContentBlock` on the assistant message in D1
- **R13**: Completed widgets display a "retake" button that re-sends the same sentence set as a new widget (new widget_id, same sentences, freshly shuffled)
- **R14**: If the user's CEFR level has insufficient content for Haiku to generate `count` sentences, the server generates as many as possible (min 5, or fails if < 5)
- **R15**: If no target language is selected (`targetLang` is null), the tool call is rejected with a tool_result error: "Please select a language first"
- **R16**: If the user disconnects mid-widget (no `widget_response` within 300 seconds), the server times out the widget, records no progress
- **R17**: If the user changes language while a widget is pending, the pending widget is cancelled (server sends `widget_cancel` to the client)
- **R18**: The Claude tool definition for `sentence_order` is included in the tools array passed to `anthropic.messages.stream()` when the user has a target language selected

---

## Interfaces / Data Shapes

### Widget Types (extends shared/types/widgets.ts)

```typescript
// Already defined in widgets.ts (lines 137-141):
export interface SentenceOrderWidget extends WidgetBase {
  type: 'sentence-order'
  words: string[]       // shuffled array of word tokens
  cefr_level: string
}

// New response type:
export interface SentenceOrderAnswer {
  sentence_id: string
  ordered_indices: number[]  // user's order (indices into the shuffled words array)
}

export interface SentenceOrderResponse {
  type: 'widget_response'
  widget_id: string
  answers: SentenceOrderAnswer[]
}

// New result types:
export interface SentenceOrderSentenceResult {
  sentence_id: string
  shuffled_words: string[]
  correct_order: number[]        // revealed after grading
  correct_sentence: string       // revealed: joined words in correct order
  user_order: number[]
  user_sentence: string          // user's joined words
  correct: boolean
}

export interface SentenceOrderResult {
  type: 'widget_result'
  widget_id: string
  widget_type: 'sentence-order'
  score: number              // e.g. 7
  total: number              // e.g. 10
  sentences: SentenceOrderSentenceResult[]
}
```

### Haiku Generation Prompt (server-side)

```typescript
const generateSentencesPrompt = `You are a German language teacher. Generate ${count} grammatically correct German sentences at CEFR level ${cefr_level}.

${focus ? `Focus on sentences that demonstrate: ${focus}` : ''}

Requirements:
- Each sentence must be grammatically correct and natural-sounding
- Sentences should be 5-12 words long
- Use vocabulary appropriate for ${cefr_level} level
- Vary sentence structures (statements, questions, subordinate clauses)
- Output only the sentences, one per line, no numbering or extra text

Examples for reference:
A1: "Ich gehe heute in die Schule."
A2: "Gestern habe ich mit meinen Freunden Tennis gespielt."
B1: "Obwohl das Wetter schlecht war, sind wir spazieren gegangen."

Generate ${count} sentences now:`
```

### D1 Cache Table (new migration)

```sql
CREATE TABLE sentence_order_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  language TEXT NOT NULL,
  cefr_level TEXT NOT NULL,
  focus TEXT,
  sentence_hash TEXT NOT NULL,
  sentence TEXT NOT NULL,
  words_json TEXT NOT NULL,       -- JSON array of word tokens
  correct_order_json TEXT NOT NULL, -- JSON array of indices
  created_at INTEGER NOT NULL,
  UNIQUE(language, cefr_level, focus, sentence_hash)
);

CREATE INDEX idx_sentence_order_cache_lookup 
  ON sentence_order_cache(language, cefr_level, focus);
```

### Claude Tool Definition

```typescript
{
  name: 'sentence_order',
  description: 'Start a sentence-order exercise. The server generates shuffled German sentences at the user\'s CEFR level. The user taps words in the correct order. Tests German word order rules (V2, verb-final subordinate clauses, time-manner-place, adjective order). Use when the user wants to practice sentence structure or word order.',
  input_schema: {
    type: 'object',
    properties: {
      count: { 
        type: 'integer', 
        minimum: 5, 
        maximum: 20, 
        description: 'Number of sentences. Default 10.' 
      },
      cefr_level: { 
        type: 'string', 
        enum: ['A1', 'A2', 'B1'], 
        description: 'Target CEFR level. Omit to use the user\'s current level.' 
      },
      focus: { 
        type: 'string', 
        description: 'Optional grammar focus (e.g., "V2 rule", "subordinate clauses", "time-manner-place", "adjective order"). Guides sentence generation.' 
      },
    },
    required: [],
  },
}
```

---

## Behavior Table

| # | Scenario | Expected Behavior | Tests |
|---|----------|-------------------|-------|
| 1 | User says "let's practice sentence structure," Claude calls sentence_order tool | Server generates 10 sentences, shuffles words, sends batch widget to client | `happy-path-sentence-order-batch` |
| 2 | User completes all 10 sentences and submits | Server grades by array comparison, sends result with revealed correct order, feeds summary to Claude | `happy-path-grade-and-persist` |
| 3 | Claude calls sentence_order with explicit count=5 | Server generates exactly 5 sentences | `explicit-count-respected` |
| 4 | Claude calls sentence_order with explicit cefr_level=A2 | Server generates A2-level sentences (Haiku prompt includes "CEFR level A2") | `explicit-cefr-level` |
| 5 | Claude calls sentence_order with no count | Server defaults to 10 sentences | `default-count-is-10` |
| 6 | Claude calls sentence_order with no cefr_level | Server uses the user's current CEFR level | `default-cefr-from-user-progress` |
| 7 | Claude calls sentence_order with focus="V2 rule" | Haiku prompt includes "Focus on sentences that demonstrate: V2 rule"; generated sentences emphasize verb-second word order | `focus-v2-rule` |
| 8 | Claude calls sentence_order with focus="subordinate clauses" | Generated sentences include subordinate clauses with verb-final order | `focus-subordinate-clauses` |
| 9 | Claude calls sentence_order with focus="time-manner-place" | Generated sentences include time-manner-place adverbial order | `focus-time-manner-place` |
| 10 | Claude calls sentence_order with count=4 | Tool rejected: "count must be between 5 and 20" | `rejects-count-under-min` |
| 11 | Claude calls sentence_order with count=25 | Tool rejected: "count must be between 5 and 20" | `rejects-count-over-max` |
| 12 | Claude calls sentence_order but no target language selected | Tool rejected: "Please select a language first" | `rejects-no-target-language` |
| 13 | Haiku generates a sentence that was previously cached | Server loads from D1 cache, skips Haiku call | `cache-hit-sentence` |
| 14 | Haiku generates a new sentence | Server caches sentence in D1 (language, cefr_level, focus, sentence_hash, words_json, correct_order_json) | `cache-miss-sentence` |
| 15 | Sentence tokenization: "Abfahrt, du bist spät." | Tokens: ["Abfahrt,", "du", "bist", "spät."] — punctuation stays attached | `tokenization-preserves-punctuation` |
| 16 | User submits correct order | Sentence scored as correct | `correct-order-scored-correct` |
| 17 | User submits incorrect order | Sentence scored as incorrect | `incorrect-order-scored-wrong` |
| 18 | User submits partial order (fewer indices than total words) | Sentence scored as incorrect | `partial-order-scored-wrong` |
| 19 | User submits out-of-bounds index (e.g., index=99 for 7 words) | Sentence scored as incorrect | `out-of-bounds-index-scored-wrong` |
| 20 | User disconnects mid-widget (no response within 300s) | Server times out, records no progress, feeds timeout to Claude | `timeout-300s-no-progress` |
| 21 | User changes language while widget is pending | Server cancels widget, sends widget_cancel, records no progress | `cancel-on-language-change` |
| 22 | Page refresh during active widget | On reconnect, server replays history; active widget is NOT re-sent (it timed out or was cancelled during disconnect) | `refresh-during-widget-shows-history` |
| 23 | Page refresh after completed widget | History loads with widget in completed state (sentences, user's order, correct order, score visible) | `refresh-shows-completed-widget` |
| 24 | User clicks "retake" on a completed widget in history | Client sends a retake request; server generates a new widget with the same sentences but freshly shuffled words and a new widget_id | `retake-generates-new-widget` |
| 25 | Widget payload does NOT include correct_order or correct_sentence | Client cannot know the answer before responding | `no-answer-in-widget-payload` |
| 26 | Widget result DOES include correct_order and correct_sentence | Client renders revealed correct answer after grading | `answer-revealed-in-result` |
| 27 | Tool result fed to Claude is a text summary, not structured data | Claude sees "User scored 7/10: [user sentence] → [correct sentence] ✓, ..." | `tool-result-is-text-summary` |
| 28 | Widget persisted as ContentBlock with full payload + response + result | D1 messages row contains the complete widget lifecycle | `widget-persisted-as-content-block` |
| 29 | Retake widget uses same sentences, freshly shuffled | Each retake is a new scoring event; shuffled order differs | `retake-reshuffles-words` |
| 30 | Haiku fails to generate valid sentences (rate limit, timeout) | Tool call fails gracefully with error message to Claude | `haiku-generation-failure` |

---

## Behavior (Step-by-Step)

### Tool Call Flow

1. User speaks (or types). Server transcribes, pushes to Claude with `tools: [sentenceOrderTool, ...]`
2. Claude streams response. If it includes a `tool_use` block for `sentence_order`:
   a. Server validates parameters (count, cefr_level, focus, target language)
   b. Server builds Haiku prompt with count, cefr_level, focus
   c. Server calls Haiku (with prompt caching on system prompt)
   d. Server receives generated sentences (one per line), validates (5-12 words each, non-empty)
   e. For each sentence:
      - Compute sentence_hash (SHA256 of sentence text)
      - Check D1 cache: `SELECT * FROM sentence_order_cache WHERE language=? AND cefr_level=? AND focus=? AND sentence_hash=?`
      - If cache hit: load `words_json` and `correct_order_json` from cache
      - If cache miss: tokenize sentence into words (split on whitespace, preserve punctuation), generate correct_order (0..n-1), shuffle words, compute shuffled-to-correct mapping, cache in D1
   f. Server generates a `widget_id` (opaque, unique)
   g. Server sends `{ type: 'widget', widget: { type: 'sentence-order', widget_id, sentences: [{ sentence_id, words }, ...], cefr_level } }` over WS — does NOT include `correct_order` or `correct_sentence`
   h. Server starts a 300s timeout timer for this widget_id
3. Client receives the widget message, renders the first sentence's shuffled words as horizontal chips
4. User taps words in order → client builds sentence left-to-right → user taps "next" or "submit" → repeat until all sentences done
5. Client sends `{ type: 'widget_response', widget_id, answers: [{ sentence_id, ordered_indices }, ...] }`
6. Server receives response:
   a. Matches `widget_id` to the pending widget; ignores if not found or already resolved
   b. Grades each sentence (compare `ordered_indices` against the server-side `correct_order` — must match exactly for correct)
   c. Computes score (correct_count / total)
   d. Sends `{ type: 'widget_result', widget_id, score, total, sentences: [{ sentence_id, shuffled_words, correct_order, correct_sentence, user_order, user_sentence, correct }, ...] }`
   e. Persists the full widget lifecycle (payload + response + result) as a ContentBlock on the assistant message in D1
   f. Builds a text summary and returns it as the `tool_result` content to Claude
   g. Claude loop continues (Claude may respond with text, call another tool, or end_turn)

### Timeout Flow

1. 300s passes with no `widget_response`
2. Server cancels the timer, builds a timeout tool_result: "Widget timed out — user did not respond within 5 minutes"
3. Widget is persisted in "timed_out" state (no response, no result)
4. Claude loop continues with the timeout result

### Cancel Flow (Language Change)

1. Client sends `{ type: 'language', code, name, english }`
2. Server detects a pending widget
3. Server sends `{ type: 'widget_cancel', widget_id, reason: 'Language changed' }`
4. Server cancels the timeout timer, builds a cancelled tool_result
5. Widget is persisted in "cancelled" state
6. Claude loop continues

---

## Acceptance Criteria

- [ ] **AC1**: User can say "let's practice word order" or "help me with sentence structure" and Claude invokes the sentence_order tool
- [ ] **AC2**: A batch of 10 shuffled sentences renders as a sequential flow — one sentence visible at a time, with word chips the user taps in order
- [ ] **AC3**: Each sentence screen shows a progress indicator (e.g., "3 / 10") and an "undo last" button
- [ ] **AC4**: After the last sentence, a summary screen shows score + per-sentence results with revealed correct order and correct sentence text
- [ ] **AC5**: Page refresh after completing a widget shows the widget in its completed state in chat history
- [ ] **AC6**: Clicking "retake" on a completed widget starts a new session with the same sentences but freshly shuffled words
- [ ] **AC7**: Claude can target specific grammar patterns (e.g., "V2 rule", "subordinate clauses") via the `focus` parameter
- [ ] **AC8**: Claude reacts to the score naturally in conversation ("Gut! 8 von 10, aber Satz 3 war schwierig...")
- [ ] **AC9**: The widget payload sent to the client does not contain the correct order or correct sentence
- [ ] **AC10**: If no target language is selected, Claude's tool call fails gracefully and Claude explains
- [ ] **AC11**: Sentences generated by Haiku are cached in D1 and reused across sessions (same language + CEFR + focus + sentence → cache hit)

---

## Non-Goals

- Drag-and-drop UI (tap-to-build is Phase 1; drag-and-drop is a Phase 2 UX enhancement)
- Case/punctuation transformation (accepts words as-is; user must preserve original casing)
- Multi-sentence paragraphs (each sentence is independent)
- Translation mode (German→English order; out of scope)
- Grammar explanations in the UI (Claude provides explanations in conversation)
- Progress tracking / spaced repetition for sentence-order (no SM-2 updates; this is a pure drill, not vocab)

---

## Open Questions

- **OQ-1**: Should the client auto-submit when all words are tapped, or require an explicit "submit" button? Leaning toward auto-advance (less friction).
- **OQ-2**: Should the "undo last" button undo one word at a time, or allow the user to tap a placed word to remove it? Leaning toward "undo last" only (simpler).
- **OQ-3**: Should Haiku's prompt include example sentences for the focus grammar pattern, or rely on Haiku's intrinsic knowledge? Leaning toward intrinsic knowledge (simpler prompt, less caching complexity).
- **OQ-4**: Should the cache table have a TTL (e.g., 90 days) to refresh stale sentences, or keep cached sentences indefinitely? Leaning toward indefinite (sentences don't expire).

---

## Related Artifacts

- **Base Spec**: `agent/specs/local.widget-system-phase1.md`
- **Widget Types**: `shared/types/widgets.ts`
- **Design**: `agent/design/local.widget-system.md` (if exists)
- **Schema**: `migrations/0003_curriculum_schema.sql` (vocab_items, user_vocab_progress)
- **Haiku Model**: `claude-3-5-haiku-20241022` (used for sentence generation with prompt caching)

---

**Status**: Draft — awaiting review
**Recommendation**: Review Behavior Table, confirm or resolve Open Questions, then implement
**Next Steps**: Create migration for `sentence_order_cache` table, implement Haiku generation logic, implement client UI (horizontal word chips + tap-to-build + undo)