# Task 5: D1 Schema Design & Migration

**Milestone**: M9 - Foundation + UX Design + OpenAPI  
**Status**: Pending  
**Estimated Hours**: 8  
**Dependencies**: Tasks 1-3 (OpenAPI schemas inform D1 schema)  

---

## Objective

Design and implement D1 database schema for core gamification tables. Create migration scripts and establish indexing strategy for performance.

---

## Scope

### Tables to Create

**Core Progress:**
- `user_progress` - XP, level tracking
- `user_quests` - Quest progress and completion
- `quests` - Quest definitions (seed data)
- `user_badges` - Badge tier progression
- `user_points` - Point balance
- `point_transactions` - Point earn/spend history
- `vocab_mastery` - Multi-signal mastery tracking

**Map & Regions:**
- `regions` - Region metadata (seed data)
- `user_regions` - Regional unlock/completion status

**Characters:**
- `characters` - Character definitions (seed data)
- `user_character_relationships` - Generic relationship tracking
- `character_interactions` - Interaction history

**Pen Pals & Collections:**
- `pen_pals` - Pen pal profiles (seed data)
- `user_pen_pals` - Pen pal relationships
- `pen_pal_letters` - Letter threads
- `collectibles` - Collectible definitions (seed data)
- `user_collectibles` - Collected items

**Fotos:**
- `fotos` - Photo metadata (seed data)
- `user_fotos` - Unlocked photos

**Mini-Games:**
- `user_fairy_tales` - Emma's Märchenbuch stories
- `fairy_tale_turns` - Turn-by-turn story content

### Migration Strategy

- Versioned migrations (001_initial_gamification.sql, 002_add_indexes.sql, etc.)
- Idempotent (can run multiple times safely)
- Rollback support (down migrations)
- Seed data separate from schema

---

## Acceptance Criteria

- [ ] All 20+ tables defined in SQL schema
- [ ] Migration scripts created (up and down)
- [ ] Indexes defined for common queries (user_id, created_at, etc.)
- [ ] Foreign key constraints where appropriate
- [ ] Default values specified (created_at, updated_at, booleans)
- [ ] JSON columns for metadata (character relationship, collectible metadata)
- [ ] Migrations tested on local D1 instance
- [ ] Seed data scripts created for static tables (quests, regions, characters, pen_pals)
- [ ] Schema documentation generated (table descriptions, column types)
- [ ] No errors when running migrations

---

## Implementation Steps

1. **Setup migration structure**
   - Create `db/migrations/` directory
   - Create `db/seeds/` directory
   - Document migration naming convention

2. **Write core progress tables**
   ```sql
   CREATE TABLE user_progress (
     user_id TEXT PRIMARY KEY,
     level INTEGER NOT NULL DEFAULT 1,
     xp_current INTEGER NOT NULL DEFAULT 0,
     xp_to_next_level INTEGER NOT NULL DEFAULT 100,
     created_at TEXT NOT NULL DEFAULT (datetime('now')),
     updated_at TEXT NOT NULL DEFAULT (datetime('now'))
   );
   
   CREATE TABLE quests (
     id TEXT PRIMARY KEY,
     name_de TEXT NOT NULL,
     name_en TEXT NOT NULL,
     description_de TEXT NOT NULL,
     description_en TEXT NOT NULL,
     category TEXT NOT NULL CHECK(category IN ('skill', 'achievement', 'streak', 'hidden', 'lesson', 'cultural', 'meta')),
     badge_skill TEXT,
     tier_thresholds TEXT NOT NULL, -- JSON array
     points_reward INTEGER NOT NULL,
     is_repeatable INTEGER NOT NULL DEFAULT 0,
     is_hidden INTEGER NOT NULL DEFAULT 0
   );
   
   CREATE TABLE user_quests (
     id TEXT PRIMARY KEY,
     user_id TEXT NOT NULL,
     quest_id TEXT NOT NULL,
     progress INTEGER NOT NULL DEFAULT 0,
     completed INTEGER NOT NULL DEFAULT 0,
     completed_at TEXT,
     tier_unlocked TEXT,
     FOREIGN KEY (user_id) REFERENCES user_progress(user_id),
     FOREIGN KEY (quest_id) REFERENCES quests(id)
   );
   
   CREATE TABLE user_badges (
     user_id TEXT NOT NULL,
     skill TEXT NOT NULL,
     tier TEXT NOT NULL CHECK(tier IN ('grey', 'bronze', 'silver', 'gold', 'diamond', 'platinum')),
     progress INTEGER NOT NULL DEFAULT 0,
     unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
     PRIMARY KEY (user_id, skill, tier),
     FOREIGN KEY (user_id) REFERENCES user_progress(user_id)
   );
   
   CREATE TABLE user_points (
     user_id TEXT PRIMARY KEY,
     total_earned INTEGER NOT NULL DEFAULT 0,
     current_balance INTEGER NOT NULL DEFAULT 0,
     updated_at TEXT NOT NULL DEFAULT (datetime('now')),
     FOREIGN KEY (user_id) REFERENCES user_progress(user_id)
   );
   
   CREATE TABLE point_transactions (
     id TEXT PRIMARY KEY,
     user_id TEXT NOT NULL,
     amount INTEGER NOT NULL,
     source TEXT NOT NULL,
     metadata TEXT, -- JSON
     created_at TEXT NOT NULL DEFAULT (datetime('now')),
     FOREIGN KEY (user_id) REFERENCES user_progress(user_id)
   );
   
   CREATE TABLE vocab_mastery (
     user_id TEXT NOT NULL,
     lemma TEXT NOT NULL,
     accuracy_rate REAL NOT NULL DEFAULT 0.0,
     consistency_score REAL NOT NULL DEFAULT 0.0,
     retention_strength REAL NOT NULL DEFAULT 0.0,
     speed_fluency REAL NOT NULL DEFAULT 0.0,
     context_breadth REAL NOT NULL DEFAULT 0.0,
     recency_decay_factor REAL NOT NULL DEFAULT 1.0,
     trend_multiplier REAL NOT NULL DEFAULT 1.0,
     mastery_level REAL NOT NULL DEFAULT 0.0,
     last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
     first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
     PRIMARY KEY (user_id, lemma),
     FOREIGN KEY (user_id) REFERENCES user_progress(user_id)
   );
   ```

