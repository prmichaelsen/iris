# Gamification UX Patterns

**Created**: 2026-04-27  
**Status**: Design Specification  
**Purpose**: Define user flows, layouts, interactions, and animations for all major gamification surfaces  

---

## 1. Progress Page

### Layout

```
┌─────────────────────────────────────────┐
│  LEVEL 12 GERMAN LEARNER               │
│  [████████░░] 2,450 / 3,000 XP         │
└─────────────────────────────────────────┘

┌─ STRENGTHS ─────────────────────────────┐
│  🥇 Vocabulary Recognition   92%        │
│  🥈 Gender Accuracy          87%        │
│  🥉 Conjugation              78%        │
└─────────────────────────────────────────┘

┌─ ACTIVE BADGES ─────────────────────────┐
│  💎 Der Meister (Diamond - 523 cards)   │
│  🥈 Lauscher (Silver - 67 dictations)   │
│  🥉 Grammatik-Ass (Bronze - 45 drills)  │
└─────────────────────────────────────────┘

┌─ QUESTS ────────────────────────────────┐
│  ⚡ Daily: Complete 5 exercises [3/5]   │
│  🗺️  Unlock Bavaria [450/500 pts]       │
│  📚 Complete Lektion 3 [80%]            │
└─────────────────────────────────────────┘

┌─ IMPROVEMENT GRAPH ─────────────────────┐
│   100% ┤                        ╭─      │
│    75% ┤              ╭────────╯        │
│    50% ┤      ╭──────╯                  │
│    25% ┤ ────╯                          │
│     0% └────────────────────────────────│
│        Jan  Feb  Mar  Apr  May  Jun     │
└─────────────────────────────────────────┘

┌─ WORD MASTERY ──────────────────────────┐
│  🌟 Mastered: 127 words (↑12 this week) │
│  📈 Learning: 43 words                   │
│  🔄 Reviewing: 18 words                  │
│                                          │
│  Recent Improvements:                    │
│  • "der Zug" ███████░░ 70% → 95% ⬆️     │
│  • "obwohl"  ████████░ 85% → 90% ⬆️     │
│                                          │
│  Reinforcement Opportunities:            │
│  • "deren"   ███░░░░░░ 88% → 45%        │
│    Last seen: 12 days ago                │
│    Try: fill-blank drill                 │
└─────────────────────────────────────────┘

┌─ RECENT GIFTS ──────────────────────────┐
│  🎨 Mila sent: Der Apfel sticker        │
│  🎵 Lena sent: Âme vinyl record         │
│  🍷 Klaus sent: 2019 Riesling label     │
│  View All Collections →                 │
└─────────────────────────────────────────┘
```

**Visual Hierarchy:**
- Top: Level and XP bar (most prominent, satisfying progress indicator)
- Second tier: Strengths (3 top skills, positive framing)
- Third tier: Active badges and quests (parallel importance)
- Bottom tier: Graphs, word mastery, recent gifts (detailed exploration)

**Responsive:**
- Mobile: Single column, collapsible sections
- Tablet/Desktop: Two-column layout (left: status/badges, right: graphs/mastery)

### Interactions

**XP Bar:**
- Tap → Modal shows XP breakdown by source
  - "Flashcard drill: +10 XP"
  - "100% bonus: +10 XP"
  - "Daily quest: +50 XP"
  - "Total this session: +70 XP"
- Hover (desktop) → Tooltip shows "450 XP to next level"

**Strengths Section:**
- Tap skill → Navigate to detailed mastery view for that skill category
- Shows top 3 only, tap "View All Skills" for complete list

**Badge Display:**
- Tap badge → Navigate to badge collection view, auto-scroll to that badge
- Shows 3 highest-tier badges only
- "View All Badges" link at bottom

**Quest Items:**
- Tap quest → Navigate to quest details with start button
- Progress indicator animates on update (fills smoothly, not instant)
- Checkmark animation on completion

**Improvement Graph:**
- Tap data point → Shows mastery score and date for that week/month
- Pinch to zoom on mobile
- Filter buttons: "7 days" | "30 days" | "90 days" | "All time"

**Word Mastery:**
- Tap word → Detailed mastery breakdown (accuracy, consistency, retention, speed, context)
- Tap "Try: fill-blank drill" → Launch contextual drill for that word
- Expand/collapse sections: Mastered | Learning | Reinforcement Opportunities
- Sort options: Alphabetical | Progress | Last Seen

**Recent Gifts:**
- Tap gift → Open gift detail view with sender's message
- Swipe left/right to see previous gifts
- "View All Collections" → Navigate to collection browser

### Animations

**Page Load:**
- Skeleton screens during data fetch (200ms)
- Elements fade in sequentially (top to bottom, 50ms stagger)
- XP bar fills smoothly to current value (800ms ease-out)

**XP Gain (Real-time via WebSocket):**
- XP bar fills incrementally (500ms ease-out per update)
- "+10 XP" floats up from bar and fades out (1s animation)
- If level up triggered → Full-screen celebration (see Level-Up Animation)

**Level-Up Celebration:**
- Screen flashes white (100ms)
- Confetti explodes from XP bar (2s particle animation)
- Large "LEVEL 12!" appears center screen with scale-in (300ms spring)
- New level number pulses (500ms)
- Confetti settles and fades (1s)
- Return to normal view (500ms fade)
- Total duration: 4s

**Quest Completion:**
- Checkmark draws in green (300ms stroke animation)
- Quest item highlights briefly (200ms yellow flash)
- Slides up and shrinks (400ms)
- Gift notification slides down from top (see Gift Notification)

**Word Improvement:**
- Progress bar fills from old to new value (700ms ease-out)
- Upward arrow appears and bounces (500ms)
- Row highlights green briefly (300ms glow)

**Word Regression:**
- Progress bar depletes smoothly (700ms ease-out)
- No arrow or negative indicator (positive framing)
- Row appears in "Reinforcement Opportunities" section with gentle yellow highlight

### States

**Loading:**
- Skeleton screens for all sections
- Pulsing gray rectangles match final layout dimensions
- No spinners (feels more premium)

**Empty State (New User):**
- XP bar at 0 with "Complete your first exercise to start tracking progress"
- Strengths: "Build skills through practice to see your strengths here"
- Badges: "Earn your first badge by completing 10 exercises"
- Quests: Shows 3 starter quests (First Steps, Complete 5 Exercises, Order Coffee)
- Graph: Dotted line with "Your progress will appear here"
- Word Mastery: "Words you practice will appear here"
- Recent Gifts: "Complete quests to receive gifts from pen pals"

**Populated:**
- All sections display data
- Smooth transitions when new data arrives via WebSocket

**Error:**
- Failed to load → "Unable to load progress. Tap to retry" with refresh button
- Partial failure → Show available sections, gray out failed sections with error icon

### Accessibility

**Screen Reader:**
- "Level 12 German Learner, 2450 of 3000 experience points, 82% to next level"
- Badge tier and count: "Diamond tier Der Meister badge, 523 flashcards completed"
- Graph: Data table alternative with week/month and mastery percentage
- Word progress: "deren, 45% mastery, decreased from 88%, last practiced 12 days ago, try fill-blank drill"

**Keyboard Navigation:**
- Tab through all interactive elements (badges, quests, words, gifts)
- Enter to activate
- Arrow keys to navigate graphs

**Color Contrast:**
- Progress bars: High contrast fills (WCAG AA compliant)
- Text on backgrounds: Minimum 4.5:1 ratio
- Error states: Red + icon (not color alone)
- Improvement indicators: Green + upward arrow (not color alone)

**Motion Reduction:**
- Respect `prefers-reduced-motion`
- Disable confetti, floating text, particle effects
- Use instant transitions instead of animations
- Keep progress bar fills but reduce duration to 200ms

### Copy Examples

**Positive Reinforcement:**
- "127 words mastered — excellent progress!"
- "You improved 'der Zug' by 25% this week!"
- "Reinforcement Opportunities" not "Words you got wrong"
- "Last seen 12 days ago — ready to practice again?" not "You forgot this word"

**Encouragement:**
- Empty quests: "Start your first quest to begin your German journey!"
- Low progress: "Every expert was once a beginner. Keep going!"
- Streak broken: "Welcome back! Your progress is still here."

**Tier Progression (Language):**
- Tier 1: Full English labels and descriptions
- Tier 2: German labels with English tooltips
- Tier 3+: German only (within mastery level)

---

## 2. Badge System

### Layout

**Collection Grid View:**
```
┌─ BADGE COLLECTION ──────────────────────┐
│  [All] [Skill] [Achievement] [Streak]   │
│                                          │
│  🌟 Der Meister                          │
│  💎 Diamond (523 / 1000)                 │
│  [████████░░] 52% to Platinum            │
│                                          │
│  🎧 Lauscher                             │
│  🥈 Silver (67 / 100)                    │
│  [██████░░░░] 67% to Gold                │
│                                          │
│  ✍️ Grammatik-Ass                        │
│  🥉 Bronze (45 / 100)                    │
│  [████░░░░░░] 45% to Silver              │
│                                          │
│  [Locked badges shown as gray silhouettes]│
└─────────────────────────────────────────┘
```

