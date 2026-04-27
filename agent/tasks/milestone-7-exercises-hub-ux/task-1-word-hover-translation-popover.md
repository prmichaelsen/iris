# Task 1: Word Hover Translation Popover

**Milestone**: M7 - Exercises Hub & UX
**Status**: Not Started
**Estimated Time**: 3-4 hours
**Dependencies**: None
**Design Reference**: None

---

## Objective

Enable users to hover (desktop) or tap (mobile) on individual words in Iris's messages to see an inline popover with translation, article, CEFR level, and an example sentence. Makes passive reading instantly self-serve for unfamiliar vocabulary.

---

## Context

Today when users encounter an unfamiliar German word in Iris's reply, they must either ask Iris what it means (breaks flow) or switch to a dictionary app. Interactive dictionary lookups on chat messages are a common language-learning UX pattern (Duolingo Stories, LingQ) and our existing infrastructure already has most of what's needed:

- `vocab_cards` table has lemma + gloss + article + cefr_level + example sentences
- `flashcard-freeform` widget already has word→gloss lookup logic that can be reused
- `tools/definition.ts` exists as a pattern for on-demand word definition generation

The MVP should be desktop-first (hover), with mobile tap support added in a follow-up if the feature sticks.

---

## Key Design Decisions

### DD-1: Lookup Strategy — Hybrid (Vocab Cards + Claude Fallback)
- **Decision**: Look up the word in `vocab_cards` first; if not found, call Claude on-demand and cache the result.
- **Why**: Vocab cards give instant response (<50ms) for the common case, Claude handles long-tail vocabulary the user encounters. Pre-tokenizing every message adds latency we don't need.
- **Rejected**: Pre-tokenize every message server-side (adds ~200ms to TTS delivery); pure Claude-on-demand (500ms hover latency for common words).

