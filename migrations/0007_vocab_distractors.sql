CREATE TABLE vocab_distractors (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  vocab_item_id   INTEGER NOT NULL REFERENCES vocab_items(id) ON DELETE CASCADE,
  distractor_en   TEXT NOT NULL,
  UNIQUE (vocab_item_id, distractor_en)
);
CREATE INDEX idx_distractors_vocab ON vocab_distractors(vocab_item_id);