**Individual Badge Detail:**
```
┌─────────────────────────────────────────┐
│         [Badge visual with tier ring]    │
│                                          │
│            💎 Der Meister                │
│          Diamond Tier (523)              │
│                                          │
│  Complete 1,000 flashcard exercises to   │
│  reach Platinum tier                     │
│                                          │
│  [████████░░] 523 / 1,000 (52%)          │
│                                          │
│  Progress History:                       │
│  🥉 Bronze   → Jan 15, 2026 (50 cards)  │
│  🥈 Silver   → Feb 3, 2026 (100 cards)  │
│  🥇 Gold     → Mar 1, 2026 (250 cards)  │
│  💎 Diamond  → Apr 10, 2026 (500 cards) │
│                                          │
│  [Continue Practicing →]                 │
└─────────────────────────────────────────┘
```

**Visual Hierarchy:**
- Badge icon dominates (large, centered, with tier-appropriate chrome)
- Tier name and count prominent below icon
- Progress ring around badge shows advancement
- Progress history chronological at bottom

### Interactions

**Collection Grid:**
- Tap badge → Open detail view
- Filter tabs at top → Show only badges in that category
- Scroll vertically through badges
- Locked badges tappable → Shows unlock requirements

**Badge Detail:**
- Swipe left/right → Navigate to previous/next badge
- Tap "Continue Practicing" → Launch relevant drill type
- Tap tier milestone in history → Expands to show date earned and celebration note

**Progress Ring:**
- Animates on page load (stroke draws clockwise)
- Updates in real-time when user completes relevant exercise (smooth fill)

**Locked Badges:**
- Tap → Modal shows unlock requirements
  - "Complete your first dictation exercise to unlock Lauscher badge"
  - Shows example of exercise type
  - "Try a Dictation Drill →" button

### Animations

**Unlock Animation (5-second sequence):**

**Phase 1: Trigger (0-0.5s):**
- Exercise completes, reaches tier threshold
- Screen fades to black vignette (500ms)

**Phase 2: Badge Materialization (0.5-2.5s):**
- Badge appears center screen as gray silhouette (200ms fade-in)
- Tier-appropriate shimmer effect sweeps across badge (500ms)
- Badge colorizes from center outward (800ms radial gradient)
- Chrome finish materializes (polished/crystalline/iridescent based on tier)
- Badge gently bobs/floats in space

**Phase 3: Tier Announcement (2.5-3.5s):**
- Tier name appears above badge with scale-in (300ms spring)
- "DIAMOND TIER" in large text
- Particle effects matching tier (sparkles for Diamond, soft glow for Platinum)

**Phase 4: Badge Name (3.5-4.5s):**
- Badge name appears below (300ms fade-in)
- "Der Meister"
- Count badge: "523 Flashcards Completed"

**Phase 5: Celebration (4.5-5s):**
- Confetti/particle burst (500ms)
- Badge pulses once (200ms scale 1.0 → 1.1 → 1.0)
- Sound effect (satisfying chime/ding)

**Phase 6: Collection Integration (5-6s):**
- Badge shrinks and moves to position in collection grid (600ms ease-in-out curve)
- Vignette fades out (400ms)
- Badge settles with gentle bounce in grid (200ms spring)

**Tier Progression (Existing Badge Upgrade):**
- Existing badge in collection pulses (300ms)
- Ring around badge fills completely (500ms)
- Badge explodes into particles (200ms)
- Reforms with new tier chrome (800ms)
- New ring appears empty, ready for next tier
- "+1 Tier" floats up (1s animation)

### States

**Unearned:**
- Gray silhouette of badge shape
- "???" or lock icon
- Tap shows requirements

**Earned - Current Tier:**
- Full color with tier-appropriate chrome
- Progress ring shows % to next tier
- Glows subtly on hover/tap

**Max Tier (Platinum):**
- No progress ring (already maxed)
- Iridescent shimmer effect on icon
- "Mastered" label
- Special prestige glow

**Close to Next Tier (90%+):**
- Progress ring pulses gently
- "Almost there!" indicator
- Encouraging copy: "10 more to Diamond!"

### Accessibility

**Screen Reader:**
- "Der Meister badge, Diamond tier, 523 of 1000 flashcards completed, 52% progress to Platinum tier"
- "Locked badge: Lauscher. Complete your first dictation exercise to unlock."
- During unlock animation: "New badge unlocked! Diamond tier Der Meister. 523 flashcards completed."

**Keyboard Navigation:**
- Arrow keys navigate badge grid
- Enter opens detail view
- Escape closes detail view

**Color Contrast:**
- Badge text over chrome backgrounds: Use overlays or halos for legibility
- Never rely on color alone for tier indication (use text labels + visual chrome style)

**Motion Reduction:**
- Skip phases 2-5 of unlock animation
- Show badge instantly in collection with brief highlight (500ms)
- No particles, shimmer, or float effects

### Copy Examples

**Tier Names (German + English):**
- "Grau / Grey — Beginner"
- "Bronze / Bronze — Experienced"
- "Silber / Silver — Intermediate"
- "Gold / Gold — Proficient"
- "Diamant / Diamond — Conversational"
- "Platin / Platinum — Fluent"

**Unlock Messages:**
- "You unlocked Der Meister! Complete flashcards to advance through the tiers."
- "Diamond tier reached! You're becoming conversational!"
- "Platinum tier! Congratulations, you've achieved fluency in flashcard mastery!"

**Progress Encouragement:**
- "77 more to Silver — you're making great progress!"
- "Almost there! 8 more to reach Gold!"
- "You're on fire! Keep this momentum going!"

---

## 3. Map Navigation

### Layout

**Regional Map View:**
```
┌─ DEINE REISE (YOUR JOURNEY) ────────────┐
│                                          │
│         🏙️ BERLIN                        │
│      [✓ COMPLETED]                      │
│      Voice: Berliner accent 🔓          │
│            ⬇️                            │
│         🏔️ BAVARIA                       │
│      [In Progress: 12/20]               │
│      Voice: Bavarian accent 🔒          │
│            ⬇️                            │
│         ⛵ HAMBURG                        │
│         [🔒 LOCKED]                      │
│      Complete Bavaria to unlock         │
│            ⬇️                            │
│       🍇 RHINE VALLEY                    │
│         [🔒 LOCKED]                      │
│            ⬇️                            │
│       🌲 BLACK FOREST                    │
│         [🔒 LOCKED]                      │
│            ⬇️                            │
│         🏛️ SAXONY                        │
│         [🔒 LOCKED]                      │
│            ⬇️                            │
│    🎻 AUSTRIA & 🍫 SWITZERLAND          │
│         [🔒 LOCKED]                      │
│   Complete any 4 regions to unlock      │
└─────────────────────────────────────────┘
```

**Region Detail View:**
```
┌─ BAVARIA ───────────────────────────────┐
│  [Hero image: Alps/Neuschwanstein]      │
│                                          │
│  Tradition Meets Modernity               │
│  Alpine villages, beer gardens, tech     │
│                                          │
│  Progress: 12 / 20 subquests            │
│  [████████░░░░░░░░░░] 60%               │
│                                          │
│  🔓 AVAILABLE QUESTS (Tier 1-2)         │
│  • Attend Beer Garden (0/1)             │
│  • Hike in Alps (0/1)                   │
│  • Learn Bavarian Greetings (1/1) ✓    │
│                                          │
│  🔒 LOCKED QUESTS (Tier 3)              │
│  • Visit Neuschwanstein Castle          │
│    Requires: Silver in Cultural Knowledge│
│                                          │
│  REWARDS                                 │
│  🎵 Voice: Bavarian accent               │
│  📷 Fotos: 8 Bavarian landscapes         │
│  💌 Pen Pal: Thomas (Mountain Guide)     │
│                                          │
│  [Start Next Quest →]                    │
└─────────────────────────────────────────┘
```

### Interactions

**Map View:**
- Tap region → Open region detail view
- Locked regions → Modal explains unlock requirements
- Completed regions → Green checkmark, can revisit
- Current region → Pulsing highlight

**Region Detail:**
- Tap available quest → Navigate to quest prep screen
- Tap locked quest → Modal shows mastery requirements with progress
- Swipe up to see full subquest list (if more than shown)
- "Start Next Quest" → Launches highest-priority incomplete quest

**Sequential Unlock:**
- User cannot skip regions
- Attempting to tap locked region shows:
  - "Complete Bavaria first to unlock Hamburg"
  - Shows progress bar for current region
  - "Continue Bavaria →" button

### Animations

**Map Scroll:**
- Vertical scroll through regions
- Parallax effect on background (subtle depth)
- Regions scale slightly as they pass center viewport (focal point)

**Region Completion:**
- All subquests complete → Celebration triggers
- Region icon explodes into confetti (1s)
- Checkmark draws in (500ms)
- Voice unlock notification appears (1s)
- Next region unlocks with key-turn animation (800ms)
- Lock icon on next region transforms to unlocked (300ms)
- Gentle pulse on newly unlocked region (1s loop, 3 iterations)

**Quest Completion Within Region:**
- Quest item checkmark animation (300ms)
- Progress bar fills incrementally (500ms ease-out)
- If Foto unlocked → Image materializes with camera shutter sound/visual (400ms)

**Lock State Interaction:**
- Tap locked region → Lock shakes "no" (200ms wiggle)
- Requirement modal slides up (300ms)

### States

**Completed:**
- Green checkmark badge
- Desaturated hero image (nostalgic film effect)
- "Revisit" instead of "Start"
- All quests show ✓

**In Progress:**
- Pulsing highlight on region icon
- Progress bar prominent
- "Continue" button
- Mix of ✓ and incomplete quests

**Locked:**
- Grayscale icon with lock overlay
- "🔒 Locked" label
- Requirement text below
- Tappable to see requirements

**Fully Complete (All Regions):**
- Special "Journey Complete" banner at bottom
- "World Traveler" badge unlocked
- Access to bonus content / prestige quests

