-- Migration 001: Initial Gamification Schema
-- Created: 2026-04-27
-- Description: Core gamification tables for Iris engagement system

-- ============================================
-- CORE PROGRESS TRACKING
-- ============================================

-- User overall progress and level
CREATE TABLE IF NOT EXISTS user_progress (
  user_id TEXT PRIMARY KEY,
  level INTEGER NOT NULL DEFAULT 1,
  xp_current INTEGER NOT NULL DEFAULT 0,
  xp_to_next_level INTEGER NOT NULL DEFAULT 100,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Quest definitions (seed data)
CREATE TABLE IF NOT EXISTS quests (
  id TEXT PRIMARY KEY,
  name_de TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_de TEXT NOT NULL,
  description_en TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('skill', 'achievement', 'streak', 'hidden', 'lesson', 'cultural', 'meta')),
  badge_skill TEXT,
  tier_thresholds TEXT NOT NULL, -- JSON array: [10, 50, 100, 500, 1000]
  points_reward INTEGER NOT NULL,
  is_repeatable INTEGER NOT NULL DEFAULT 0,
  is_hidden INTEGER NOT NULL DEFAULT 0
);

-- User quest progress
CREATE TABLE IF NOT EXISTS user_quests (
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

-- Badge progression per skill
CREATE TABLE IF NOT EXISTS user_badges (
  user_id TEXT NOT NULL,
  skill TEXT NOT NULL,
  tier TEXT NOT NULL CHECK(tier IN ('grey', 'bronze', 'silver', 'gold', 'diamond', 'platinum')),
  progress INTEGER NOT NULL DEFAULT 0,
  unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, skill, tier),
  FOREIGN KEY (user_id) REFERENCES user_progress(user_id)
);

-- Point balance tracking
CREATE TABLE IF NOT EXISTS user_points (
  user_id TEXT PRIMARY KEY,
  total_earned INTEGER NOT NULL DEFAULT 0,
  current_balance INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES user_progress(user_id)
);

-- Point transaction history
CREATE TABLE IF NOT EXISTS point_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  metadata TEXT, -- JSON: {quest_id, item_purchased, etc}
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES user_progress(user_id)
);

-- Vocabulary mastery tracking with multi-signal formula
CREATE TABLE IF NOT EXISTS vocab_mastery (
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

-- ============================================
-- MAP & REGIONAL PROGRESSION
-- ============================================

-- Region definitions (seed data)
CREATE TABLE IF NOT EXISTS regions (
  id TEXT PRIMARY KEY,
  name_de TEXT NOT NULL,
  name_en TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  description_de TEXT NOT NULL,
  description_en TEXT NOT NULL,
  voice_unlock TEXT NOT NULL,
  point_cost INTEGER NOT NULL,
  is_bonus INTEGER NOT NULL DEFAULT 0,
  unlock_requirements TEXT -- JSON: {regions_completed: [...], badges: {...}}
);

-- User region unlock and completion status
CREATE TABLE IF NOT EXISTS user_regions (
  user_id TEXT NOT NULL,
  region_id TEXT NOT NULL,
  unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  subquests_completed INTEGER NOT NULL DEFAULT 0,
  subquests_total INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, region_id),
  FOREIGN KEY (user_id) REFERENCES user_progress(user_id),
  FOREIGN KEY (region_id) REFERENCES regions(id)
);

-- ============================================
-- CHARACTERS & RELATIONSHIPS
-- ============================================

-- Character definitions (seed data)
CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER,
  region_id TEXT NOT NULL,
  personality_description TEXT NOT NULL,
  specialty TEXT NOT NULL,
  unlock_requirements TEXT, -- JSON: {tier, quest_id, etc}
  grading_weights TEXT NOT NULL, -- JSON: {vocabulary: 0.25, cultural_awareness: 0.15, ...}
  FOREIGN KEY (region_id) REFERENCES regions(id)
);

-- Generic character relationship tracking
CREATE TABLE IF NOT EXISTS user_character_relationships (
  user_id TEXT NOT NULL,
  character_id TEXT NOT NULL,
  relationship_level INTEGER NOT NULL DEFAULT 0,
  interactions_count INTEGER NOT NULL DEFAULT 0,
  last_interaction_at TEXT,
  metadata TEXT, -- JSON: {topics_discussed, gifts_received, mini_game_scores, etc}
  PRIMARY KEY (user_id, character_id),
  FOREIGN KEY (user_id) REFERENCES user_progress(user_id),
  FOREIGN KEY (character_id) REFERENCES characters(id)
);