3. **Write map/region tables**
   - `regions` (seed data)
   - `user_regions`

4. **Write character tables**
   - `characters` (seed data with grading_weights as JSON)
   - `user_character_relationships` (generic with metadata JSON)
   - `character_interactions`

5. **Write pen pal tables**
   - `pen_pals` (seed data)
   - `user_pen_pals`
   - `pen_pal_letters`
   - `collectibles` (seed data with metadata JSON)
   - `user_collectibles`

6. **Write foto tables**
   - `fotos` (seed data)
   - `user_fotos`

7. **Write mini-game tables**
   - `user_fairy_tales`
   - `fairy_tale_turns`

8. **Define indexes**
   ```sql
   CREATE INDEX idx_user_quests_user ON user_quests(user_id);
   CREATE INDEX idx_user_quests_completed ON user_quests(user_id, completed);
   CREATE INDEX idx_point_transactions_user ON point_transactions(user_id);
   CREATE INDEX idx_point_transactions_created ON point_transactions(created_at);
   CREATE INDEX idx_character_interactions_user ON character_interactions(user_id);
   CREATE INDEX idx_character_interactions_character ON character_interactions(character_id);
   CREATE INDEX idx_pen_pal_letters_user ON pen_pal_letters(user_id);
   CREATE INDEX idx_pen_pal_letters_penpal ON pen_pal_letters(pen_pal_id);
   CREATE INDEX idx_vocab_mastery_mastery ON vocab_mastery(user_id, mastery_level);
   ```

9. **Write seed data**
   - Quests (Der Meister, Lauscher, etc.)
   - Regions (Berlin → Saxony)
   - Characters (Karl, Mila, Lena, etc. with grading weights)
   - Pen pals (8 profiles)
   - Badge thresholds (10, 50, 100, 500, 1000)

10. **Test migrations locally**
    ```bash
    # Create local D1 database
    wrangler d1 create iris-gamification-local
    
    # Run migrations
    wrangler d1 execute iris-gamification-local --file=db/migrations/001_initial_gamification.sql
    wrangler d1 execute iris-gamification-local --file=db/seeds/001_quests.sql
    
    # Verify tables
    wrangler d1 execute iris-gamification-local --command="SELECT name FROM sqlite_master WHERE type='table'"
    ```

11. **Document schema**
    - Create `db/README.md` with table descriptions
    - Document foreign key relationships
    - Document JSON column structures
    - Migration instructions

---

## Testing

**Run migrations:**
```bash
wrangler d1 execute iris-gamification-local --file=db/migrations/001_initial_gamification.sql
```

**Verify table structure:**
```bash
wrangler d1 execute iris-gamification-local --command="PRAGMA table_info(user_progress)"
```

**Test foreign key constraints:**
```sql
-- Should fail (no user exists)
INSERT INTO user_quests (id, user_id, quest_id, progress)
VALUES ('test', 'nonexistent', 'quest1', 0);
```

**Test seed data:**
```bash
wrangler d1 execute iris-gamification-local --file=db/seeds/001_quests.sql
wrangler d1 execute iris-gamification-local --command="SELECT COUNT(*) FROM quests"
-- Should return count of seeded quests
```

---

## Design References

- **Spec**: "Interfaces / Data Shapes" section (TypeScript schemas)
- **OpenAPI**: Tasks 1-3 (schemas must match)
- **Spec**: R2 (mastery multi-signal formula)
- **Spec**: R15 (generic character relationship with metadata)

---

## Key Design Decisions

**Q: SQLite doesn't have native JSON type - how to store metadata?**  
A: Use TEXT column with JSON string. Query with `json_extract()`. Example: `SELECT json_extract(metadata, '$.bavarian_bread_discussed') FROM user_character_relationships`.

**Q: How to handle updated_at timestamps?**  
A: Create trigger:
```sql
CREATE TRIGGER update_user_progress_timestamp 
AFTER UPDATE ON user_progress
FOR EACH ROW
BEGIN
  UPDATE user_progress SET updated_at = datetime('now') WHERE user_id = NEW.user_id;
END;
```

**Q: Should we use UUIDs or autoincrement IDs?**  
A: UUIDs for distributed systems (Cloudflare Workers can run in multiple regions). Generate with `crypto.randomUUID()` in Workers.

**Q: How to enforce max 3 letters per week (R30)?**  
A: Application logic, not database constraint. Query: `SELECT COUNT(*) FROM pen_pal_letters WHERE sender='pen_pal' AND user_id=? AND sent_at > datetime('now', '-7 days')`.

---

## Notes

- D1 is SQLite-based, so use SQLite syntax (no PostgreSQL features)
- JSON columns queried with `json_extract()`
- TEXT type for timestamps (ISO 8601 format)
- INTEGER for booleans (0/1)
- Indexes critical for performance (user_id on everything)
- Seed data must match spec exactly (quest thresholds, character grading weights)
- Migration versioning prevents conflicts across team
- **Foto image generation**: Use nanobanana + Vertex API (same as scenecraft-engine). Pre-generate images and cache in R2. Store `generation_prompt` in fotos table for reference/regeneration. See `../scenecraft-engine` for implementation pattern.
