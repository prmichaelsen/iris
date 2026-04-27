# Widget System

**Concept**: Tool-calling architecture with interactive widgets for flashcards, quizzes, and drills — adapted from scenecraft's streaming tool protocol
**Created**: 2026-04-27
**Status**: Design Specification

---

## Overview

Iris currently operates as a free-conversation voice tutor with vocabulary injection. This design adds **structured interactive exercises** — flashcards, dictation, quizzes — that Claude can invoke as tools during conversation. Each tool produces an interactive widget rendered inline in the chat, with a response channel back to the server for grading and progress tracking.

The architecture is adapted from scenecraft's tool-calling system (see `agent/reports/audit-1-scenecraft-tool-architecture.md`) where Claude calls tools → server executes → client renders typed UI → user responds → server scores → Claude reacts. The key insight: **widgets are typed tool results with interactive response schemas**, not a separate system.

---

## Problem Statement

- Iris can converse but can't *drill*. Language learning requires structured practice (flashcards, dictation, gap-fill) alongside conversation.
- Vocabulary is injected into the system prompt but there's no way to actively test whether the user learned it.
- The `user_vocab_progress` table has SM-2 fields (`ease`, `interval_days`, `due_at`) that are never properly scored — the current implementation just marks words as "seen" with a flat 24h `due_at`.
- Without interactive exercises, there's no measurable progress signal.

---

## Solution

Add Claude tool-use to the Worker's streaming loop. When Claude decides the user should practice (or the user asks), it calls a tool like `flashcard({ mode: 'matching', count: 5 })`. The server:

1. Executes the tool (queries D1 for vocab, generates distractors)
2. Sends a typed `widget` message to the client over WebSocket
3. Client renders the appropriate interactive component inline in chat
4. User interacts (taps an option, types an answer)
5. Client sends the response back over WS
6. Server grades it (locally for exact-match, via Claude for freeform)
7. Updates `user_vocab_progress` with real SM-2 scoring
8. Feeds the result back to Claude so it can react naturally

---

## Implementation

### Widget Type Union (all types defined, MVP = flashcard-matching)

```typescript
// Shared between worker and client

interface WidgetBase {
  widget_id: string
}

interface FlashcardMatchingWidget extends WidgetBase {
  type: 'flashcard-matching'
  word: string           // the target word to display/speak: "die Abfahrt"
  audio?: boolean        // true = server already sent TTS audio for this word
  options: string[]      // e.g. ["departure", "arrival", "flight", "platform"]
  correct_index: number  // index into options[]
  cefr_level: string
}

interface FlashcardFreeformWidget extends WidgetBase {
  type: 'flashcard-freeform'
  word: string
  audio?: boolean
  expected: string       // correct answer for local pre-check
  accept_close: boolean  // true = fuzzy match ok (umlauts, case)
  cefr_level: string
}

interface DictationWidget extends WidgetBase {
  type: 'dictation'
  // no text shown — audio only
  audio: true
  expected: string       // the German text that was spoken
  cefr_level: string
}

interface ComprehensionWidget extends WidgetBase {
  type: 'comprehension'
  // no text shown — audio only
  audio: true
  expected_meaning: string  // reference English meaning for Claude grading
  cefr_level: string
}

interface FillBlankWidget extends WidgetBase {
  type: 'fill-blank'
  sentence: string       // "Ich ___ nach Berlin gefahren." (blank = ___)
  hint?: string          // optional: "sein, past participle"
  expected: string       // "bin"
  cefr_level: string
}

interface GenderPickWidget extends WidgetBase {
  type: 'gender-pick'
  noun: string           // "Abfahrt" (no article shown)
  correct: 'der' | 'die' | 'das'
  cefr_level: string
}

interface SentenceOrderWidget extends WidgetBase {
  type: 'sentence-order'
  words: string[]        // shuffled: ["Berlin", "nach", "fahre", "Ich"]
  correct_order: number[] // [3, 2, 1, 0] → "Ich fahre nach Berlin"
  cefr_level: string
}

interface ArticleInContextWidget extends WidgetBase {
  type: 'article-in-context'
  sentence: string       // "Ich gebe ___ Mann das Buch." (blank = article)
  hint?: string          // optional: "dative, masculine"
  expected: string       // "dem"
  options?: string[]     // optional multiple-choice: ["den", "dem", "der", "das"]
  cefr_level: string
}

interface PluralizationWidget extends WidgetBase {
  type: 'pluralization'
  noun: string           // "das Kind"
  expected: string       // "die Kinder"
  hint?: string          // optional: plural rule hint e.g. "-er"
  cefr_level: string
}

interface ConjugationWidget extends WidgetBase {
  type: 'conjugation'
  verb: string           // infinitive: "fahren"
  subject: string        // "ich" | "du" | "er/sie/es" | "wir" | "ihr" | "sie/Sie"
  tense: string          // "Präsens" | "Präteritum" | "Perfekt" | "Futur I"
  expected: string       // "fahre"
  context_sentence?: string // optional: full sentence for context
  cefr_level: string
}

interface DefinitionWidget extends WidgetBase {
  type: 'definition'
  word: string           // German word shown: "die Abfahrt"
  audio?: boolean        // true = server already sent TTS audio
  expected_meaning: string  // reference English meaning for Claude grading
  cefr_level: string
}

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
interface WidgetResponse {
  type: 'widget_response'
  widget_id: string
  answer: unknown  // shape depends on widget type
}

// Per-widget answer shapes:
// flashcard-matching:    { selected_index: number }
// flashcard-freeform:    { text: string }
// dictation:             { text: string }
// comprehension:         { text: string }
// fill-blank:            { text: string }
// gender-pick:           { article: 'der' | 'die' | 'das' }
// article-in-context:    { text: string }  (or { selected_index: number } if options provided)
// pluralization:         { text: string }
// conjugation:           { text: string }
// definition:            { text: string }  (Claude grades — synonym/paraphrase tolerance)
// sentence-order:        { order: number[] }
```

