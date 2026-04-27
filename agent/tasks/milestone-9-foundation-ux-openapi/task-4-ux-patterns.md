# Task 4: UX Patterns Document

**Milestone**: M9 - Foundation + UX Design + OpenAPI  
**Status**: Pending  
**Estimated Hours**: 10  
**Dependencies**: None (can run parallel to OpenAPI tasks)  

---

## Objective

Create comprehensive UX patterns document that defines user flows, layouts, interactions, and animations for all major gamification surfaces. This guides M15 UI implementation without blocking M10-M14 backend development.

---

## Scope

Document UX patterns (NOT UI implementation) for:

1. **Progress Page**
   - Layout structure (XP bar, strengths, badges, quests, improvement graph)
   - Mastery visualization (word lists with progress bars)
   - "Reinforcement Opportunities" framing (never "failures")
   - Recent gifts section

2. **Badge System**
   - Badge display in collection view
   - Unlock animation sequence (5-second full-screen → shrink to collection)
   - Tier progression indicator (ring around badge)
   - Hover/tap states

3. **Map Navigation**
   - Regional map layout (sequential unlock visualization)
   - Lock states for incomplete regions
   - Completion celebration animation
   - Subquest list per region with tier gates

4. **Quest Tracking**
   - Quest list organization (daily, weekly, skill, achievement)
   - Progress indicators
   - Completion notifications
   - Language progression (Tier 1 bilingual → Tier 3+ German only)

