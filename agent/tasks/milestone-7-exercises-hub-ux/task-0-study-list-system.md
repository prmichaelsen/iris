# Task 0: Study List System (Retroactive)

**Milestone**: M7 - Exercises Hub & UX
**Status**: Complete ✅
**Estimated Time**: 3 hours
**Actual Time**: ~2 hours
**Completed**: 2026-04-27
**Dependencies**: Prompt injection framework (from M10)
**Design Reference**: None

---

## Objective

Let users curate a list of words they want to practice. Iris occasionally weaves them into replies naturally, and always renders them inline with the English gloss — `gerade (already)` — so the user gets a reminder without needing to ask for a translation.

Tool-driven (no UI) to support voice-first flows: "Add *gerade* to my study list" works end-to-end through conversation.

---

## Context

Users encountering words they repeatedly forget lacked a lightweight way to flag them for practice. The system already has SM-2 vocab cards, but those are system-curated (Goethe word lists); users wanted **user-curated** reinforcement.

We chose to:
- Skip a star/button UI in favor of an MCP tool (works in voice chat)
- Inject the list into Iris's system prompt with a formatting rule (`lemma (gloss)`)
- Use a composite sampling strategy so the list can grow without bloating the prompt

---

## Key Design Decisions

### DD-1: Voice-First via MCP Tool, Not UI
- **Decision**: No "star" button. Users add via conversation: "Add X to my study list."
- **Why**: Iris is a voice-first product. A UI-only path would block voice users.

### DD-2: Priority System (0.0-1.0) with Lazy Decay
- **Decision**: Static insert at **0.65**, lazy decay at **-0.01/day since last_touched_at**, interaction bumps (+0.02 to +0.15) clamped to [0, 1].
- **Why**: Simple math, one source of truth (`effectivePriority()`), no background jobs. Decay applied at read time, not write time.
- **Rejected**: Binary hot/cold (too blunt); session-scoped median snapshot (complexity not justified).

### DD-3: Composite Injection (Top 20 + Random 20/50 Recent + Random 10 Tail)
- **Decision**: Per-turn injection composes three sources, deduped by lemma.
  - **Top 20**: `ORDER BY base_priority DESC` — the words the system thinks matter most
  - **Recent sample**: 20 picked from most-recent 50 by `added_at` — rotating bench; guarantees fresh adds air time
  - **Resurface sample**: 10 from `ORDER BY RANDOM()` on rank 21+ — combats decay bias; rediscovery is a feature
- **Why**: Pure top-N calcifies; the recent bench gives rotation; the resurface lottery gives forgotten words a second chance. Uniform random for simplicity.
- **Dedup via `Map<lemma, entry>`**: overlap between top and recent is common; resulting 35–45 unique words per turn.

### DD-4: Inline Gloss Rule is Mandatory
- **Decision**: Every time Iris uses a study-list word, she MUST render it as `lemma (gloss)`. Applies to every occurrence, not just the first.
- **Why**: Users add words they keep forgetting. Paying the parenthetical cost every time is cheaper than the user losing context mid-conversation.

### DD-5: Consolidated Tool with Action Param
- **Decision**: Single `study_list` tool with actions: `add`, `remove`, `list`, `mark_used`, `mark_clarified`.
- **Why**: Anthropic best practice — fewer tools with dynamic arguments outperform many small tools.

### DD-6: Static Insert Priority (0.65), Not Median-Based
- **Decision**: New adds get a flat 0.65 instead of "median of top-N plus small bonus."
- **Why**: Bulk adds with dynamic median create drift (each insert shifts the median). Static 0.65 is safe for batch adds (all entries enter at same priority, no internal competition) and roughly matches the empirical median of active users' top-25.

---

## Actual Implementation

### Files Created
- `migrations/0012_user_study_list.sql`
- `worker/tools/study-list.ts` — tool + `composeStudyListInjection()` helper + `effectivePriority()`
- `worker/prompt-injectors/injectors/study-list.ts` — injector with inline-gloss rule
- `tests/tools/study-list.test.ts` — priority decay unit tests