### WebSocket Message Protocol Extensions

```typescript
// Server → Client (new message types, added to existing union)
| { type: 'widget'; widget: Widget }
| { type: 'widget_audio'; widget_id: string }  // followed by binary audio frame
| { type: 'widget_result'; widget_id: string; correct: boolean; explanation?: string }

// Client → Server (new)
| { type: 'widget_response'; widget_id: string; answer: unknown }
```

### Server-Side Tool Definitions (Claude API format)

```typescript
const TOOLS: Anthropic.Tool[] = [
  {
    name: 'flashcard',
    description: `Start a flashcard exercise for the user. Use this when the user
wants to practice vocabulary, or when you think drilling would help reinforce
words from the current lesson. The server will generate the flashcard content
and present it as an interactive widget.`,
    input_schema: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['matching', 'freeform'],
          description: 'matching = pick from options, freeform = type the answer',
        },
        count: {
          type: 'integer',
          description: 'Number of cards (1-10)',
          minimum: 1,
          maximum: 10,
        },
        cefr_level: {
          type: 'string',
          enum: ['A1', 'A2', 'B1'],
          description: 'Target CEFR level. Omit to use the user\'s current level.',
        },
      },
      required: ['mode'],
    },
  },
  {
    name: 'dictation',
    description: `Start a listening exercise. The user hears a German word or phrase
and must type what they heard in German. Tests spelling and listening comprehension.
Use when the user wants ear training or spelling practice.`,
    input_schema: {
      type: 'object',
      properties: {
        count: { type: 'integer', minimum: 1, maximum: 10 },
        cefr_level: { type: 'string', enum: ['A1', 'A2', 'B1'] },
      },
    },
  },
  {
    name: 'comprehension',
    description: `Start a listening comprehension exercise. The user hears German
and must type the English meaning. Tests understanding, not spelling. Use when
the user wants to practice understanding spoken German.`,
    input_schema: {
      type: 'object',
      properties: {
        count: { type: 'integer', minimum: 1, maximum: 10 },
        cefr_level: { type: 'string', enum: ['A1', 'A2', 'B1'] },
      },
    },
  },
  {
    name: 'gender_quiz',
    description: `Quiz the user on German noun genders (der/die/das). Shows a noun
without its article; user picks the correct one.`,
    input_schema: {
      type: 'object',
      properties: {
        count: { type: 'integer', minimum: 1, maximum: 10 },
        cefr_level: { type: 'string', enum: ['A1', 'A2', 'B1'] },
      },
    },
  },
  {
    name: 'fill_blank',
    description: `Generate a fill-in-the-blank exercise from a German sentence.
One word is removed; user types it. Tests grammar and vocabulary in context.`,
    input_schema: {
      type: 'object',
      properties: {
        count: { type: 'integer', minimum: 1, maximum: 10 },
        focus: {
          type: 'string',
          description: 'Grammar focus: verbs, articles, prepositions, or omit for mixed',
        },
        cefr_level: { type: 'string', enum: ['A1', 'A2', 'B1'] },
      },
    },
  },
  {
    name: 'definition_quiz',
    description: `Quiz the user on German word definitions. Shows a German word
(optionally spoken aloud); user types the English meaning. Claude grades the
response with synonym and paraphrase tolerance. Tests active vocabulary recall.`,
    input_schema: {
      type: 'object',
      properties: {
        count: { type: 'integer', minimum: 1, maximum: 10 },
        speak: {
          type: 'boolean',
          description: 'If true, speak the word aloud via TTS (tests listening + meaning)',
        },
        cefr_level: { type: 'string', enum: ['A1', 'A2', 'B1'] },
      },
    },
  },
  {
    name: 'article_quiz',
    description: `Quiz the user on German articles in context — full declension
