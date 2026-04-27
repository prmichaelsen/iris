# Task 8: Integration Testing & Deploy

**Milestone**: M4 — Interactive Widgets
**Status**: Pending
**Estimated**: 1–2 hours
**Dependencies**: Task 2, Task 3, Task 4, Task 5, Task 6, Task 7

## Objective

End-to-end integration test: Claude calls flashcard → server generates → client renders → user answers → server grades → Claude reacts → widget persists → page refresh shows completed widget → retake works. Then deploy.

## Steps

1. Run `npm run dev` locally, sign in, select German
2. Say "quiz me on some vocabulary" — verify Claude invokes the flashcard tool
3. Verify 10 cards render sequentially
4. Answer all 10, verify:
   - Summary screen shows score
   - Claude responds naturally to the score
   - Widget appears in chat history with ✓/✗ marks
5. Refresh the page — verify widget renders in completed state from history
6. Click retake — verify new widget with same words, fresh shuffle
7. Test edge cases:
   - Disconnect mid-widget (kill WS) → verify timeout after reconnect
   - Change language mid-widget → verify cancellation
   - Say something while widget is pending → verify voice is queued
8. Check D1: `user_vocab_progress` rows have updated ease/interval/due_at
9. Type-check: `npx tsc --noEmit`
10. Worker bundle: `npx wrangler deploy --dry-run`
11. Deploy: `npm run deploy`
12. Smoke-test on production URL

## Verification

- [ ] Full happy path works end-to-end (voice → tool → widget → grade → history)
- [ ] Timeout, cancel, and voice-queueing edge cases handled
- [ ] SM-2 values correct in D1
- [ ] Production deploy succeeds
- [ ] Works on both desktop and mobile (iOS Safari)