### Accessibility

**Screen Reader:**
- "Berlin region, completed, Berliner accent voice unlocked"
- "Bavaria region, in progress, 12 of 20 subquests completed, 60%"
- "Hamburg region, locked, complete Bavaria to unlock"
- Lock interactions: "This region is locked. Complete Bavaria first."

**Keyboard Navigation:**
- Arrow up/down to navigate regions
- Enter to open region detail
- Tab through quests in detail view

**Color Contrast:**
- Lock overlays don't obscure icon completely
- Requirement text readable over background
- Progress bars high contrast

**Motion Reduction:**
- Skip confetti and particle effects
- Use instant state changes (locked → unlocked)
- Brief highlight instead of pulsing (single flash)

### Copy Examples

**Lock Messages:**
- "Complete Bavaria to unlock Hamburg"
- "Complete any 4 main regions to unlock Austria & Switzerland"
- Not: "You must complete..." (sounds punitive)

**Completion Celebration:**
- "Bavaria Complete! You've mastered Alpine German!"
- "Hamburg unlocked! Ready for the harbor city?"
- "Journey complete! You've traveled all of Germany!"

**Quest Categories:**
- Tier 1: "Getting Started"
- Tier 2: "Local Experiences"
- Tier 3: "Cultural Deep Dive"
- Tier 4: "Hidden Gems"

---

## 4. Quest Tracking

### Layout

**Quest List View:**
```
┌─ QUESTS ────────────────────────────────┐
│  [Daily] [Weekly] [Regional] [All]      │
│                                          │
│  ⚡ DAILY QUESTS                         │
│  • Complete 5 exercises [3/5]           │
│    [██████░░░░] 60%                     │
│    Reward: 50 XP                        │
│                                          │
│  • Practice 10 words [10/10] ✓         │
│    Reward: 50 XP [Claimed]              │
│                                          │
│  📅 WEEKLY QUESTS                        │
│  • Complete 20 drills [14/20]           │
│    [███████░░░] 70%                     │
│    Reward: 200 XP + Loot Box            │
│                                          │
│  🗺️ REGIONAL QUESTS (Bavaria)           │
│  • Attend Beer Garden [0/1]             │
│    🎯 Start Quest →                     │
│                                          │
│  • Learn Bavarian Greetings [1/1] ✓    │
│    Completed: Apr 20, 2026              │
│                                          │
│  🏆 ACHIEVEMENT QUESTS                   │
│  • Erste Schritte [1/1] ✓              │
│  • Perfektionist [0/1]                  │
│    Get 100% on any 10-card drill        │
│                                          │
└─────────────────────────────────────────┘
```

**Quest Detail View:**
```
┌─ ATTEND BEER GARDEN ────────────────────┐
│  [Hero image: Beer garden scene]         │
│                                          │
│  Region: Bavaria (Tier 1)                │
│  Difficulty: ⭐                          │
│                                          │
│  Description:                            │
│  Visit a traditional Bavarian beer       │
│  garden and practice ordering drinks     │
│  and food. Learn common phrases and      │
│  cultural etiquette.                     │
│                                          │
│  You'll Practice:                        │
│  • Food & drink vocabulary               │
│  • Ordering politely                     │
│  • Understanding menu items              │
│                                          │
│  Requirements:                           │
│  ✓ Complete "First Steps" quest         │
│  ✓ Level 5 or higher                    │
│                                          │
│  Rewards:                                │
│  • 150 XP                                │
│  • Foto: Bavarian beer garden            │
│  • Gift from Thomas                      │
│                                          │
│  [Start Quest →]                         │
└─────────────────────────────────────────┘
```

### Interactions

**Quest List:**
- Tap quest → Open detail view
- Filter tabs → Show quests by category
- Pull to refresh → Check for new daily/weekly quests
- Swipe quest item → Quick actions (Start | Details | Dismiss)

**Quest Detail:**
- "Start Quest" → Navigate to quest prep screen (see Character Interactions)
- Collapse/expand description sections
- Tap reward item → Preview (Foto thumbnail, gift preview)

**Progress Updates:**
- Real-time via WebSocket
- Progress bars fill smoothly as user completes objectives
- Checkmark animation when completed
- Notification banner when quest completes

**Quest Completion:**
- Checkmark draws in (300ms)
- "Completed!" badge appears
- Reward items fly to collection (800ms curved path)
- XP floats up and adds to bar (500ms)

### Animations

**Quest Unlock:**
- New quest slides down from top (400ms)
- "New Quest Available!" banner
- Quest item highlights yellow briefly (500ms glow)
- Settles into appropriate category

**Progress Update:**
- Counter increments with spring animation
- Progress bar fills (500ms ease-out)
- Percentage updates (counts up animation)

**Quest Completion:**
- Quest item flashes green (200ms)
- Confetti burst from quest item (1s)
- Checkmark draws in (300ms stroke animation)
- "Quest Complete!" appears above (300ms scale-in)
- Rewards reveal sequentially (stagger 200ms each)
- Quest moves to "Completed" section with slide animation (600ms)

**Daily/Weekly Reset:**
- Old quests fade out (500ms)
- "New Quests Available!" notification
- New quests fade in (500ms stagger)
- Counter resets with brief highlight

### States

**Available:**
- Full color, pulsing highlight on "Start" button
- Progress bar if partially complete
- Shows requirements met (✓)

**In Progress:**
- Prominent progress indicator
- "Continue" instead of "Start"
- Time indicator if relevant ("14 hours remaining" for daily)

**Completed:**
- Checkmark badge
- Grayed out slightly (less prominent than active)
- Shows completion date
- "Claimed" on rewards

**Locked:**
- Grayscale with lock icon
- Shows requirements not yet met (✗)
- Tap → Explains what's needed to unlock

**Expired (Daily/Weekly):**
- Moves to "Expired" section
- Shows what was missed (not punitive, just informational)
- "New quests tomorrow!" if daily reset

### Accessibility

**Screen Reader:**
- "Daily quest: Complete 5 exercises, 3 of 5 complete, 60%, reward 50 experience points"
- "Quest completed: Practice 10 words, reward claimed"
- "Regional quest: Attend Beer Garden, Tier 1, not started, tap to view details"

**Keyboard Navigation:**
- Tab through quest items
- Enter to open details
- Arrow keys to switch category filters

**Color Contrast:**
- Progress bars meet WCAG AA
- Checkmarks use green + icon
- Lock indicators use gray + lock icon

**Motion Reduction:**
- Skip confetti and particle effects
- Use instant checkmark appearance
- Brief highlight instead of animations

### Copy Examples

**Quest Descriptions (Tier 1 - Bilingual):**
```
☕ Erste Bestellung (First Order)
Order a coffee at Karl's bakery
Difficulty: ⭐
```

**Quest Descriptions (Tier 2 - German + Translation):**
```
🗣️ Smalltalk am Markt
Führe ein Gespräch mit einem Verkäufer auf dem Flohmarkt.
(Have a conversation with a vendor at the flea market.)
Difficulty: ⭐⭐
```

**Quest Descriptions (Tier 3+ - German Only):**
```
🎷 Der Jazzclub
Besuche eine Underground-Jazzshow und verstehe die Ansagen.
Difficulty: ⭐⭐⭐⭐
```

**Completion Messages:**
- "Quest Complete! Well done!"
- "You earned a gift from Thomas!"
- "New Foto unlocked: Bavarian Alps"

**Progress Encouragement:**
- "Almost there! 2 more exercises to complete this quest."
- "Keep going! You're making great progress."
- "You're on a roll! Complete 1 more quest today for a bonus."

---

## 5. Character Interactions

### Pre-Conversation Prep Screen

**Layout:**
```
┌─ KARL'S BAKERY ─────────────────────────┐
│  [Image: Karl behind counter, grumpy]   │
│                                          │
│  Karl der Bäcker                         │
│  Difficulty: ⭐⭐⭐                       │
│  Your relationship: 67/100 ⭐⭐⭐        │
│                                          │
│  📖 IRIS'S BRIEFING:                     │
│                                          │
│  "Karl is busy during morning rush. He   │
│  expects you to order quickly — you      │
│  have 5 seconds per response. Don't      │
│  worry about perfect grammar; he cares   │
│  more about speed and confidence.        │
│                                          │
│  He's grumpy but fair. If you make an   │
│  effort, he'll respect you. Good luck!" │
│                                          │
│  ⚡ WHAT YOU'LL PRACTICE:                │
│  • Quick thinking under pressure         │
│  • Food ordering vocabulary              │
│  • Pronunciation                         │
│                                          │
│  🎯 YOUR GOAL:                           │
│  Order a Brötchen and coffee without    │
│  timing out                              │
│                                          │
│  ⏱️ CHALLENGE: 5 second timer            │
│  🗣️ MODE: Voice only (no text)          │
│  ⚠️ STRIKES: 3 timeouts = quest fail    │
│                                          │
│  [I'm Ready →] [Maybe Later]            │
└─────────────────────────────────────────┘
```

**Visual Hierarchy:**
- Character image dominates top (sets tone/personality)
- Iris's briefing is warm, encouraging, distinct from quest mechanics
- Challenge parameters clear and prominent
- "I'm Ready" button large, inviting

### During Conversation (Help System)

**Layout:**
```
┌─────────────────────────────────────────┐
│  Karl: "Was willst du?"                 │
│  [Audio plays automatically]             │
│                                          │
│  [Timer: 5 seconds]                      │
│  [████░░░░░░] 2s remaining               │
│                                          │
│  [Microphone button - tap to speak]     │
│                                          │
│  [🆘 Help] — bottom right, accessible   │
└─────────────────────────────────────────┘
```