### DD-2: Tokenization — Client-Side, Preserve Punctuation
- **Decision**: Tokenize on the client. Split on whitespace, strip leading/trailing punctuation for lookup but preserve it for display.
- **Why**: Server doesn't need to know about tokenization. Client has full control over rendering. Punctuation preservation avoids "der," becoming "der" in display.
- **Edge case**: German compound words stay as single tokens (e.g., "Abfahrtszeit" stays whole — don't split).

### DD-3: Desktop-First
- **Decision**: Implement hover popover for desktop only in this task. Mobile tap gesture deferred.
- **Why**: Avoid conflict with existing mobile tap gestures (message playback, widget interactions). Follow-up task can add mobile after testing desktop flow.

### DD-4: Popover Implementation — Custom Lightweight Component
- **Decision**: Build a ~60-line popover component with `@floating-ui/react` (smart positioning, collision detection) rather than pulling in Radix/Headless UI.
- **Why**: We only need one type of popover. Radix is ~30kb gzipped; floating-ui is ~5kb. The feature is simple enough to not need a full headless component library.

### DD-5: Cache Lookups in `word_definitions` Table
- **Decision**: Create a new D1 table to cache Claude-generated definitions. Composite key (lemma, target_lang_code).
- **Why**: Avoids paying Claude tokens for the same word twice. First user of a word pays the latency; everyone else is instant.

---

## Steps

### Step 1: Database Migration for Word Definition Cache

Create `migrations/NNNN_word_definitions.sql`:

```sql
CREATE TABLE IF NOT EXISTS word_definitions (
  lemma TEXT NOT NULL,
  target_lang_code TEXT NOT NULL,
  article TEXT,                  -- "der" | "die" | "das" | NULL
  gloss TEXT NOT NULL,           -- English translation
  cefr_level TEXT,               -- A1 | A2 | B1 | B2 | C1 | C2 | NULL
  example_de TEXT,               -- German example sentence
  example_en TEXT,               -- English translation of example
  source TEXT NOT NULL,          -- 'vocab_cards' | 'claude' | 'manual'
  created_at INTEGER NOT NULL,
  PRIMARY KEY (lemma, target_lang_code)
);

CREATE INDEX IF NOT EXISTS idx_word_definitions_lemma ON word_definitions(lemma);
```

### Step 2: Backend Endpoint — GET `/api/word`

Add a new route in `worker/index.ts`:

**Endpoint**: `GET /api/word?q=<word>&lang=<code>`

**Behavior**:
1. Normalize `q`: lowercase, strip punctuation, trim
2. Query `word_definitions` table by `(lemma, target_lang_code)` — if hit, return immediately
3. Query `vocab_cards` by lemma (case-insensitive) for the user's target language — if hit, write to cache and return
4. Fall through: call Claude with a structured prompt to generate `{ article, gloss, cefr_level, example_de, example_en }`
5. Store result in `word_definitions` with `source='claude'`
6. Return JSON

**Response shape**:
```typescript
{
  lemma: string,            // normalized form
  article: string | null,   // "der" | "die" | "das" | null for non-nouns
  gloss: string,            // "departure"
  cefr_level: string | null,
  example_de: string | null,
  example_en: string | null,
  source: 'cache' | 'vocab_cards' | 'claude'
}
```

**Auth**: Require authenticated session (same cookie flow as `/api/auth/me`).

**Error handling**: If Claude fails, return `{ lemma, gloss: null, error: 'lookup_failed' }` (status 200, not 500 — client gracefully handles).

### Step 3: Client — Tokenize Message Rendering

In the chat message renderer (likely `client/App.tsx` where assistant messages are rendered):

1. Replace plain text rendering of assistant message content with a tokenized component
2. Create `client/WordToken.tsx`:
   - Props: `{ word: string, targetLang: string }`
   - Strips leading/trailing punctuation for lookup, displays original
   - On hover (debounced 150ms), triggers popover
   - Delegates popover rendering to `WordPopover` component

```tsx
// Pseudo-code
function tokenize(text: string): Array<{ text: string, type: 'word' | 'space' | 'punct' }> {
  // Split preserving whitespace and punctuation
}

function MessageContent({ content, targetLang }) {
  const tokens = tokenize(content)
  return tokens.map((t, i) => 
    t.type === 'word' 
      ? <WordToken key={i} word={t.text} targetLang={targetLang} />
      : <span key={i}>{t.text}</span>
  )
}
```

### Step 4: Client — Word Popover Component

Create `client/WordPopover.tsx` using `@floating-ui/react`:

**Install**: `npm i @floating-ui/react`

**Features**:
- Positioned above the word, flips to below if insufficient space
- Shows loading spinner while fetching
- Displays: article + lemma (bold), gloss, CEFR badge, example (DE/EN)
- Dismisses on mouseleave (with 200ms grace period for mouse-to-popover traversal)
- Only one popover visible at a time (global state or document-level mouseover)

**Layout**:
```
┌────────────────────────────────┐
│ die Abfahrt           [A2]     │
│ departure                      │
│                                │
│ "Die Abfahrt ist um 9 Uhr."    │
│ "The departure is at 9."       │
└────────────────────────────────┘
```

### Step 5: Client — Fetch + Cache

Add to `client/App.tsx` (or extract to `client/api.ts`):

```typescript
const wordCache = new Map<string, WordDefinition>()

async function lookupWord(word: string, targetLang: string): Promise<WordDefinition> {
  const key = `${word.toLowerCase()}:${targetLang}`
  if (wordCache.has(key)) return wordCache.get(key)!
  const res = await fetch(`/api/word?q=${encodeURIComponent(word)}&lang=${targetLang}`)
  const data = await res.json()
  wordCache.set(key, data)
  return data
}
```

Client-side cache avoids repeated fetches for the same word in the current session.

### Step 6: Styling

In `client/styles.css`:
- `.word-token { cursor: help; border-bottom: 1px dotted rgba(0,0,0,0.15) }` (subtle hint that words are interactive)
- `.word-token:hover { background: rgba(59,130,246,0.08); border-bottom-color: rgba(59,130,246,0.4) }`
- `.word-popover` styles (white bg, subtle shadow, rounded-md, max-width 280px, padding 12px)
- `@media (hover: none) { .word-token { border-bottom: none } }` (hide hint on touch devices until mobile support lands)

### Step 7: Testing

**Unit tests** (`tests/api/word.test.ts`):
- Cache hit returns cached data
- Vocab card hit writes to cache and returns vocab data
- Claude fallback stores result with `source='claude'`
- Punctuation normalization (`"Abfahrt,"` → looks up `"abfahrt"`)
- Unknown word returns graceful error, not 500

**Client tests** (`tests/client/WordToken.test.tsx`):
- Tokenizer preserves whitespace and punctuation
- German compound words stay as single tokens
- Hover triggers lookup after 150ms debounce
- Popover dismisses on mouseleave with grace period

**Manual test checklist** (in browser):
- Hover "die Abfahrt" in Iris's reply → popover shows translation
- Hover unknown word → loading spinner, then result (Claude path)
- Hover word a second time → instant (cache hit)
- Rapid mouse movement across multiple words → no jank, popovers don't pile up

---

## Expected Output

### Files Created
- `migrations/NNNN_word_definitions.sql`
- `client/WordToken.tsx`
- `client/WordPopover.tsx`
- `tests/api/word.test.ts`
- `tests/client/WordToken.test.tsx`

### Files Modified
- `worker/index.ts` — add `/api/word` route
- `client/App.tsx` — replace assistant message rendering with tokenized version
- `client/styles.css` — add word-token and popover styles
- `package.json` — add `@floating-ui/react` dependency
- `agent/progress.yaml` — mark task complete

---

## Verification Checklist

- [ ] Migration `word_definitions` table applied to both local and remote D1
- [ ] GET `/api/word?q=Abfahrt&lang=de` returns `{ article: "die", gloss: "departure", ... }`
- [ ] Repeated request for same word hits cache (check `source` field)
- [ ] Vocab card lookup populates cache with `source='vocab_cards'`
- [ ] Unknown word triggers Claude path, returns valid response, caches with `source='claude'`
- [ ] Punctuation stripped for lookup (`"Abfahrt,"` finds `"abfahrt"`)
- [ ] Assistant messages render with hoverable word tokens
- [ ] Hover shows popover after 150ms debounce
- [ ] Popover positions above word, flips below when near viewport top
- [ ] Popover dismisses on mouseleave with 200ms grace period
- [ ] Only one popover visible at a time
- [ ] CEFR badge color matches level (A1 green → C2 purple)
- [ ] Example sentence shown in both German and English
- [ ] Loading state visible during Claude fallback (doesn't block other hovers)
- [ ] Error state graceful (unknown word shows "No translation found" not crash)
- [ ] Existing message features still work: audio playback, widget interactions, message history scroll
- [ ] User messages do NOT render word tokens (only assistant messages)
- [ ] Touch devices don't show dotted underline (feature deferred for mobile)
- [ ] Unit tests pass
- [ ] Manual browser test: hover 10 different words without issues

---

## Non-Goals (Deferred)

- **Mobile tap support** — conflicts with existing tap gestures; needs UX design work
- **Word-level playback** — tapping a word to hear just that word's pronunciation
- **"Add to vocab" from popover** — saving a looked-up word to the user's SM-2 deck
- **Contextual disambiguation** — `"Bank"` means bench OR financial institution depending on sentence; MVP returns the most common gloss
- **Highlighting already-mastered words** — visually distinguishing words the user has high mastery on
- **User message tokenization** — users can look up their own transcribed words (adds noise, defer)

---

## Notes

- If `@floating-ui/react` feels heavy, consider a pure-CSS tooltip with `position: absolute` — works for single-line popovers but struggles near viewport edges.
- Claude prompt for word definition should be tight and schema-constrained (use tool-use with a JSON schema) to avoid parsing issues.
- The existing `worker/tools/flashcard-freeform.ts` has word normalization logic that can be extracted into a shared utility.