-- Character interaction history
CREATE TABLE IF NOT EXISTS character_interactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  character_id TEXT NOT NULL,
  interaction_type TEXT NOT NULL, -- 'conversation', 'mini_game', 'gift_received'
  topic TEXT,
  score REAL,
  metadata TEXT, -- JSON: specific details about the interaction
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES user_progress(user_id),
  FOREIGN KEY (character_id) REFERENCES characters(id)
);

-- ============================================
-- PEN PALS & LETTER SYSTEM
-- ============================================

-- Pen pal profiles (seed data)
CREATE TABLE IF NOT EXISTS pen_pals (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  region_id TEXT NOT NULL,
  bio_de TEXT NOT NULL,
  bio_en TEXT NOT NULL,
  topics TEXT NOT NULL, -- JSON array: ["art", "music", "politics"]
  recommendations TEXT NOT NULL, -- JSON: {music: [...], films: [...], books: [...]}
  FOREIGN KEY (character_id) REFERENCES characters(id),
  FOREIGN KEY (region_id) REFERENCES regions(id)
);

-- User pen pal relationship status
CREATE TABLE IF NOT EXISTS user_pen_pals (
  user_id TEXT NOT NULL,
  pen_pal_id TEXT NOT NULL,
  unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
  relationship_level INTEGER NOT NULL DEFAULT 0,
  letters_sent INTEGER NOT NULL DEFAULT 0,
  letters_received INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, pen_pal_id),
  FOREIGN KEY (user_id) REFERENCES user_progress(user_id),
  FOREIGN KEY (pen_pal_id) REFERENCES pen_pals(id)
);

-- Letter exchange history
CREATE TABLE IF NOT EXISTS pen_pal_letters (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  pen_pal_id TEXT NOT NULL,
  sender TEXT NOT NULL CHECK(sender IN ('user', 'pen_pal')),
  content TEXT NOT NULL,
  topic TEXT,
  sentiment TEXT, -- 'positive', 'neutral', 'reflective'
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES user_progress(user_id),
  FOREIGN KEY (pen_pal_id) REFERENCES pen_pals(id)
);

-- ============================================
-- COLLECTIBLES & GIFTS
-- ============================================

-- Collectible definitions (seed data)
CREATE TABLE IF NOT EXISTS collectibles (
  id TEXT PRIMARY KEY,
  name_de TEXT NOT NULL,
  name_en TEXT NOT NULL,
  category TEXT NOT NULL, -- 'sticker', 'vinyl_record', 'wine_label', 'flower', 'postcard', etc
  pen_pal_id TEXT,
  region_id TEXT,
  rarity TEXT NOT NULL CHECK(rarity IN ('common', 'uncommon', 'rare', 'legendary')),
  description_de TEXT NOT NULL,
  description_en TEXT NOT NULL,
  image_url TEXT,
  metadata TEXT, -- JSON: extra attributes specific to collectible type
  FOREIGN KEY (pen_pal_id) REFERENCES pen_pals(id),
  FOREIGN KEY (region_id) REFERENCES regions(id)
);

-- User collectible inventory
CREATE TABLE IF NOT EXISTS user_collectibles (
  user_id TEXT NOT NULL,
  collectible_id TEXT NOT NULL,
  acquired_at TEXT NOT NULL DEFAULT (datetime('now')),
  source TEXT NOT NULL, -- 'pen_pal_gift', 'quest_reward', 'loot_box', 'purchase'
  metadata TEXT, -- JSON: {letter_id, quest_id, etc}
  PRIMARY KEY (user_id, collectible_id),
  FOREIGN KEY (user_id) REFERENCES user_progress(user_id),
  FOREIGN KEY (collectible_id) REFERENCES collectibles(id)
);

-- ============================================
-- PHOTO COLLECTION (FOTOS)
-- ============================================

