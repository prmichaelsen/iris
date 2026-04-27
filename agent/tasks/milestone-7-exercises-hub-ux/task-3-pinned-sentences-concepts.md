# Task 3: Pinned Sentences and Concepts

**Milestone**: M7 - Exercises Hub & UX
**Status**: Not Started
**Estimated Time**: 2-3 hours
**Dependencies**: None (pairs well with Task 2 session-freshness injector)
**Design Reference**: None

---

## Objective

Give users a way to pin specific German sentences and grammar concepts for deliberate future practice, separate from the word-level study list. Iris fetches from these lists on demand — when the user explicitly asks, or when Iris proactively offers direction (fresh session, conversation stall).

---

## Context

The study list (Task M10-adjacent) covers word-level practice via prompt injection. But users also want to practice:

- **Sentences**: "Ich hätte gerne einen Kaffee" — a phrase they want to master
- **Concepts**: "Dative case with prepositions" — a grammar topic they want to drill

These don't belong in the study list because:
1. Sentences are too long to inject inline with gloss format
2. Concepts aren't vocabulary — they're topics for exercises
3. Neither needs per-turn injection — they're *fetched* when relevant

Instead, Iris learns they exist, and pulls from them via tool calls when useful.

---

## Key Design Decisions

### DD-1: Single Tool, Action Param for Type
- **Decision**: One `pinned_items` tool with `type: "sentence" | "concept"` param.
- **Why**: Domain-aggregation pattern (same as `regions`, `quests`, `study_list`). Avoids tool proliferation.

### DD-2: No Prompt Injection — Fetch On Demand
- **Decision**: Do NOT inject pinned items into every prompt. Iris calls `pinned_items` action="list" or action="pick_random" when she wants one.
- **Why**: Sentences are long. Concepts are topical. Injecting every turn would waste tokens. On-demand keeps things fast and cheap.

### DD-3: Count-Only Awareness
- **Decision**: Inject only the *count* of pinned items at prompt build time: "User has 5 pinned sentences, 3 pinned concepts." Not the contents.
- **Why**: Iris needs to know they *exist* to offer them proactively, but she doesn't need the content until she decides to fetch.

### DD-4: Types as Extensible Schema
- **Decision**: Use `type TEXT NOT NULL CHECK(type IN ('sentence','concept'))` with room to add future types ('conjugation_pattern', 'dialogue', 'song_lyric') later.
- **Why**: YAGNI for now, but the schema doesn't lock us in.

---

## Steps

### Step 1: Database Migration

Create `migrations/NNNN_user_pinned_items.sql`:

```sql
CREATE TABLE IF NOT EXISTS user_pinned_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('sentence', 'concept')),
  content TEXT NOT NULL,        -- the sentence (German) or concept name
  gloss TEXT,                   -- English translation (sentences) or brief description (concepts)
  notes TEXT,                   -- optional user note
  added_at INTEGER NOT NULL,
  last_practiced_at INTEGER,
  practice_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_pinned_items_user_type ON user_pinned_items (user_id, type);
CREATE INDEX IF NOT EXISTS idx_pinned_items_user_added ON user_pinned_items (user_id, added_at DESC);
```

### Step 2: MCP Tool

Create `worker/tools/pinned-items.ts`:

```typescript
pinned_items {
  action: "add" | "remove" | "list" | "pick_random" | "mark_practiced"
  type?: "sentence" | "concept"    // required for add/list/pick_random (except "list all")
  id?: string                       // required for remove / mark_practiced
  content?: string                  // required for add
  gloss?: string                    // optional for add (recommended for sentences)
  notes?: string                    // optional for add
}
```

Behavior:
- **add**: Insert row, return the new ID
- **remove**: Delete by ID
- **list**: Return all pinned items, optionally filtered by type. Include id, content, gloss, notes, practice_count.
- **pick_random**: Return one random item of the given type (`ORDER BY RANDOM() LIMIT 1`). Iris calls this when she wants to spontaneously practice one.
- **mark_practiced**: Increment practice_count, update last_practiced_at. Iris calls after drilling the item.

Tool description emphasizes intent-matching:

> "Manage the user's pinned sentences (phrases to memorize) and concepts (grammar topics to drill). Use action='add' when user says 'pin this sentence', 'save this for later', 'add dative case to my concepts', etc. Use action='pick_random' when YOU want to spontaneously offer one to practice. Use action='mark_practiced' after drilling the item with the user."

