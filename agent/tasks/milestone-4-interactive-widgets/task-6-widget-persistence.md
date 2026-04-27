# Task 6: Widget Persistence in D1

**Milestone**: M4 — Interactive Widgets
**Status**: Pending
**Estimated**: 1–2 hours
**Dependencies**: Task 5

## Objective

Persist the full widget lifecycle (payload + response + result) as a `WidgetContentBlock` on the assistant message in D1. Ensure the history replay on WS connect sends these blocks so completed widgets render correctly after page refresh.

## Steps

1. Change the assistant message content format: currently stored as a plain string, now needs to support `ContentBlock[]` (same shape as scenecraft)
2. When a widget completes (graded), build a `WidgetContentBlock`:
   ```
   { type: 'widget', widget_type: 'flashcard-matching', widget_id, payload, response, result }
   ```
3. If the turn also had text from Claude (before/after the tool call), include `TextContentBlock` entries alongside
4. Persist the entire `ContentBlock[]` as JSON in the messages table `content` column
5. For timed-out widgets: persist with `response: null, result: null`
6. For cancelled widgets: persist with a `cancelled: true` flag
7. Update the `loadHistory()` function to handle `ContentBlock[]` content (not just strings)
8. Update the WS `history` message to include widget blocks
9. Verify that the client's history rendering (Virtuoso) handles both plain-text turns and widget turns

## Verification

- [ ] Completed widget survives page refresh — visible in history with correct state
- [ ] Timed-out widget shows in history without answers
- [ ] Cancelled widget shows in history with cancellation note
- [ ] Plain-text turns still render correctly (backward compat)
- [ ] History load doesn't break if old messages are plain strings
