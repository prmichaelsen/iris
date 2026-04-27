# Gamification Testing Strategy

**Version**: 1.0.0  
**Created**: 2026-04-27  
**Status**: Active  

---

## Overview

**Test-Driven Development (TDD) approach**: Write tests FIRST based on spec requirements, then implement features to pass tests.

Testing approach for gamification system across 3 layers:
1. **Unit**: Individual functions, API endpoints, MCP tools
2. **Integration**: D1 queries, OpenAPI validation, cross-system interactions
3. **E2E**: Full user journeys via MCP tools and UI (when implemented)

---

## TDD Workflow

For every feature implementation (M10+):

1. **Read spec requirement** (e.g., R1: Progress Tracking)
2. **Read spec test cases** (e.g., first-drill-completion, xp-award-calculation)
3. **Write test code** matching Given/When/Then structure
4. **Run test** (expect failure - feature not implemented yet)
5. **Implement feature** (minimal code to pass test)
6. **Run test** (expect pass)
7. **Refactor** (improve code quality while keeping tests green)
8. **Commit** (test + implementation together)

**Benefits:**
- Catch regressions immediately (test suite runs on every change)
- Validate state changes as features evolve
- Ensure spec compliance (tests encode requirements)
- Prevent accidental breakage of working features
- Document expected behavior via executable tests

---

## Unit Testing

### API Endpoints

Test each OpenAPI endpoint in isolation:
- Mock D1 database responses
- Validate request/response schemas
- Test error conditions (400, 404, 409, 422)
- Verify authentication requirements
- Test authorization rules

**Example Test Structure:**

```typescript
describe('POST /api/progress/xp', () => {
  it('should award XP for drill completion', async () => {
    // Given
    const userId = 'user123';
    const mockUser = { id: userId, level: 5, xp: 2450 };
    mockD1.prepare().bind().first.mockResolvedValue(mockUser);
    
    // When
    const response = await request(app)
      .post('/api/progress/xp')
      .send({ user_id: userId, xp_amount: 35, source: 'drill_completion' });
    
    // Then
    expect(response.status).toBe(200);
    expect(response.body.xp_total).toBe(2485);
    expect(response.body.level).toBe(5);
  });
  
  it('should trigger level up when XP threshold crossed', async () => {
    // Given: User at 2990 XP (10 away from level 6)
    const mockUser = { id: 'user123', level: 5, xp: 2990 };
    mockD1.prepare().bind().first.mockResolvedValue(mockUser);
    
    // When: Award 20 XP
    const response = await request(app)
      .post('/api/progress/xp')
      .send({ user_id: 'user123', xp_amount: 20, source: 'drill_completion' });
    
    // Then
    expect(response.body.level).toBe(6); // level-increased
    expect(response.body.xp_current).toBe(10); // xp-reset (overflow)
    expect(response.body.level_up_triggered).toBe(true); // animation-played
  });
  
  it('should return 404 if user not found', async () => {
    mockD1.prepare().bind().first.mockResolvedValue(null);
    
    const response = await request(app)
      .post('/api/progress/xp')
      .send({ user_id: 'nonexistent', xp_amount: 10, source: 'drill' });
    
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('User not found');
  });
});
```

### MCP Tools

Test `set_context`, `view_progress`, `debug_state`:
- Validate parameter schemas
- Test error handling
- Mock backend responses
- Verify tool output format

**Example Test Structure:**

```typescript
describe('view_progress MCP tool', () => {
  it('should return user progress data', async () => {
    // Given
    const mockProgress = {
      level: 5,
      xp_current: 2450,
      xp_to_next_level: 3000,
      badges: [
        { skill: 'flashcard', tier: 'bronze', progress: 45 },
        { skill: 'dictation', tier: 'grey', progress: 8 }
      ],
      active_quests: [
        { name: 'Complete 5 exercises', progress: 3, total: 5 }
      ]
    };
    
    // When
    const result = await viewProgressTool.execute({ user_id: 'user123' });
    
    // Then
    expect(result.content).toMatchObject([
      {
        type: 'text',
        text: expect.stringContaining('Level 5')
      }
    ]);
  });
});
```

