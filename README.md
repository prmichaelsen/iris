# Iris

Bilingual voice chat for language learning — Claude + ElevenLabs streaming over WebSocket.

> Built with [Agent Context Protocol](https://github.com/prmichaelsen/agent-context-protocol)

## What it does

Iris is a real-time voice tutor that holds a natural conversation in two languages at once (initial target: German + English). You speak in either language; Iris hears, understands, and replies — code-switching mid-sentence the way a fluent bilingual speaker does. The streaming experience matches the Claude iOS app: token-by-token audio playback, no page reloads, low perceived latency.

Named for **Iris**, the Greek messenger goddess who carried words between worlds on a rainbow bridge.

## Gamification System

Iris includes a comprehensive gamification and engagement system (M9 Foundation complete):

- **Progress Tracking**: XP, levels, multi-signal mastery calculation
- **Quest System**: 6-tier badge progression (Grey → Platinum), core/achievement/streak quests
- **Point Economy**: Dual-path voice unlocks (complete region OR purchase with points)
- **Map Progression**: 8 German regions (Berlin → Bavaria → Hamburg → Rhine Valley → Black Forest → Saxony → Austria/Switzerland)
- **Character Relationships**: 9 unique characters with adaptive difficulty and mini-games
- **Pen Pal System**: 8 regional pen pals with themed collectibles and adaptive letter frequency
- **Photo Collection**: AI-generated photorealistic images (Fotos) with German/English captions
- **Iris Meta-Layer**: Proactive quest suggestions, conversation help, post-conversation coaching

See `agent/design/local.gamification-engagement-system.md` for complete design and `agent/specs/local.gamification-engagement-system.md` for implementation requirements.

## Stack

- **Frontend**: TanStack Start (React) on Cloudflare Workers
- **Realtime**: Cloudflare Durable Objects WebSocket relay
- **STT**: streaming speech-to-text (Deepgram or Whisper)
- **LLM**: Anthropic Claude Sonnet 4.6 streaming
- **TTS**: ElevenLabs multilingual v2 streaming
- **Auth**: Firebase (anonymous sessions for hackathon)
- **Database**: Cloudflare D1 (SQLite) for gamification state
- **API**: OpenAPI 3.0+ specification with generated TypeScript types

## Quick Start

```bash
cd ~/.acp/projects/iris
npm install
npm run dev
# open http://localhost:5173
```

Hold the button (or hold Space) to talk. Release to send. Try mixing German and English.

API keys go in `.env.local`:

```
ANTHROPIC_API_KEY=...
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=pNInz6obpgDQGcFmaJgB   # optional — Adam (multilingual)
```

## Architecture (POC)

```
Browser (React + Vite)
   │  hold-to-talk → MediaRecorder → audio/webm Blob
   │  WebSocket /api/voice  ↓
   ▼
Node server (Express + ws)
   │  → ElevenLabs Scribe (STT)            text
   │  → Claude Opus 4.7 (streaming)        text deltas → client live transcript
   │  → ElevenLabs TTS (HTTP streaming)    mp3 chunks → client audio queue
   ▼
Browser plays mp3 once stream completes
```

Single Claude session with a bilingual system prompt. ElevenLabs `eleven_multilingual_v2` handles German + English natively in one synthesis call. STT is push-to-talk (whole utterance), not real-time.

## OpenAPI Usage

Iris uses OpenAPI 3.0+ for all gamification API endpoints:

### Validate Spec

```bash
openapi-generator-cli validate -i openapi.yaml
```

### Generate TypeScript Types

```bash
# Generate client types
openapi-generator-cli generate -i openapi.yaml -g typescript-fetch -o generated/client

# Generate server stubs
openapi-generator-cli generate -i openapi.yaml -g typescript-node -o generated/server
```

### Update Spec

When adding new endpoints:
1. Update `openapi.yaml` with new endpoint definition
2. Define request/response schemas
3. Document error codes (400, 404, 409, 422)
4. Regenerate TypeScript types
5. Implement endpoint handler using generated types
6. Write tests covering all documented behaviors

**OpenAPI is the single source of truth** for API contracts. All endpoint implementations must match the spec.

## MCP Tools

Iris provides Model Context Protocol (MCP) tools for Claude to interact with the gamification system:

### `set_context`

Set user's current location and character context.

```typescript
set_context(user_id: string, location: string, character_id?: string)
```

**Example**:
```
User: "I want to visit Karl's bakery in Berlin"
Claude calls: set_context(user_id="user123", location="berlin", character_id="karl")
Response: { "success": true, "character": "Karl der Bäcker", "location": "Berlin" }
Claude: "You're now at Karl's bakery in Berlin!"
```

### `view_progress`

View user's progress, XP, level, badges, and active quests.

```typescript
view_progress(user_id: string)
```

**Example**:
```
User: "Can you check my progress?"
Claude calls: view_progress(user_id="user123")
Response: {
  "level": 5,
  "xp_current": 2450,
  "xp_to_next_level": 3000,
  "badges": [
    { "skill": "flashcard", "tier": "bronze", "progress": 45 },
    { "skill": "dictation", "tier": "grey", "progress": 8 }
  ],
  "active_quests": [
    { "name": "Complete 5 exercises", "progress": 3, "total": 5 }
  ]
}
Claude: "You're level 5 with 2,450 XP (550 away from level 6). You have a Bronze flashcard badge and you're 3/5 on today's quest!"
```

### `debug_state`

Debug tool for inspecting gamification state (development only).

```typescript
debug_state(user_id: string, scope?: string)
```

**Scopes**: `progress`, `quests`, `badges`, `points`, `relationships`, `pen_pals`, `all`

### `talk_to_character`

Initiate conversation with character and grade via Claude API.

```typescript
talk_to_character(user_id: string, character_id: string, transcript: string, response_times: number[])
```

**Example**:
```typescript
talk_to_character(
  user_id="user123",
  character_id="karl",
  transcript="User: Guten Tag!\nKarl: Was möchtest du?\nUser: Ein Roggenbrot, bitte.",
  response_times=[4, 6]
)
```

Returns conversation grade (7 metrics), overall score, relationship delta, and relationship total.

## Database Migrations

Iris uses Cloudflare D1 (SQLite) for gamification state. Migrations are stored in `db/migrations/`.

### Create Database

```bash
# Production
wrangler d1 create iris-prod

# Development
wrangler d1 create iris-dev

# Testing
wrangler d1 create iris-test
```

### Run Migrations

```bash
# Run single migration
wrangler d1 execute iris-dev --file=db/migrations/001_initial_gamification.sql

# Run all migrations
for file in db/migrations/*.sql; do
  echo "Running $file..."
  wrangler d1 execute iris-dev --file="$file"
done
```

### Query Database

```bash
# View user progress
wrangler d1 execute iris-dev --command="SELECT * FROM user_progress WHERE user_id='user123'"

# List tables
wrangler d1 execute iris-dev --command="SELECT name FROM sqlite_master WHERE type='table';"

# Count records
wrangler d1 execute iris-dev --command="SELECT COUNT(*) FROM user_progress"
```

### Schema Documentation

See `db/README.md` (pending) for complete schema documentation, relationships, and query examples.

### Migration Testing

**Always test migrations before production deploy:**

```bash
# 1. Create test database
wrangler d1 create iris-migration-test

# 2. Run all migrations
for file in db/migrations/*.sql; do
  wrangler d1 execute iris-migration-test --file="$file"
done

# 3. Verify schema
wrangler d1 execute iris-migration-test --command="SELECT name FROM sqlite_master WHERE type='table';"

# 4. Test sample queries
wrangler d1 execute iris-migration-test --file=db/test-queries.sql

# 5. Drop test database
wrangler d1 delete iris-migration-test
```

## Testing

Iris uses Test-Driven Development (TDD): write tests first, then implement features.

### Run Tests

```bash
# Run all tests
npm test

# Watch mode (run on file change)
npm test -- --watch

# Coverage report
npm test -- --coverage

# Run specific test file
npm test -- gamification/progress.test.ts
```

### Testing Strategy

See `agent/testing/strategy.gamification.md` for comprehensive testing documentation:

- **Unit Tests**: API endpoints, MCP tools, business logic
- **Integration Tests**: D1 queries, OpenAPI validation, cross-system interactions
- **E2E Tests**: Full user journeys via MCP tools and UI
- **Test Coverage**: 80%+ code coverage, 100% requirement coverage (R1-R30)
- **Continuous Testing**: Watch mode during development, pre-commit hooks, CI pipeline

### Pre-Commit Hooks

Tests must pass before commits are allowed:

```bash
# Install Husky
npm install --save-dev husky lint-staged
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

## Development with ACP

- `@acp.init` — load agent context
- `@acp.plan` — plan milestones and tasks
- `@acp.proceed` — implement the next task
- `@acp.status` — check progress

See [AGENT.md](./AGENT.md) for complete ACP documentation.

## Milestones

- **M4**: Interactive Widgets (Complete)
- **M9**: Foundation + UX Design + OpenAPI (Complete)
  - OpenAPI 3.0+ specification for 40+ gamification endpoints
  - UX patterns document for all major surfaces
  - D1 schema design and migrations
  - Base MCP tools (set_context, view_progress, debug_state)
  - Visual design system (badge tiers, chrome effects)
  - Testing strategy document (TDD workflow, test case structure)
- **M10**: Berlin Vertical Slice - Karl + Mila (Next)
  - Implement Karl's conversation system with Claude grading
  - Implement Mila's pen pal system with adaptive letters
  - Test full vertical slice via MCP tools before UI implementation

## License

MIT

## Author

Patrick Michaelsen
