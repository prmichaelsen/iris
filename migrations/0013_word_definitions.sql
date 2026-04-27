-- Cached word definitions for hover/tap translation popover.
-- Primary key (lemma, target_lang_code) enables fast lookup.
-- Populated lazily: vocab_cards first, then Claude fallback.

CREATE TABLE IF NOT EXISTS word_definitions (
  lemma TEXT NOT NULL,
  target_lang_code TEXT NOT NULL,
  article TEXT,                  -- "der" | "die" | "das" | NULL for non-nouns
  gloss TEXT NOT NULL,           -- English translation
  cefr_level TEXT,               -- A1 | A2 | B1 | B2 | C1 | C2 | NULL
  example_de TEXT,               -- German example sentence
  example_en TEXT,               -- English translation of example
  source TEXT NOT NULL,          -- 'vocab_cards' | 'claude' | 'manual'
  created_at INTEGER NOT NULL,
  PRIMARY KEY (lemma, target_lang_code)
);

CREATE INDEX IF NOT EXISTS idx_word_definitions_lemma ON word_definitions(lemma);
