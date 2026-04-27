# Milestone 3: Tutor Mode & Curriculum Data

**Status**: ✅ Complete
**Versions**: v0.5.0 – v0.7.0
**Completed**: 2026-04-27

## Goal

Transform Iris from a generic polyglot into a structured language tutor. Ingest curriculum data (Goethe Wortlisten + Tatoeba), add a language picker, make Iris vocabulary-aware per turn, and begin spaced-repetition tracking.

## Deliverables

- [x] Tutor-mode system prompt (English L1, target language as L2)
- [x] Typeahead language picker (53 languages, fuzzy search, persisted in D1)
- [x] Curriculum schema: vocab_items, vocab_examples, sentences, sentence_pairs, user_vocab_progress (SM-2)
- [x] Goethe Wortlisten ingested: 4,870 vocab items (A1/A2/B1) + 7,311 example sentences
- [x] Tatoeba DE-EN pairs ingested: 577,582 translation pairs, 940,670 sentences
- [x] Iris-aware vocabulary: 5 CEFR-graded words injected into system prompt per turn
- [x] Spaced-repetition tracking: words marked seen with 24h due_at
- [x] Virtualized chat list (react-virtuoso) with smart auto-scroll
- [x] WebSocket auto-reconnect with capped exponential backoff
