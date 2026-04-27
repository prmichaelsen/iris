-- User study list — words the user wants to practice.
-- Iris is instructed to occasionally use these words in replies and
-- show the English gloss inline when she does: "gerade (already)".
-- Priority is a soft score used to decide which words get injected
-- into the system prompt each turn.

CREATE TABLE IF NOT EXISTS user_study_list (
  user_id TEXT NOT NULL,
  lemma TEXT NOT NULL,
  gloss TEXT,                        -- English translation, cached at add-time
  notes TEXT,                        -- optional user note
  base_priority REAL NOT NULL DEFAULT 0.65,
  last_touched_at INTEGER NOT NULL,  -- unix seconds; drives decay
  added_at INTEGER NOT NULL,
  uses_by_iris INTEGER NOT NULL DEFAULT 0,
  uses_by_user INTEGER NOT NULL DEFAULT 0,
  clarifications_requested INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, lemma)
);

CREATE INDEX IF NOT EXISTS idx_study_list_user_priority
  ON user_study_list (user_id, base_priority DESC);

CREATE INDEX IF NOT EXISTS idx_study_list_user_added
  ON user_study_list (user_id, added_at DESC);
