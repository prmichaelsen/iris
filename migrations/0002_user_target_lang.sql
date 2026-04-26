-- Persist the user's currently chosen learning target language so it
-- survives across sessions. Stores all three fields (code + native name +
-- English name) so the worker can build the system prompt without needing
-- a server-side language lookup table.
ALTER TABLE users ADD COLUMN target_lang_code TEXT;
ALTER TABLE users ADD COLUMN target_lang_name TEXT;
ALTER TABLE users ADD COLUMN target_lang_english TEXT;