### Business Logic Functions

Test pure functions in isolation:
- Mastery calculation (multi-signal formula)
- XP award calculation (base + bonuses)
- Badge tier progression logic
- Letter frequency calculation
- Relationship score deltas

**Example Test Structure:**

```typescript
describe('calculateMastery', () => {
  it('should compute mastery from multiple signals', () => {
    // Given (from spec test: mastery-improvement)
    const signals = {
      accuracy_rate: 0.85,        // 35% weight
      consistency_score: 0.75,    // 25% weight
      retention_strength: 0.90,   // 20% weight
      speed_fluency: 0.60,        // 10% weight
      context_breadth: 0.70       // 10% weight
    };
    const recency_decay = 0.95;
    const trend_multiplier = 1.1;
    
    // When
    const mastery = calculateMastery(signals, recency_decay, trend_multiplier);
    
    // Then
    const raw = (0.85 * 0.35) + (0.75 * 0.25) + (0.90 * 0.20) + (0.60 * 0.10) + (0.70 * 0.10);
    const expected = raw * recency_decay * trend_multiplier;
    expect(mastery).toBeCloseTo(expected, 2);
  });
  
  it('should floor mastery at 0 (never negative)', () => {
    const signals = { accuracy_rate: 0, consistency_score: 0, retention_strength: 0, speed_fluency: 0, context_breadth: 0 };
    const mastery = calculateMastery(signals, 0.5, 0.5);
    expect(mastery).toBe(0); // mastery-zero-floor
  });
});
```

---

## Integration Testing

### D1 Schema

Test database operations:
- Migrations run successfully
- Foreign key constraints enforced
- JSON column queries work correctly
- Indexes improve query performance
- Transaction isolation

**Example Test Structure:**

```typescript
describe('D1 Schema: user_progress', () => {
  beforeEach(async () => {
    await runMigrations(testDb);
  });
  
  it('should create user_progress record', async () => {
    const result = await testDb
      .prepare('INSERT INTO user_progress (user_id, level, xp) VALUES (?, ?, ?)')
      .bind('user123', 1, 0)
      .run();
    
    expect(result.success).toBe(true);
  });
  
  it('should enforce foreign key to users table', async () => {
    await expect(async () => {
      await testDb
        .prepare('INSERT INTO user_progress (user_id, level, xp) VALUES (?, ?, ?)')
        .bind('nonexistent', 1, 0)
        .run();
    }).rejects.toThrow('FOREIGN KEY constraint failed');
  });
  
  it('should query JSON mastery_signals column', async () => {
    await testDb
      .prepare('INSERT INTO vocab_mastery (user_id, word, mastery_signals) VALUES (?, ?, ?)')
      .bind('user123', 'Brot', JSON.stringify({ accuracy_rate: 0.85, consistency_score: 0.75 }))
      .run();
    
    const result = await testDb
      .prepare('SELECT mastery_signals FROM vocab_mastery WHERE word = ?')
      .bind('Brot')
      .first();
    
    const signals = JSON.parse(result.mastery_signals);
    expect(signals.accuracy_rate).toBe(0.85);
  });
});
```

### OpenAPI Validation

Validate spec and generated code:
- Spec passes `openapi-generator-cli validate`
- Generated TypeScript types match spec
- Endpoint implementations match spec
- Error response schemas validated

**Example Test Structure:**

```bash
# Validate spec
openapi-generator-cli validate -i openapi.yaml

# Generate TypeScript client
openapi-generator-cli generate -i openapi.yaml -g typescript-fetch -o generated/client

# Run type checking
tsc --noEmit --project tsconfig.json
```

```typescript
describe('OpenAPI Generated Types', () => {
  it('should match UserProgress schema', () => {
    const progress: UserProgress = {
      user_id: 'user123',
      level: 5,
      xp_current: 2450,
      xp_to_next_level: 3000,
      badges: [],
      active_quests: []
    };
    
    // TypeScript compiler verifies this at compile time
    expect(progress.level).toBe(5);
  });
});
```

