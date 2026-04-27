# Task 8: Testing Strategy & Documentation

**Milestone**: M9 - Foundation + UX Design + OpenAPI  
**Status**: Pending  
**Estimated Hours**: 4  
**Dependencies**: Tasks 1-7 (synthesizes all M9 work)  

---

## Objective

Document testing strategy for gamification system, define test case structure from spec, create E2E test scenarios for vertical slices, and update project documentation with M9 completion notes.

---

## Scope

### Testing Documentation to Create

1. **Testing Strategy Document**
   - Unit testing approach (API endpoints, MCP tools)
   - Integration testing approach (D1 queries, OpenAPI validation)
   - E2E testing approach (vertical slice scenarios)
   - Claude conversation testing (MCP tool usage)

2. **Test Case Structure**
   - Template based on spec's Given/When/Then format
   - Mapping from spec scenarios to test implementations
   - Coverage tracking per requirement (R1-R30)

3. **E2E Test Scenarios**
   - Karl vertical slice (M10): first visit → relationship progression → master test
   - Mila vertical slice (M10): unlock → letter exchange → collectible gifts
   - Full user journey: signup → first drill → level up → region completion

4. **Project Documentation Updates**
   - Update README with M9 completion
   - Document OpenAPI usage
   - Document MCP tools
   - Migration instructions

---

## Deliverable Format

Create `agent/testing/strategy.gamification.md`:

```markdown
# Gamification Testing Strategy

## Overview

Testing approach for gamification system across 3 layers:
1. **Unit**: Individual functions, API endpoints, MCP tools
2. **Integration**: D1 queries, OpenAPI validation, cross-system interactions
3. **E2E**: Full user journeys via MCP tools and UI (when implemented)

## Unit Testing

### API Endpoints
- Test each OpenAPI endpoint in isolation
- Mock D1 database responses
- Validate request/response schemas
- Test error conditions (400, 404, 409, 422)

### MCP Tools
- Test set_context, view_progress, debug_state
- Validate parameter schemas
- Test error handling
- Mock backend responses

### Example Test Cases
[From spec test cases: first-drill-completion, xp-award-calculation, etc.]

## Integration Testing

### D1 Schema
- Test migrations run successfully
- Test foreign key constraints
- Test JSON column queries
- Test indexes improve performance

### OpenAPI Validation
- Validate spec with openapi-generator
- Generate TypeScript types and verify correctness
- Test endpoint implementations match spec
- Validate error response schemas

### Cross-System
- Test drill completion → XP award → quest progress
- Test quest completion → badge unlock → point award
- Test region completion → voice unlock + next region unlock

## E2E Testing

### Vertical Slice: Karl (M10)
**Scenario**: User's first encounter with Karl through master test

1. User starts "Erste Bestellung" quest
2. Set context: Berlin, Karl's bakery
3. Voice conversation with 5s timer
4. Claude grades conversation (Karl's weights)
5. Relationship score updated (+8 for excellent)
6. User revisits after learning Bavarian bread
7. Karl recognizes Brezel knowledge
8. Cultural bonus applied (+10)
9. User reaches 90+ relationship, master test unlocks
10. User answers trick question correctly
11. Relationship → 100, badge unlocked, mini-game available

**MCP Tool Testing**:
```
set_context(user_id, location="berlin", character_id="karl")
talk_to_character(user_id, character_id="karl", transcript="...")
view_progress(user_id) // Check relationship score
```

### Vertical Slice: Mila (M10)
[Similar structure for pen pal system testing]

### Full User Journey
[Signup → first drill → level up → badge unlock → region completion]

## Test Coverage Tracking

Map each spec requirement to test cases:
- R1 (Progress Tracking): tests 1-3, 56-57
- R2 (Mastery Calculation): tests 25-26, 58-61
- R3 (Quest System): tests 4, 6, 40-45
- R4 (Badge Progression): tests 5, 32-35
...

Target: 100% of R1-R30 covered by at least one test case.

## Testing Tools

- **OpenAPI Validation**: `openapi-generator-cli validate`
- **D1 Testing**: Local Wrangler D1 instance
- **MCP Testing**: Claude Code conversation tests
- **Future**: Playwright for UI E2E (M15)

## Continuous Testing

- Run OpenAPI validation on every commit
- Run D1 migrations on test database before deploy
- MCP tool smoke tests in CI
- E2E scenarios run pre-release

```

