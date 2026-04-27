# Task 1: OpenAPI Specification - Core Progress & Quests

**Milestone**: M9 - Foundation + UX Design + OpenAPI  
**Status**: Pending  
**Estimated Hours**: 8  
**Dependencies**: None  

---

## Objective

Create OpenAPI 3.0+ specification for core gamification endpoints covering progress tracking, quest system, and badge progression. This establishes the API contract for the most fundamental gamification features.

---

## Background

The gamification spec (R1-R4) defines progress tracking with XP/levels, quest system with multiple categories, and badge progression across 6 tiers. Before implementing any backend logic, we need a formal API contract that:

- Defines exact request/response shapes
- Specifies validation rules
- Documents error codes
- Enables TypeScript code generation
- Serves as single source of truth

This task covers the "core loop" endpoints that every other feature depends on.

---

## Scope

### Schemas to Define

**UserProgress:**
```yaml
type: object
properties:
  user_id: string
  level: integer (min: 1)
  xp_current: integer (min: 0)
  xp_to_next_level: integer (min: 1)
  created_at: string (ISO 8601)
  updated_at: string (ISO 8601)
```

**Quest:**
```yaml
type: object
properties:
  id: string (uuid)
  name_de: string
  name_en: string
  description_de: string
  description_en: string
  category: enum [skill, achievement, streak, hidden, lesson, cultural, meta]
  badge_skill: string | null
  tier_thresholds: array of integers
  points_reward: integer
  is_repeatable: boolean
  is_hidden: boolean
```

**UserQuest:**
```yaml
type: object
properties:
  id: string (uuid)
  user_id: string
  quest_id: string
  progress: integer (min: 0)
  completed: boolean
  completed_at: string (ISO 8601) | null
  tier_unlocked: enum [grey, bronze, silver, gold, diamond, platinum] | null
```

**UserBadge:**
```yaml
type: object
properties:
  user_id: string
  skill: string (flashcard, dictation, grammar, etc.)
  tier: enum [grey, bronze, silver, gold, diamond, platinum]
  progress: integer (count toward next tier)
  unlocked_at: string (ISO 8601)
```

**Badge (metadata):**
```yaml
type: object
properties:
  skill: string
  tier: enum [grey, bronze, silver, gold, diamond, platinum]
  threshold: integer
  name_de: string
  name_en: string
  description_de: string
  description_en: string
```

### Endpoints to Document

**Progress Tracking:**
- `GET /api/progress/{userId}` - Get user progress summary
- `POST /api/progress/xp` - Award XP (with level-up detection)
- `GET /api/progress/mastery/{userId}` - Get mastery breakdown by skill

**Quest System:**
- `GET /api/quests/available/{userId}` - List available quests (filtered by level/region)
- `GET /api/quests/active/{userId}` - List active (in-progress) quests
- `POST /api/quests/{questId}/progress` - Increment quest progress
- `POST /api/quests/{questId}/complete` - Mark quest complete (award points, check badge tier)
- `GET /api/quests/{questId}` - Get quest details

**Badge System:**
- `GET /api/badges/{userId}` - List all user badges (with progress)
- `POST /api/badges/{skill}/progress` - Increment badge progress (from drill completion)
- `GET /api/badges/metadata` - Get badge tier thresholds and names

### Validation Rules

**XP Award:**
- Amount: 10-50 (reject outside range)
- Source: enum [drill_complete, quest_complete, bonus]

**Quest Progress:**
- Increment: 1-100 (reject outside range)
- Quest must exist and be active for user

**Badge Progress:**
- Skill must be valid enum
- Count must be positive integer

### Error Codes

- `400 BadRequest` - Invalid parameters (out of range, wrong type)
- `404 NotFound` - Quest/User not found
- `409 Conflict` - Quest already completed
- `422 UnprocessableEntity` - Business logic violation (e.g., quest not unlocked yet)
- `500 InternalServerError` - Database/system error

---

## Acceptance Criteria