### Cross-System

Test feature interactions:
- Drill completion → XP award → quest progress
- Quest completion → badge unlock → point award
- Region completion → voice unlock + next region unlock
- Character conversation → Claude grading → relationship update

**Example Test Structure:**

```typescript
describe('Cross-System: Drill to Quest Progress', () => {
  it('should update quest progress when drill completes', async () => {
    // Given: User has active quest "Complete 5 exercises" (4/5)
    await testDb.prepare('INSERT INTO user_quests (user_id, quest_id, progress) VALUES (?, ?, ?)').bind('user123', 'daily-5-drills', 4).run();
    
    // When: User completes drill
    await completeDrill({ user_id: 'user123', drill_type: 'flashcard', accuracy: 0.8 });
    
    // Then: Quest progress updated
    const quest = await testDb.prepare('SELECT progress FROM user_quests WHERE user_id = ? AND quest_id = ?').bind('user123', 'daily-5-drills').first();
    expect(quest.progress).toBe(5);
    
    // And: Quest marked complete
    const questStatus = await testDb.prepare('SELECT status FROM user_quests WHERE user_id = ? AND quest_id = ?').bind('user123', 'daily-5-drills').first();
    expect(questStatus.status).toBe('completed');
    
    // And: Points awarded
    const points = await testDb.prepare('SELECT balance FROM user_points WHERE user_id = ?').bind('user123').first();
    expect(points.balance).toBeGreaterThanOrEqual(50);
  });
});
```

---

## E2E Testing

### Vertical Slice: Karl (M10)

**Scenario**: User's first encounter with Karl through master test

#### Test: Karl First Visit

**Given**:
- User is level 5, no Karl relationship yet
- "Erste Bestellung" quest available in Tier 1 Berlin quests

**When**: User starts Karl quest

**Then** (assertions):
- **context-set**: MCP tool `set_context(user_id, location="berlin", character_id="karl")` succeeds
- **character-loaded**: Karl's personality and specialty loaded (speed/impatience, 5s timer)
- **conversation-started**: Voice conversation begins
- **timer-visible**: 5-second countdown timer displayed per response

**MCP Tool Interaction:**
```
User: "Can you set my context to Karl's bakery in Berlin?"

Claude calls:
set_context(user_id="user123", location="berlin", character_id="karl")

Response: { "success": true, "character": "Karl der Bäcker", "location": "Berlin", "timer": 5 }

Claude: "You're now at Karl's bakery in Berlin. He's busy, so you have 5 seconds per response!"
```

#### Test: Karl Conversation Grading

**Given**:
- User in conversation with Karl
- Transcript: 3 exchanges, response times [4s, 6s, 3s]

**When**: Conversation ends, Claude grades via API

**Then** (assertions from spec test: karl-perfect-conversation):
- **claude-api-called**: Conversation transcript sent to Claude API
- **metrics-received**: 7 grading metrics returned (comprehension: 9, fluency: 10, grammar: 8, vocabulary: 9, pronunciation: 8, confidence: 9, cultural_awareness: 7)
- **weights-applied**: Karl's weights applied (fluency 25%, comprehension 20%, vocabulary 15%, confidence 15%, grammar 10%, pronunciation 10%, cultural 5%)
- **overall-score**: Overall score = 8.85/10
- **relationship-delta**: +8 relationship points (excellent tier: 8-8.9)
- **relationship-updated**: Karl relationship now 38/100 (was 30)

