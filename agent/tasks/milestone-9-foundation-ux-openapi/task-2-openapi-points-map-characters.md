# Task 2: OpenAPI Specification - Points, Map, Characters

**Milestone**: M9 - Foundation + UX Design + OpenAPI  
**Status**: Pending  
**Estimated Hours**: 8  
**Dependencies**: Task 1 (extends same OpenAPI file)  

---

## Objective

Extend the OpenAPI specification with point economy, map/regional progression, and character relationship endpoints. These systems build on the core progress tracking from Task 1.

---

## Background

Per spec requirements:
- **R5-R6**: Point economy with dual-path voice unlocks
- **R7-R9**: Sequential map progression with gated subquests
- **R13-R18**: Character revisit system with relationship tracking and adaptive difficulty

This task defines the API contracts for these interconnected systems.

---

## Scope

### Schemas to Define

**UserPoints:**
```yaml
type: object
properties:
  user_id: string
  total_earned: integer (min: 0)
  current_balance: integer (min: 0)
  updated_at: string (ISO 8601)
```

**PointTransaction:**
```yaml
type: object
properties:
  id: string (uuid)
  user_id: string
  amount: integer (positive for earn, negative for spend)
  source: string (drill_complete, voice_unlock, loot_box, etc.)
  metadata: object (optional details)
  created_at: string (ISO 8601)
```

**Region:**
```yaml
type: object
properties:
  id: string (berlin, bavaria, hamburg, etc.)
  name_de: string
  name_en: string
  order_position: integer (1-8)
  narrative_title_de: string
  narrative_title_en: string
  voice_id: string (ElevenLabs voice ID)
  voice_cost_points: integer (600-4000)
  required_previous_region: string | null
```

**UserRegion:**
```yaml
type: object
properties:
  user_id: string
  region_id: string
  unlocked: boolean
  completed: boolean
  subquests_completed: integer
  voice_unlocked: boolean
  unlocked_at: string (ISO 8601) | null
  completed_at: string (ISO 8601) | null
```

**Character:**
```yaml
type: object
properties:
  id: string (karl, mila, lena, etc.)
  name: string
  age: integer
  region_id: string
  profession_de: string
  profession_en: string
  personality: string
  specialty: enum [speed_impatience, slang_casual, grammar_precision, ...]
  language_style: string
  voice_characteristics: array of strings
  grading_weights: object (comprehension, fluency, grammar, ...)
  tier_thresholds: array of integers
  tier_names: array of strings
  difficulty_scaling: object
```

**UserCharacterRelationship:**
```yaml
type: object
properties:
  user_id: string
  character_id: string
  relationship_score: integer (0-100)
  first_visit_at: string (ISO 8601)
  last_visit_at: string (ISO 8601)
  visit_count: integer
  tier: string (character-specific tier name)
  metadata: object (character-specific data)
  created_at: string (ISO 8601)
  updated_at: string (ISO 8601)
```

**CharacterInteraction:**
```yaml
type: object
properties:
  id: string (uuid)
  user_id: string
  character_id: string
  interaction_type: enum [first_visit, revisit, quest_complete]
  user_level_at_visit: integer
  mastery_snapshot: object (skill -> mastery %)
  conversation_grade: number (0-10) | null
  relationship_change: integer (-8 to +10)
  topics_discussed: array of strings
  drill_suggested: string | null
  created_at: string (ISO 8601)
```

**ConversationGrade:**
```yaml
type: object
properties:
  comprehension: number (0-10)
  fluency: number (0-10)
  grammar: number (0-10)
  vocabulary: number (0-10)
  pronunciation: number (0-10)
  confidence: number (0-10)
  cultural_awareness: number (0-10)
  overall_score: number (weighted average)
  relationship_delta: integer (+8, -3, etc.)
```

### Endpoints to Document

**Point Economy:**
- `GET /api/points/{userId}` - Get point balance and total earned
- `POST /api/points/earn` - Award points (from drill, quest, milestone)
- `POST /api/points/spend` - Spend points (voice unlock, loot box, vanity item)
- `GET /api/points/transactions/{userId}` - Transaction history (paginated)

**Map & Regions:**
- `GET /api/map/{userId}` - Get all regions with user's unlock/completion status
- `POST /api/regions/{regionId}/unlock` - Unlock next region (validates sequential order)
- `POST /api/regions/{regionId}/complete` - Mark region complete (awards voice + points)
- `GET /api/regions/{regionId}/subquests` - List subquests for region (with tier gates)
- `POST /api/voices/{regionId}/unlock` - Purchase voice with points (dual-path)

**Characters:**
- `GET /api/characters` - List all characters (with basic info)
- `GET /api/characters/{characterId}` - Get character details (personality, grading weights)
- `GET /api/characters/{characterId}/relationship/{userId}` - Get relationship status
- `POST /api/characters/{characterId}/visit` - Record character visit (creates interaction)
- `POST /api/characters/{characterId}/conversation` - Submit conversation for grading
- `GET /api/characters/{characterId}/interactions/{userId}` - Interaction history (paginated)

### Validation Rules

**Point Spend:**
- Amount must be ≤ current balance
- Item must exist and be purchasable
- Voice unlock requires region not already unlocked via completion

**Region Unlock:**
- Must be next in sequence (validates `required_previous_region`)
- Previous region must be completed

**Voice Unlock:**
- Via completion: automatic, free
- Via purchase: requires sufficient points, deducts cost

**Character Conversation:**
- Transcript required (string, min 10 characters)
- Character must be unlocked (via subquest completion)
- Grading weights must match character's specialty (R18)

### Error Codes