5. **Character Interactions**
   - Pre-conversation prep screen (Iris's cultural context)
   - During conversation help system (lifelines: hint, suggestion, exit, slow down)
   - Post-conversation analysis (grade breakdown, feedback)
   - Character memory recognition (improvement/regression/absence comments)

6. **Foto Gallery**
   - Grid layout with filter options (region, category)
   - Locked Fotos as silhouettes
   - Unlock notification animation
   - Full-size view with German/English captions

7. **Pen Pal Interface**
   - Pen pal list with temperature indicators (🔥🔥🔥 → 💤)
   - Letter thread conversation view
   - Gift reveal animation when opening letters
   - Reply composition interface

8. **Collection Browser**
   - Collections organized by pen pal
   - Completion progress per collection
   - Locked items as "???" silhouettes
   - Metadata display (music links, tasting notes, etc.)

9. **Help System During Conversations**
   - Help button placement (always accessible but non-intrusive)
   - Lifeline option menu (Translation Hint 10 XP, Suggested Response 20 XP, etc.)
   - Iris whisper overlay (meta-layer, invisible to character)
   - Character annoyance indicators (if help used 3+ times)

10. **Mastery Visualization**
    - Word list with progress bars (0-100%)
    - Grouping: Mastered (🌟), Learning (📈), Reinforcement Opportunities (🔄)
    - Recent improvements highlighted
    - Last seen date for Reinforcement Opportunities
    - Suggested drill types per word

---

## Deliverable Format

Create `agent/design/ux-patterns.gamification.md` with:

### Structure

```markdown
# Gamification UX Patterns

## 1. Progress Page

### Layout
[Wireframe sketch or detailed description]

### Interactions
- User taps XP bar → shows XP breakdown (drill +10, bonus +10, etc.)
- User taps badge → navigates to badge collection view
- User taps quest → navigates to quest details
...

### Animations
- XP bar fill: 500ms ease-out
- Level-up: 2s full-screen celebration, confetti effect
...

### States
- Loading: skeleton screens
- Empty: "Complete your first exercise to start tracking progress"
- Populated: show all sections
...

### Accessibility
- Screen reader labels for all badges
- Color contrast meets WCAG AA
...

## 2. Badge System
[Same structure]

## 3. Map Navigation
[Same structure]

...
```

### Per Section Include

- **Layout**: Describe visual hierarchy, component placement, grouping
- **Interactions**: Tap/click behaviors, hover states, gestures
- **Animations**: Timing, easing, sequencing (e.g., "badge materializes with tier-appropriate shimmer")
- **States**: Loading, empty, error, success
- **Accessibility**: Screen reader support, keyboard navigation, color contrast
- **Responsive**: Mobile vs tablet/desktop considerations
- **Copy Examples**: Sample text for labels, buttons, notifications

---

## Acceptance Criteria

- [ ] All 10 major surfaces documented with layout/interactions/animations/states
- [ ] Badge unlock animation sequence clearly specified (matches spec R4 visual design)
- [ ] Character help system flows documented (pre/during/post conversation)
- [ ] "Reinforcement Opportunities" framing used throughout (never "failures" per R28)
- [ ] Language progression documented (Tier 1 bilingual → Tier 3+ German only, R27)
- [ ] Notification patterns respect limits (max 1 pen pal/day, quiet hours, R30)
- [ ] Mastery visualization shows multi-signal breakdown (accuracy, consistency, retention, speed, context)
- [ ] Accessibility considerations included for each pattern
- [ ] Copy examples demonstrate positive reinforcement tone
- [ ] Cross-references to spec requirements (R1-R30)

---

## Implementation Steps

1. **Research existing patterns**
   - Review Duolingo, Busuu, Babbel progress tracking
   - Note gamification patterns from games (Zelda, Pokemon, Stardew Valley)
   - Collect animation inspiration (Stripe, Apple, Material Design)

2. **Document Progress Page patterns**
   - XP bar with level indicator
   - Strengths section (top 3 skills)
   - Badge collection preview
   - Active quests list
   - Improvement graph (mastery over time)
   - Word mastery breakdown

3. **Document Badge System patterns**
   - Collection grid layout
   - Tier progression ring
   - Unlock animation sequence
   - Tier visual specifications (star-in-circle chrome)

4. **Document Map Navigation patterns**
   - Sequential regional unlock visualization
   - Lock states and requirement messages
   - Subquest list with tier gates
   - Voice unlock indicator

5. **Document Quest Tracking patterns**
   - Quest categories and grouping
   - Progress indicators (percentage, count)
   - Completion checkmarks and notifications
   - Language progression by tier

6. **Document Character Interaction patterns**
   - Pre-conversation prep screen layout
   - Help button placement during conversation
   - Lifeline menu with XP costs
   - Post-conversation grade display
   - Character memory dialogue examples

7. **Document Foto Gallery patterns**
   - Grid with masonry/uniform options
   - Filter controls (region, category)
   - Locked foto silhouettes
   - Unlock animation + caption reveal

8. **Document Pen Pal Interface patterns**
   - List with temperature indicators
   - Letter thread chronological layout
   - Gift reveal sequence
   - Reply composition (German text input)

9. **Document Collection Browser patterns**
   - Organization by pen pal
   - Completion progress indicators
   - Locked item silhouettes
   - Metadata display (music links, wine notes)

10. **Document Help System patterns**
    - Help button states (idle, active, overused)
    - Iris whisper overlay design
    - Character reaction to excessive help
    - Lifeline cost indicators

11. **Document Mastery Visualization patterns**
    - Word list grouping (Mastered/Learning/Reinforcement)
    - Progress bar colors and sizing
    - Last seen dates
    - Drill type suggestions

12. **Add accessibility notes throughout**
    - Screen reader labels
    - Keyboard navigation
    - Color contrast ratios
    - Focus indicators

13. **Review and cross-reference**
    - Link each pattern to spec requirements
    - Ensure positive reinforcement tone throughout
    - Verify notification limits respected
    - Check language progression consistency

---

## Design References

- **Spec**: All requirements (R1-R30), especially R27-R30 (UX requirements)
- **Design**: `agent/design/local.gamification-engagement-system.md` (full context)
- **Design**: Badge visual system section (star-in-circle chrome specifications)
- **Spec**: Behavior table for interaction examples
- **Spec**: Test cases for edge case handling

---

## Key Design Principles

**From spec requirements:**

1. **Positive Reinforcement Only** (R28)
   - "Reinforcement Opportunities" not "mistakes" or "failures"
   - Celebrate progress, don't highlight regression
   - Encourage, never punish

2. **Progressive Language UI** (R27)
   - Tier 1: German + English
   - Tier 2: German instructions + English translation
   - Tier 3+: German only (within mastery level)

3. **No Punishment Mechanics** (R29)
   - No badges for failures
   - No "you suck" achievements
   - Every metric framed as opportunity

4. **Notification Limits** (R30)
   - Max 1 pen pal notification per day
   - Max 3 letters per week across all pen pals
   - No notifications if user inactive 7+ days
   - Quiet hours 10pm-8am local time

5. **Accessibility First**
   - Chrome effects decorative only, not information-bearing
   - Text labels for screen readers
   - Color contrast WCAG AA
   - Keyboard navigation

---

## Notes

- This document guides M15 implementation but doesn't block M10-M14 backend work
- UX patterns can be iterated without changing backend APIs
- Focus on user flows and interactions, not pixel-perfect mockups
- Include enough detail that frontend dev can implement without guessing
- Copy examples demonstrate tone and language progression
- Animation timing should feel premium (not rushed, not sluggish)
- Reference existing design systems (Material, Apple HIG) for interaction patterns