**MCP Tool Testing:**
```typescript
describe('talk_to_character MCP tool', () => {
  it('should grade conversation and update relationship', async () => {
    // Given
    mockClaudeAPI.post('/v1/messages').mockResolvedValue({
      data: {
        content: [{ text: JSON.stringify({
          comprehension: 9, fluency: 10, grammar: 8, vocabulary: 9,
          pronunciation: 8, confidence: 9, cultural_awareness: 7
        })}]
      }
    });
    
    // When
    const result = await talkToCharacterTool.execute({
      user_id: 'user123',
      character_id: 'karl',
      transcript: 'User: Guten Tag! Ich möchte ein Brot.\nKarl: Welches Brot?\nUser: Ein Roggenbrot, bitte.',
      response_times: [4, 6, 3]
    });
    
    // Then
    expect(result.overall_score).toBeCloseTo(8.85, 2);
    expect(result.relationship_delta).toBe(8);
    expect(result.relationship_total).toBe(38);
  });
});
```

#### Test: Karl Regional Discovery Quest

**Given** (from spec test: karl-bavarian-bread-conversation):
- User completed Bavaria region
- Karl relationship is 45/100
- Iris suggests: "You learned about Brezel! Return to Karl."

**When**: User returns to Karl's bakery

**Then**:
- **progress-recognized**: Karl's dialogue includes "Du warst in Bayern, oder?"
- **cultural-bonus**: +10 relationship points awarded
- **relationship-updated**: Karl relationship now 55/100
- **new-dialogue-unlocked**: Bavaria bread dialogue tree available

**MCP Tool Testing:**
```
User: "I want to visit Karl again after learning about Bavarian bread"

Claude calls:
set_context(user_id="user123", location="berlin", character_id="karl")

Response: {
  "success": true,
  "character_progress_recognized": true,
  "new_content_available": ["bavarian_bread_dialogue"],
  "greeting": "Du warst in Bayern, oder? Hast du Brezel probiert?"
}

Claude: "Karl recognized that you learned about Bavarian bread! He's impressed. You can talk to him about Brezeln now."
```

#### Test: Karl Master Test

**Given** (from spec test: karl-master-test-unlock):
- All main regions complete
- Karl relationship ≥ 90

**When**: "Meisterprüfung" quest appears

**Then**:
- **quest-visible**: Master test quest appears in quest list
- **requirement-met**: Quest shows "Requirements: ✓ All regions, ✓ Relationship 90+"

**Master Test Execution** (from spec test: karl-master-test-success):

**Given**: User starts master test

**When**: Karl asks "Was ist das beste Brot in Deutschland?"

**Then**:
- **correct-answer-accepted**: Answers like "Es kommt darauf an" or "Jede Region hat ihre Spezialität" accepted
- **wrong-answer-rejected**: Answers like "Ihr Brot!" or "Bayerisches Brot!" rejected
- **relationship-maxed**: Correct answer → relationship = 100
- **badge-unlocked**: "Karl's Apprentice" badge awarded
- **mini-game-unlocked**: Bread-making mini-game available

### Vertical Slice: Mila (M10)

**Scenario**: User unlocks pen pal and receives first letter with collectible

#### Test: Mila Unlock

**Given** (from spec test: pen-pal-unlock):
- User completed Tier 2 Berlin regional quest

**When**: Quest completion triggers

**Then**:
- **pen-pal-created**: Mila record created in database
- **first-letter-scheduled**: Letter scheduled for delivery within 24 hours
- **profile-visible**: Mila's profile (name: "Mila", age: 22, personality: "street artist", profession: "graffiti artist") visible
- **notification-shown**: "You've unlocked a pen pal: Mila!" notification

#### Test: Letter Exchange

**Given** (from spec test: pen-pal-gift-delivery):
- Mila sends letter with sticker gift

**When**: User opens letter

**Then**:
- **letter-visible**: German text displayed
- **translation-toggle**: English translation available via toggle
- **gift-revealed**: Hand-drawn sticker card shown with message "Hier ist ein Sticker von meiner neuesten Wand!"
- **collectible-added**: Sticker added to "Mila's Stickers" collection
- **read-marked**: Letter marked as read
- **attention-updated**: `last_interaction_at` updated

#### Test: Adaptive Letter Frequency

**Given** (from spec test: pen-pal-attention-increase):
- Mila sent 2 letters, user replied to both
- Attention score: (2 letters_sent × 3) + (2 letters_read × 1) = 8
- Previous frequency: 1/14 days (score <10)