**Help Menu (Tap 🆘):**
```
┌─ LIFELINES ─────────────────────────────┐
│                                          │
│  💬 Translation Hint (10 XP)            │
│     See what Karl said in English       │
│                                          │
│  📝 Suggested Response (20 XP)          │
│     Iris suggests what to say           │
│                                          │
│  🎯 Slow Down (Free)                    │
│     Ask Karl to speak slower            │
│     (He might get annoyed)              │
│                                          │
│  ⏭️ Graceful Exit (0 XP)                │
│     Leave politely, no penalty          │
│                                          │
│  [Cancel]                                │
└─────────────────────────────────────────┘
```

**Iris Whisper Overlay (After selecting Translation Hint):**
```
┌─────────────────────────────────────────┐
│  Karl: "Was willst du?"                 │
│                                          │
│  ┌─ 💙 IRIS (only you can hear) ──────┐│
│  │ "He's asking what you want. Try:   ││
│  │ 'Ein Brötchen und einen Kaffee,    ││
│  │ bitte.' That's 'A roll and a       ││
│  │ coffee, please.'"                  ││
│  └────────────────────────────────────┘│
│                                          │
│  [Timer resumes: 3s remaining]          │
│  [Microphone button]                     │
└─────────────────────────────────────────┘
```

**Character Annoyance (Help used 3+ times):**
```
┌─────────────────────────────────────────┐
│  Karl: "Warum dauert das so lange?      │
│         Brauchst du einen Übersetzer?"  │
│                                          │
│  [Karl is getting impatient]            │
│  ⚠️ Use help sparingly                  │
│                                          │
│  [Continue trying] [Exit quest]         │
└─────────────────────────────────────────┘
```

### Post-Conversation Analysis

**Layout (Success):**
```
┌─ QUEST COMPLETE ────────────────────────┐
│  ✓ Karl's Bakery                        │
│                                          │
│  Karl: "Nicht schlecht!"                │
│  (Not bad!)                              │
│                                          │
│  ┌─ 💙 IRIS'S FEEDBACK ─────────────────┐
│  │                                       │
│  │ "Great job! You ordered successfully  │
│  │ within the time limit. Karl said     │
│  │ 'Was willst du?' which is very       │
│  │ direct — that's typical Berlin style.│
│  │                                       │
│  │ Your response time was 3.2 seconds   │
│  │ — perfect for a busy bakery!         │
│  │                                       │
│  │ One note: You said 'ein Kaffee' but  │
│  │ it should be 'einen Kaffee'          │
│  │ (accusative case). Karl understood   │
│  │ you though, and that's what matters! │
│  │                                       │
│  │ Your relationship with Karl improved │
│  │ by 8 points!"                        │
│  └───────────────────────────────────────┘
│                                          │
│  GRADE: 8.6 / 10                         │
│                                          │
│  Comprehension  ██████████ 10/10         │
│  Fluency        █████████░  9/10         │
│  Grammar        ██████░░░░  6/10         │
│  Vocabulary     ██████████ 10/10         │
│  Pronunciation  █████████░  9/10         │
│  Confidence     █████████░  9/10         │
│                                          │
│  REWARDS                                 │
│  +150 XP                                 │
│  +8 Karl relationship                    │
│  🥨 Thomas sent you a gift!              │
│                                          │
│  [View Gift] [Continue Journey]          │
└─────────────────────────────────────────┘
```

**Layout (Failure):**
```
┌─ QUEST FAILED ──────────────────────────┐
│  Karl: "NÄCHSTER! Du bist noch nicht    │
│         bereit."                         │
│  (NEXT! You're not ready yet.)           │
│                                          │
│  ┌─ 💙 IRIS'S FEEDBACK ─────────────────┐
│  │                                       │
│  │ "Hey, don't worry — Karl is REALLY   │
│  │ tough. You timed out 3 times, which  │
│  │ in a busy bakery means you get       │
│  │ skipped.                             │
│  │                                       │
│  │ This is actually good practice! In   │
│  │ real Germany, some people won't wait │
│  │ while you think. Karl prepares you   │
│  │ for that.                            │
│  │                                       │
│  │ Want to build confidence first? Try  │
│  │ Anna's Café quest. She's patient and │
│  │ gives you all the time you need.     │
│  │ Once you feel good there, we'll      │
│  │ tackle Karl again!"                  │
│  └───────────────────────────────────────┘
│                                          │
│  [Try Anna's Café] [Retry Karl] [Exit]  │
└─────────────────────────────────────────┘
```

### Interactions

**Prep Screen:**
- Tap "I'm Ready" → Start conversation
- Tap "Maybe Later" → Return to quest list
- Expand/collapse Iris's briefing
- Tap character image → View relationship history

**During Conversation:**
- Hold microphone button to speak (or tap to toggle voice recording)
- Tap Help → Open lifeline menu (pauses timer)
- Select lifeline → Applies effect, resumes timer
- Timer runs down → Visual + audio warning at 2s remaining

**Help Menu:**
- Tap lifeline → Deducts XP cost, applies effect
- "Slow Down" sends message to character (may refuse or comply)
- "Graceful Exit" → Polite ending, return to map

**Post-Conversation:**
- Swipe through grade categories to see detailed feedback
- Tap grade bar → Explanation of what affected score
- "View Gift" → Open gift reveal animation
- "Continue Journey" → Return to map

### Animations

**Pre-Conversation:**
- Character image fades in with personality-appropriate animation
  - Karl: Gruff entrance, arms crossed
  - Lena: Casual wave
  - Klaus: Gentle nod
- Iris's briefing text types in (20ms per character, skippable)
- "I'm Ready" button pulses gently

**Timer During Conversation:**
- Progress bar depletes smoothly
- At 2s remaining: Bar turns orange, pulses
- At 0s: Bar flashes red, times out

**Help Menu:**
- Slides up from bottom (300ms)
- Backdrop darkens (50% opacity)
- Tap backdrop to cancel

**Iris Whisper:**
- Appears with soft glow (blue aura)
- Text fades in word by word (100ms per word)
- Distinct from character dialogue (different font, color, style)

**Character Reaction:**
- Karl getting impatient: Taps counter (animation loops)
- Karl impressed: Eyebrows raise, slight smile
- Karl annoyed: Frowns, crosses arms tighter

**Post-Conversation Success:**
- "Quest Complete" banner bounces in (400ms spring)
- Checkmark draws in (300ms)
- Grade bars fill sequentially (stagger 100ms)
- Relationship increase floats up (+8) (1s)
- Rewards reveal with pop (stagger 200ms)

**Post-Conversation Failure:**
- Karl's rejection dialogue appears with shake (200ms)
- No harsh visuals (stays positive)
- Iris's feedback fades in warmly (400ms)
- Alternative quest suggestion highlights (300ms glow)

### States

**First Visit:**
- Iris provides extra context
- "This is your first time talking to Karl" note
- Longer briefing

**Return Visit:**
- Iris comments on last visit
  - "Last time you scored 6.8 — let's beat that!"
  - "Karl remembers you. He's a bit friendlier now."
- Shorter briefing

**High Relationship (70+):**
- Karl greets warmly before quest starts
- Timer extended (7s instead of 5s)
- More forgiving of errors

**Low Relationship (<30):**
- Karl extra gruff
- Stricter timer
- One warning before failure

**After Long Absence:**
- Iris notes: "It's been 3 weeks since you visited Karl"
- Karl comments on absence in character

### Accessibility

**Screen Reader:**
- Character dialogue spoken aloud (TTS)
- "Timer: 5 seconds remaining, 3 seconds remaining"
- "Help button, opens lifeline menu"
- Iris whisper: "Iris suggests: Ein Brötchen und einen Kaffee, bitte"
- Grade breakdown: "Comprehension 10 out of 10, Fluency 9 out of 10..."

**Keyboard Navigation:**
- Tab to help button
- Arrow keys navigate lifeline menu
- Enter to select
- Escape to close

**Visual Indicators:**
- Timer not just visual — audio tick at 2s
- Help usage tracked visually (🆘 turns yellow after 2 uses)
- Character mood shown with icon + text ("Karl is getting impatient")

**Motion Reduction:**
- Skip character entrance animations
- Use instant timer depletion (step-wise at 1s intervals)
- No shaking or bouncing effects

### Copy Examples

**Iris Briefings (Warm, Encouraging):**
- Karl: "Karl is busy during morning rush. He expects quick responses. Don't worry about perfect grammar; he cares more about speed and confidence."
- Lena: "Lena is laid-back and friendly. She loves music and harbor stories. Take your time, enjoy the conversation!"
- Klaus: "Klaus speaks slowly and poetically. Listen carefully to his metaphors. He'll test your sensory vocabulary."

**Character Memory Recognition:**
- Karl (improvement): "Oh, willkommen zurück! Dein Deutsch ist viel besser geworden! Last time you struggled with articles, but now it sounds very natural."
- Karl (regression): "Hmm, du hast doch früher den Namen von allem hier gewusst... Maybe you need a little refresher?"
- Karl (absence): "Wow, lange nicht gesehen! Where have you been? I was starting to think you forgot about us!"

**Positive Framing (R28):**
- Not: "You failed" → "Karl's pretty tough — let's try a friendlier character first!"
- Not: "You timed out 3 times" → "In a busy bakery, speed matters. Let's practice thinking faster!"
- Not: "Your grammar was wrong" → "Karl understood you perfectly! Native speakers make mistakes too."

---

## 6. Foto Gallery