### Files Modified
- `worker/tools/index.ts` — register `studyListTool`
- `worker/prompt-injectors/injectors/index.ts` — export `StudyListInjector`
- `worker/prompt-injectors/index.ts` — register `StudyListInjector`
- `worker/index.ts` — BASE_PROMPT additions + wire `buildSystemPromptAsync` to call injector registry

---

## What Shipped

**Tool:**

```typescript
study_list {
  action: "add" | "remove" | "list" | "mark_used" | "mark_clarified"
  word?: string
  gloss?: string   // required for 'add'
  notes?: string
}
```

**Priority math:**

```typescript
effectivePriority = clamp(base_priority - daysSince(last_touched_at) * 0.01, 0, 1)
```

**Injection composition (per turn):**

```
Top 20 by priority
  ∪ Random 20 of Last-50-added
  ∪ Random 10 tail (rank > 20)
→ dedupe by lemma
→ sort desc by priority
→ inject as markdown list
```

**Prompt rule injected:**

> When you use one of these words in a reply, immediately follow it with the English gloss in parentheses — e.g., "gerade (already)". This applies to every occurrence, not just the first.
>
> When natural, weave 1–2 of these words into your reply without drilling or listing them.
>
> After deliberately using a study word, call `study_list` action="mark_used" so the system tracks engagement.
>
> If the user asks what a study word means, call `study_list` action="mark_clarified" for that word.

---

## Verification (Completed)

- [x] Migration applied to local and remote D1
- [x] Tool registered and discoverable by Claude
- [x] `add` inserts row with static 0.65 priority
- [x] `add` requires `gloss` param (rejects without it)
- [x] Duplicate `add` upserts (refreshes last_touched_at, keeps higher priority)
- [x] `remove` deletes row, returns graceful message if lemma not found
- [x] `list` returns all words with effective priorities
- [x] `mark_used` bumps priority by +0.02, increments uses_by_iris
- [x] `mark_clarified` bumps priority by +0.15, increments clarifications_requested
- [x] Lemma normalization strips punctuation and lowercases
- [x] `composeStudyListInjection` returns 0-45 unique words, sorted by effective priority
- [x] `ORDER BY RANDOM()` works on D1 (SQLite-compatible)
- [x] `StudyListInjector.canInject` requires `db` and `userId`
- [x] Injector returns null for empty study list (no prompt bloat for new users)
- [x] Tests: 7 priority decay tests pass (0-day, 5-day, 7-day, 30-day, boundary cases)
- [x] Full suite: 217/217 passing
- [x] Build clean (vite)
- [x] Deployed to prod (version 11b7222e)
- [x] Manual voice test: "Add gerade to my study list" → row created in D1
- [x] Manual voice test: Iris uses gerade in next reply, renders "gerade (already)"

---

## Non-Goals (Deferred)

- **UI view of study list** — voice + chat is the only interface
- **True SM-2 on study words** — interaction counters are enough signal for MVP
- **User-defined lessons / groupings** — would conflict with planned M6 lesson system
- **Bulk add via UI** — voice add is fine; if users bulk-add 20 in conversation, the static 0.65 makes that safe
- **Per-word decay tuning** — all words share the same 0.01/day rate
- **Weighted tail sampling** — currently uniform random; weighted by priority is future optimization

---

## Follow-On Items

- [M7 Task 2] Session freshness injector — pairs naturally with study list (fresh session → offer a study word)
- [M7 Task 3] Pinned sentences and concepts — sibling feature; lives in separate tool
- [M7 Task 1] Word hover translation popover — unrelated but also M7; tackled in parallel

---

## Notes

- The `effectivePriority` function is pure — accepts a row and a `now` timestamp. Makes unit testing trivial.
- Migration includes indexes on `(user_id, base_priority DESC)` and `(user_id, added_at DESC)` — covers both query paths (top-N and recent-pool).
- The injector is `priority: 0.75` — lands after character identity (1.0) and quest conditions (0.9), before conversation-end detector (0.8). Placement matters: Iris reads the persona first, then the practice rules.
- `@acp.proceed --yolo` workflow: no worktrees, single coherent feature, ~200 LoC across 5 files. Good candidate for "direct implementation" rather than the stacked-worktree pattern.
