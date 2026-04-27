# Task 7: FlashcardWidget Client Component

**Milestone**: M4 — Interactive Widgets
**Status**: Pending
**Estimated**: 2–3 hours
**Dependencies**: Task 1, Task 4

## Objective

Build the React component that renders a flashcard-matching batch inline in the chat. Handles the sequential card-stepping flow, the summary screen, and the completed-state rendering for history.

## Steps

### Active Widget (user answering)
1. Create `client/FlashcardWidget.tsx`
2. Props: `widget: FlashcardMatchingWidget`, `onSubmit: (answers) => void`
3. State: `currentCardIndex`, `answers: Map<card_id, selected_index>`
4. Render current card:
   - Show the German word prominently
   - Show 4 option buttons
   - Progress indicator: "3 / 10"
   - On option tap: record answer, advance to next card
   - No back button (can't change previous answers — keeps it simple)
5. After last card: show a "Submit" confirmation (or auto-submit)
6. Call `onSubmit(answers)` which sends the `widget_response` over WS

### Completed Widget (in history)
7. Create `client/FlashcardResult.tsx` (or a mode within FlashcardWidget)
8. Props: `widget`, `response`, `result`
9. Render:
   - Score prominently: "7 / 10"
   - Per-card list: word, what user picked, correct answer, ✓/✗ indicator
   - "Retake" button
10. On retake: dispatch a `widget_retake` message to the WS (or re-invoke the tool via a chat message)

### Integration into App.tsx
11. In the Virtuoso `itemContent`, detect `WidgetContentBlock` in a turn's content
12. If active (no result yet): render `FlashcardWidget`
13. If completed: render `FlashcardResult`
14. Style to match the Iris design language (warm tones, serif, rounded borders)

## Verification

- [ ] 10-card sequence renders one card at a time
- [ ] Progress indicator updates correctly
- [ ] Tapping an option highlights it and advances
- [ ] Summary/submit works after the last card
- [ ] Completed state in history shows all cards with grades
- [ ] Retake button triggers a new widget
- [ ] Mobile-friendly: large tap targets, no hover-dependent interactions