### Layout

**Gallery Grid View:**
```
┌─ FOTO GALLERY ──────────────────────────┐
│  [All] [Berlin] [Bavaria] [Hamburg]...  │
│  [Filter: Places ▾] [Sort: Recent ▾]    │
│                                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│  │[Foto]│ │[Foto]│ │[Lock]│ │[Foto]│   │
│  │Berlin│ │Bayern│ │ ???  │ │Berlin│   │
│  └──────┘ └──────┘ └──────┘ └──────┘   │
│                                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│  │[Foto]│ │[Lock]│ │[Foto]│ │[Lock]│   │
│  │Rhine │ │ ???  │ │Bayern│ │ ???  │   │
│  └──────┘ └──────┘ └──────┘ └──────┘   │
│                                          │
│  42 / 120 Fotos unlocked                 │
└─────────────────────────────────────────┘
```

**Full-Size View:**
```
┌─────────────────────────────────────────┐
│  [← Back]                    [Share ⤴] │
│                                          │
│                                          │
│        [Full-size photo displays]        │
│         Film photography aesthetic       │
│              Slightly grainy             │
│           Natural colors                 │
│                                          │
│                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                          │
│  Sonnenaufgang über der Spree            │
│  (Sunrise over the Spree)                │
│                                          │
│  Berlin • Jan 15, 2026                   │
│  Unlocked via: Morning Market quest      │
│                                          │
│  [< Previous] [Next >]                   │
└─────────────────────────────────────────┘
```

### Interactions

**Gallery Grid:**
- Tap unlocked Foto → Open full-size view
- Tap locked Foto → Show unlock requirements
- Swipe to scroll through grid
- Filter by region → Show only that region's Fotos
- Filter by category (People, Places, Culture, Food)
- Sort: Recent | Alphabetical | Region

**Locked Fotos:**
- Silhouette with "???" or blurred preview
- Tap → Modal shows:
  - "Complete 'Beer Garden' quest to unlock"
  - Quest difficulty and requirements
  - "Start Quest →" button

**Full-Size View:**
- Swipe left/right → Navigate to adjacent Fotos
- Pinch to zoom (up to 2x)
- Double-tap to zoom to fit
- Tap "Share" → Share image with caption to social media
- Tap caption → Hear German pronunciation (TTS)

### Animations

**Foto Unlock (After quest completion):**
- Camera shutter sound effect
- White flash (100ms)
- Locked Foto slot transforms:
  - Lock icon fades out (200ms)
  - Silhouette colorizes from center outward (800ms radial)
  - Image sharpens (300ms blur to sharp)
- Foto bounces into place (300ms spring)
- Caption fades in below (400ms)
- "+1 Foto" notification floats up (1s)

**Gallery Load:**
- Fotos fade in sequentially (stagger 50ms, row by row)
- Locked slots appear as gray placeholders immediately
- Smooth scroll momentum

**Full-Size Transition:**
- Thumbnail scales up to full-size (400ms ease-out)
- Background darkens (300ms)
- Caption slides up from bottom (300ms)
- Navigation buttons fade in (200ms)

### States

**Unlocked:**
- Full color, sharp detail
- Caption visible in grid view (truncated)
- Tappable for full-size

**Locked:**
- Gray silhouette OR heavily blurred preview
- "🔒" icon overlay
- "???" as caption
- Shows unlock hint on hover/tap

**Recently Unlocked:**
- Subtle glow effect (first 24 hours)
- "New!" badge in corner
- Sorts to top in "Recent" filter

**Collection Complete (Region):**
- Special badge on region filter tab
- "✓ Complete" indicator
- Unlocks bonus Foto or collection reward

### Accessibility

**Screen Reader:**
- "Foto: Sonnenaufgang über der Spree, Sunrise over the Spree, Berlin, unlocked January 15, 2026"
- "Locked Foto, complete Beer Garden quest to unlock"
- "42 of 120 Fotos unlocked, 35% complete"

**Keyboard Navigation:**
- Arrow keys navigate grid
- Enter opens full-size view
- Escape closes full-size view
- Tab to filters and sort options

**Alt Text:**
- Every Foto has descriptive alt text in German and English
- "Sunrise over the Spree river in Berlin, golden light reflecting on water, Brandenburg Gate visible in distance"

**Color Contrast:**
- Caption text over photo: dark overlay ensures readability
- Lock icons high contrast

**Motion Reduction:**
- Skip radial colorize effect
- Instant unlock (200ms fade-in)
- No camera shutter effect

### Copy Examples

**Captions (Bilingual):**
- "Der Bäcker am Morgen (The baker in the morning)"
- "Herbstlaub im Englischen Garten (Autumn leaves in English Garden)"
- "Weihnachtsmarkt bei Nacht (Christmas market at night)"

**Unlock Requirements:**
- "Complete 'Beer Garden Quest' to unlock this Foto"
- "Reach Silver tier in Cultural Knowledge to unlock Hidden Gems"
- "Complete all Bavaria quests to unlock the full collection"

**Collection Progress:**
- "42 / 120 Fotos unlocked (35%)"
- "Berlin: 12 / 15 complete"
- "Bavaria collection complete! ✓"

---

## 7. Pen Pal Letter Interface

### Layout

**Pen Pal List:**
```
┌─ PEN PALS ──────────────────────────────┐
│                                          │
│  🎨 Mila (Berlin)              🔥🔥🔥    │
│  Last letter: 2 days ago                 │
│  "Did you like the sticker I sent?"     │
│  [Read Letter →]                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                          │
│  🎵 Lena (Hamburg)             🔥🔥      │
│  Last letter: 5 days ago                 │
│  "Check out that album, it's fire!"     │
│  [Read Letter →]                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                          │
│  🍷 Klaus (Rhine)              🔥        │
│  Last letter: 12 days ago                │
│  "The harvest was exceptional..."       │
│  [Read Letter →]                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                          │
│  🏔️ Thomas (Bavaria)           💤       │
│  Last letter: 3 months ago               │
│  "Viel Erfolg in Hamburg!"              │
│  [Write to Thomas]                       │
│                                          │
└─────────────────────────────────────────┘
```

**Letter Thread View:**
```
┌─ MILA ──────────────────────────────────┐
│  [← Back to Pen Pals]                   │
│                                          │
│  ┌─ FROM MILA ─────────────────────────┐│
│  │ Hallo! Wie geht's dir?              ││
│  │                                      ││
│  │ I'm working on a new gallery show   ││
│  │ and thought of you. Want to come    ││
│  │ to the opening? It's at Kreuzberg   ││
│  │ next Friday!                        ││
│  │                                      ││
│  │ By the way, I drew you something... ││
│  │                                      ││
│  │ [Gift: Der Apfel sticker]           ││
│  │ [Tap to view]                       ││
│  │                                      ││
│  │ - Mila 🎨                           ││
│  │ Apr 20, 2026                        ││
│  └──────────────────────────────────────┘│
│                                          │
│  ┌─ FROM YOU ──────────────────────────┐│
│  │ Danke Mila! Der Sticker ist super!  ││
│  │ Ich komme gerne zur Eröffnung!      ││
│  │                                      ││
│  │ - You                                ││
│  │ Apr 21, 2026                        ││
│  └──────────────────────────────────────┘│
│                                          │
│  ┌─ FROM MILA ─────────────────────────┐│
│  │ Perfekt! Ich freue mich schon!      ││
│  │                                      ││
│  │ Dein Deutsch wird echt besser, übri ││
│  │ gens. Ich bin stolz auf dich! 😊    ││
│  │                                      ││
│  │ - Mila 🎨                           ││
│  │ Apr 22, 2026                        ││
│  └──────────────────────────────────────┘│
│                                          │
│  [Write Reply →]                         │
└─────────────────────────────────────────┘
```

**Gift Reveal Animation:**
```
┌─────────────────────────────────────────┐
│                                          │
│         [Envelope animation]             │
│      Closes, flips, opens slowly         │
│                                          │
│  ┌───────────────────────────────────┐  │
│  │                                    │  │
│  │      [Gift appears]                │  │
│  │   🎨 Der Apfel Sticker             │  │
│  │   Hand-drawn apple with rosy       │  │
│  │   cheeks and happy face            │  │
│  │                                    │  │
│  │   "Ich habe dir was gezeichnet     │  │
│  │   zur Feier des Tages!"            │  │
│  │   (I drew something for you to     │  │
│  │   celebrate!)                      │  │
│  │                                    │  │
│  │   - Mila 🎨                        │  │
│  └───────────────────────────────────┘  │
│                                          │
│  [Add to Collection]                     │
└─────────────────────────────────────────┘
```

**Reply Composition:**
```
┌─ REPLY TO MILA ─────────────────────────┐
│  [← Cancel]                    [Send ✓] │
│                                          │
│  ┌───────────────────────────────────┐  │
│  │ Write your letter in German...    │  │
│  │                                    │  │
│  │ [Text input area]                 │  │
│  │                                    │  │
│  │                                    │  │
│  │                                    │  │
│  └───────────────────────────────────┘  │
│                                          │
│  💙 Iris can help:                       │
│  [Translation Check] [Suggest Phrases]   │
│                                          │
│  Character count: 127                    │
│  Recommended: 50-300 characters          │
└─────────────────────────────────────────┘
```

### Interactions

**Pen Pal List:**
- Tap pen pal → Open letter thread
- Swipe pen pal item → Quick actions (Write | Mute | View Collection)
- Temperature indicator (🔥🔥🔥 → 💤) shows relationship warmth
- Pull to refresh → Check for new letters

