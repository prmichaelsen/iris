# Task 5: Server-Side Grading + SM-2 Update

**Milestone**: M4 — Interactive Widgets
**Status**: Pending
**Estimated**: 1–2 hours
**Dependencies**: Task 3

## Objective

Grade the user's flashcard answers server-side, compute a score, update `user_vocab_progress` with real SM-2 scoring, and build a text summary for Claude.

## Steps

1. Receive `widget_response` with `answers: [{ card_id, selected_index }]`
2. Match each answer against the server-side `correct_index` map
3. Handle edge cases:
   - Missing cards in the response → scored as incorrect
   - `selected_index` out of bounds → scored as incorrect
   - Partial responses (fewer answers than cards) → missing ones incorrect
4. Compute score: `correct_count / total`
5. For each card, run SM-2 update:
   - Read current `user_vocab_progress` (ease, interval_days) — default ease=2.5, interval=0 if no row
   - Apply `sm2Update(correct, { ease, interval_days })`
   - Upsert to D1 with new `ease`, `interval_days`, `due_at`, `last_seen_at`, and increment `correct_count` or `incorrect_count`
6. Build `FlashcardMatchingResult`: per-card results with revealed `correct_answer` and `correct_index`
7. Send `{ type: 'widget_result', ...result }` to client
8. Build text summary for Claude: "User scored 7/10: Abfahrt ✓, Schule ✗, ..."
9. Return the text summary as the tool_result content

## Verification

- [ ] Correct answers increase ease and extend interval per SM-2
- [ ] Incorrect answers reset interval to 0 and decrease ease (floor 1.3)
- [ ] First correct answer: interval 0→1, ease 2.5→2.6
- [ ] Missing/out-of-bounds answers scored as incorrect
- [ ] widget_result contains revealed correct_answer and correct_index for every card
- [ ] Claude receives a text summary, not structured JSON
