# Task 1: Define Shared Widget Types

**Milestone**: M4 — Interactive Widgets
**Status**: Pending
**Estimated**: 1 hour
**Dependencies**: None

## Objective

Create `shared/types/widgets.ts` with all 11 widget type interfaces, the Widget union, WidgetResponse, WidgetResult, and WidgetCancel types. This file is imported by both `worker/` and `client/`.

## Steps

1. Create `shared/types/widgets.ts`
2. Define `WidgetBase`, all 11 widget interfaces per the design doc
3. Define `Widget` discriminated union
4. Define `FlashcardMatchingResponse`, `FlashcardMatchingResult`, `FlashcardMatchingCardResult`
5. Define `WidgetCancel`
6. Define `WidgetContentBlock` (for D1 persistence)
7. Export all types
8. Verify `tsconfig.json` includes `shared/` in its `include` paths
9. Verify both `npx tsc --noEmit` and `npx wrangler deploy --dry-run` pass

## Verification

- [ ] All 11 widget types defined
- [ ] Only `flashcard-matching` has card/response/result types fleshed out
- [ ] Types compile cleanly in both client and worker contexts
- [ ] No runtime code — types only