**Letter Thread:**
- Scroll through chronological conversation
- Tap gift → Open gift reveal animation
- Long-press letter → Copy text, translate to English
- Swipe between pen pals without returning to list

**Gift in Letter:**
- Tap gift → Envelope opens with animation
- Gift appears with sender's message
- "Add to Collection" → Flies to collection with trail effect
- Can view gift again from collection browser

**Reply Composition:**
- Type in German (primary input)
- "Translation Check" → Iris reviews for errors, suggests improvements (non-blocking)
- "Suggest Phrases" → Context-appropriate German phrases for common responses
  - "Thanks for the gift!" → "Danke für das Geschenk!"
  - "I'd love to come" → "Ich komme gerne!"
  - "How have you been?" → "Wie geht es dir?"
- Send → Letter marked as sent, pen pal will reply in 1-4 days

### Animations

**New Letter Notification:**
- Badge appears on pen pal avatar (1, 2, 3...)
- Pen pal item highlights with gentle pulse (1s loop, 3 iterations)
- Push notification: "Mila sent you a letter!"

**Envelope Open Animation (2s sequence):**
- Envelope appears sealed (200ms fade-in)
- Flips over horizontally (400ms 3D rotation)
- Unseals from top (600ms)
- Letter slides out (400ms)
- Unfolds with paper sound (400ms)
- Content fades in (200ms)

**Gift Reveal:**
- Gift package shakes (200ms wiggle)
- Wrapping disappears with sparkle (300ms)
- Gift item scales in (400ms spring bounce)
- Sender's message appears below (300ms fade)
- "Add to Collection" button pulses

**Reply Sent:**
- "Sending..." spinner (brief)
- Letter whooshes up and away (600ms)
- "Letter sent!" checkmark (300ms)
- Return to thread view (300ms)
- Your letter appears in thread

**Temperature Change:**
- Flame adds/removes with fade (500ms)
- If going dormant: Flames fade to 💤 over 1s
- If reactivating: 💤 disappears, flame ignites (300ms)

### States

**Active (🔥🔥🔥):**
- Frequent correspondence
- Letters arrive every 1-3 days
- Full color avatar
- Temperature indicator bright

**Warm (🔥🔥):**
- Occasional letters
- Every 4-7 days
- Normal colors

**Cool (🔥):**
- Rare contact
- Every 7-14 days
- Slightly muted colors

**Dormant (💤):**
- No engagement for 30+ days
- Letters stopped
- Grayscale avatar
- "Write to rekindle friendship" prompt

**Unread Letter:**
- Bold sender name
- Red dot or badge count
- Preview text shown
- "New" label

**Read Letter:**
- Normal weight text
- No badge
- Timestamp shown

### Accessibility

**Screen Reader:**
- "Mila, Berlin, temperature 3 flames, close friend, last letter 2 days ago, unread, Did you like the sticker I sent?"
- Letter content read aloud with sender and date
- Gift: "Gift from Mila, Der Apfel sticker, hand-drawn apple, tap to add to collection"

**Keyboard Navigation:**
- Tab through pen pal list
- Enter to open thread
- Arrow keys to scroll letters
- Tab through composition fields

**Notification Controls:**
- Max 1 pen pal notification per day (R30)
- Quiet hours: 10pm-8am local time (R30)
- User can set favorites (only notify for these)
- Mute individual pen pals

**Motion Reduction:**
- Skip envelope animation
- Instant letter appearance
- Gift reveal without sparkle/shake

### Copy Examples

**Letter Excerpts (Personality-Driven):**

**Mila (Creative, Casual):**
- "Hey! Wie geht's? I'm working on something cool..."
- "Did you see the new street art near Mauerpark? Wild!"
- "Check this out — drew you something! 🎨"

**Klaus (Philosophical, Formal):**
- "Liebe Freundin, how is your journey progressing?"
- "The harvest this year reminds me of patience and time..."
- "I included a label from our 2019 vintage. Sehr besonders."

**Lena (Direct, Slangy):**
- "Moin! Was geht ab?"
- "Found this sick vinyl at Fischmarkt — you gotta hear it!"
- "Hamburg misses you, digga. Come back soon!"

**Temperature Indicators:**
- 🔥🔥🔥: "Enge Freundin (Close friend)"
- 🔥🔥: "Bekannter (Acquaintance)"
- 🔥: "Flüchtig (Fleeting contact)"
- 💤: "Eingeschlafen (Dormant)"

**Notification Limits (R30):**
- Max 3 letters per week across all pen pals
- Max 1 notification per day
- No notifications if app not opened in 7 days
- Quiet hours respected (10pm-8am)

---

## 8. Collection Browser

### Layout

**Collections by Pen Pal:**
```
┌─ COLLECTIONS ───────────────────────────┐
│  [Mila] [Lena] [Klaus] [Thomas]...      │
│    🎨    🎵     🍷      🏔️               │
│                                          │
│  Currently viewing: Lena's Vinyl Records │
│  📀 12 / 25 collected (48%)              │
│  [████████░░░░░░░] Progress              │
│                                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│  │ 🎵  │ │ 🎵  │ │ 🔒  │ │ 🎵  │   │
│  │ Âme │ │Moder│ │ ??? │ │Paul │   │
│  │2011 │ │ at  │ │     │ │Kalk │   │
│  └──────┘ └──────┘ └──────┘ └──────┘   │
│  Melodic   Deep     Locked  Berlin      │
│  Techno    Techno           Calling     │
│                                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│  │ 🎵  │ │ 🔒  │ │ 🎵  │ │ 🔒  │   │
│  │Robin │ │ ??? │ │Anna │ │ ??? │   │
│  │Schulz│ │     │ │May  │ │     │   │
│  └──────┘ └──────┘ └──────┘ └──────┘   │
│                                          │
│  Recent from Lena:                       │
│  "Hab das beim Fischmarkt gefunden —     │
│   das Album ist der Hammer! 🎧"          │
│                                          │
│  [Write to Lena]                         │
└─────────────────────────────────────────┘
```

**Item Detail View:**
```
┌─ ÂME - REJ (2011) ──────────────────────┐
│  [← Back to Collection]                  │
│                                          │
│  [Album cover image]                     │
│  Vintage vinyl aesthetic                 │
│                                          │
│  Âme - Rej                               │
│  Released: 2011                          │
│  Genre: Melodic Techno                   │
│                                          │
│  From Lena:                              │
│  "This album captures Hamburg's         │
│  underground scene perfectly. Play it    │
│  at night with rain outside. Trust me." │
│                                          │
│  [▶️ Listen on YouTube]                 │
│  [▶️ Listen on Bandcamp]                │
│                                          │
│  Received: March 15, 2026                │
│  After completing: Harbor Tour quest     │
│                                          │
│  [< Previous] [Next >]                   │
└─────────────────────────────────────────┘
```

### Interactions

**Collection Browser:**
- Tap pen pal tab → Switch to their collection
- Tap unlocked item → Open detail view
- Tap locked item → Show unlock requirements (quest name, tier gate)
- Sort: Alphabetical | Date Received | Category
- Filter by type (if pen pal has multiple types)

**Item Detail:**
- Swipe left/right → Navigate collection
- Tap music link → Open in external app/browser
- Tap sender quote → Hear pronunciation (TTS)
- Tap "Write to Lena" → Compose letter referencing this item

**Locked Items:**
- "???" silhouette
- Blurred preview (50% opacity)
- Tap → "Complete 'Beer Garden' quest to unlock this collectible"

**Completion Rewards:**
- Complete collection → Special badge
- Complete all 8 collections → "Master Collector" achievement

### Animations

**Item Unlock:**
- Quest completes → Item notification appears
- Tap notification → Navigate to collection
- Locked slot pulses (300ms)
- Lock icon fades out (200ms)
- Item materializes with sender-appropriate effect:
  - Mila (stickers): Hand-drawn sketch-to-color (800ms)
  - Lena (vinyl): Record spins in (600ms rotation)
  - Klaus (wine): Label rolls out (500ms)
  - Thomas (flowers): Pressed flower unfolds (700ms)
- Item settles with bounce (200ms spring)

**Collection Switch:**
- Fade out current collection (200ms)
- Fade in new collection (200ms)
- Items stagger in (50ms delay each)

**Detail View Transition:**
- Item scales up from grid (400ms ease-out)
- Background darkens (300ms)
- Metadata slides in from bottom (300ms)

### States

**Unlocked:**
- Full color, sharp detail
- Shows metadata
- Tappable for detail view
- Link actions available

**Locked:**
- Gray silhouette or blurred
- "🔒 ???" as placeholder
- Shows unlock hint
- Not fully interactive

**Complete Collection:**
- "✓ Complete" badge on pen pal tab
- Special border/glow on completed pen pal
- Completion celebration animation (confetti)

**Empty (No Items Yet):**
- "Complete quests to receive gifts from [Pen Pal Name]"
- Shows first few locked slots as preview

### Accessibility

**Screen Reader:**
- "Lena's vinyl collection, 12 of 25 collected, 48% complete"
- "Âme Rej album, 2011, Melodic Techno, listen on YouTube, listen on Bandcamp"
- "Locked item, complete Harbor Tour quest to unlock"

**Keyboard Navigation:**
- Tab through pen pal tabs
- Arrow keys navigate item grid
- Enter opens detail view
- Escape closes detail view

**Color Contrast:**
- Item text readable over images (dark overlay)
- Lock icons high contrast

**Motion Reduction:**
- Skip unlock animations
- Instant item appearance
- No rotation, spin, or particle effects

### Copy Examples

