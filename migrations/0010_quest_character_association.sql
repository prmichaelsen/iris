-- Migration 003: Quest Character Association
-- Created: 2026-04-27
-- Description: Add character association and success criteria to quests for narrative quest system

-- Add character_id column to link quests to specific characters
ALTER TABLE quests ADD COLUMN character_id TEXT;

-- Add success_criteria JSON field for quest-specific completion conditions
-- Examples:
--   {"max_timeouts": 3, "timer_seconds": 5} for Karl's impatience mechanic
--   {"min_relationship": 40} for quests requiring friendship
--   {"required_items": ["schnitzel", "kartoffelsalat"]} for ordering quests
ALTER TABLE quests ADD COLUMN success_criteria TEXT;

-- Add foreign key constraint (SQLite 3.6.19+ supports foreign keys)
-- character_id references characters(id)

-- Add 'narrative' category for character-driven story quests
-- Note: SQLite doesn't support altering CHECK constraints directly
-- This would require recreating the table in a production migration
-- For now, the seed data will use 'narrative' and we'll document it

-- Index for querying quests by character
CREATE INDEX IF NOT EXISTS idx_quests_character ON quests(character_id);

-- Comment explaining the fields
-- character_id: Links quest to specific character (e.g., 'char_karl_baker')
-- success_criteria: JSON object defining quest-specific completion conditions
--   - max_timeouts: Maximum allowed timer expiries (for impatient characters)
--   - timer_seconds: Response time limit per turn
--   - min_relationship: Minimum relationship level required
--   - required_actions: Array of actions that must be completed
