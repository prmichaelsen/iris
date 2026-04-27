# Task 4: WebSocket Protocol Extensions

**Milestone**: M4 — Interactive Widgets
**Status**: Pending
**Estimated**: 1 hour
**Dependencies**: Task 1

## Objective

Extend the WS message handling in both worker and client to support the new message types: `widget`, `widget_response`, `widget_result`, `widget_cancel`.

## Steps

### Worker side
1. Add a `pendingWidget` map: `Map<string, { resolve, reject, timer }>` keyed by widget_id
2. In the WS message handler, when a text message with `type === 'widget_response'` arrives:
   - Look up the pending widget by widget_id
   - If found and not expired: clear the timer, resolve the promise with the answers
   - If not found: log warning, ignore
3. When language change arrives while a widget is pending:
   - Send `{ type: 'widget_cancel', widget_id, reason: 'Language changed' }`
   - Reject the pending promise
   - Clear the timer
4. When voice audio arrives while a widget is pending:
   - Queue it (push to an array)
   - After widget resolves: process the queued audio as a normal turn

### Client side
5. In App.tsx's WS `onmessage`, handle:
   - `widget` → set active widget state
   - `widget_result` → update widget to completed state, add to history
   - `widget_cancel` → clear active widget, show cancellation notice

## Verification

- [ ] Worker correctly routes `widget_response` to the pending widget
- [ ] Wrong widget_id is silently ignored
- [ ] Language change cancels pending widget
- [ ] Voice messages queue during pending widget
- [ ] Client handles all three new message types