**When**: User replies to 3rd letter

**Then**:
- **attention-increased**: Score = (3 × 3) + (3 × 1) = 12
- **frequency-increased**: New frequency tier: 1/7-10 days (score 10-30)
- **next-letter-scheduled**: Next letter scheduled in 7-10 days
- **priority-updated**: Mila's priority score recalculated

**Given** (from spec test: max-letters-per-week-enforcement):
- User has 3 pen pals: Mila, Thomas, Lena
- All have high attention scores
- 3 letters already sent this week

**When**: 4th pen pal wants to send letter

**Then**:
- **cap-enforced**: Letter delayed until next week
- **priority-used**: Highest attention score pen pal gets slot
- **notification-sent**: "Mila will write to you next week!"

### Full User Journey

**Scenario**: Signup → region completion

#### Phase 1: Account Creation & First Drill

**Given**: New user signs up

**When**: User completes account creation

**Then**:
- **user-created**: User record in database
- **progress-initialized**: `user_progress` record (level: 1, xp: 0)
- **berlin-unlocked**: Berlin region unlocked by default
- **tier1-quests-visible**: Tier 1 Berlin quests visible

**When**: User completes first flashcard drill (80% accuracy)

**Then** (from spec test: first-drill-completion):
- **xp-awarded**: 10 XP added
- **progress-bar-updated**: XP bar shows 10/1000
- **no-level-up**: Level remains 1
- **quest-progress**: Daily quest "Complete 5 exercises" shows 1/5

#### Phase 2: Level Up

**Given**: User at level 5 with 2990 XP

**When**: User completes drill earning 20 XP

**Then** (from spec test: level-up-trigger):
- **level-increased**: Level now 6
- **xp-overflow**: XP now 10 (3010 - 3000)
- **animation-triggered**: Level-up animation plays
- **notification**: "Level 6!" notification shown

#### Phase 3: Badge Unlock

**Given**: User completed 9 flashcard drills

**When**: User completes 10th flashcard drill

**Then** (from spec test: badge-unlock-tier-1):
- **badge-created**: "Der Meister" Bronze badge in inventory
- **notification**: Badge unlock notification
- **progress-tracked**: Badge progress 10/50 toward Silver

#### Phase 4: Quest Completion

**Given**: Daily quest "Complete 5 exercises" at 4/5

**When**: User completes 5th exercise

**Then** (from spec test: daily-quest-completion):
- **quest-complete**: Quest status = completed
- **points-awarded**: 50 points added
- **quest-removed**: Quest removed from active list
- **new-quest-generated**: New daily quest for tomorrow

#### Phase 5: Region Completion

**Given**: User completed all required Berlin subquests

**When**: Region completion triggers

**Then** (from spec test: region-completion-rewards):
- **voice-unlocked**: Berliner accent voice available (free)
- **points-awarded**: 500 points added
- **next-region-unlocked**: Bavaria appears on map
- **animation**: Celebration animation plays

---

## Test Coverage Tracking

Map each spec requirement to test cases:

| Requirement | Description | Test Cases | Status |
|-------------|-------------|------------|--------|
| R1 | Progress Tracking | first-drill-completion, xp-award-calculation, level-up-trigger, xp-overflow-on-level-up, concurrent-xp-updates, xp-integer-overflow | Pending |
| R2 | Mastery Calculation | mastery-improvement, mastery-decay, mastery-at-boundary-values, mastery-zero-floor | Pending |
| R3 | Quest System | badge-unlock-tier-1, daily-quest-completion, simultaneous-quest-completion, concurrent-quest-progress | Pending |
| R4 | Badge Tier Progression | badge-tier-progression, multiple-badge-tiers-same-session | Pending |
| R5 | Point Economy | first-drill-completion, xp-award-calculation, daily-quest-completion, voice-purchase-with-points, insufficient-points-for-voice, loot-box-opening, loot-box-insufficient-points, negative-points-prevention | Pending |
| R6 | Dual-Path Voice Unlocks | region-completion-rewards, voice-purchase-with-points, insufficient-points-for-voice, region-unlock-without-voice-purchase | Pending |
| R7 | Sequential Map Progression | sequential-region-enforcement, region-completion-rewards, region-unlock-without-voice-purchase | Pending |
| R8 | Photo Collection | foto-unlock-on-subquest, foto-generation-failure, foto-duplicate-unlock-attempt | Pending |
| R9 | Gated Subquests | gated-subquest-requirement | Pending |
| R10 | Pen Pal System | pen-pal-unlock, pen-pal-unlock-duplicate, maximum-pen-pals-unlocked | Pending |
| R11 | Themed Collectibles | pen-pal-gift-delivery, collectible-duplicate-gift | Pending |
| R12 | Adaptive Letter Frequency | pen-pal-attention-decay, pen-pal-attention-increase, max-letters-per-week-enforcement, dormant-user-letter-pause, pen-pal-priority-scheduling, pen-pal-letter-collision, letter-frequency-daily-cap, empty-pen-pal-attention-score | Pending |
| R13 | Character Revisit System | character-recognizes-improvement, character-suggests-drill, contextual-drill-launch, character-revisit-same-day | Pending |
| R14 | Character Memory | character-recognizes-improvement, character-suggests-drill, character-memory-first-visit, character-revisit-same-day, character-interaction-history-limit | Pending |
| R15 | Character Relationship System | karl-first-visit, karl-timeout-failure, karl-bavarian-bread-conversation, karl-master-test-unlock, character-relationship-at-boundaries, character-relationship-zero-floor, henrik-vocabulary-progression, lena-slang-progression, character-adaptive-difficulty | Pending |
| R15a | Karl's Multi-Region Arc | karl-first-visit, karl-bavarian-bread-conversation | Pending |
| R16 | Fast Relationship Progression | karl-perfect-conversation, karl-slow-conversation, karl-relationship-tier-boundary | Pending |
| R17 | Claude Conversation Grading | karl-perfect-conversation, karl-slow-conversation, claude-grading-timeout, claude-grading-malformed-response | Pending |
| R18 | Character-Specific Grading Weights | karl-perfect-conversation, karl-slow-conversation | Pending |
| R18a | Adaptive Character Difficulty | henrik-vocabulary-progression, lena-slang-progression, character-adaptive-difficulty | Pending |
| R18b | OpenAPI Specification Required | (All API endpoint tests) | Pending |
| R19 | Iris Meta-Layer | iris-proactive-speed-suggestion, help-translation-hint | Pending |
| R20 | Contextual Help System | help-translation-hint, excessive-help-usage | Pending |
| R21 | Proactive Quest Suggestions | iris-suggests-karl-revisit, iris-proactive-speed-suggestion, iris-content-triggered-suggestion, iris-suggestion-spam-prevention | Pending |
| R22 | Content-Triggered Revisits | iris-suggests-karl-revisit, iris-content-triggered-suggestion | Pending |
| R23 | Cross-Referencing | karl-bavarian-bread-conversation, pen-pal-cross-reference, pen-pal-priority-scheduling | Pending |
| R24 | Loot Box System | loot-box-opening, loot-box-insufficient-points, loot-box-rarity-distribution-over-1000-opens | Pending |
| R25 | Chat Buddy System | chat-buddy-activation | Pending |
| R26 | Special Event Quests | seasonal-quest-activation, time-zone-midnight-boundary, seasonal-quest-year-boundary | Pending |
| R27 | Adaptive Quest Language | tier-1-quest-language, tier-3-quest-language | Pending |
| R30 | Letter Frequency Caps | max-letters-per-week-enforcement, dormant-user-letter-pause, letter-frequency-daily-cap, quiet-hours-enforcement | Pending |

**Target**: 100% of R1-R30 covered by at least one test case.

**Coverage Metrics**:
- **Requirement Coverage**: 30/30 requirements (100%)
- **Test Cases**: 70+ test cases from spec
- **Code Coverage Target**: 80%+ line coverage

---

## Testing Tools

