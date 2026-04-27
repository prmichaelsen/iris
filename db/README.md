# Iris Gamification Database Schema

This directory contains D1 (Cloudflare SQLite) database migrations and seed data for the Iris gamification and engagement system.

## Overview

The gamification system consists of 20+ tables organized into functional domains:
- Core Progress Tracking
- Quest System & Badges
- Point Economy
- Map & Regional Progression
- Character Relationships
- Pen Pal System
- Collectibles & Gifts
- Photo Collection (Fotos)
- Mini-Games (Emma's Märchenbuch)

## Directory Structure

```
db/
├── migrations/
│   └── 001_initial_gamification.sql    # Core schema with all tables, indexes, triggers
├── seeds/
│   ├── 001_quests.sql                  # Quest definitions
│   ├── 002_regions.sql                 # Regional map progression
│   ├── 003_characters.sql              # Character profiles with grading weights
│   ├── 004_pen_pals.sql                # Pen pal profiles and recommendations
│   ├── 005_collectibles.sql            # Collectible items from pen pals
│   └── 006_fotos.sql                   # Photo collection definitions
└── README.md                           # This file
```

## Tables

### Core Progress Tracking

#### `user_progress`
Overall user level and XP tracking.

| Column | Type | Description |
|--------|------|-------------|
| user_id | TEXT PRIMARY KEY | User identifier |
| level | INTEGER | Current level (default 1) |
| xp_current | INTEGER | Current XP in level |
| xp_to_next_level | INTEGER | XP required for next level |
| created_at | TEXT | Account creation timestamp |
| updated_at | TEXT | Last update timestamp |

**Trigger**: Auto-updates `updated_at` on modification.

#### `vocab_mastery`
Multi-signal mastery tracking per word.

| Column | Type | Description |
|--------|------|-------------|
| user_id, lemma | TEXT PRIMARY KEY | Composite key |
| accuracy_rate | REAL | Percentage correct (0.0-1.0) |
| consistency_score | REAL | No regression after mastery |
| retention_strength | REAL | Long-term retention signal |
| speed_fluency | REAL | Response time metric |
| context_breadth | REAL | Success across drill types |
| recency_decay_factor | REAL | Natural decay over time |
| trend_multiplier | REAL | Improving vs declining |
| mastery_level | REAL | Computed overall mastery |
| last_seen_at | TEXT | Last practice timestamp |
| first_seen_at | TEXT | First encounter timestamp |

**Mastery Formula**:
```
Mastery = (
  accuracy_rate * 0.35 +
  consistency_score * 0.25 +
  retention_strength * 0.20 +
  speed_fluency * 0.10 +
  context_breadth * 0.10
) * recency_decay_factor * trend_multiplier
```

### Quest System & Badges

#### `quests`
Quest definitions (static seed data).

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | Quest identifier |
| name_de, name_en | TEXT | Localized names |
| description_de, description_en | TEXT | Localized descriptions |
| category | TEXT | skill, achievement, streak, hidden, lesson, cultural, meta |
| badge_skill | TEXT | Associated skill for badge progression |
| tier_thresholds | TEXT (JSON) | Array of thresholds: [10, 50, 100, 500, 1000] |
| points_reward | INTEGER | Points earned on completion |
| is_repeatable | INTEGER (0/1) | Can be completed multiple times |
| is_hidden | INTEGER (0/1) | Hidden until discovered |

**Badge Tiers**: grey → bronze → silver → gold → diamond → platinum

#### `user_quests`
User progress on quests.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | Record identifier |
| user_id | TEXT | Foreign key to user_progress |
| quest_id | TEXT | Foreign key to quests |
| progress | INTEGER | Current progress count |
| completed | INTEGER (0/1) | Completion status |
| completed_at | TEXT | Completion timestamp |
| tier_unlocked | TEXT | Highest tier achieved (for badge quests) |

#### `user_badges`
Badge tier progression per skill.

| Column | Type | Description |
|--------|------|-------------|
| user_id, skill, tier | TEXT PRIMARY KEY | Composite key |
| progress | INTEGER | Progress toward this tier |
| unlocked_at | TEXT | Unlock timestamp |

### Point Economy

#### `user_points`
Point balance tracking.

| Column | Type | Description |
|--------|------|-------------|
| user_id | TEXT PRIMARY KEY | User identifier |
| total_earned | INTEGER | Lifetime points earned |
| current_balance | INTEGER | Spendable balance |
| updated_at | TEXT | Last update timestamp |

**Trigger**: Auto-updates `updated_at` on modification.

#### `point_transactions`
Point earn/spend history.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | Transaction identifier |
| user_id | TEXT | Foreign key to user_progress |
| amount | INTEGER | Points (positive = earned, negative = spent) |
| source | TEXT | Transaction source (e.g., "quest_complete", "voice_unlock") |
| metadata | TEXT (JSON) | Additional context |
| created_at | TEXT | Transaction timestamp |

### Map & Regional Progression

#### `regions`
Region definitions (static seed data).

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | Region identifier |
| name_de, name_en | TEXT | Localized names |
| order_index | INTEGER | Sequential progression order |
| description_de, description_en | TEXT | Localized descriptions |
| voice_unlock | TEXT | Voice ID unlocked on completion |
| point_cost | INTEGER | Alternative point-purchase cost |
| is_bonus | INTEGER (0/1) | Bonus region (Austria, Switzerland) |
| unlock_requirements | TEXT (JSON) | Prerequisites to unlock |

**Regional Progression**: Berlin → Bavaria → Hamburg → Rhine Valley → Black Forest → Saxony → (Austria/Switzerland)

#### `user_regions`
User region unlock and completion status.

| Column | Type | Description |
|--------|------|-------------|
| user_id, region_id | TEXT PRIMARY KEY | Composite key |
| unlocked_at | TEXT | Unlock timestamp |
| completed | INTEGER (0/1) | Completion status |
| completed_at | TEXT | Completion timestamp |
| subquests_completed | INTEGER | Number completed |
| subquests_total | INTEGER | Total available |

### Characters & Relationships

#### `characters`
Character definitions (static seed data).

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | Character identifier |
| name | TEXT | Character name |
| age | INTEGER | Character age |
| region_id | TEXT | Home region |
| personality_description | TEXT | Personality summary |
| specialty | TEXT | Mini-game specialty |
| unlock_requirements | TEXT (JSON) | Prerequisites to unlock |
| grading_weights | TEXT (JSON) | Mini-game grading weights |

**Grading Weights** (JSON):
```json
{
  "vocabulary": 0.25,
  "cultural_awareness": 0.15,
  "grammar": 0.20,
  "comprehension": 0.15,
  "fluency": 0.15,
  "confidence": 0.10
}
```

#### `user_character_relationships`
Generic relationship tracking with metadata.

| Column | Type | Description |
|--------|------|-------------|
| user_id, character_id | TEXT PRIMARY KEY | Composite key |
| relationship_level | INTEGER | 0-100 relationship strength |
| interactions_count | INTEGER | Total interactions |
| last_interaction_at | TEXT | Last interaction timestamp |
| metadata | TEXT (JSON) | Character-specific data (topics discussed, mini-game scores, etc.) |

#### `character_interactions`
Interaction history.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | Interaction identifier |
| user_id | TEXT | Foreign key to user_progress |
| character_id | TEXT | Foreign key to characters |
| interaction_type | TEXT | conversation, mini_game, gift_received |
| topic | TEXT | Conversation topic |
| score | REAL | Mini-game score |
| metadata | TEXT (JSON) | Interaction-specific details |
| created_at | TEXT | Interaction timestamp |

### Pen Pal System

#### `pen_pals`
Pen pal profiles (static seed data).

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | Pen pal identifier |
| character_id | TEXT | Linked character |
| region_id | TEXT | Home region |
| bio_de, bio_en | TEXT | Localized bios |
| topics | TEXT (JSON) | Array of conversation topics |
| recommendations | TEXT (JSON) | Music, films, books recommendations |

**Recommendations** (JSON):
```json
{
  "music": ["Artist 1", "Artist 2"],
  "films": ["Film 1", "Film 2"],
  "books": ["Book 1", "Book 2"]
}
```

#### `user_pen_pals`
User pen pal relationship status.

| Column | Type | Description |
|--------|------|-------------|
| user_id, pen_pal_id | TEXT PRIMARY KEY | Composite key |
| unlocked_at | TEXT | Unlock timestamp |
| relationship_level | INTEGER | 0-100 relationship strength |
| letters_sent | INTEGER | Letters sent by user |
| letters_received | INTEGER | Letters from pen pal |

#### `pen_pal_letters`
Letter exchange history.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | Letter identifier |
| user_id | TEXT | Foreign key to user_progress |
| pen_pal_id | TEXT | Foreign key to pen_pals |
| sender | TEXT | 'user' or 'pen_pal' |
| content | TEXT | Letter content |
| topic | TEXT | Letter topic |
| sentiment | TEXT | positive, neutral, reflective |
| sent_at | TEXT | Send timestamp |

**Rate Limit**: Pen pals send max 3 letters per week (enforced in application logic).

### Collectibles & Gifts

#### `collectibles`
Collectible definitions (static seed data).

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | Collectible identifier |
| name_de, name_en | TEXT | Localized names |
| category | TEXT | sticker, vinyl_record, wine_label, pressed_flower, etc. |
| pen_pal_id | TEXT | Pen pal who gives this |
| region_id | TEXT | Associated region |
| rarity | TEXT | common, uncommon, rare, legendary |
| description_de, description_en | TEXT | Localized descriptions |
| image_url | TEXT | Image asset URL |
| metadata | TEXT (JSON) | Collectible-specific attributes |

#### `user_collectibles`
User collectible inventory.

| Column | Type | Description |
|--------|------|-------------|
| user_id, collectible_id | TEXT PRIMARY KEY | Composite key |
| acquired_at | TEXT | Acquisition timestamp |
| source | TEXT | pen_pal_gift, quest_reward, loot_box, purchase |
| metadata | TEXT (JSON) | Acquisition context |

### Photo Collection (Fotos)

#### `fotos`
Photo definitions (static seed data).

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | Photo identifier |
| title_de, title_en | TEXT | Localized titles |
| caption_de, caption_en | TEXT | Localized captions |
| category | TEXT | menschen, orte, kultur, essen_trinken |
| region_id | TEXT | Associated region |
| tier | INTEGER | 1-4 (gated by mastery) |
| subquest_id | TEXT | Subquest that unlocks this |
| image_url | TEXT | Image asset URL |
| generation_prompt | TEXT | AI generation prompt for regeneration |

**Tier Gating**:
- Tier 1: Always available
- Tier 2: Requires Bronze badges
- Tier 3: Requires Silver badges in Grammar + Listening
- Tier 4: Requires Gold badge in Conversation OR 3+ regions complete

#### `user_fotos`
User unlocked photos.

| Column | Type | Description |
|--------|------|-------------|
| user_id, foto_id | TEXT PRIMARY KEY | Composite key |
| unlocked_at | TEXT | Unlock timestamp |
| subquest_completed | TEXT | Subquest that triggered unlock |

### Mini-Games (Emma's Märchenbuch)

#### `user_fairy_tales`
User fairy tale story progress.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | Story identifier |
| user_id | TEXT | Foreign key to user_progress |
| story_title | TEXT | Story name |
| current_turn | INTEGER | Current turn number |
| story_state | TEXT (JSON) | Narrative state |
| completed | INTEGER (0/1) | Completion status |
| created_at | TEXT | Story start timestamp |
| completed_at | TEXT | Completion timestamp |

#### `fairy_tale_turns`
Individual story turns/interactions.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | Turn identifier |
| fairy_tale_id | TEXT | Foreign key to user_fairy_tales |
| turn_number | INTEGER | Sequential turn number |
| user_choice | TEXT | User's choice/input |
| emma_response | TEXT | Emma's narrative response |
| grammar_correction | TEXT (JSON) | Corrections made if any |
| vocabulary_learned | TEXT (JSON) | New words introduced |
| created_at | TEXT | Turn timestamp |

## Indexes

All tables have indexes on frequently queried columns:
- `user_id` on all user-related tables
- `created_at` / `sent_at` for time-based queries
- Composite indexes for common joins
- `mastery_level` for vocab progression queries

## Triggers

- `update_user_progress_timestamp`: Auto-updates `user_progress.updated_at`
- `update_user_points_timestamp`: Auto-updates `user_points.updated_at`

## JSON Column Usage

D1 (SQLite) stores JSON as TEXT. Query with `json_extract()`:

```sql
-- Extract specific field
SELECT json_extract(metadata, '$.quest_id') FROM point_transactions;

-- Extract array element
SELECT json_extract(tier_thresholds, '$[0]') FROM quests;

-- Check array membership
SELECT * FROM pen_pals WHERE json_extract(topics, '$') LIKE '%art%';
```

## Migration Instructions

### Local Development

1. Create local D1 database:
```bash
wrangler d1 create iris-gamification-local
```

2. Update `wrangler.toml` with database ID:
```toml
[[d1_databases]]
binding = "DB"
database_name = "iris-gamification-local"
database_id = "YOUR_DATABASE_ID"
```

3. Run migrations:
```bash
wrangler d1 execute iris-gamification-local --file=db/migrations/001_initial_gamification.sql
```

4. Seed static data:
```bash
wrangler d1 execute iris-gamification-local --file=db/seeds/001_quests.sql
wrangler d1 execute iris-gamification-local --file=db/seeds/002_regions.sql
wrangler d1 execute iris-gamification-local --file=db/seeds/003_characters.sql
wrangler d1 execute iris-gamification-local --file=db/seeds/004_pen_pals.sql
wrangler d1 execute iris-gamification-local --file=db/seeds/005_collectibles.sql
wrangler d1 execute iris-gamification-local --file=db/seeds/006_fotos.sql
```

5. Verify tables:
```bash
wrangler d1 execute iris-gamification-local --command="SELECT name FROM sqlite_master WHERE type='table'"
```

### Production Deployment

1. Create production database:
```bash
wrangler d1 create iris-gamification-prod
```

2. Update `wrangler.toml` for production environment.

3. Run migrations against production:
```bash
wrangler d1 execute iris-gamification-prod --file=db/migrations/001_initial_gamification.sql
wrangler d1 execute iris-gamification-prod --file=db/seeds/001_quests.sql
# ... etc for all seed files
```

## Testing Queries

### Verify table structure:
```sql
PRAGMA table_info(user_progress);
PRAGMA table_info(vocab_mastery);
```

### Test foreign key constraints:
```sql
-- Should fail (no user exists)
INSERT INTO user_quests (id, user_id, quest_id, progress)
VALUES ('test', 'nonexistent', 'quest1', 0);
```

### Test seed data:
```sql
SELECT COUNT(*) FROM quests;
SELECT * FROM regions ORDER BY order_index;
SELECT * FROM characters WHERE region_id = 'region_berlin';
```

### Test JSON queries:
```sql
-- Extract tier thresholds
SELECT id, name_en, json_extract(tier_thresholds, '$') as thresholds FROM quests WHERE badge_skill IS NOT NULL;

-- Extract grading weights
SELECT name, json_extract(grading_weights, '$.vocabulary') as vocab_weight FROM characters;

-- Extract recommendations
SELECT name, json_extract(recommendations, '$.music') as music FROM pen_pals;
```

## Schema Versioning

Migrations are numbered sequentially: `001_`, `002_`, etc.

Future migrations should:
- Never modify existing migration files
- Create new migration files with next sequential number
- Include both `up` and `down` migrations when possible
- Document breaking changes clearly

## Design Decisions

**Q: Why TEXT for timestamps instead of INTEGER?**  
A: ISO 8601 format (TEXT) is human-readable and works well with SQLite's datetime functions. D1 console displays them nicely.

**Q: Why TEXT PRIMARY KEY for IDs?**  
A: UUIDs for distributed systems. Cloudflare Workers run in multiple regions. Use `crypto.randomUUID()` in Workers.

**Q: How to handle updated_at?**  
A: Triggers automatically update timestamps on row modification. No application logic needed.

**Q: Why JSON TEXT instead of typed columns?**  
A: SQLite doesn't have JSON type. TEXT with `json_extract()` provides flexibility for evolving metadata schemas.

**Q: Why composite PRIMARY KEYs?**  
A: Many tables represent many-to-many relationships (user-quest, user-collectible, user-character). Composite keys enforce uniqueness without extra indexes.

## Related Documentation

- Design Spec: `agent/design/local.gamification-engagement-system.md`
- Task Doc: `agent/tasks/milestone-9-foundation-ux-openapi/task-5-d1-schema-migration.md`
- OpenAPI Schemas: Tasks 1-3 (data shapes must match)