- `400 BadRequest` - Invalid parameters
- `402 PaymentRequired` - Insufficient points
- `403 Forbidden` - Action not allowed (region locked, character not unlocked)
- `404 NotFound` - Region/Character not found
- `409 Conflict` - Already unlocked/completed
- `422 UnprocessableEntity` - Business logic violation (skip region, etc.)
- `500 InternalServerError` - System error

---

## Acceptance Criteria

- [ ] All point economy endpoints documented (earn, spend, balance, transactions)
- [ ] All map/region endpoints documented with sequential validation logic
- [ ] Voice unlock dual-path clearly documented (free via completion OR purchase with points)
- [ ] All character endpoints documented with relationship tracking
- [ ] Conversation grading endpoint includes character-specific grading weights (R18)
- [ ] Schemas include proper constraints (min/max, enums, required fields)
- [ ] Error responses defined for each endpoint (especially 402 for insufficient points)
- [ ] Pagination documented for transaction/interaction history endpoints
- [ ] File still passes `openapi-generator validate` after additions
- [ ] Examples included for complex requests (conversation grading, metadata objects)

---

## Implementation Steps

1. **Define point economy schemas and endpoints**
   - UserPoints, PointTransaction schemas
   - GET /api/points/{userId}
   - POST /api/points/earn (with source tracking)
   - POST /api/points/spend (with balance validation)
   - GET /api/points/transactions (with pagination params)

2. **Define map/region schemas and endpoints**
   - Region, UserRegion schemas
   - GET /api/map/{userId} (returns all regions with status)
   - POST /api/regions/{regionId}/unlock (validates sequence)
   - POST /api/regions/{regionId}/complete (awards voice + 500 points)
   - GET /api/regions/{regionId}/subquests (with tier filtering)
   - POST /api/voices/{regionId}/unlock (dual-path logic)

3. **Define character schemas and endpoints**
   - Character, UserCharacterRelationship, CharacterInteraction schemas
   - ConversationGrade schema
   - GET /api/characters (list all with basic info)
   - GET /api/characters/{characterId} (full details including grading weights)
   - GET /api/characters/{characterId}/relationship/{userId}
   - POST /api/characters/{characterId}/visit
   - POST /api/characters/{characterId}/conversation (includes transcript, returns grade + relationship delta)
   - GET /api/characters/{characterId}/interactions/{userId} (paginated history)

4. **Document validation rules**
   - Point spend requires balance check (402 error)
   - Region unlock requires previous completion (422 error)
   - Voice unlock validates not already owned (409 error)
   - Character conversation requires character unlocked (403 error)

5. **Add pagination parameters**
   - Transactions: `?limit=50&offset=0&sortBy=created_at&order=desc`
   - Interactions: `?limit=20&offset=0`

6. **Validate specification**
   - Run `openapi-generator-cli validate`
   - Check that Task 1 schemas still work
   - Verify $ref cross-references between schemas

---

## Testing

**Validate entire spec:**
```bash
openapi-generator-cli validate -i openapi.yaml
```

**Test point spend logic:**
```bash
# Mock scenario: user has 500 points, tries to buy 800pt voice
POST /api/points/spend
{
  "user_id": "user123",
  "amount": 800,
  "item": "voice_bavarian"
}

Expected: 402 PaymentRequired
{
  "code": "INSUFFICIENT_POINTS",
  "message": "You need 300 more points",
  "details": {
    "required": 800,
    "balance": 500,
    "shortfall": 300
  }
}
```

**Test sequential region enforcement:**
```bash
# User completed Berlin, tries to unlock Hamburg (skipping Bavaria)
POST /api/regions/hamburg/unlock

Expected: 422 UnprocessableEntity
{
  "code": "REGION_LOCKED",
  "message": "Complete Bavaria first",
  "details": {
    "required_region": "bavaria",
    "current_status": "locked"
  }
}
```

---

## Design References

- **Spec**: R5-R6 (Point Economy & Voice Unlocks)
- **Spec**: R7-R9 (Map Progression, Sequential Unlock, Gated Subquests)
- **Spec**: R13-R18 (Character Revisit System, Relationship Tracking, Grading)
- **Spec**: Behavior table scenarios 7-11, 19-28
- **Design**: "3. Point Economy & Voice Unlocks" section
- **Design**: "4. Map Progression & Regional Story" section
- **Design**: "7. Character Revisit System" section

---

## Key Design Decisions

**Q: Should voice unlock via purchase also mark region complete?**  
A: No. Voice unlock is separate from region completion. User can buy voice early but still must complete region naturally. This prevents pay-to-skip progression.

**Q: How to represent character-specific metadata (Karl's breads, Lena's vinyl)?**  
A: Use flexible JSON object in `UserCharacterRelationship.metadata`. Each character has unique structure. OpenAPI can define `additionalProperties: true` or provide examples.

**Q: Should conversation grading be synchronous or async?**  
A: Synchronous. Claude API grading takes ~2-5 seconds, acceptable for real-time conversation feedback. Response must include grade breakdown + relationship delta for immediate UI update.

**Q: Pagination strategy for transaction history?**  
A: Offset-based pagination (simple, works with D1). Parameters: `limit` (default 50, max 100), `offset` (default 0). Future: consider cursor-based for infinite scroll.

**Q: Should region unlock require explicit API call or happen automatically?**  
A: Explicit call. When region X completes, backend sets `UserRegion.completed = true` and unlocks next region automatically. But client must call `POST /api/regions/{regionId}/unlock` to initialize UserRegion record.

---

## Notes

- Dual-path voice unlock (R6) is core to engagement design - must be clear in spec
- Character grading weights (R18) critical for each character's specialty
- Metadata flexibility in UserCharacterRelationship allows unlimited character types
- Transaction history enables "how did I earn/spend points" transparency
- Interaction history enables character memory ("last time you were level 5...")