### OpenAPI Validation
```bash
# Validate spec structure
openapi-generator-cli validate -i openapi.yaml

# Generate TypeScript client
openapi-generator-cli generate -i openapi.yaml -g typescript-fetch -o generated/client

# Generate server stubs
openapi-generator-cli generate -i openapi.yaml -g typescript-node -o generated/server
```

### D1 Testing
```bash
# Create test database
wrangler d1 create iris-test

# Run migrations
wrangler d1 execute iris-test --file=db/migrations/001_initial_gamification.sql
wrangler d1 execute iris-test --file=db/migrations/002_character_system.sql

# Query test data
wrangler d1 execute iris-test --command="SELECT * FROM user_progress WHERE user_id='test123'"

# Reset test database
wrangler d1 execute iris-test --command="DROP TABLE user_progress; DROP TABLE user_quests;"
```

### MCP Testing
```bash
# Start MCP server
npm run dev:server

# Test via Claude conversation
# User: "Can you check my progress?"
# Claude calls: view_progress(user_id="user123")
# Verify response structure matches schema

# Test via command line (if MCP CLI available)
mcp-cli call view_progress --user_id=user123
```

### Unit Testing (Vitest)
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

### E2E Testing (Future: Playwright)
```bash
# Run E2E tests (M15+)
npm run test:e2e

# Run specific scenario
npm run test:e2e -- karl-first-visit
```

---

## Continuous Testing

### Watch Mode (Development)

**Setup**: Configure Vitest to watch source files and re-run tests automatically.

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    watch: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80
    }
  }
});
```

**Usage**:
```bash
# Start watch mode during development
npm test -- --watch

# Tests re-run automatically when files change
# Fast feedback loop: write code → save → see test results
```

### Pre-Commit Hook

**Setup**: Use Husky + lint-staged to run tests before commit.

```bash
# Install Husky
npm install --save-dev husky lint-staged

# Initialize Husky
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npx lint-staged"
```

```json
// package.json
{
  "lint-staged": {
    "*.ts": [
      "npm test -- --run --passWithNoTests",
      "eslint --fix"
    ]
  }
}
```

**Behavior**:
- Pre-commit hook runs tests for changed files
- Commit blocked if tests fail
- Forces "tests must pass" discipline
- Prevents broken code from entering repo

### CI Pipeline (GitHub Actions)

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test -- --run --coverage
      - run: npx openapi-generator-cli validate -i openapi.yaml
      - name: D1 Migrations Test
        run: |
          npm install -g wrangler
          wrangler d1 create iris-ci-test
          wrangler d1 execute iris-ci-test --file=db/migrations/*.sql
      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

**Pipeline Steps**:
1. **OpenAPI Validation**: Ensure spec is valid
2. **Unit Tests**: All business logic and API endpoint tests
3. **Integration Tests**: D1 queries and cross-system tests
4. **E2E Scenarios**: Critical user journeys (via MCP tools)
5. **D1 Migrations**: Verify migrations run without errors
6. **Coverage Report**: Upload to Codecov for tracking

**Coverage Tracking**:
- Maintain 80%+ code coverage
- 100% requirement coverage (R1-R30)
- Fail build if coverage drops below threshold

---

## Test Case Structure

All test cases follow the spec's **Given/When/Then** format:

```typescript
describe('Feature: Progress Tracking', () => {
  describe('Scenario: first-drill-completion (covers R1, R5)', () => {
    it('should award XP and update progress bar', async () => {
      // Given: User has never completed a drill
      const user = await createTestUser({ drills_completed: 0, xp: 0, level: 1 });
      
      // When: User completes a flashcard drill with 80% accuracy
      const result = await completeDrill({
        user_id: user.id,
        drill_type: 'flashcard',
        accuracy: 0.80
      });
      
      // Then (assertions):
      // - xp-awarded: 10 XP added to user's total
      expect(result.xp_awarded).toBe(10);
      const updatedUser = await getUser(user.id);
      expect(updatedUser.xp).toBe(10);
      
      // - progress-bar-updated: XP bar shows new value
      expect(result.xp_current).toBe(10);
      expect(result.xp_to_next_level).toBe(1000);
      
      // - no-level-up: Level remains same (not enough XP for level-up)
      expect(updatedUser.level).toBe(1);
      expect(result.level_up_triggered).toBe(false);
    });
  });
});
```

**Assertion Naming**: Use descriptive assertion names from spec test cases (e.g., `xp-awarded`, `progress-bar-updated`, `no-level-up`).

---

## Edge Cases & Error Handling

The spec includes 19 edge case tests (tests 44-62):

- **Boundary Values**: XP overflow, mastery at 0/100, relationship at 0/100
- **Concurrency**: Multiple XP updates, simultaneous quest completions
- **Rate Limits**: Max 3 letters/week, daily letter cap, quiet hours
- **Failures**: Photo generation failure, Claude grading timeout, malformed responses
- **Duplicates**: Duplicate foto unlocks, duplicate pen pal unlocks, duplicate gifts
- **Constraints**: Negative points prevention, XP integer overflow
- **Time Zones**: Midnight boundary for daily quests, seasonal quest year boundary

**Testing Strategy**:
1. Read edge case test from spec
2. Write test case matching Given/When/Then structure
3. Implement defensive code to handle edge case
4. Verify test passes
5. Document edge case behavior in code comments

---

## Migration Testing

### D1 Migration Strategy

**Test migrations before production deploy:**

```bash
# 1. Create test database
wrangler d1 create iris-migration-test