**Collection Names:**
- "Mila's Sticker Album"
- "Lena's Vinyl Collection"
- "Klaus's Wine Labels"
- "Thomas's Pressed Flowers"
- "Emma's Curiosities"
- "Henrik's Historical Archive"
- "Sophie's Coffee Tins"
- "Marco's Dessert Portfolio"

**Item Metadata:**

**Lena's Vinyl:**
- "Âme - Rej (2011) | Melodic Techno"
- "Links: YouTube, Bandcamp"

**Klaus's Wine:**
- "Rheingau Riesling 2019 | Trocken"
- "Tasting notes: Mineralisch, grüner Apfel, Honig"

**Emma's Curiosities:**
- "Brass Gear (1823) | Clock mechanism"
- "From Emma: 'Dieses Zahnrad ist von einer Uhr aus 1823!'"

**Progress Messages:**
- "12 / 25 collected (48%)"
- "Almost complete! 3 more to go!"
- "Collection complete! ✓"

---

## 9. Help System During Conversations

### Layout

**Help Button Placement:**
- Bottom-right corner, always visible
- Floats above conversation UI
- Non-intrusive but easily accessible
- Changes color based on usage (see States)

**Lifeline Menu:**
```
┌─ LIFELINES ─────────────────────────────┐
│                                          │
│  💬 Translation Hint (10 XP)            │
│     See what they said in English       │
│                                          │
│  📝 Suggested Response (20 XP)          │
│     Iris suggests what to say           │
│                                          │
│  🎯 Slow Down Request (Free)            │
│     Ask to speak slower                  │
│     (May annoy impatient characters)     │
│                                          │
│  ⏭️ Graceful Exit (0 XP)                │
│     Leave conversation politely          │
│                                          │
│  [Cancel]                                │
└─────────────────────────────────────────┘
```

**Iris Whisper Overlay:**
```
┌─────────────────────────────────────────┐
│  Karl: "Was willst du?"                 │
│                                          │
│  ┌─ 💙 IRIS ──────────────────────────┐│
│  │ (Only you can hear this)           ││
│  │                                     ││
│  │ He's asking what you want.         ││
│  │                                     ││
│  │ Try saying:                        ││
│  │ "Ein Brötchen und einen Kaffee,   ││
│  │  bitte."                           ││
│  │                                     ││
│  │ That means: "A roll and a coffee,  ││
│  │ please."                           ││
│  └─────────────────────────────────────┘│
│                                          │
│  [Timer resumes]                         │
│  [Microphone]                            │
└─────────────────────────────────────────┘
```

**Character Annoyance Indicator:**
```
┌─────────────────────────────────────────┐
│  Karl: "Warum dauert das so lange?"    │
│         (Why is this taking so long?)   │
│                                          │
│  ⚠️ Karl is getting impatient           │
│  Help usage: 3/3 — He's annoyed         │
│                                          │
│  One more help → Quest may fail          │
│                                          │
│  [I can do this] [Exit gracefully]      │
└─────────────────────────────────────────┘
```

### Interactions

**Help Button:**
- Tap → Opens lifeline menu (pauses timer)
- Hold (long-press) → Quick translation without menu
- Changes appearance based on usage count

**Lifeline Selection:**
- Tap lifeline → Deducts XP cost (if applicable)
- Shows effect (translation, suggestion, etc.)
- Resumes timer after user reads/hears help
- Closes menu automatically

**Translation Hint:**
- Shows character's German + English translation
- Invisible to character (meta-layer)
- Timer pauses briefly, resumes when dismissed

**Suggested Response:**
- Iris provides 2-3 options in German
- User can select one or speak their own
- Character may notice hesitation if used frequently

**Slow Down Request:**
- Sends message to character in German
- Some comply: "Okay, ich spreche langsamer..."
- Some refuse: "Nein, ich habe keine Zeit!" (Karl)
- Some get annoyed: Relationship delta -2

**Graceful Exit:**
- Iris helps you leave politely in character-appropriate German
- No penalty, no rewards
- Quest marked as "Attempted" not "Failed"
- Can retry anytime

**Character Reaction System:**
- Help usage tracked per conversation
- After 2 helps: Character shows slight impatience
- After 3 helps: Character comments or may fail quest
- Different characters have different tolerance:
  - Karl: 2 helps max
  - Anna (patient café owner): 5 helps allowed
  - Lena: 3 helps, but teases you good-naturedly

### Animations

**Help Button:**
- Idle: Gentle pulse (2s loop)
- First use: Subtle bounce
- Overused (3+): Shakes slightly, turns yellow/orange

**Lifeline Menu:**
- Slides up from bottom (300ms ease-out)
- Backdrop darkens (50% opacity)
- Each lifeline fades in (stagger 50ms)

**Iris Whisper:**
- Blue aura appears around Iris text (300ms glow)
- Text fades in word-by-word (50ms per word, skippable)
- Gentle sparkle particles (optional, disabled in motion-reduced mode)

**Character Annoyance:**
- Character avatar frowns or crosses arms
- Warning icon appears with pulse
- Screen edges flash orange briefly (100ms)

### States

**Help Available:**
- Button green/neutral
- No warnings
- Full menu available

**Help Used (1-2 times):**
- Button turns slightly yellow
- Small counter appears (1, 2)
- Menu still available

**Help Overused (3+ times):**
- Button orange/red
- Pulsing warning
- Character annoyance indicator shown
- "Use sparingly" tooltip

**Help Locked (Character-Specific):**
- Some premium challenges disable help
- Berghain bouncer: No help allowed
- Button grayed out with lock icon
- "Navigate this yourself" message

### Accessibility

**Screen Reader:**
- "Help button, opens lifeline menu, help used 2 times"
- Lifeline options read aloud with costs
- Iris whisper read aloud immediately
- Character annoyance: "Warning, Karl is getting impatient, one more help may cause quest failure"

**Keyboard Navigation:**
- Hotkey (?) opens help menu
- Arrow keys navigate lifelines
- Enter to select
- Escape to cancel

**Visual Indicators:**
- Help usage counter visible
- Character mood shown with icon + text
- Not just color (uses icons, text, animation)

**Motion Reduction:**
- Skip sparkle effects
- Instant menu appearance
- No pulsing or shaking

### Copy Examples

**Iris Whispers (Supportive, Clear):**
- "He's asking what you want. Try: 'Ein Brötchen, bitte.'"
- "This is a polite way to order. Germans appreciate directness."
- "Don't worry about the accent — just try your best!"

**Character Reactions (Varied by Personality):**

**Karl (Impatient):**
- "Mensch, das dauert zu lange!" (Man, this is taking too long!)
- "Brauchst du einen Übersetzer?" (Do you need a translator?)

**Anna (Patient):**
- "Kein Problem, nimm dir Zeit." (No problem, take your time.)
- "Möchtest du, dass ich langsamer spreche?" (Would you like me to speak slower?)

**Lena (Teasing):**
- "Alles klar? Brauchst du Hilfe, oder?" (Everything okay? Need help, or?)
- "Du bist süß wenn du nachdenkst!" (You're cute when you're thinking!)