- [ ] OpenAPI YAML file created at `openapi/gamification.yaml` (or root `openapi.yaml`)
- [ ] All schemas defined with types, constraints, descriptions
- [ ] All 10 endpoints documented with parameters, request bodies, responses
- [ ] Each endpoint includes 2xx success response and 4xx/5xx error responses
- [ ] Validation rules specified in schema constraints (min/max, enums, patterns)
- [ ] Error response schema defined with `code`, `message`, `details` fields
- [ ] Authentication requirements specified (bearer token, user_id extraction)
- [ ] File passes `openapi-generator validate` command
- [ ] Examples included for complex request/response bodies
- [ ] Cross-references added between related schemas ($ref usage)

---

## Implementation Steps

1. **Setup OpenAPI file structure**
   - Create `openapi.yaml` or `openapi/gamification.yaml`
   - Define OpenAPI 3.0+ header with version, title, description
   - Define `servers` block (localhost + production Cloudflare Workers URL)
   - Define security schemes (bearer token)

2. **Define core schemas**
   - UserProgress schema with XP/level fields
   - Quest schema with all metadata
   - UserQuest schema with progress tracking
   - UserBadge schema with tier progression
   - Badge metadata schema
   - ErrorResponse schema (reusable)

3. **Document progress endpoints**
   - GET /api/progress/{userId} with full response
   - POST /api/progress/xp with request body + level-up response
   - GET /api/progress/mastery/{userId}

4. **Document quest endpoints**
   - GET /api/quests/available/{userId} with filtering logic
   - GET /api/quests/active/{userId}
   - POST /api/quests/{questId}/progress with increment
   - POST /api/quests/{questId}/complete with rewards
   - GET /api/quests/{questId}

5. **Document badge endpoints**
   - GET /api/badges/{userId} with tier progress
   - POST /api/badges/{skill}/progress
   - GET /api/badges/metadata

6. **Add validation and error responses**
   - Specify min/max constraints on integers
   - Define enums for categories, tiers, sources
   - Add 400/404/409/422/500 responses to each endpoint
   - Include error code examples

7. **Validate specification**
   - Install `@openapitools/openapi-generator-cli`
   - Run `openapi-generator-cli validate -i openapi.yaml`
   - Fix any validation errors
   - Optionally: generate mock server to test structure

8. **Document and review**
   - Add comments explaining complex schemas
   - Include example request/response payloads
   - Review for consistency with spec requirements (R1-R4)

---

## Testing

**Manual validation:**
```bash
npm install -g @openapitools/openapi-generator-cli
openapi-generator-cli validate -i openapi.yaml
```

**Generate TypeScript types (preview):**
```bash
openapi-generator-cli generate -i openapi.yaml -g typescript-fetch -o /tmp/generated
cat /tmp/generated/models/UserProgress.ts  # Verify generated types
```

**Mock server (optional):**
```bash
npx @stoplight/prism-cli mock openapi.yaml
curl http://localhost:4010/api/progress/user123
```

---

## Design References

- **Spec**: `agent/specs/local.gamification-engagement-system.md` (R1-R4, "Interfaces / Data Shapes" section)
- **Spec**: Behavior table scenarios 1-6 (XP, levels, badges)
- **Spec**: Test cases: first-drill-completion, xp-award-calculation, level-up-trigger, badge-unlock-tier-1

---

## Key Design Decisions

**Q: Should XP award be synchronous or async?**  
A: Synchronous. Response must include level-up flag so client can show animation immediately.

**Q: How to handle concurrent badge progress updates?**  
A: Backend must use atomic increments (D1 supports `UPDATE ... SET progress = progress + 1`). OpenAPI doesn't specify implementation, but response should reflect final count.

**Q: Should quest completion return full reward details?**  
A: Yes. Response should include: `points_awarded`, `badge_tier_unlocked`, `xp_bonus`, `new_balance`. Client needs all data for notification UI.

**Q: Filtering logic for available quests?**  
A: Document query parameters: `?region=berlin&minLevel=5&category=skill`. Backend filters based on user's unlocked regions and level. OpenAPI specifies parameters, implementation follows in M10+.

---

## Notes

- This task defines the contract only - no implementation yet
- M10 will generate TypeScript code from this spec
- Focus on correctness over completeness - can add more endpoints in tasks 2-3
- Badge tier thresholds (10/50/100/500/1000) must match spec exactly (R4)
- XP calculation formula (10 base + 10 perfect + 15 first-try) documented in POST /api/progress/xp description
