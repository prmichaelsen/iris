# Task 3: OpenAPI Specification - Pen Pals & Collections

**Milestone**: M9 - Foundation + UX Design + OpenAPI  
**Status**: Pending  
**Estimated Hours**: 6  
**Dependencies**: Task 2 (extends same OpenAPI file)  

---

## Objective

Complete the OpenAPI specification with pen pal system, collectibles, and photo (Foto) collection endpoints. These are the narrative/emotional engagement layers.

---

## Background

Per spec requirements:
- **R10-R12**: Pen pal system with themed collectibles and adaptive letter frequency
- **R8**: Photo collection system (Fotos) earned through subquests
- **R19**: Character mini-games (Märchenbuch for Emma's fairy tales)

These systems create emotional connections and long-term progression beyond pure language drills.

---

## Scope

### Schemas to Define

**PenPal:**
```yaml
type: object
properties:
  id: string (mila, thomas, lena, etc.)
  name: string
  age: integer
  profession_de: string
  profession_en: string
  region_id: string
  personality_traits: array of strings
  collectible_type: string (stickers, vinyl, wine_labels, etc.)
  unlock_quest_id: string (Tier 2 regional quest)
```

**UserPenPal:**
```yaml
type: object
properties:
  user_id: string
  pen_pal_id: string
  unlocked: boolean
  relationship_score: integer (0-100)
  letters_sent_by_user: integer
  letters_received: integer
  last_interaction_at: string (ISO 8601) | null
  attention_score: number (calculated)
  temperature: enum [hot, warm, cool, dormant]
  unlocked_at: string (ISO 8601) | null
```

**PenPalLetter:**
```yaml
type: object
properties:
  id: string (uuid)
  pen_pal_id: string
  user_id: string
  sender: enum [pen_pal, user]
  content_de: string
  content_en: string | null (null for user letters)
  collectible_gift_id: string | null
  sent_at: string (ISO 8601)
  read_at: string (ISO 8601) | null
```

**Collectible:**
```yaml
type: object
properties:
  id: string (uuid)
  pen_pal_id: string
  type: string (sticker, vinyl, wine_label, flower, etc.)
  name_de: string
  name_en: string
  description_de: string
  description_en: string
  image_url: string (R2 CDN URL)
  metadata: object (year, artist, vineyard, etc.)
  external_links: array of strings (YouTube, Bandcamp)
```

**UserCollectible:**
```yaml
type: object
properties:
  user_id: string
  collectible_id: string
  acquired_from_letter_id: string | null
  acquired_at: string (ISO 8601)
```

**Foto:**
```yaml
type: object
properties:
  id: string (uuid)
  region_id: string
  category: enum [menschen, orte, kultur, essen]
  title_de: string
  title_en: string
  caption_de: string
  caption_en: string
  image_url: string (R2 CDN URL)
  subquest_id: string (which subquest unlocks it)
  tier_required: integer (1-4)
```

**UserFoto:**
```yaml
type: object
properties:
  user_id: string
  foto_id: string
  unlocked_at: string (ISO 8601)
```

**UserFairyTale (Emma's mini-game):**
```yaml
type: object
properties:
  id: string (uuid)
  user_id: string
  title: string
  content: string (full story with turn markers)
  turn_count: integer
  user_level_at_creation: integer
  grammar_errors_count: integer
  vocabulary_richness_score: number (0-100)
  created_at: string (ISO 8601)
  emma_reactions: array of strings
```

**FairyTaleTurn:**
```yaml
type: object
properties:
  fairy_tale_id: string
  turn_number: integer
  author: enum [user, emma]
  content: string
  grammar_score: number
  vocabulary_score: number
  creativity_score: number
  emma_reaction: string | null
```

### Endpoints to Document

**Pen Pals:**
- `GET /api/penpals/{userId}` - List all pen pals with unlock status
- `GET /api/penpals/{penPalId}/details` - Get pen pal profile
- `GET /api/penpals/{penPalId}/letters/{userId}` - Get conversation thread
- `POST /api/penpals/{penPalId}/send-letter` - User sends letter to pen pal
- `POST /api/penpals/{penPalId}/read-letter/{letterId}` - Mark letter as read
- `GET /api/penpals/{penPalId}/relationship/{userId}` - Get relationship status + attention score

**Collectibles:**
- `GET /api/collectibles/{userId}` - Get all collected items (grouped by pen pal)
- `GET /api/collectibles/{penPalId}/collection` - Get full collection for one pen pal (shows locked items as silhouettes)
- `POST /api/collectibles/{collectibleId}/unlock` - Unlock collectible (from letter gift)

**Fotos:**
- `GET /api/fotos/{userId}` - Get all unlocked Fotos (filterable by region/category)
- `POST /api/fotos/{fotoId}/unlock` - Unlock Foto (from subquest completion)
- `GET /api/fotos/{regionId}/gallery` - Gallery view for one region

**Emma's Fairy Tales (Mini-Game):**
- `POST /api/fairytales/start` - Start new fairy tale with Emma
- `POST /api/fairytales/{fairyTaleId}/turn` - Add turn to story (user or Emma)
- `GET /api/fairytales/{userId}/archive` - Get Märchenbuch archive (all completed stories)
- `GET /api/fairytales/{fairyTaleId}` - Get full fairy tale with turns and reactions

### Validation Rules

**Letter Sending:**
- Content must be 10-1000 characters
- Pen pal must be unlocked
- Max 3 letters per week across all pen pals (R30)

**Attention Score Calculation:**
- `(letters_sent * 3) + (letters_read * 1) + (recommendations_engaged * 2) - (days_since_last * 0.5)`
- Determines letter frequency (R12)

**Foto Unlock:**
- Subquest must be completed
- Tier requirement must be met (R9)
- No duplicate unlocks (idempotent)

**Fairy Tale Turn:**
- Must alternate between user and Emma
- Claude grades user turns on grammar/vocabulary/creativity
- Emma reacts to specific story elements (clocks, fairy tale tropes, precise descriptions)

### Error Codes

- `400 BadRequest` - Invalid parameters
- `403 Forbidden` - Pen pal not unlocked, tier requirement not met
- `404 NotFound` - Pen pal/Foto/Collectible not found
- `409 Conflict` - Already unlocked
- `422 UnprocessableEntity` - Business logic violation (letter frequency limit)
- `429 TooManyRequests` - Max 3 letters per week exceeded
- `500 InternalServerError` - System error

---

## Acceptance Criteria

- [ ] All pen pal endpoints documented (list, letters, send, read, relationship)
- [ ] Collectible endpoints documented with locked/unlocked states
- [ ] Foto endpoints documented with tier gating
- [ ] Emma's fairy tale mini-game endpoints documented
- [ ] Attention score calculation documented in GET relationship endpoint
- [ ] Letter frequency limits documented (max 3/week, R30)
- [ ] Metadata objects defined for collectibles (music links, wine notes, etc.)
- [ ] Pagination documented for letter threads and fairy tale archive
- [ ] File still passes `openapi-generator validate`
- [ ] Examples included for complex payloads (letters with gifts, fairy tale turns)

---

## Implementation Steps

1. **Define pen pal schemas and endpoints**
   - PenPal, UserPenPal, PenPalLetter schemas
   - GET /api/penpals/{userId}
   - GET /api/penpals/{penPalId}/details
   - GET /api/penpals/{penPalId}/letters/{userId} (pagination)
   - POST /api/penpals/{penPalId}/send-letter
   - POST /api/penpals/{penPalId}/read-letter/{letterId}
   - GET /api/penpals/{penPalId}/relationship/{userId} (with attention score)

2. **Define collectible schemas and endpoints**
   - Collectible, UserCollectible schemas
   - GET /api/collectibles/{userId} (grouped by pen pal)
   - GET /api/collectibles/{penPalId}/collection (shows locked items)
   - POST /api/collectibles/{collectibleId}/unlock

3. **Define Foto schemas and endpoints**
   - Foto, UserFoto schemas
   - GET /api/fotos/{userId} (filterable: `?region=berlin&category=menschen`)
   - POST /api/fotos/{fotoId}/unlock (validates tier requirement)
   - GET /api/fotos/{regionId}/gallery

4. **Define fairy tale schemas and endpoints**
   - UserFairyTale, FairyTaleTurn schemas
   - POST /api/fairytales/start (creates new story)
   - POST /api/fairytales/{fairyTaleId}/turn (user or Emma adds content)
   - GET /api/fairytales/{userId}/archive (paginated list)
   - GET /api/fairytales/{fairyTaleId} (full story with turns)

5. **Document attention score logic**
   - Formula in GET relationship endpoint description
   - Temperature thresholds (hot/warm/cool/dormant)
   - Letter frequency mapping (R12)

6. **Document letter frequency limits**
   - Max 3 pen pal letters per week (R30)
   - 429 error when limit exceeded
   - No letters if user inactive 7+ days (documented in POST send-letter)

7. **Add metadata examples**
   - Vinyl record: `{artist, album, year, bandcamp_link}`
   - Wine label: `{vineyard, year, varietal, tasting_notes}`
   - Pressed flower: `{species, location, date_collected}`

8. **Validate specification**
   - Run `openapi-generator-cli validate`
   - Verify all cross-references work
   - Check pagination consistency across endpoints

---

## Testing

**Validate full spec:**
```bash
openapi-generator-cli validate -i openapi.yaml
```

**Test letter frequency limit:**
```bash
# User sends 4th letter in same week
POST /api/penpals/mila/send-letter
{
  "user_id": "user123",
  "content_de": "Wie geht's?"
}

Expected: 429 TooManyRequests
{
  "code": "WEEKLY_LETTER_LIMIT",
  "message": "You can only send 3 pen pal letters per week",
  "details": {
    "letters_sent_this_week": 3,
    "limit": 3,
    "resets_at": "2026-05-04T00:00:00Z"
  }
}
```

**Test tier-gated Foto unlock:**
```bash
# User tries Tier 3 Foto without Silver badges
POST /api/fotos/exclusive-jazz-club-photo/unlock

Expected: 403 Forbidden
{
  "code": "TIER_REQUIREMENT_NOT_MET",
  "message": "Requires Silver in Grammar + Listening",
  "details": {
    "tier_required": 3,
    "current_badges": {
      "grammar": "bronze",
      "listening": "grey"
    }
  }
}
```

---

## Design References

- **Spec**: R8 (Photo Collection), R10-R12 (Pen Pal System), R19 (Mini-Games)
- **Spec**: R30 (Notification Limits - max 3 letters/week)
- **Spec**: Behavior table scenarios 13-18, 42-43
- **Design**: "5. Photo Collection System (Fotos)" section
- **Design**: "6. Pen Pal System" section (including character profiles with mini-games)
- **Design**: Emma's fairy tale co-writing mini-game with Märchenbuch archive

---

## Key Design Decisions

**Q: Should letter generation be user-triggered or automatic?**  
A: Automatic (backend job). API only provides: send (user → pen pal) and read (user reads pen pal letter). Generation happens server-side based on attention score.

**Q: How to represent locked collectibles in GET collection?**  
A: Return all collectibles for that pen pal. Locked items have `unlocked: false` and no `image_url` (or placeholder). UI shows as silhouettes.

**Q: Should Foto unlock trigger image generation API call?**  
A: No. Fotos are pre-generated and cached in R2. POST /api/fotos/unlock just creates UserFoto record. Image generation happens via separate admin/seeding process using nanobanana + Vertex API (same approach as scenecraft-engine). See `../scenecraft-engine` for reference implementation.

**Q: How to handle Emma's reactions in fairy tale turns?**  
A: Claude API call grades user's turn and detects trigger words (clock, Grimm tropes, etc.). Response includes `emma_reaction` string if triggered. Stored in FairyTaleTurn record.

**Q: Should fairy tale archive show old stories with errors highlighted?**  
A: Yes, but not in OpenAPI spec (UI decision). API returns `grammar_errors_count` and `vocabulary_richness_score` for each story. UI can compare: "3 months ago: 12 errors → now: 2 errors" (progress benchmark per R19).

---

## Notes

- Pen pal system (R10-R12) is core engagement mechanic - must be well-documented
- Märchenbuch archive (Emma's mini-game, R19) demonstrates tangible progress over time
- Collectibles add emotional depth vs pure XP numbers
- Foto system rewards exploration, not just drilling
- Attention score creates adaptive engagement without spamming notifications (R30)
- Letter frequency calculation in spec formula must match OpenAPI description exactly
