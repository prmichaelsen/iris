-- Curriculum tables: vocabulary spine, example sentences, lessons,
-- and per-user progress for spaced repetition.

CREATE TABLE vocab_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  language        TEXT NOT NULL DEFAULT 'deu',          -- ISO 639-3
  lemma           TEXT NOT NULL,                        -- normalized headword: "Abfahrt"
  display         TEXT NOT NULL,                        -- as printed: "die Abfahrt", "abholen(1)"
  article         TEXT,                                 -- "der" | "die" | "das" | NULL
  pos             TEXT,                                 -- "noun" | "verb" | "adj" | NULL (best-effort)
  cefr_level      TEXT NOT NULL,                        -- "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
  source          TEXT NOT NULL,                        -- "goethe" | ...
  created_at      INTEGER NOT NULL,
  UNIQUE (language, lemma, cefr_level, source)
);
CREATE INDEX idx_vocab_lang_lemma ON vocab_items(language, lemma);
CREATE INDEX idx_vocab_lang_level ON vocab_items(language, cefr_level);

-- Curated examples that travel WITH the vocab item (Goethe gives one per word).
CREATE TABLE vocab_examples (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  vocab_item_id   INTEGER NOT NULL REFERENCES vocab_items(id) ON DELETE CASCADE,
  sentence_de     TEXT NOT NULL,
  sentence_en     TEXT NOT NULL,
  source          TEXT NOT NULL DEFAULT 'goethe'
);
CREATE INDEX idx_vocab_examples_item ON vocab_examples(vocab_item_id);

-- Free-floating sentence corpus (Tatoeba etc.) — separate from curated examples.
CREATE TABLE sentences (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  source          TEXT NOT NULL,
  source_id       TEXT,
  language        TEXT NOT NULL,
  text            TEXT NOT NULL,
  attribution     TEXT,
  UNIQUE (source, source_id, language)
);
CREATE INDEX idx_sentences_lang ON sentences(language);

CREATE TABLE sentence_pairs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  sentence_a_id   INTEGER NOT NULL REFERENCES sentences(id) ON DELETE CASCADE,
  sentence_b_id   INTEGER NOT NULL REFERENCES sentences(id) ON DELETE CASCADE,
  UNIQUE (sentence_a_id, sentence_b_id)
);

-- Optional: which vocab item appears in which sentence (Tatoeba lemmatization)
CREATE TABLE sentence_vocab (
  sentence_id     INTEGER NOT NULL REFERENCES sentences(id) ON DELETE CASCADE,
  vocab_item_id   INTEGER NOT NULL REFERENCES vocab_items(id) ON DELETE CASCADE,
  PRIMARY KEY (sentence_id, vocab_item_id)
);

-- Lesson plans (FSI units, custom plans) ordered within a CEFR level
CREATE TABLE lessons (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  language        TEXT NOT NULL,
  cefr_level      TEXT NOT NULL,
  ordinal         INTEGER NOT NULL,
  theme           TEXT,
  source          TEXT NOT NULL,
  UNIQUE (language, source, ordinal)
);

CREATE TABLE lesson_vocab (
  lesson_id       INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  vocab_item_id   INTEGER NOT NULL REFERENCES vocab_items(id) ON DELETE CASCADE,
  position        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (lesson_id, vocab_item_id)
);

-- Per-user vocabulary progress with spaced-repetition fields (SM-2 inspired)
CREATE TABLE user_vocab_progress (
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vocab_item_id   INTEGER NOT NULL REFERENCES vocab_items(id) ON DELETE CASCADE,
  ease            REAL NOT NULL DEFAULT 2.5,
  interval_days   INTEGER NOT NULL DEFAULT 0,
  due_at          INTEGER,                              -- unix seconds
  last_seen_at    INTEGER,
  correct_count   INTEGER NOT NULL DEFAULT 0,
  incorrect_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, vocab_item_id)
);
CREATE INDEX idx_user_vocab_due ON user_vocab_progress(user_id, due_at);

-- Per-lesson progress (status + completion)
CREATE TABLE user_lesson_progress (
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id       INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress' | 'completed'
  started_at      INTEGER NOT NULL,
  completed_at    INTEGER,
  accuracy        REAL,
  PRIMARY KEY (user_id, lesson_id)
);