**Graceful Exit Options:**
- "Entschuldigung, ich komme später wieder." (Sorry, I'll come back later.)
- "Es tut mir leid, ich brauche mehr Übung." (I'm sorry, I need more practice.)
- "Danke für deine Geduld. Bis bald!" (Thanks for your patience. See you soon!)

---

## 10. Mastery Visualization

### Layout

**Word List View:**
```
┌─ WORD MASTERY ──────────────────────────┐
│  [Mastered] [Learning] [Reinforce]      │
│  [All] • [Nouns] [Verbs] [Adj] [Other]  │
│                                          │
│  🌟 MASTERED (127 words)                 │
│  ↑ 12 improved this week                 │
│                                          │
│  • der Zug      ██████████ 95%          │
│    Progress: 70% → 95% (↑25%)           │
│    Last seen: 2 days ago                 │
│                                          │
│  • obwohl       ██████████ 90%          │
│    Progress: 85% → 90% (↑5%)            │
│    Last seen: 1 day ago                  │
│                                          │
│  [Show All Mastered →]                   │
│                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                          │
│  📈 LEARNING (43 words)                  │
│                                          │
│  • dessen       ███████░░░ 72%          │
│    Progress: 65% → 72% (↑7%)            │
│    Last seen: 3 days ago                 │
│                                          │
│  • würde        ██████░░░░ 68%          │
│    Progress: 60% → 68% (↑8%)            │
│    Last seen: 4 days ago                 │
│                                          │
│  [Show All Learning →]                   │
│                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                          │
│  🔄 REINFORCEMENT OPPORTUNITIES (18)     │
│                                          │
│  • deren        ███░░░░░░░ 45%          │
│    Progress: 88% → 45% (↓43%)           │
│    Last seen: 12 days ago                │
│    💡 Try: Fill-blank drill              │
│    [Practice Now →]                      │
│                                          │
│  • trotzdem     ████░░░░░░ 52%          │
│    Progress: 79% → 52% (↓27%)           │
│    Last seen: 8 days ago                 │
│    💡 Try: Flashcard drill               │
│    [Practice Now →]                      │
│                                          │
│  [Show All →]                            │
└─────────────────────────────────────────┘
```

**Word Detail View:**
```
┌─ DEREN ─────────────────────────────────┐
│  [← Back to Word List]                   │
│                                          │
│  deren                                   │
│  (whose, of which — relative pronoun)    │
│  [🔊 Pronunciation]                      │
│                                          │
│  Overall Mastery: 45%                    │
│  [████░░░░░░]                            │
│                                          │
│  ━━ MASTERY BREAKDOWN ━━━━━━━━━━━━━━━  │
│                                          │
│  Accuracy       ███████░░░ 68%          │
│  Consistency    ██░░░░░░░░ 25%  ⚠️      │
│  Retention      ███░░░░░░░ 35%  ⚠️      │
│  Speed          ████████░░ 75%          │
│  Context Breadth████░░░░░░ 42%          │
│                                          │
│  📊 HISTORY                              │
│  Mar 15: 88% (Peak)                      │
│  Mar 22: 82%                             │
│  Apr  3: 75%                             │
│  Apr 15: 58%                             │
│  Apr 27: 45% (Current)                   │
│                                          │
│  🔄 REINFORCEMENT NEEDED                 │
│  Last practiced: 12 days ago             │
│  Decline: -43% since peak                │
│                                          │
│  💡 SUGGESTED PRACTICE:                  │
│  • Fill-blank drill (Context focus)      │
│  • Conversation with Henrik (Usage)      │
│  • Flashcard review (Retention)          │
│                                          │
│  [Start Fill-Blank Drill →]             │
└─────────────────────────────────────────┘
```

### Interactions

**Word List:**
- Tap category tab → Filter by mastery level
- Tap word → Open detail view
- Tap "Practice Now" → Launch contextual drill
- Sort: Alphabetical | Progress | Last Seen | Mastery %
- Filter by word type (noun, verb, adjective, etc.)

**Word Detail:**
- Tap pronunciation button → Hear word (TTS)
- Tap mastery signal → See explanation
  - "Accuracy: % correct over last 20 attempts"
  - "Consistency: Getting it right repeatedly"
  - "Retention: Success after long intervals"
  - "Speed: Response time improving"
  - "Context Breadth: Correct across drill types"
- Tap suggested practice → Launch that drill type
- Swipe left/right → Navigate to adjacent words

**Mastery Signals:**
- Each signal expandable for detailed breakdown
- Shows recent attempts (timeline)
- Context examples where used correctly/incorrectly

### Animations

**Page Load:**
- Sections expand sequentially (stagger 150ms)
- Progress bars fill smoothly (800ms ease-out)
- Arrows animate in (300ms)

**Progress Update (Real-time):**
- Progress bar fills/depletes (700ms)
- Arrow appears and bounces (500ms)
- Row highlights briefly (300ms)

**Category Switch:**
- Fade out current list (200ms)
- Fade in new list (200ms)
- Stagger item appearance (30ms each)

**Word Improvement:**
- Progress bar fills with green tint (700ms)
- Upward arrow (↑) bounces in (500ms)
- Row glows green (300ms pulse)
- Confetti if mastery threshold crossed (1s)

**Word Regression:**
- Progress bar depletes (700ms)
- No downward arrow (positive framing - R28)
- Word moves to "Reinforcement Opportunities" with slide (400ms)
- Yellow highlight (non-punitive, 300ms)

### States

**Mastered (90-100%):**
- Green progress bar
- 🌟 Star icon
- Recent improvement highlighted
- "Well done!" affirmation

**Learning (60-89%):**
- Blue progress bar
- 📈 Chart icon
- Progress trend shown
- "Keep going!" encouragement

**Reinforcement Opportunity (0-59%):**
- Yellow/orange progress bar
- 🔄 Cycle icon
- Last seen date prominent
- Suggested drill type
- "Ready to practice again?" positive framing

**Recently Improved:**
- Green highlight (first 24 hours)
- Upward arrow (↑)
- Progress delta shown (+25%)
- Celebration animation on first view

**Declining:**
- Word automatically moves to Reinforcement section
- No negative language ("failure", "forgot")
- Focus on "last practiced X days ago"
- Drill suggestion framed as opportunity

### Accessibility

**Screen Reader:**
- "Mastered: 127 words, 12 improved this week"
- "der Zug, 95% mastery, improved from 70% to 95%, last practiced 2 days ago"
- "Reinforcement opportunity: deren, 45% mastery, declined from 88%, last practiced 12 days ago, try fill-blank drill"
- Mastery signals: "Accuracy 68%, Consistency 25% warning, Retention 35% warning, Speed 75%, Context Breadth 42%"

**Keyboard Navigation:**
- Tab through words
- Arrow keys navigate mastery signals
- Enter to open detail or launch drill

**Color Contrast:**
- Progress bars meet WCAG AA
- Use icons + color for mastery levels (not color alone)
- Green + ↑, Yellow + 🔄, Blue + 📈

**Motion Reduction:**
- Skip bar fill animations
- Instant state changes
- No bouncing arrows or confetti

### Copy Examples

**Mastery Levels (R28 Positive Framing):**
- 🌟 "Mastered" (90-100%) — not "Perfect"
- 📈 "Learning" (60-89%) — not "Intermediate"
- 🔄 "Reinforcement Opportunities" (0-59%) — NOT "Weak" or "Failing" or "Forgotten"

**Progress Messages:**
- "You improved 'der Zug' by 25% this week — excellent!"
- "12 words mastered this week! You're on fire!"
- "'deren' is ready for practice — let's reinforce it!"

**Drill Suggestions (Positive, Helpful):**
- "💡 Try: Fill-blank drill — Great for context practice"
- "💡 Try: Conversation with Henrik — He uses this word often"
- "💡 Try: Flashcard review — Quick refresher"

**Last Seen Framing:**
- "Last seen: 2 days ago" — neutral, informational
- "Last seen: 12 days ago — Ready to practice again?" — inviting, not punitive
- NOT: "You haven't practiced in 12 days" — sounds accusatory

**Mastery Signal Explanations:**
- "Accuracy: How often you get it right"
- "Consistency: Getting it right repeatedly over time"
- "Retention: Remembering it after longer breaks"
- "Speed: How quickly you can recall it"
- "Context Breadth: Using it correctly in different situations"

---

## Cross-Pattern Requirements

### Language Progression (R27)

**Tier 1 (Beginner):**
- All UI text: German + English
- Quests: "☕ Erste Bestellung (First Order)"
- Buttons: "Start Quest →" and "Quest starten →"
- Help always available

**Tier 2 (Intermediate):**
- UI text: German with English tooltips/subtitles
- Quests: German instructions + English translation below
- Buttons: German primary, English hint on hover
- Help available but costs slightly more XP

**Tier 3+ (Advanced):**
- UI text: German only (within mastery level)
- Quests: German descriptions, no translation
- Buttons: German only
- Help available but character may judge
- If user can't read quest, not ready for content (natural skill gate)

### Positive Reinforcement (R28)

**Required Framing:**
- "Reinforcement Opportunities" NOT "failures" or "weak words"
- "Ready to practice again?" NOT "You forgot this"
- "Let's try a different approach" NOT "You failed"
- Progress indicators show growth, not punishment
- Characters challenge but ultimately support

**Forbidden:**
- No "failure" badges or achievements
- No highlighting mistakes/errors publicly
- No punishment mechanics
- No negative progress indicators

### No Punishment Mechanics (R29)

**Allowed:**
- Natural consequences (Karl kicks you out, try again)
- Skill gates (need Silver badge to unlock quest)
- Relationship fluctuations (cooling off if not engaging)

**Forbidden:**
- Losing XP or levels
- Badges for failures
- "Shame" mechanics
- Forced grinding to recover from mistakes

### Notification Limits (R30)

**Hard Limits:**
- Max 1 pen pal notification per day
- Max 3 pen pal letters per week (across all pen pals)
- No notifications if app not opened in 7+ days
- Quiet hours: 10pm-8am local time (user configurable)

**Adaptive:**
- Attention score determines letter frequency
- High engagement → More frequent letters (within limits)
- Low engagement → Letters slow/stop after 30 days
- User controls: Favorites only, custom quiet hours, mute individuals

**Respect User Boundaries:**
- Easy opt-out per pen pal
- Clear notification settings
- Never spam or guilt-trip for disengagement

---

## Implementation Notes

**Technology Stack:**
- WebSocket for real-time progress updates (XP bars, quest completion)
- D1 database for progress persistence
- R2 for Foto/gift asset caching
- ElevenLabs TTS for character voices and pronunciation
- Claude API for character conversations and pen pal letters
- Cloudflare Workers + Durable Objects for pen pal scheduling

**Performance Considerations:**
- Skeleton screens during loads (no spinners)
- Lazy load Fotos and collections (load on scroll)
- Cache character voice clips (common phrases)
- Batch WebSocket updates (max 10/second)
- Progressive image loading (blur-up technique)

**Accessibility First:**
- WCAG AA compliance minimum
- Screen reader support for all interactive elements
- Keyboard navigation for all features
- `prefers-reduced-motion` support
- High contrast mode support
- Focus indicators visible

**Animation Budgets:**
- Keep animations under 1s except celebrations
- Respect motion preferences
- Use GPU-accelerated transforms (translate, scale, opacity)
- Avoid layout thrashing (batch DOM reads/writes)

**Copy Tone:**
- Warm, encouraging, never condescending
- German + English appropriate to tier
- Celebrate effort and progress
- Frame challenges as opportunities
- Character-consistent voice

---

**Status**: Design Specification  
**Created**: 2026-04-27  
**Cross-References**:
- R27: Progressive Language UI (agent/design/local.gamification-engagement-system.md §12)
- R28: Positive Reinforcement Only (§Benefits - For Motivation)
- R29: No Punishment Mechanics (§Key Design Decisions)
- R30: Notification Limits (§Key Design Decisions, §Pen Pal System)
- Full gamification system: agent/design/local.gamification-engagement-system.md