-- Photo definitions (seed data)
CREATE TABLE IF NOT EXISTS fotos (
  id TEXT PRIMARY KEY,
  title_de TEXT NOT NULL,
  title_en TEXT NOT NULL,
  caption_de TEXT NOT NULL,
  caption_en TEXT NOT NULL,
  category TEXT NOT NULL, -- 'menschen', 'orte', 'kultur', 'essen_trinken'
  region_id TEXT NOT NULL,
  tier INTEGER NOT NULL DEFAULT 1, -- 1-4 (gating based on mastery)
  subquest_id TEXT,
  image_url TEXT,
  generation_prompt TEXT, -- For AI image regeneration
  FOREIGN KEY (region_id) REFERENCES regions(id)
);

-- User unlocked photos
CREATE TABLE IF NOT EXISTS user_fotos (
  user_id TEXT NOT NULL,
  foto_id TEXT NOT NULL,
  unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
  subquest_completed TEXT,
  PRIMARY KEY (user_id, foto_id),
  FOREIGN KEY (user_id) REFERENCES user_progress(user_id),
  FOREIGN KEY (foto_id) REFERENCES fotos(id)
);

-- ============================================
-- MINI-GAMES (Emma's Märchenbuch)
-- ============================================

-- User fairy tale story progress
CREATE TABLE IF NOT EXISTS user_fairy_tales (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  story_title TEXT NOT NULL,
  current_turn INTEGER NOT NULL DEFAULT 1,
  story_state TEXT NOT NULL, -- JSON: current narrative state
  completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES user_progress(user_id)
);

-- Individual story turns/interactions
CREATE TABLE IF NOT EXISTS fairy_tale_turns (
  id TEXT PRIMARY KEY,
  fairy_tale_id TEXT NOT NULL,
  turn_number INTEGER NOT NULL,
  user_choice TEXT NOT NULL,
  emma_response TEXT NOT NULL,
  grammar_correction TEXT, -- JSON: corrections made if any
  vocabulary_learned TEXT, -- JSON: new words introduced
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (fairy_tale_id) REFERENCES user_fairy_tales(id)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_quests_user ON user_quests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quests_completed ON user_quests(user_id, completed);
CREATE INDEX IF NOT EXISTS idx_user_quests_quest ON user_quests(quest_id);

CREATE INDEX IF NOT EXISTS idx_point_transactions_user ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created ON point_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_point_transactions_source ON point_transactions(source);

CREATE INDEX IF NOT EXISTS idx_vocab_mastery_mastery ON vocab_mastery(user_id, mastery_level);
CREATE INDEX IF NOT EXISTS idx_vocab_mastery_last_seen ON vocab_mastery(user_id, last_seen_at);

CREATE INDEX IF NOT EXISTS idx_user_regions_user ON user_regions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_regions_completed ON user_regions(user_id, completed);

CREATE INDEX IF NOT EXISTS idx_character_interactions_user ON character_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_character_interactions_character ON character_interactions(character_id);
CREATE INDEX IF NOT EXISTS idx_character_interactions_created ON character_interactions(created_at);

CREATE INDEX IF NOT EXISTS idx_pen_pal_letters_user ON pen_pal_letters(user_id);
CREATE INDEX IF NOT EXISTS idx_pen_pal_letters_penpal ON pen_pal_letters(pen_pal_id);
CREATE INDEX IF NOT EXISTS idx_pen_pal_letters_sent ON pen_pal_letters(sent_at);

CREATE INDEX IF NOT EXISTS idx_user_collectibles_user ON user_collectibles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_collectibles_collectible ON user_collectibles(collectible_id);

CREATE INDEX IF NOT EXISTS idx_user_fotos_user ON user_fotos(user_id);
CREATE INDEX IF NOT EXISTS idx_user_fotos_foto ON user_fotos(foto_id);

CREATE INDEX IF NOT EXISTS idx_fairy_tale_turns_tale ON fairy_tale_turns(fairy_tale_id);

-- ============================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================

CREATE TRIGGER IF NOT EXISTS update_user_progress_timestamp
AFTER UPDATE ON user_progress
FOR EACH ROW
BEGIN
  UPDATE user_progress SET updated_at = datetime('now') WHERE user_id = NEW.user_id;
END;

CREATE TRIGGER IF NOT EXISTS update_user_points_timestamp
AFTER UPDATE ON user_points
FOR EACH ROW
BEGIN
  UPDATE user_points SET updated_at = datetime('now') WHERE user_id = NEW.user_id;
END;