---

## Acceptance Criteria

- [ ] Testing strategy document created with unit/integration/E2E sections
- [ ] Test case structure defined matching spec's Given/When/Then format
- [ ] Mapping created from spec requirements (R1-R30) to test cases
- [ ] E2E scenarios documented for Karl and Mila vertical slices (M10)
- [ ] Full user journey scenario documented (signup → region completion)
- [ ] README updated with M9 completion notes
- [ ] OpenAPI usage documented (how to validate, generate types)
- [ ] MCP tools documented with usage examples
- [ ] Migration instructions added to db/README.md
- [ ] Test coverage tracking template created

---

## Implementation Steps

1. **Create testing strategy document**
   - Define 3-layer testing approach
   - Document tools and frameworks
   - Explain vertical slice testing philosophy

2. **Define test case structure**
   - Template: Given/When/Then format from spec
   - Example: `first-drill-completion` test case
   - Document assertion types

3. **Map spec requirements to test cases**
   - Create tracking table: Requirement → Test Cases
   - Identify coverage gaps
   - Prioritize critical paths

4. **Document Karl E2E scenario**
   - First visit setup
   - Conversation grading
   - Relationship progression
   - Regional discovery quests
   - Master test sequence
   - MCP tool interactions

5. **Document Mila E2E scenario**
   - Pen pal unlock
   - Letter exchange
   - Collectible gifts
   - Attention score adaptation
   - MCP tool interactions

6. **Document full user journey**
   - Account creation
   - First drill completion
   - XP award and level up
   - Quest completion
   - Badge unlock
   - Region completion
   - Voice unlock

7. **Update README.md**
   - Add "Gamification System" section
   - Link to M9 artifacts (OpenAPI, UX patterns, visual design)
   - Document MCP tools
   - Migration instructions

8. **Document OpenAPI usage**
   - How to validate spec
   - How to generate TypeScript types
   - How to update spec when adding endpoints
   - How to maintain OpenAPI as single source of truth

9. **Document MCP tools**
   - Purpose of each tool
   - Parameter schemas
   - Usage examples (Claude conversations)
   - When to use each tool

10. **Update db/README.md**
    - Migration instructions
    - Seed data instructions
    - Schema documentation
    - Query examples

11. **Create test coverage template**
    - Spreadsheet or markdown table
    - Columns: Requirement ID, Description, Test Cases, Status
    - Initialize with R1-R30

---

## Testing

**Validate OpenAPI spec:**
```bash
openapi-generator-cli validate -i openapi.yaml
```

**Run D1 migrations on test DB:**
```bash
wrangler d1 create iris-test
wrangler d1 execute iris-test --file=db/migrations/001_initial_gamification.sql
wrangler d1 execute iris-test --command="SELECT COUNT(*) FROM user_progress"
```

**Test MCP tools:**
```bash
# Start server
npm run dev:server

# Claude conversation test
"Can you check my progress?"
[Claude calls view_progress tool]
[Verify response matches expected structure]
```

---

## Design References

- **Spec**: All test cases (44 base + 6 edge = 50 total)
- **Spec**: Behavior table (45 scenarios)
- **Spec**: Requirements R1-R30
- **Testing**: Martin Fowler's Test Pyramid
- **MCP**: Model Context Protocol testing patterns

---

## Key Design Decisions

**Q: Unit tests before or after implementation?**  
A: Define test cases in M9 (documentation), implement tests in M10+ as features are built. TDD approach where feasible.

**Q: Should E2E tests use real or mock backend?**  
A: Real backend (local D1) for integration confidence. Mock only external APIs (Claude, ElevenLabs) to avoid rate limits.

**Q: How to test Claude conversation grading?**  
A: Mock Claude API responses with known grades. Verify calculation logic (weights, relationship delta). Manual QA for actual Claude API quality.

**Q: How to track test coverage as features are built?**  
A: Maintain coverage table in testing strategy doc. Update as tests are written. CI tracks coverage percentage.

---

## Notes

- Spec provides 50 test cases - use as foundation
- Vertical slice testing (M10) validates full stack before scaling
- MCP tools enable testing without UI implementation
- OpenAPI validation prevents API drift
- Test coverage goal: 100% of R1-R30, 80%+ of code
- Edge cases (concurrency, boundaries) documented in spec tests 44-62