system (der/die/das/den/dem/des/einen/einem/etc), not just nominative gender.
Shows a sentence with a blanked article; user fills it in. Tests case
awareness (nominative, accusative, dative, genitive).`,
    input_schema: {
      type: 'object',
      properties: {
        count: { type: 'integer', minimum: 1, maximum: 10 },
        cases: {
          type: 'array',
          items: { type: 'string', enum: ['nominative', 'accusative', 'dative', 'genitive'] },
          description: 'Which cases to focus on. Omit for mixed.',
        },
        mode: {
          type: 'string',
          enum: ['freeform', 'multiple_choice'],
          description: 'freeform = type the article, multiple_choice = pick from 4 options',
        },
        cefr_level: { type: 'string', enum: ['A1', 'A2', 'B1'] },
      },
    },
  },
  {
    name: 'pluralization_quiz',
    description: `Quiz the user on German noun plurals. Shows a singular noun with
its article; user types the plural form. German plurals are irregular and must
be memorized — this drill is essential for building that muscle.`,
    input_schema: {
      type: 'object',
      properties: {
        count: { type: 'integer', minimum: 1, maximum: 10 },
        cefr_level: { type: 'string', enum: ['A1', 'A2', 'B1'] },
      },
    },
  },
  {
    name: 'conjugation_quiz',
    description: `Quiz the user on German verb conjugation. Shows an infinitive verb,
a subject pronoun, and a tense; user types the correct conjugated form. Covers
regular and irregular verbs, separable prefixes, and auxiliary selection.`,
    input_schema: {
      type: 'object',
      properties: {
        count: { type: 'integer', minimum: 1, maximum: 10 },
        tenses: {
          type: 'array',
          items: { type: 'string', enum: ['Präsens', 'Präteritum', 'Perfekt', 'Futur I'] },
          description: 'Which tenses to test. Omit for mixed.',
        },
        subjects: {
          type: 'array',
          items: { type: 'string', enum: ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie'] },
          description: 'Which subject pronouns to use. Omit for mixed.',
        },
        cefr_level: { type: 'string', enum: ['A1', 'A2', 'B1'] },
      },
    },
  },
]
```

### Tool Execution Flow (Worker)

```
Claude streaming loop (max 10 tool iterations):

1. Stream Claude response
   - text deltas → send as { type: 'response_text', delta } (existing)
   - tool_use block → execute tool

2. Execute tool:
   flashcard({ mode: 'matching', count: 3 })
   → query D1 for 3 vocab items (same pickVocab logic)
   → for each item, pick 3 random distractors at same CEFR level
   → for each item, TTS the word via ElevenLabs → send binary audio
   → send { type: 'widget', widget: { type: 'flashcard-matching', ... } }
   → await { type: 'widget_response', widget_id, answer }
   → grade, update user_vocab_progress, build tool_result string
   → feed result back to Claude: "User scored 2/3: got Abfahrt ✓, Schule ✓, Arbeit ✗"

3. Claude sees the result, responds naturally:
   "Gut gemacht! Zwei von drei richtig. 'Die Arbeit' bedeutet 'work'.
    Sollen wir noch ein paar üben?"
```

### Grading Strategy

| Widget type | Grading method | Latency |
|---|---|---|
| flashcard-matching | Index comparison (local) | 0ms |
| flashcard-freeform | Fuzzy string match + Claude fallback | 0-2s |
| dictation | Levenshtein distance with ä/ae, ß/ss normalization | 0ms |
| comprehension | Claude grades (synonym tolerance) | 1-2s |
| fill-blank | Exact match after normalization | 0ms |
| gender-pick | Exact match (local) | 0ms |
| article-in-context | Exact match (freeform) or index (multiple-choice) | 0ms |
| pluralization | Exact match after normalization | 0ms |
| conjugation | Exact match + Claude fallback for edge cases (separable prefixes, auxiliary forms) | 0-2s |
| definition | Claude grades (synonym/paraphrase tolerance — "departure" ≈ "leaving" ≈ "the act of departing") | 1-2s |
| sentence-order | Array comparison (local) | 0ms |

Local grading is preferred. Claude grading is reserved for freeform text where synonyms, paraphrases, and partial credit matter.

### SM-2 Progress Update

After each widget response, update `user_vocab_progress`:

```typescript
function sm2Update(correct: boolean, prev: { ease: number; interval_days: number }) {
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

## Benefits

- **Structured practice** alongside free conversation — the user doesn't have to leave the chat
- **Voice-first hearing modes** (dictation, comprehension) that no visual-first app does well
- **Real progress signal** — SM-2 scoring replaces the flat 24h `due_at`
- **Claude-aware results** — Claude sees what the user got right/wrong and adapts conversation
- **Reusable protocol** — same widget primitive works for any future exercise type

---

## Trade-offs

- **Tool-use adds latency** — each tool call is an extra Claude API round-trip (~1-2s). Mitigated by keeping tool count low per turn (Claude naturally doesn't call 10 flashcards in one shot).
- **Widget audio = extra TTS calls** — each flashcard word is a TTS call (~$0.01). For a 5-card set that's $0.05. Acceptable for hackathon; cache by lemma in D1 for production.
- **Freeform grading via Claude** — adds 1-2s latency per answer. Only used for comprehension and freeform flashcard modes; all other modes grade locally.
- **D1 write pressure** — each widget response writes to `user_vocab_progress`. SM-2 updates are single-row upserts, well within D1 limits.

---

## Dependencies

- Anthropic Claude API with tool-use (already in use for conversation)
- ElevenLabs TTS (already in use for response audio; reused for widget word audio)
- D1 `vocab_items`, `vocab_examples`, `user_vocab_progress` tables (already exist)
- Existing WebSocket protocol (extended, not replaced)

---

## Testing Strategy

- **Unit**: SM-2 scoring function, fuzzy string matching (umlaut normalization, Levenshtein), distractor generation (no duplicates, no correct answer in distractors)
- **Integration**: Full tool-call round-trip: Claude calls flashcard → server generates → client renders → user responds → server grades → Claude reacts
- **Manual**: Voice-first flows — dictation where user only hears, no text shown; verify TTS plays before widget renders
- **Edge cases**: Empty vocab at a CEFR level, user disconnects mid-widget, tool call timeout

---

## Migration Path

1. **Phase 1 (MVP)**: `flashcard-matching` only. Define all widget types. Single-card flow (one card at a time, not a batch). No audio for the word yet — just text + options.
2. **Phase 2**: Add TTS for the flashcard word (speak before showing options). Add `gender-pick` and `article-in-context` (article/case system drills).
3. **Phase 3**: Add `pluralization` and `conjugation` (core grammar widgets). These require Claude to generate the quiz content since the data isn't in our vocab tables.
4. **Phase 4**: Add `dictation` and `comprehension` (hearing-only modes). Add `fill-blank`.
5. **Phase 5**: Batch mode (5 cards in sequence), session summary ("you scored 4/5, here are the words to review").
6. **Phase 6**: `sentence-order`, `flashcard-freeform`. Claude-graded freeform modes.

---

## Key Design Decisions

### Architecture

| Decision | Choice | Rationale |
|---|---|---|
| Widget primitive | Typed tool result with interactive response schema | Same pattern as scenecraft's elicitation — proven, clean protocol |
| Transport | Existing WebSocket (extended) | Already handles binary audio + JSON; adding widget types is additive |
| Tool execution | Server-side (Worker) | Tools read/write D1; client just renders |
| Grading | Local where possible, Claude for freeform | Minimizes latency and cost; Claude only when synonym/paraphrase tolerance is needed |

### Voice Integration

| Decision | Choice | Rationale |
|---|---|---|
| Flashcard audio | Server TTS-es the word, sends audio before widget payload | User hears the word, then sees options — tests listening, not reading |
| Dictation | Audio only, no text shown | True listening comprehension test |
| Comprehension | Audio only, user types English | Tests understanding, not spelling |

### Progress

| Decision | Choice | Rationale |
|---|---|---|
| Scoring | SM-2 (SuperMemo 2) | Industry standard for spaced repetition; simple, well-understood |
| Storage | `user_vocab_progress` table (existing) | Already has ease, interval_days, due_at fields |
| Integration | Widget results feed back into conversation vocab picker | Getting a word wrong in a flashcard → it reappears sooner in conversation |

---

## Future Considerations

- **Lesson tool**: `activate_lesson`, `list_lessons`, `pause_lesson` — sets the session's active lesson, which constrains vocab selection and enables themed exercises
- **Batch widget mode**: Server sends 5 cards at once, client renders them as a sequence with a progress bar, results sent as a batch
- **Audio caching**: TTS output cached in D1 or R2 by lemma+voice — eliminates repeat TTS calls for the same word
- **Pronunciation scoring**: Server sends `pronunciation_request`, client records audio, server compares via Scribe transcript — same round-trip pattern as scenecraft's mix_render_request
- **Leaderboard / streaks**: Daily practice streaks, words mastered count — gamification layer on top of SM-2

---

**Status**: Design Specification
**Recommendation**: Implement Phase 1 (flashcard-matching MVP) — define all widget types in TypeScript, wire only flashcard-matching end-to-end
**Related Documents**: `agent/reports/audit-1-scenecraft-tool-architecture.md`