### Step 3: Count Injection

Add a lightweight injector `worker/prompt-injectors/injectors/pinned-items-count.ts`:

```typescript
export class PinnedItemsCountInjector implements PromptInjector {
  readonly id = 'pinned-items-count'
  // ...

  async inject(context): Promise<PromptInjectorResult | null> {
    const { db, userId } = context
    const { sentences = 0, concepts = 0 } = await db
      .prepare(`
        SELECT
          SUM(CASE WHEN type='sentence' THEN 1 ELSE 0 END) as sentences,
          SUM(CASE WHEN type='concept'  THEN 1 ELSE 0 END) as concepts
        FROM user_pinned_items WHERE user_id = ?
      `)
      .bind(userId).first<{ sentences: number, concepts: number }>() || {}

    if (sentences + concepts === 0) return null

    return {
      content: `## Pinned Items

The user has pinned ${sentences} sentence${sentences === 1 ? '' : 's'} and ${concepts} concept${concepts === 1 ? '' : 's'} for practice.
When offering direction (fresh session, conversation stall, user uncertainty), consider suggesting: "Möchtest du an einem gepinnten Satz arbeiten?" or "Sollen wir ein Konzept üben?"
Call \`pinned_items\` action="pick_random" type="sentence" (or "concept") to fetch one. Then drill it with the user. Call action="mark_practiced" when done.`,
      priority: 0.7,
      title: 'Pinned Items',
      required: false,
    }
  }
}
```

### Step 4: BASE_PROMPT Addition

```
Pinned items (use proactively):
- Users can pin sentences and concepts for later practice via the \`pinned_items\` tool.
- When user says "pin this", "save this sentence", "add X to my concepts", use action="add".
- When the Pinned Items section appears in your system prompt, the user has pinned items. Offer to drill one when appropriate — especially at session starts or when the user seems unsure what to do.
```

### Step 5: Tests

Create `tests/tools/pinned-items.test.ts`:
- add sentence → inserts row, returns ID
- add concept without gloss → succeeds (gloss optional)
- remove by ID → deletes row
- list filters by type correctly
- pick_random returns one of the items
- pick_random with empty list returns graceful "no items"
- mark_practiced increments counter

---

## Expected Output

### Files Created
- `migrations/NNNN_user_pinned_items.sql`
- `worker/tools/pinned-items.ts`
- `worker/prompt-injectors/injectors/pinned-items-count.ts`
- `tests/tools/pinned-items.test.ts`

### Files Modified
- `worker/tools/index.ts` — register tool
- `worker/prompt-injectors/index.ts` — register injector
- `worker/prompt-injectors/injectors/index.ts` — export injector
- `worker/index.ts` — BASE_PROMPT addition
- `agent/progress.yaml` — mark task complete

---

## Verification Checklist

- [ ] Migration applies cleanly to local and remote D1
- [ ] Tool registered and callable via Claude
- [ ] `pinned_items add type=sentence content="..."` inserts a row
- [ ] `pinned_items list type=sentence` returns only sentences
- [ ] `pinned_items pick_random type=concept` returns one random concept
- [ ] `pinned_items mark_practiced id=X` increments practice_count
- [ ] Count injector appears in system prompt when user has items, absent otherwise
- [ ] Manual test: tell Iris "pin 'Ich hätte gerne einen Kaffee' as a sentence" → tool called, row created
- [ ] Manual test: after pinning several items, start a fresh session (> 4h idle or new tab) — Iris proactively offers to drill one
- [ ] Manual test: tell Iris "let's practice my pinned sentences" → she calls pick_random, drills one, calls mark_practiced after
- [ ] Unit tests pass

---

## Non-Goals

- **Proficiency tracking** — deferred; practice_count is enough signal for MVP
- **Sub-types / tags** — pinned items are flat; no folders or grouping
- **Auto-pinning** — Iris doesn't pin things for the user without asking
- **Cross-session linking** — no relationships between pinned items
- **UI view** — voice + chat is the only interface for MVP

---

## Notes

- The `practice_count` could eventually feed into a "most-neglected" pick_random variant ("weighted pick_random favoring items with low practice_count"). Defer until users ask.
- If sentences grow very long, consider truncating in the `list` response and offering a `get` action for single items. Not needed for MVP.