# 2. Run all migrations in sequence
for file in db/migrations/*.sql; do
  echo "Running $file..."
  wrangler d1 execute iris-migration-test --file="$file"
done

# 3. Verify schema
wrangler d1 execute iris-migration-test --command="SELECT name FROM sqlite_master WHERE type='table';"

# 4. Test sample queries
wrangler d1 execute iris-migration-test --file=db/test-queries.sql

# 5. Drop test database
wrangler d1 delete iris-migration-test
```

**Migration Checklist**:
- [ ] Migrations run without errors
- [ ] Foreign keys enforced
- [ ] Indexes created
- [ ] JSON columns queryable
- [ ] No data loss (for schema changes)
- [ ] Rollback script tested

---

## Documentation

### Test Documentation Standards

Each test file should include:

```typescript
/**
 * Test Suite: Progress Tracking
 * 
 * Covers requirements: R1 (Progress Tracking), R5 (Point Economy)
 * 
 * Test cases from spec:
 * - first-drill-completion
 * - xp-award-calculation
 * - level-up-trigger
 * - xp-overflow-on-level-up
 * 
 * Related files:
 * - src/gamification/progress.ts
 * - openapi.yaml (POST /api/progress/xp)
 * - db/migrations/001_initial_gamification.sql (user_progress table)
 */
```

### README Updates

See main README sections:
- "Gamification System" overview
- "Testing" section with command examples
- "OpenAPI Usage" instructions
- "MCP Tools" documentation
- "Migration Instructions" for D1

---

## Next Steps

### M10 Implementation

1. **Read spec requirements** for Karl & Mila features
2. **Read spec test cases** for vertical slice scenarios
3. **Write tests first** (TDD workflow)
4. **Implement features** to pass tests
5. **Test via MCP tools** before UI implementation
6. **Update coverage tracking** table

### Testing Priorities

**High Priority** (M10):
- Progress tracking (R1)
- Quest system (R3)
- Point economy (R5)
- Character relationship system (R15)
- Claude conversation grading (R17, R18)
- Pen pal unlock (R10)

**Medium Priority** (M11-M14):
- Badge tier progression (R4)
- Map progression (R6, R7)
- Adaptive letter frequency (R12)
- Character memory (R14)
- Adaptive character difficulty (R18a)

**Low Priority** (M15):
- Photo collection (R8)
- Loot box system (R24)
- Chat buddy system (R25)
- Special event quests (R26)

---

**Version**: 1.0.0  
**Status**: Active  
**Last Updated**: 2026-04-27
