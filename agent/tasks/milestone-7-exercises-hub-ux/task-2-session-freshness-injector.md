# Task 2: Session Freshness Prompt Injector

**Milestone**: M7 - Exercises Hub & UX
**Status**: Not Started
**Estimated Time**: 30-45 minutes
**Dependencies**: None (but benefits from Task 3 pinned items for richer suggestions)
**Design Reference**: None

---

## Objective

Inject a factual context line into Iris's system prompt describing how long it's been since the user's last message. Let Iris use that signal to greet returning users, offer direction on fresh sessions, and continue naturally mid-conversation — all without hardcoded heuristics.

---

## Context

Currently Iris behaves the same whether the user just replied 30 seconds ago or returned after 8 hours. Users returning to a session want a gentle re-entry ("Hallo again! Wollen wir weiter üben?") rather than Iris continuing mid-thought.

Rather than detecting engagement with fragile heuristics (reply length, word counts), we expose a single factual signal — minutes since last user message — and trust Claude to interpret it. This follows the same principle as the character-switching prompt injection framework: factual context in, natural behavior out.

---

## Key Design Decisions

### DD-1: Factual Signal, Not Interpretation
- **Decision**: Inject raw minutes-since-last-message plus a bucket label ("fresh session", "resumed", "mid-conversation"). Don't tell Iris what to *do* about it.
- **Why**: Heuristic rules ("3 short replies = offer quest") are brittle. Claude's already capable of reading conversation tone — give her the one piece of info she can't derive from history (elapsed time) and let her decide.

### DD-2: Bucket Thresholds
- **Fresh session**: > 4 hours — treat as re-entry, greet warmly, offer direction
- **Resumed**: 30 minutes – 4 hours — brief check-in, may offer direction
- **Mid-conversation**: < 30 minutes — no injection (default continuation)
- **Why**: Three buckets cover the distinct UX states without over-segmenting. Injecting nothing for mid-conversation avoids prompt bloat on every turn.

### DD-3: Include Hint, Not Command
- **Decision**: Phrase as "consider greeting and offering direction" — advisory, not mandatory.
- **Why**: Overly prescriptive prompts make Iris robotic. She may have good reason to skip the greeting (e.g., user's first message is a specific question).

### DD-4: Data Source
- **Decision**: Query `messages` table for the most recent user message in the current conversation, compute `now - created_at`.
- **Why**: We already persist messages. No new storage needed. One cheap SELECT per turn at prompt-build time.

---

## Steps

### Step 1: Create the Injector

Create `worker/prompt-injectors/injectors/session-freshness.ts`:

```typescript
import type { PromptInjector, PromptInjectorContext, PromptInjectorResult } from '../types'

const FRESH_SESSION_THRESHOLD_MIN = 240  // 4 hours
const RESUMED_SESSION_THRESHOLD_MIN = 30

export class SessionFreshnessInjector implements PromptInjector {
  readonly id = 'session-freshness'
  readonly name = 'Session Freshness'
  readonly description = 'Injects elapsed time since last user message to cue re-entry behavior'
  readonly enabledByDefault = true

  canInject(context: PromptInjectorContext): boolean {
    return !!context.db && !!context.userId
  }

  async inject(context: PromptInjectorContext): Promise<PromptInjectorResult | null> {
    const { db, userId } = context
    if (!db || !userId) return null

    // Find the last user message across all conversations for this user.
    // Scope to current conversation if available; fall back to user-wide.
    const row = await db
      .prepare(`
        SELECT created_at FROM messages
        WHERE user_id = ? AND role = 'user'
        ORDER BY created_at DESC
        LIMIT 1
      `)
      .bind(userId)
      .first<{ created_at: number }>()

    if (!row) return null

    const now = Math.floor(Date.now() / 1000)
    const minutesSince = Math.floor((now - row.created_at) / 60)

    // Skip injection for mid-conversation (< 30min)
    if (minutesSince < RESUMED_SESSION_THRESHOLD_MIN) return null

    const bucket = minutesSince >= FRESH_SESSION_THRESHOLD_MIN
      ? 'fresh session'
      : 'resumed session'

    const humanTime = formatElapsed(minutesSince)
    const hint = bucket === 'fresh session'
      ? 'Consider greeting the user and offering direction (a study word, a pinned item, or a quest).'
      : 'Consider a brief re-entry — acknowledge returning and continue naturally.'

    return {
      content: `## Session Context

- Time since last user message: **${humanTime}** (${bucket})
- ${hint}`,
      priority: 0.95, // early in prompt, right after character identity
      title: 'Session Context',
      required: false,
    }
  }
}

function formatElapsed(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  const remainingMin = minutes % 60
  if (hours < 24) return remainingMin > 0 ? `${hours}h ${remainingMin}min` : `${hours}h`
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
}
```

### Step 2: Register the Injector

Update `worker/prompt-injectors/injectors/index.ts`:

```typescript
export { SessionFreshnessInjector } from './session-freshness'
```

Update `worker/prompt-injectors/index.ts`:

```typescript
import { SessionFreshnessInjector } from './injectors'
registerInjector(new SessionFreshnessInjector())
```

### Step 3: Add Proactive-Suggestion Nudge to BASE_PROMPT

In `worker/index.ts`, BASE_PROMPT additions:

```
- If conversation slows, the user seems unsure what to do next, or you detect a fresh session, proactively offer direction: a study list word to practice, a pinned sentence or concept, a quest with a character, or just a conversational prompt. Don't push — one gentle offer, then follow the user's lead.
```

### Step 4: Test

Create `tests/prompt-injectors/session-freshness.test.ts`:

```typescript
describe('SessionFreshnessInjector', () => {
  it('skips injection when last message is < 30 minutes old')
  it('injects "resumed session" bucket at 30min-4h')
  it('injects "fresh session" bucket at > 4h')
  it('returns null when user has no messages yet')
  it('formats elapsed time correctly (45min, 2h 14min, 3d)')
})
```

---

## Expected Output

### Files Created
- `worker/prompt-injectors/injectors/session-freshness.ts`
- `tests/prompt-injectors/session-freshness.test.ts`

### Files Modified
- `worker/prompt-injectors/injectors/index.ts` — export new injector
- `worker/prompt-injectors/index.ts` — register new injector
- `worker/index.ts` — BASE_PROMPT proactive-suggestion nudge
- `agent/progress.yaml` — mark task complete

---

## Verification Checklist

- [ ] Injector only fires when user has ≥1 prior message
- [ ] Returns null (no injection) for messages < 30 minutes old
- [ ] Uses "resumed session" label for 30min-4h
- [ ] Uses "fresh session" label for > 4h
- [ ] Human-readable elapsed format: "45min", "2h 14min", "3d"
- [ ] BASE_PROMPT includes proactive-suggestion nudge
- [ ] Unit tests pass
- [ ] Manual browser test: leave tab idle 30+ minutes, refresh, send a message — Iris acknowledges the return
- [ ] Manual browser test: reply quickly (< 30min gap) — Iris continues conversation normally, no greeting re-loop

---

## Non-Goals

- **Intent detection / sub-LLM calls** — deferred; trust Claude to read tone
- **Last-suggestion-time tracking** — add only if users report repeated suggestions
- **Per-conversation scoping** — initial implementation uses user-wide last message; scope to conversation only if needed

---

## Notes

- If users start complaining about repeated greetings, add a `last_greeting_at` column to sessions and include "last greeted N min ago — skip greeting" in the injection.
- The injector runs on every turn but only adds content on 20-30% of them (the ones with enough elapsed time). Negligible cost.
