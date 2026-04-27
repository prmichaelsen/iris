# Milestone 4: Interactive Widgets (Flashcard-Matching MVP)

**Status**: 🔵 In Progress
**Spec**: `agent/specs/local.widget-system-phase1.md`
**Design**: `agent/design/local.widget-system.md`
**Estimated**: 1–2 days

## Goal

Add Claude tool-use to the Worker so Claude can invoke a `flashcard` tool that produces an interactive matching-quiz widget rendered inline in the chat. Server-side grading, SM-2 progress updates, full widget persistence for replay and retake.

## Deliverables

- [ ] Shared widget type definitions (`types/widgets.ts`) — all 11 widget types defined, only flashcard-matching implemented
- [ ] Claude tool-use streaming loop in the Worker (max 10 iterations per turn)
- [ ] `flashcard` tool definition registered with Claude
- [ ] Server-side flashcard generation: vocab query, distractor generation, batch assembly
- [ ] WebSocket protocol extensions: `widget`, `widget_response`, `widget_result`, `widget_cancel`
- [ ] Server-side grading (index comparison, no correct answer sent to client)
- [ ] SM-2 progress scoring on widget completion
- [ ] Widget persistence as ContentBlock in D1 messages
- [ ] Client: FlashcardWidget component — sequential card stepper with progress indicator
- [ ] Client: completed widget rendering in history (cards, answers, correct reveals, score)
- [ ] Client: retake button on completed widgets
- [ ] 300s timeout for pending widgets
- [ ] Widget cancellation on language change
- [ ] Voice message queueing during pending widget

## Success Criteria

- User can say "quiz me" and Claude invokes the flashcard tool
- 10-card batch renders as a sequential flow, one card at a time
- Summary screen shows score + per-card results with revealed answers
- Page refresh shows completed widgets in history
- Retake works with fresh shuffled options
- SM-2 intervals update correctly (wrong → reset, right → extend)
