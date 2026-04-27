# Task 3: Server-Side Flashcard Generation

**Milestone**: M4 — Interactive Widgets
**Status**: Pending
**Estimated**: 2 hours
**Dependencies**: Task 1, Task 2

## Objective

Implement `executeFlashcard()` — queries D1 for vocab items, generates distractors, assembles a batch, sends the widget to the client, and waits for the response.

## Steps

1. Validate tool input: mode must be 'matching', count 1–20 (default 10), reject if no targetLang
2. Query D1 for `count` vocab items using the existing `pickVocab` logic (unseen → due → seen, by CEFR level)
3. For each item, query 3 distractor glosses from the same CEFR level (`vocab_examples.sentence_en` or a gloss column). Ensure:
   - No duplicate options within a card
   - Correct answer appears exactly once
   - Fallback to adjacent CEFR levels if fewer than 3 other words exist
4. Shuffle options per card, record `correct_index` server-side (do NOT send to client)
5. Generate `widget_id` and per-card `card_id` values
6. Send `{ type: 'widget', widget: { type: 'flashcard-matching', widget_id, cards, cefr_level } }` over WS
7. Start a 300s timeout (`setTimeout` or promise race)
8. Await `widget_response` from the client (via a pending-widget map, keyed by widget_id)
9. If timeout fires first: resolve with a timeout result
10. Return the response (or timeout) to the tool-use loop for grading

## Verification

- [ ] Batch of 10 cards generated with correct structure
- [ ] No `correct_index` or `correct_answer` in the payload sent to client
- [ ] Distractors are unique per card and don't repeat the correct answer
- [ ] Falls back to adjacent CEFR levels when needed
- [ ] Handles edge case: zero vocab items → tool error
