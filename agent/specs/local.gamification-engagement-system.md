# Specification: Gamification & Engagement System

> **🤖 Agent Directive**: This specification defines the exact implementation requirements for Iris's gamification and engagement system. All behavior must match this spec exactly.

**Namespace**: local  
**Version**: 1.0.0  
**Created**: 2026-04-27  
**Last Updated**: 2026-04-27  
**Status**: Active  

---

## Purpose

Implement a comprehensive gamification and engagement system that transforms abstract language learning progress into tangible rewards, meaningful narrative experiences, and emotional connections through quests, badges, points, map progression, photo collection, pen pal relationships, character revisits, and collectible systems.

---

## Source

Generated from design document: `agent/design/local.gamification-engagement-system.md`

---

## Scope

### In Scope

- Progress tracking with dynamic multi-signal mastery calculation
- Quest system with 6-tier badge progression (Grey → Platinum)
- Point economy with dual-path voice unlocks
- Sequential map progression through 8 German regions
- AI-generated photo collection (Fotos) system
- Pen pal system with 8 unique characters and themed collectibles
- Character revisit system with memory and progress recognition
- Karl's multi-region quest arc as recurring benchmark character
- Iris meta-layer guidance system with proactive suggestions
- Adaptive letter frequency based on engagement
- Claude-based conversation grading with character-specific weights
- Loot box system (Mila's sticker packs)
- Chat buddy system
- Special event quests (seasonal, cultural)

### Out of Scope

- Pronunciation scoring integration (future consideration)
- Multiplayer / social features (future consideration)
- Friend system and leaderboards (future consideration)
- Sticker trading between users (future consideration)
- Real-world event triggers (future consideration)
- Lesson tool integration (depends on separate lesson system)

---

## Requirements

### R1: Progress Tracking
The system MUST track user progress across multiple dimensions: overall level, XP, skill mastery, quest completion, badge tiers, regional progression, photo collection, pen pal relationships, and character interaction history.

### R2: Multi-Signal Mastery Calculation
Mastery level MUST be calculated using multiple signals: accuracy rate (35%), consistency score (25%), retention strength (20%), speed fluency (10%), and context breadth (10%), multiplied by recency decay factor and trend multiplier. Mastery CAN improve or degrade based on user behavior.

### R3: Quest System
The system MUST support multiple quest categories: Core Skill Quests with badge progression, Achievement Quests (one-time), Streak Quests (repeatable), Fun/Hidden Quests, Lesson Quests, Personality/Cultural Quests, and Meta/System Quests.

### R4: Badge Tier Progression
Every skill MUST have 6 badge tiers with unified visual design. All badges are a star inside a circle (star slightly darker than circle) with chrome finish matching the tier: Grey (Beginner), Bronze (Experienced), Silver (Intermediate), Gold (Proficient), Diamond (Conversational), Platinum (Fluent).

### R5: Point Economy
Users MUST earn points from drills (10-25 points), daily quests (50 points), weekly quests (200 points), lessons (150 points), region unlocks (500 points), and milestone achievements (100-500 points).

### R6: Dual-Path Voice Unlocks
Regional voices MUST be unlockable via two paths: complete the region (free) OR purchase with points (escalating costs: 600 → 800 → 1200 → 1600 → 2400 → 3200 → 4000 for bonus regions).

### R7: Sequential Map Progression
Regions MUST be completed in order: Berlin → Bavaria → Hamburg → Rhine Valley → Black Forest → Saxony → Austria/Switzerland (bonus). No region skipping allowed.

### R8: Photo Collection System
Users MUST earn AI-generated photorealistic images (Fotos) by completing subquests. Fotos MUST include German caption, English translation, location, and date.

### R9: Gated Subquests
Certain subquests MUST require mastery achievements: Tier 1 (always available), Tier 2 (Bronze badges), Tier 3 (Silver in Grammar + Listening), Tier 4 (Gold in Conversation OR 3+ regions complete).

### R10: Pen Pal System
Each of 8 regions MUST have one unique pen pal character unlockable via Tier 2 regional quest: Mila (Berlin), Thomas (Bavaria), Lena (Hamburg), Klaus (Rhine), Emma (Black Forest), Henrik (Saxony), Sophie (Austria), Marco (Switzerland).

### R11: Themed Collectibles
Each pen pal MUST send themed collectible gifts matching their personality: Mila (hand-drawn stickers), Thomas (pressed flowers & hiking patches), Lena (vinyl records), Klaus (wine labels), Emma (mechanical curiosities & fairy tale trinkets), Henrik (historical postcards & DDR artifacts), Sophie (coffee/tea tins), Marco (chocolates & desserts).

### R12: Adaptive Letter Frequency
Pen pal letter frequency MUST adapt based on attention score: no responses (1/14 days), rare responses (1/7-10 days), occasional (1/4-6 days), active (1/2-4 days), deep friendship (1/1-3 days). Max 3 letters/week across all pen pals.

### R13: Character Revisit System
Any character-based subquest MUST unlock a revisitable location. On revisit, characters MUST recognize the user, comment on progress since last visit, and optionally suggest contextual drills.

### R14: Character Memory
Each character MUST track: first meeting date & user level, last visit date & user level, current visit & user level, topics discussed, and drills suggested.

### R15: Karl's Multi-Region Arc
Karl der Bäcker MUST be a recurring benchmark character with 6 content-triggered discovery quests (one per region after Berlin), voice-only 5-second timer conversations, relationship scoring (0-100), and character-specific behaviors at each relationship tier.

### R16: Fast Relationship Progression
Karl's relationship MUST progress quickly: +10 for perfect (9-10/10), +8 excellent, +6 good, +4 okay, +2 rough, -3 poor, -8 terrible. Target: 8-10 perfect visits to reach 100.

### R17: Claude Conversation Grading
All character conversations MUST be graded by Claude using 7 metrics (0-10 each): comprehension, fluency, grammar, vocabulary, pronunciation, confidence, cultural_awareness. Each character MUST have weighted preferences.

### R18: Karl's Weighted Grading
Karl MUST weight: comprehension 20%, fluency 25%, grammar 10%, vocabulary 15%, pronunciation 10%, confidence 15%, cultural_awareness 5% (prioritizes speed and confidence over grammar).

### R19: Iris Meta-Layer
Iris MUST exist as omnipresent meta-layer guide who voices all game characters, provides help during conversations, analyzes performance post-conversation, preps users before tough challenges, and proactively suggests quests.

### R20: Contextual Help System
During conversations, users MUST be able to access help lifelines: Translation Hint (10 XP, whisper English), Suggested Response (20 XP, tell what to say), Graceful Exit (0 XP, polite exit), Slow Down Request (free, may annoy characters).

### R21: Proactive Quest Suggestions
Iris MUST suggest quests based on: mastery signals (speed issues → Karl), regional discovery (learned Brezel → return to Karl), quest failure (Karl kicked you out → try easier Anna's café), pen pal nudges (Mila hasn't heard from you), region readiness (crushed Berlin → ready for Bavaria).

### R22: Content-Triggered Karl Revisits
After each region completion, Iris MUST suggest returning to Karl with new bread knowledge. These suggestions MUST trigger regardless of Karl's relationship score (score-agnostic, content-driven).

### R23: Cross-Character Relationships
Pen pals MUST mention each other in letters (Klaus knows Lena, Karl trades with Klaus, Marco got Emma's recipe). Creates living social network.

### R24: Loot Box System
Loot boxes MUST be framed as "Mila's sticker packs" she sells at markets (75 points each). Distribution: Common 60%, Uncommon 30%, Rare 9%, Legendary 1%.

### R25: Chat Buddy System
Animated companions MUST be unlockable via 500 points, specific badges, or legendary loot box drops. Examples: Berliner Bär, Bavarian Pretzel, Rhine Grape, Jazz Cat.

### R26: Special Event Quests
System MUST support seasonal quests (Karneval, Weihnachten, Oktoberfest) and cultural quests (Tag der Deutschen Einheit, Adventskalender).

### R27: Progressive Language UI
Quest language MUST progress by tier: Tier 1 (German + English), Tier 2 (German instructions + English translation), Tier 3+ (German only within mastery level).

### R28: Positive Reinforcement Only
System MUST use "Reinforcement Opportunities" framing instead of "failures" or "needs attention". Never highlight mistakes, only celebrate progress.

### R29: No Punishment Mechanics
The system MUST NOT include quests or badges for failures. No "Fehler-Freund", "Langsam und Stetig", or "Poltergeist" style negative achievements.

### R30: Notification Limits
Max 1 pen pal notification per day, max 3 letters per week across all pen pals, no notifications if user inactive 7+ days, respect quiet hours (10pm-8am local time).

---

## Visual Design

### Badge Design System

All badges follow a unified design pattern with tier-specific chrome finishes:

**Base Structure:**
- Circular background with chrome finish matching tier
- Five-pointed star centered in circle
- Star color is slightly darker than circle background (maintains tier color family)
- Consistent size and proportions across all badges

**Tier Specifications:**

| Tier | Chrome Finish | Circle Color | Star Color | Visual Effect |
|---|---|---|---|---|
| Grey | Matte grey metal | `#8B8B8B` | `#6B6B6B` | Flat, beginner-friendly |
| Bronze | Brushed bronze | `#CD7F32` | `#8B5A2B` | Warm metallic sheen |
| Silver | Polished silver | `#C0C0C0` | `#A0A0A0` | Mirror-like reflection |
| Gold | Polished gold | `#FFD700` | `#DAA520` | Rich, luxurious glow |
| Diamond | Crystalline faceted | `#B9F2FF` | `#87CEEB` | Prismatic sparkle effect |
| Platinum | Brushed platinum | `#E5E4E2` | `#C5C4C2` | Subtle iridescence |

**Implementation Notes:**
- SVG format for crisp scaling at all sizes
- CSS filters or SVG gradients for chrome effects
- Subtle animation on unlock: badge materializes with tier-appropriate shimmer
- Progress ring around badge shows completion toward next tier (same chrome finish)
- Hover state: subtle glow matching tier color

**Badge Sizes:**
- Small: 32px (in-line with text, quest lists)
- Medium: 64px (badge collection, profile page)
- Large: 128px (unlock animations, achievement notifications)

**Accessibility:**
- Each tier includes text label for screen readers
- Color contrast ratios meet WCAG AA standards
- Chrome effects are decorative only, not information-bearing

## Interfaces / Data Shapes

### Database Schema

```typescript
// Progress Tracking
interface UserProgress {
  user_id: string;
  level: number;
  xp_current: number;
  xp_to_next_level: number;
  created_at: string;
  updated_at: string;
}

// Quest System
interface UserQuest {
  id: string;
  user_id: string;
  quest_id: string;
  progress: number; // 0-100 or count
  completed: boolean;
  completed_at: string | null;
  tier_unlocked: string | null; // Grey, Bronze, Silver, Gold, Diamond, Platinum
}

interface Quest {
  id: string;
  name_de: string;
  name_en: string;
  description_de: string;
  description_en: string;
  category: 'skill' | 'achievement' | 'streak' | 'hidden' | 'lesson' | 'cultural' | 'meta';
  badge_skill: string | null; // 'flashcard', 'dictation', 'grammar', etc.
  tier_thresholds: number[]; // [10, 50, 100, 500, 1000] for skill quests
  points_reward: number;
  is_repeatable: boolean;
  is_hidden: boolean;
}

// Badge System
interface UserBadge {
  user_id: string;
  skill: string; // 'flashcard', 'dictation', 'grammar', etc.
  tier: string; // 'grey', 'bronze', 'silver', 'gold', 'diamond', 'platinum'
  progress: number; // count toward next tier
  unlocked_at: string;
}

// Point Economy
interface UserPoints {
  user_id: string;
  total_earned: number;
  current_balance: number;
  updated_at: string;
}

interface PointTransaction {
  id: string;
  user_id: string;
  amount: number; // positive for earn, negative for spend
  source: string; // 'drill_complete', 'quest_complete', 'voice_unlock', etc.
  created_at: string;
}

// Map Progression
interface UserRegion {
  user_id: string;
  region_id: string; // 'berlin', 'bavaria', etc.
  unlocked: boolean;
  completed: boolean;
  subquests_completed: number;
  voice_unlocked: boolean;
  unlocked_at: string | null;
  completed_at: string | null;
}

interface Region {
  id: string;
  name_de: string;
  name_en: string;
  order_position: number; // 1-8
  narrative_title_de: string;
  narrative_title_en: string;
  voice_id: string; // ElevenLabs voice ID
  voice_cost_points: number; // 600, 800, 1200, etc.
  required_previous_region: string | null;
}

// Photo Collection
interface UserFoto {
  user_id: string;
  foto_id: string;
  unlocked_at: string;
}

interface Foto {
  id: string;
  region_id: string;
  category: string; // 'menschen', 'orte', 'kultur', 'essen'
  title_de: string;
  title_en: string;
  caption_de: string;
  caption_en: string;
  image_url: string; // R2 CDN URL
  subquest_id: string; // which subquest unlocks it
  tier_required: number; // 1-4
}

// Pen Pal System
interface UserPenPal {
  user_id: string;
  pen_pal_id: string;
  unlocked: boolean;
  relationship_score: number; // 0-100
  letters_sent_by_user: number;
  letters_received: number;
  last_interaction_at: string | null;
  attention_score: number; // calculated
  temperature: string; // 'hot', 'warm', 'cool', 'dormant'
  unlocked_at: string | null;
}

interface PenPal {
  id: string;
  name: string;
  age: number;
  profession_de: string;
  profession_en: string;
  region_id: string;
  personality_traits: string[];
  collectible_type: string; // 'stickers', 'vinyl', 'wine_labels', etc.
  unlock_quest_id: string; // Tier 2 regional quest
}

interface PenPalLetter {
  id: string;
  pen_pal_id: string;
  user_id: string;
  sender: 'pen_pal' | 'user';
  content_de: string;
  content_en: string | null; // null for user letters
  collectible_gift_id: string | null; // if letter includes gift
  sent_at: string;
  read_at: string | null;
}

// Collectibles
interface UserCollectible {
  user_id: string;
  collectible_id: string;
  acquired_from_letter_id: string | null;
  acquired_at: string;
}

interface Collectible {
  id: string;
  pen_pal_id: string;
  type: string; // 'sticker', 'vinyl', 'wine_label', etc.
  name_de: string;
  name_en: string;
  description_de: string;
  description_en: string;
  image_url: string;
  metadata: Record<string, any>; // year, artist, vineyard, etc.
  external_links: string[]; // YouTube, Bandcamp
}

// Character Revisit System
interface CharacterInteraction {
  id: string;
  user_id: string;
  character_id: string;
  interaction_type: 'first_visit' | 'revisit' | 'quest_complete';
  user_level_at_visit: number;
  mastery_snapshot: Record<string, number>; // skill -> mastery %
  conversation_grade: number | null; // 0-10
  relationship_change: number; // +8, -3, etc.
  topics_discussed: string[];
  drill_suggested: string | null;
  created_at: string;
}

interface Character {
  id: string;
  name: string;
  age: number;
  region_id: string;
  profession_de: string;
  profession_en: string;
  personality: string;
  language_style: string; // 'fast_berlin_dialect', 'patient', etc.
  voice_characteristics: string[];
  grading_weights: {
    comprehension: number;
    fluency: number;
    grammar: number;
    vocabulary: number;
    pronunciation: number;
    confidence: number;
    cultural_awareness: number;
  };
}

// Karl Specific
interface UserKarlRelationship {
  user_id: string;
  relationship_score: number; // 0-100
  first_visit_at: string;
  last_visit_at: string;
  visit_count: number;
  tier: string; // 'hostile', 'cold', 'neutral', 'friendly', 'family'
  bavarian_bread_discussed: boolean;
  hamburg_bread_discussed: boolean;
  rhine_bread_discussed: boolean;
  blackforest_bread_discussed: boolean;
  saxony_stollen_discussed: boolean;
  master_test_passed: boolean;
}

// Conversation Grading
interface ConversationGrade {
  comprehension: number; // 0-10
  fluency: number; // 0-10
  grammar: number; // 0-10
  vocabulary: number; // 0-10
  pronunciation: number; // 0-10
  confidence: number; // 0-10
  cultural_awareness: number; // 0-10
  overall_score: number; // weighted average
  relationship_delta: number; // +8, -3, etc.
}

// Mastery Calculation
interface VocabMastery {
  user_id: string;
  lemma: string;
  accuracy_rate: number; // 0-1
  consistency_score: number; // 0-1
  retention_strength: number; // 0-1
  speed_fluency: number; // 0-1
  context_breadth: number; // 0-1
  recency_decay_factor: number; // 0-1
  trend_multiplier: number; // 0.5-1.5
  mastery_level: number; // calculated 0-100
  last_seen_at: string;
  first_seen_at: string;
}

// Loot Boxes
interface LootBox {
  id: string;
  user_id: string;
  opened_at: string;
  contents: {
    type: string; // 'collectible', 'points', 'color', 'font', 'chat_buddy', 'voice'
    item_id: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  }[];
}

// Chat Buddies
interface UserChatBuddy {
  user_id: string;
  buddy_id: string;
  active: boolean;
  unlocked_at: string;
}

interface ChatBuddy {
  id: string;
  name_de: string;
  name_en: string;
  personality: string;
  animation_set: string;
  unlock_method: string; // 'points', 'badge', 'loot_box'
}
```

### API Endpoints

```typescript
// Progress
GET /api/progress/:userId
POST /api/progress/xp (body: { amount: number, source: string })

// Quests
GET /api/quests/available/:userId
GET /api/quests/active/:userId
POST /api/quests/:questId/progress (body: { increment: number })
POST /api/quests/:questId/complete

// Badges
GET /api/badges/:userId
POST /api/badges/:skill/progress (body: { count: number })

// Points
GET /api/points/:userId
POST /api/points/earn (body: { amount: number, source: string })
POST /api/points/spend (body: { amount: number, item: string })

// Map
GET /api/map/:userId
POST /api/regions/:regionId/unlock
POST /api/regions/:regionId/complete

// Fotos
GET /api/fotos/:userId
POST /api/fotos/:fotoId/unlock

// Pen Pals
GET /api/penpals/:userId
GET /api/penpals/:penPalId/letters
POST /api/penpals/:penPalId/send-letter (body: { content_de: string })
POST /api/penpals/:penPalId/read-letter/:letterId

// Collectibles
GET /api/collectibles/:userId
GET /api/collectibles/:penPalId/collection

// Characters
GET /api/characters/:characterId/info
POST /api/characters/:characterId/visit
POST /api/characters/:characterId/conversation (body: { transcript: string })

// Karl
GET /api/karl/:userId
POST /api/karl/visit
POST /api/karl/conversation (body: { transcript: string, response_time_ms: number })

// Iris
POST /api/iris/suggest-quest (body: { context: string })
POST /api/iris/help (body: { character_id: string, situation: string })

// Loot Boxes
POST /api/lootbox/open
```

---

## Behavior Table

| # | Scenario | Expected Behavior | Tests |
|---|----------|-------------------|-------|
| 1 | User completes first drill | XP awarded (10-25), progress bar updates, level-up if threshold crossed | `first-drill-completion`, `xp-award-calculation` |
| 2 | User reaches XP threshold | Level-up animation, new level displayed, XP bar resets to 0 | `level-up-trigger` |
| 3 | User completes drill with 100% | Bonus XP awarded (+10), celebratory animation | `perfect-drill-bonus` |
| 4 | User completes 10 flashcards | "Der Meister" Bronze badge unlocked, badge notification shown | `badge-unlock-tier-1` |
| 5 | User progresses through badge tiers | Badge visual updates (Grey→Bronze→Silver→Gold→Diamond→Platinum) | `badge-tier-progression` |
| 6 | User completes daily quest | 50 points awarded, quest removed from active list | `daily-quest-completion` |
| 7 | User completes Berlin region | Voice unlocked (free), 500 points awarded, Bavaria unlocked | `region-completion-rewards` |
| 8 | User tries to skip to Bavaria without completing Berlin | Error shown: "Complete Berlin first", Bavaria stays locked | `sequential-region-enforcement` |
| 9 | User buys voice with points | Points deducted, voice unlocked, can be selected in settings | `voice-purchase-with-points` |
| 10 | User tries to buy voice without enough points | Error shown: "Not enough points", voice stays locked | `insufficient-points-for-voice` |
| 11 | User completes Tier 2 subquest | Foto unlocked, Foto notification shown with German/English captions | `foto-unlock-on-subquest` |
| 12 | User tries Tier 3 subquest without Silver badges | Subquest locked, message: "Requires Silver in Grammar + Listening" | `gated-subquest-requirement` |
| 13 | User completes Tier 2 regional quest | Pen pal unlocked, first letter sent within 24 hours | `pen-pal-unlock` |
| 14 | User receives pen pal letter with gift | Letter contains message + collectible, both added to collections | `pen-pal-gift-delivery` |
| 15 | User ignores pen pal letters for 30 days | Letter frequency drops to 1/14 days, temperature becomes 💤 | `pen-pal-attention-decay` |
| 16 | User actively corresponds with pen pal | Letter frequency increases to 1/2-4 days, temperature becomes 🔥🔥🔥 | `pen-pal-attention-increase` |
| 17 | User receives 4 pen pal letters in one week | Only 3 delivered, 4th queued for next week | `max-letters-per-week-enforcement` |
| 18 | User hasn't opened app in 8 days | Pen pal letters stop sending, no notifications | `dormant-user-letter-pause` |
| 19 | User visits Karl for first time | Timer-based conversation (5s), relationship starts at 20, graded by Claude | `karl-first-visit` |
| 20 | User times out 3 times in Karl conversation | Karl says "NÄCHSTER!", quest fails, can retry immediately | `karl-timeout-failure` |
| 21 | User has perfect conversation with Karl (9-10/10) | Relationship +10, Karl responds positively | `karl-perfect-conversation` |
| 22 | User has slow conversation with Karl (5-6/10) | Relationship +2, Karl taps counter impatiently | `karl-slow-conversation` |
| 23 | User completes Bavaria, Iris suggests Karl revisit | Quest card shown: "Return to Karl with Brezel knowledge" | `iris-suggests-karl-revisit` |
| 24 | User discusses Bavarian Brezel with Karl | New dialogue unlocked, relationship +10 (cultural bonus), cross-refs Bavaria | `karl-bavarian-bread-conversation` |
| 25 | User's vocabulary mastery improves over time | Mastery % increases, moves from "Learning" to "Mastered" | `mastery-improvement` |
| 26 | User hasn't practiced word in 30+ days | Mastery % decreases (recency decay), moved to "Reinforcement Opportunities" | `mastery-decay` |
| 27 | User revisits character after improvement | Character comments: "Dein Deutsch ist viel besser geworden!" | `character-recognizes-improvement` |
| 28 | User revisits character after regression | Character offers drill: "Brauchst du vielleicht eine kleine Auffrischung?" | `character-suggests-drill` |
| 29 | User clicks [Drill] from character | Contextual drill launches (bakery vocab for baker), completes normally | `contextual-drill-launch` |
| 30 | User presses Help button during Karl conversation | Iris whispers translation (10 XP cost), character doesn't notice | `help-translation-hint` |
| 31 | User uses help 3+ times with Karl | Karl gets annoyed: "Brauchst du einen Übersetzer?", may kick user out | `excessive-help-usage` |
| 32 | User completes all regions + Karl score 90+ | Final Karl quest unlocked: "Meisterprüfung" | `karl-master-test-unlock` |
| 33 | User answers Karl's trick question correctly | Relationship 100, "Karl's Apprentice" badge, bread mini-game unlocked | `karl-master-test-success` |
| 34 | User opens Mila's sticker pack (loot box) | 75 points deducted, random item awarded based on rarity distribution | `loot-box-opening` |
| 35 | User tries loot box without 75 points | Error: "Not enough points", loot box doesn't open | `loot-box-insufficient-points` |
| 36 | User unlocks chat buddy | Animated companion appears during sessions with personality-specific dialogue | `chat-buddy-activation` |
| 37 | Seasonal event occurs (Oktoberfest) | Time-limited quest appears in quest list | `seasonal-quest-activation` |
| 38 | User views Tier 1 quest | German title + English subtitle shown | `tier-1-quest-language` |
| 39 | User views Tier 3+ quest | German only (no English translation), tests reading comprehension | `tier-3-quest-language` |
| 40 | Iris detects user struggles with speed | Proactively suggests Karl's bakery for speed practice | `iris-proactive-speed-suggestion` |
| 41 | User learns about Stollen in Saxony | Iris suggests returning to Karl for DDR history conversation | `iris-content-triggered-suggestion` |
| 42 | Pen pal mentions another pen pal in letter | Cross-reference dialogue appears: "Klaus hat mir erzählt..." | `pen-pal-cross-reference` |
| 43 | Multiple pen pals want to send letters same day | System prioritizes by attention score, enforces max 3/week | `pen-pal-priority-scheduling` |
| 44 | User completes quest showing mistake | `undefined` | → [OQ-1](#open-questions) |
| 45 | User attempts to skip ahead in Karl's regional quests | `undefined` | → [OQ-2](#open-questions) |

---

## Behavior

### Phase 1: Core Progress & Quests (MVP)

**Step 1: XP & Level Tracking**
- User completes any drill (flashcard, dictation, fill-blank, etc.)
- System calculates XP: 10 base, +10 if 100% accurate, +15 if 100% on first try
- XP added to user's current total
- If XP ≥ threshold for next level, trigger level-up
- Level-up animation plays, new level displayed, XP bar resets

**Step 2: Quest System Implementation**
- Load available quests based on user's current level and unlocked regions
- Track quest progress as drills complete (e.g., flashcard count toward "Der Meister")
- When quest threshold reached, mark complete and award points
- Display quest completion notification with badge tier unlock if applicable

**Step 3: Badge Progression**
- Each skill (flashcard, dictation, grammar, etc.) has 6-tier badge
- As user completes drills, increment badge progress counter
- When threshold reached (10, 50, 100, 500, 1000), unlock next tier
- Display badge upgrade animation with tier name

**Step 4: Point Economy Basics**
- Award points for all completing activities (drills, quests, streaks, milestones)
- Store total earned and current balance separately
- When user spends points (voice unlock, loot box, vanity items), deduct from balance
- Prevent spending if balance insufficient

### Phase 2: Map & Regional Progression

**Step 5: Regional Unlocking**
- Berlin always unlocked at start
- Bavaria unlocks only after Berlin completion
- Each subsequent region unlocks only after previous completion
- Display lock icon + requirement message for locked regions

**Step 6: Subquest Tiers**
- Tier 1 subquests always available in unlocked regions
- Tier 2 requires Bronze badge in any skill
- Tier 3 requires Silver in Grammar + Listening
- Tier 4 requires Gold in Conversation OR 3+ regions complete
- Check requirements before showing subquest as available

**Step 7: Voice Unlocks**
- When region completed, unlock voice automatically (free)
- OR allow purchase with points at any time (escalating costs)
- Once unlocked, voice appears in settings dropdown
- Apply accent/dialect to all Iris TTS in that voice

**Step 8: Regional Completion**
- Track subquest completion count per region
- When all required subquests complete, mark region as complete
- Award 500 points + voice unlock + unlock next region
- Display region completion animation

### Phase 3: Photo Collection

**Step 9: Foto Generation**
- When subquest completed, check if Foto reward attached
- Generate AI image via Midjourney/DALL-E with photorealistic film aesthetic
- Cache image in R2 with unique ID
- Create Foto record with German/English captions + CDN URL

**Step 10: Foto Unlocking**
- Add Foto to user's collection
- Display notification: "[Foto Title] - [German Caption]"
- Allow tap to view full-size with English translation

**Step 11: Foto Gallery**
- Display all unlocked Fotos in grid by region/category
- Show locked Fotos as silhouettes with unlock requirements
- Allow filtering: Menschen, Orte, Kultur, Essen

### Phase 4: Pen Pal System

**Step 12: Pen Pal Unlocking**
- When Tier 2 regional quest completed, unlock regional pen pal
- Send first letter within 24 hours
- Display pen pal profile: name, age, personality, profession

**Step 13: Letter Generation**
- Calculate attention score from user engagement metrics
- Determine letter frequency based on score (1/14 days → 1/1-3 days)
- Generate letter content via Claude using pen pal personality prompt
- Optionally attach collectible gift based on quest triggers
- Add letter to pen pal conversation thread

**Step 14: Letter Reading**
- Display unread letter notification in app
- When user opens letter, show German text + optional English translation toggle
- If gift attached, display gift card with message
- Add collectible to user's collection
- Mark letter as read, update last_interaction_at

**Step 15: User Replies**
- Allow user to write reply in German (free text)
- Store user's message in conversation thread (no translation)
- Increment attention score for sending letter
- Trigger next pen pal letter generation (respecting frequency limits)

**Step 16: Adaptive Frequency**
- Calculate attention score: (letters_sent * 3) + (letters_read * 1) + (recommendations_engaged * 2) - (days_since_last * 0.5)
- Map score to frequency tier: <10 = 1/14 days, 10-30 = 1/7-10 days, 30-60 = 1/4-6 days, 60-100 = 1/2-4 days, 100+ = 1/1-3 days
- Enforce max 3 letters per week across all pen pals
- Prioritize by attention score when multiple pen pals want to send

**Step 17: Cultural Recommendations**
- Pen pals include media recommendations in letters: music (YouTube/Bandcamp), films, books, podcasts
- Store links in letter metadata
- Track user engagement (did they click link?)
- Increase attention score when user engages with recommendations

### Phase 5: Character Revisit System

**Step 18: First Character Visit**
- When user completes character subquest, create CharacterInteraction record
- Snapshot: user level, mastery scores, topics discussed
- Characters remember this as "first meeting"

**Step 19: Revisiting Characters**
- When user returns to character location, load interaction history
- Compare current level/mastery to last visit
- Determine progress type: improvement, regression, stagnation, long absence
- Generate appropriate greeting dialogue

**Step 20: Progress Recognition**
- If improvement detected: Character says "Dein Deutsch ist viel besser geworden!"
- If regression detected: Character offers drill: "Brauchst du eine kleine Auffrischung?"
- If long absence (30+ days): "Lange nicht gesehen! Wo warst du?"
- Update relationship score based on conversation quality

**Step 21: Contextual Drill Suggestions**
- If character detects skill regression in their specialty (baker → food vocab), offer drill
- Display [Drill] / [Maybe later] buttons
- If user accepts, launch contextual flashcard drill with relevant vocabulary
- After completion, character responds: "Siehst du? Es kommt schnell zurück!"

### Phase 6: Karl's Multi-Region Arc

**Step 22: Karl First Encounter (Berlin)**
- "Erste Bestellung" quest appears in Tier 1 Berlin quests
- User visits Karl's bakery
- Voice-only conversation with 5-second timer per response
- 3 timeouts = kicked out, can retry
- Success = relationship 30/100, basic bakery vocab unlocked

**Step 23: Claude Grading**
- Send conversation transcript + response times to Claude
- Claude grades on 7 metrics (0-10 each): comprehension, fluency, grammar, vocabulary, pronunciation, confidence, cultural_awareness
- Apply Karl's weights: fluency 25%, comprehension 20%, vocabulary 15%, confidence 15%, grammar 10%, pronunciation 10%, cultural 5%
- Calculate overall score (0-10)
- Map to relationship delta: 9-10 = +10, 8-8.9 = +8, 7-7.9 = +6, 6-6.9 = +4, 5-5.9 = +2, 3-4.9 = -3, 0-2.9 = -8

**Step 24: Relationship Tiers**
- 0-20 = Hostile (3s timer, kicks you out)
- 21-40 = Cold (5s timer, "What do you want?")
- 41-60 = Neutral (7s timer, "Du schon wieder")
- 61-80 = Friendly (10s timer, small talk, free pretzel at 75)
- 81-100 = Family (no timer, DDR stories at 85, back slap at 100)
- Adjust Karl's behavior based on tier

**Step 25: Regional Discovery Quests**
- After Bavaria completion, Iris suggests: "You learned about Brezel! Return to Karl."
- User orders Brezel from Karl
- Karl recognizes regional knowledge: "Du warst in Bayern, oder?"
- New dialogue tree unlocked, relationship +10 cultural bonus
- Repeat pattern for Hamburg (Franzbrötchen), Rhine (Bauernbrot), Black Forest (Kirschkuchen), Saxony (Stollen)

**Step 26: Content-Triggered Revisits**
- Iris suggestions trigger after region completion (score-agnostic)
- Even if Karl relationship is 15 (hostile), new bread content creates fresh conversation angle
- Each regional bread unlocks unique Karl dialogue + cross-references to pen pals

**Step 27: Final Karl Quest**
- Unlocks when: all main regions complete + Karl relationship ≥ 90
- "Meisterprüfung" quest appears
- Karl asks trick question: "Was ist das beste Brot in Deutschland?"
- Good answers: "Es kommt darauf an", "Jede Region hat ihre Spezialität"
- Bad answers: "Ihr Brot!", "Bayerisches Brot!"
- Correct answer = relationship 100, "Karl's Apprentice" badge, bread mini-game unlocked

### Phase 7: Iris Meta-Layer

**Step 28: Help System**
- During any character conversation, user can press 🆘 Help button
- Display help options: Translation Hint (10 XP), Suggested Response (20 XP), Graceful Exit (0 XP), Slow Down (free)
- Deduct XP cost when user selects help
- Iris whispers help in meta-layer (character doesn't hear)
- Track help usage count per conversation
- If ≥3 helps used, some characters (Karl, Sven) react negatively

**Step 29: Post-Conversation Analysis**
- After conversation ends (success or fail), Iris provides coaching
- Analyze: response times, hesitations, grammar mistakes, cultural appropriateness
- Give specific feedback: "You hesitated for 8 seconds, try to respond within 3-5 seconds next time"
- Offer [Retry Quest] / [Review Vocabulary] / [Free Practice] options

**Step 30: Cultural Context Prep**
- Before tough conversations (Berghain with Sven), Iris briefs user
- Explain character personality, conversation strategy, cultural expectations
- Example: "Sven values confidence over perfect German. Don't mention you're a tourist."

**Step 31: Proactive Quest Suggestions**
- Iris monitors mastery signals, quest completions, regional progress
- Suggests appropriate next quest based on user's needs:
  - Speed issues → "Try Karl's bakery to practice thinking fast"
  - New regional content → "You learned about Brezel! Go tell Karl."
  - Quest failure → "Karl's tough. Try Anna's café first to build confidence."
  - Pen pal neglect → "Mila hasn't heard from you in 5 days!"
  - Region ready → "You crushed Berlin! Ready for Bavaria?"
- Display quest card with one-tap deep link to start quest

**Step 32: Meta-Commentary**
- Iris can break fourth wall to comment on player behavior
- "I noticed you've been avoiding conversation practice. Want to try talking to Karl?"
- "You just used 'deren' correctly! Two weeks ago that was in your Reinforcement Opportunities."
- "Sven rejected you, but that's okay. Your conversational German improved 10% since last attempt."

### Phase 8: Collectible System

**Step 33: Gift Delivery**
- When pen pal sends letter with gift, generate collectible record
- Display envelope animation
- Show pen pal's personal message in German
- Reveal collectible card with image, name (DE/EN), description
- If music/media item, include YouTube/Bandcamp links
- Add to user's collection under pen pal's category

**Step 34: Collection Browser**
- Display collections organized by pen pal
- Show completion progress: "12 / 25 vinyl records collected"
- Locked items show silhouette with "???"
- Each collectible has metadata: year, artist, tasting notes, historical context, etc.
- Allow sharing collection screenshots

**Step 35: Cross-Referencing**
- Pen pals mention each other in letters
- Klaus: "Lena hat mir erzählt, dass sie dir ein paar Platten geschickt hat."
- Marco: "Emma aus dem Schwarzwald hat mir das Originalrezept gegeben!"
- Creates sense of living social network where NPCs know each other

### Phase 9: Loot Box System

**Step 36: Loot Box Opening**
- User spends 75 points to open "Mila's sticker pack"
- Deduct points from balance
- Roll random item based on rarity: Common 60%, Uncommon 30%, Rare 9%, Legendary 1%
- Common: sticker + 50 points + color accent
- Uncommon: rare sticker variant + font pack + 150 points
- Rare: chat buddy + color scheme + 300 points + collectible from other pen pal
- Legendary: voice unlock + personality pack + animated sticker + mini-collection (3-5 items)
- Display loot box opening animation
- Add items to inventory

**Step 37: Narrative Framing**
- Loot box UI shows Mila's message: "Ich habe ein paar extra Sticker gedruckt für den Flohmarkt. Willst du einen?"
- Purchase button says "Support Mila's Art (75 points)"
- Reframes gambling mechanic as supporting friend's creative work

### Phase 10: Special Events

**Step 38: Seasonal Quest Activation**
- System checks current date against seasonal event calendar
- If within event window (e.g., Feb 1-28 = Karneval), activate time-limited quests
- Add quest to available quest list with ⏰ indicator
- Award special badges/rewards for seasonal completion
- Remove quest when event period ends

---

## Acceptance Criteria

- [ ] XP calculation matches formula: 10 base + 10 perfect + 15 first-try-perfect
- [ ] Level-up triggers when XP ≥ threshold
- [ ] Badge tiers progress at correct counts: 10, 50, 100, 500, 1000
- [ ] Point economy tracks earned vs. spent accurately
- [ ] Sequential region enforcement prevents skipping
- [ ] Voice dual-path works: free on completion OR purchasable with points
- [ ] Fotos generated with photorealistic aesthetic + German/English captions
- [ ] Gated subquests check mastery requirements before unlocking
- [ ] Pen pal unlock triggers after Tier 2 regional quest
- [ ] Letter frequency adapts based on attention score
- [ ] Max 3 letters per week enforced across all pen pals
- [ ] No letters sent if user inactive 7+ days
- [ ] Character revisit recognizes improvement, regression, stagnation, absence
- [ ] Contextual drills launch from character suggestions
- [ ] Karl's relationship progresses with fast scoring (8-10 visits to 100)
- [ ] Claude grading applies character-specific weights
- [ ] Karl's timer varies by relationship tier (3s hostile → no timer family)
- [ ] Regional discovery quests trigger content-based (score-agnostic)
- [ ] Iris help system deducts XP costs (10 for hint, 20 for suggestion)
- [ ] Excessive help usage (3+) triggers character annoyance
- [ ] Post-conversation analysis provides specific feedback
- [ ] Proactive quest suggestions match user's current needs
- [ ] Collectibles come from pen pals with personal messages
- [ ] Collections organized by pen pal with completion progress
- [ ] Cross-referencing dialogue appears in pen pal letters
- [ ] Loot box opening follows rarity distribution (60/30/9/1)
- [ ] Loot box framed as "Mila's sticker packs"
- [ ] Seasonal quests activate/deactivate based on calendar
- [ ] Quest language progresses: Tier 1 bilingual → Tier 3+ German only
- [ ] "Reinforcement Opportunities" framing used (never "failures")
- [ ] No punishment quests or negative badges present
- [ ] Notification limits enforced: max 1 pen pal/day, quiet hours respected

---

## Tests

### Base Cases

The core behavior contract: happy path, common bad paths, primary positive and negative assertions.

#### Test: first-drill-completion (covers R1, R5)

**Given**: User has never completed a drill  
**When**: User completes a flashcard drill with 80% accuracy  
**Then** (assertions):
- **xp-awarded**: 10 XP added to user's total
- **progress-bar-updated**: XP bar shows new value
- **no-level-up**: Level remains same (not enough XP for level-up)

#### Test: xp-award-calculation (covers R1, R5)

**Given**:
- User completes drill with 100% accuracy
- Drill is first attempt at this drill type

**When**: Drill completion triggers XP calculation  
**Then** (assertions):
- **base-xp**: 10 points awarded (base)
- **perfect-bonus**: +10 points awarded (100% bonus)
- **first-try-bonus**: +15 points awarded (first attempt bonus)
- **total-xp**: 35 points total awarded

#### Test: level-up-trigger (covers R1)

**Given**:
- User is level 5 with 2990 XP
- Level 6 threshold is 3000 XP

**When**: User earns 20 XP from drill completion  
**Then** (assertions):
- **level-increased**: User level is now 6
- **xp-reset**: Current XP is 10 (overflow from 3010)
- **animation-played**: Level-up animation triggered
- **notification-shown**: "Level 6!" notification displayed

#### Test: badge-unlock-tier-1 (covers R3, R4)

**Given**: User has completed 9 flashcard drills  
**When**: User completes 10th flashcard drill  
**Then** (assertions):
- **badge-created**: "Der Meister" Bronze badge appears in inventory
- **notification-shown**: Badge unlock notification displays
- **progress-tracked**: Badge progress now 10/50 toward Silver

#### Test: badge-tier-progression (covers R4)

**Given**: User has Bronze badge in flashcards (10 complete)  
**When**: User completes 40 more flashcards (50 total)  
**Then** (assertions):
- **tier-upgraded**: Badge upgrades from Bronze to Silver
- **visual-changed**: Badge chrome changes from bronze to silver finish (star-in-circle design maintained)
- **star-darker**: Star remains slightly darker than circle background
- **new-threshold**: Progress now 50/100 toward Gold

#### Test: daily-quest-completion (covers R3, R5)

**Given**: Daily quest "Complete 5 exercises" has 4/5 progress  
**When**: User completes 5th exercise  
**Then** (assertions):
- **quest-marked-complete**: Quest status = completed
- **points-awarded**: 50 points added to balance
- **quest-removed**: Quest removed from active quest list
- **new-daily-generated**: New daily quest generated for next day

#### Test: region-completion-rewards (covers R6, R7)

**Given**: User has completed all required Berlin subquests  
**When**: Region completion triggers  
**Then** (assertions):
- **voice-unlocked**: Berliner accent voice unlocked (free)
- **points-awarded**: 500 points added to balance
- **next-region-unlocked**: Bavaria appears as unlocked on map
- **completion-animation**: Region completion celebration shown

#### Test: sequential-region-enforcement (covers R7)

**Given**:
- Berlin is complete
- Bavaria is locked (not started)

**When**: User attempts to navigate to Bavaria map  
**Then** (assertions):
- **error-shown**: Message "Complete Berlin first" displayed
- **region-locked**: Bavaria remains locked
- **no-subquests-visible**: No Bavaria subquests appear in quest list

#### Test: voice-purchase-with-points (covers R5, R6)

**Given**:
- User has 800 points
- Bavarian voice costs 800 points
- Bavaria region is not complete

**When**: User purchases Bavarian voice  
**Then** (assertions):
- **points-deducted**: Balance reduced by 800 (now 0)
- **voice-unlocked**: Bavarian accent appears in voice selector
- **voice-usable**: User can select and use Bavarian voice
- **region-still-locked**: Bavaria region remains incomplete (purchase doesn't complete region)

#### Test: insufficient-points-for-voice (covers R5, R6)

**Given**:
- User has 600 points
- Bavarian voice costs 800 points

**When**: User attempts to purchase Bavarian voice  
**Then** (assertions):
- **error-shown**: "Not enough points" message displayed
- **voice-locked**: Bavarian voice remains locked
- **balance-unchanged**: User still has 600 points

#### Test: foto-unlock-on-subquest (covers R8)

**Given**: User completes "Harbor Tour" subquest in Hamburg  
**When**: Subquest completion triggers  
**Then** (assertions):
- **foto-generated**: AI generates photorealistic harbor image
- **foto-cached**: Image stored in R2 with unique URL
- **foto-added**: Foto added to user's collection
- **notification-shown**: "Sonnenaufgang über die Elbe" notification with German/English captions
- **gallery-updated**: Foto appears in Fotos gallery under Hamburg

#### Test: gated-subquest-requirement (covers R9)

**Given**:
- User has Bronze badge in Vocabulary
- User has no badge in Grammar or Listening
- Tier 3 subquest requires Silver in Grammar + Listening

**When**: User views available subquests  
**Then** (assertions):
- **subquest-locked**: Tier 3 subquest shows lock icon
- **message-displayed**: "Requires Silver in Grammar + Listening"
- **cannot-start**: No [Start Quest] button available

#### Test: pen-pal-unlock (covers R10)

**Given**: User completes "Find Inspiration" Tier 2 quest in Berlin  
**When**: Quest completion triggers  
**Then** (assertions):
- **pen-pal-created**: Mila appears in pen pals list
- **relationship-initialized**: Relationship score starts at 0
- **first-letter-scheduled**: Letter generation scheduled within 24 hours
- **profile-visible**: Mila's profile (age, profession, personality) viewable

#### Test: pen-pal-gift-delivery (covers R11, R12)

**Given**: User completes Berlin subquest that triggers Mila gift  
**When**: Mila's next letter is generated  
**Then** (assertions):
- **letter-contains-message**: German text: "Ich habe dir was gezeichnet!"
- **collectible-attached**: "Der Apfel" sticker attached to letter
- **collectible-added**: Sticker appears in Mila's collection
- **image-displayed**: Sticker artwork shown in letter view
- **notification-sent**: "Mila hat dir etwas geschickt!" notification

#### Test: pen-pal-attention-decay (covers R12)

**Given**:
- User unlocked Mila 30 days ago
- User has not read or replied to any letters in 30 days

**When**: System calculates attention score and letter frequency  
**Then** (assertions):
- **attention-score-low**: Score ≤ 10
- **frequency-reduced**: Letter frequency = 1 per 14 days
- **temperature-dormant**: Temperature indicator shows 💤
- **no-notifications**: No push notifications sent

#### Test: pen-pal-attention-increase (covers R12)

**Given**:
- User has sent 10 letters to Lena
- User has read 15 letters from Lena
- User has engaged with 5 music recommendations

**When**: System calculates attention score  
**Then** (assertions):
- **attention-score-high**: Score = (10*3) + (15*1) + (5*2) = 55
- **frequency-increased**: Letter frequency = 1 per 2-4 days
- **temperature-hot**: Temperature indicator shows 🔥🔥🔥
- **priority-high**: Lena prioritized when scheduling letters

#### Test: max-letters-per-week-enforcement (covers R12, R30)

**Given**:
- User has 5 active pen pals with high attention scores
- All want to send letters this week

**When**: System schedules letters for the week  
**Then** (assertions):
- **only-three-sent**: Exactly 3 letters delivered this week
- **prioritized-by-score**: Top 3 attention scores selected
- **remaining-queued**: Other 2 letters queued for next week
- **no-spam**: User doesn't receive 5 letters

#### Test: dormant-user-letter-pause (covers R12, R30)

**Given**: User hasn't opened app in 8 days  
**When**: Pen pal letter generation job runs  
**Then** (assertions):
- **letters-paused**: No new letters generated
- **no-notifications**: No push notifications sent
- **queue-empty**: Letter queue cleared
- **resumes-on-return**: Letters resume when user opens app again

#### Test: karl-first-visit (covers R15, R16)

**Given**: User starts "Erste Bestellung" quest in Berlin  
**When**: User enters Karl's bakery  
**Then** (assertions):
- **voice-only-required**: Text input disabled, mic required
- **timer-shown**: 5-second countdown timer visible
- **relationship-initialized**: Karl relationship starts at 20
- **grading-prepared**: Claude grading ready to score conversation

#### Test: karl-timeout-failure (covers R15)

**Given**: User in Karl conversation has timed out twice (2 strikes)  
**When**: User times out a 3rd time without responding  
**Then** (assertions):
- **quest-failed**: Quest marked as failed
- **karl-kicks-out**: Karl says "NÄCHSTER! Du bist noch nicht bereit."
- **retry-available**: [Retry] button shown immediately
- **relationship-unchanged**: No relationship penalty (failure is learning)

#### Test: karl-perfect-conversation (covers R16, R17, R18)

**Given**: User completes Karl conversation  
**When**: Claude grades conversation as 9.2/10 using Karl's weights  
**Then** (assertions):
- **relationship-increased**: +10 points added to relationship score
- **karl-responds-positively**: "Gut!" dialogue shown
- **grade-recorded**: ConversationGrade record saved with breakdown
- **progress-visible**: "Last visit: +10 points (excellent!)" shown on Karl's page

#### Test: karl-slow-conversation (covers R16, R17, R18)

**Given**: User completes Karl conversation with 8-second response times  
**When**: Claude grades conversation as 5.4/10 (low fluency score)  
**Then** (assertions):
- **relationship-minimal-increase**: +2 points added to relationship
- **karl-responds-impatiently**: "Ja, ja, ich warte..." dialogue shown
- **fluency-flagged**: Claude feedback mentions slow response times
- **grammar-irrelevant**: Perfect grammar didn't help score (Karl weights fluency 25% vs grammar 10%)

#### Test: iris-suggests-karl-revisit (covers R21, R22)

**Given**: User completes Bavaria region and learns about Brezel  
**When**: Region completion triggers Iris analysis  
**Then** (assertions):
- **suggestion-generated**: "You learned about Brezel! Return to Karl." quest card shown
- **deep-link-ready**: [Let's Go →] button loads Karl's bakery directly
- **score-agnostic**: Suggestion appears even if Karl relationship is low
- **content-triggered**: Trigger based on Brezel knowledge, not relationship threshold

#### Test: karl-bavarian-bread-conversation (covers R15, R22, R23)

**Given**:
- User completed Bavaria
- User visits Karl and orders "Eine Brezel, bitte"

**When**: Karl recognizes Bavarian bread knowledge  
**Then** (assertions):
- **new-dialogue-unlocked**: Special Bavaria dialogue tree appears
- **karl-comments**: "Du warst in Bayern, oder? Die Brezel dort sind anders..."
- **cultural-bonus**: +10 relationship (beyond conversation grade)
- **cross-reference-mentioned**: Karl mentions "Thomas aus Bayern"
- **flag-set**: `bavarian_bread_discussed` = true in Karl relationship record

#### Test: mastery-improvement (covers R2)

**Given**:
- User has vocab item "der Zug" at 70% mastery
- User correctly uses it 5 times in different contexts over 2 weeks

**When**: System recalculates mastery  
**Then** (assertions):
- **accuracy-increased**: Accuracy rate improves to 95%
- **consistency-improved**: Consistency score rises
- **context-breadth-increased**: Used in flashcard, conversation, fill-blank
- **mastery-level-increased**: Overall mastery rises to 95%
- **status-changed**: Moves from "Learning" to "Mastered" category

#### Test: mastery-decay (covers R2)

**Given**:
- User has vocab item "deren" at 88% mastery
- User hasn't seen it in 30 days

**When**: System applies recency decay  
**Then** (assertions):
- **recency-factor-applied**: Decay multiplier reduces score
- **mastery-decreased**: Mastery drops to 45%
- **status-changed**: Moves to "Reinforcement Opportunities"
- **last-seen-tracked**: `last_seen_at` shows 30 days ago
- **drill-suggested**: UI suggests: "Try: fill-blank drill"

#### Test: character-recognizes-improvement (covers R13, R14)

**Given**:
- User visited baker 30 days ago at level 5
- User returns at level 9 with improved vocabulary mastery

**When**: User revisits baker  
**Then** (assertions):
- **greeting-changed**: "Dein Deutsch ist viel besser geworden!"
- **comparison-made**: "Letztes Mal hast du noch mit den Artikeln gekämpft"
- **memory-loaded**: Character references previous visit level
- **positive-tone**: Encouragement given

#### Test: character-suggests-drill (covers R13, R14)

**Given**:
- User visited baker 60 days ago with strong bakery vocabulary
- User returns with declined bakery vocabulary mastery

**When**: Character detects regression  
**Then** (assertions):
- **regression-noted**: "Du hast doch früher den Namen von allem hier gewusst..."
- **drill-offered**: [Drill] and [Maybe later] buttons shown
- **contextual-drill-ready**: Drill contains bakery vocabulary specifically
- **optional**: User can decline without penalty

#### Test: contextual-drill-launch (covers R13)

**Given**: Baker suggested drill after detecting vocabulary regression  
**When**: User clicks [Drill] button  
**Then** (assertions):
- **drill-launches**: Flashcard drill starts immediately
- **vocabulary-scoped**: Only bakery vocabulary included
- **character-waits**: Baker's conversation paused during drill
- **completion-response**: After drill, baker says "Siehst du? Es kommt schnell zurück!"

#### Test: help-translation-hint (covers R19, R20)

**Given**: User in Karl conversation, Karl asks "Was willst du?"  
**When**: User presses 🆘 Help button and selects Translation Hint  
**Then** (assertions):
- **xp-deducted**: 10 XP removed from balance
- **iris-whispers**: English translation shown in meta-layer: "He's asking what you want"
- **character-unaware**: Karl doesn't react to help usage (invisible to him)
- **timer-continues**: 5-second timer keeps running
- **help-counted**: Help usage counter increments

#### Test: excessive-help-usage (covers R20)

**Given**: User has used help 2 times in current Karl conversation  
**When**: User uses help a 3rd time  
**Then** (assertions):
- **karl-reacts**: "Warum dauert das so lange? Brauchst du einen Übersetzer?"
- **annoyance-shown**: Karl's impatience visible in dialogue
- **relationship-at-risk**: If 4th help used, Karl may kick user out
- **warning-given**: Iris warns: "Karl is getting impatient with the help requests"

#### Test: karl-master-test-unlock (covers R15)

**Given**:
- User completed all 6 main regions
- Karl relationship ≥ 90

**When**: User visits Karl's bakery  
**Then** (assertions):
- **new-quest-appears**: "Meisterprüfung" (Master's Test) quest shown
- **special-dialogue**: Karl says "So. Du bist jetzt zurück. Du warst überall..."
- **trick-question-posed**: "Was ist das beste Brot in Deutschland?"
- **no-timer**: Conversation has no time pressure (relationship 90+ = no timer)

#### Test: karl-master-test-success (covers R15)

**Given**: User answers Karl's trick question correctly ("Es kommt darauf an")  
**When**: Karl evaluates answer  
**Then** (assertions):
- **karl-approves**: "HA! RICHTIG! Es gibt kein 'bestes' Brot."
- **relationship-maxed**: Relationship set to 100
- **badge-awarded**: "Karl's Apprentice" badge unlocked
- **mini-game-unlocked**: Bread-making mini-game appears in Berlin
- **physical-gesture**: Karl slaps user on back: "Du bist jetzt wirklich ein Deutscher."

#### Test: loot-box-opening (covers R24)

**Given**: User has 75 points  
**When**: User opens "Mila's sticker pack"  
**Then** (assertions):
- **points-deducted**: Balance reduced by 75
- **rarity-rolled**: Random number determines rarity (60% common, 30% uncommon, 9% rare, 1% legendary)
- **item-awarded**: Item from appropriate rarity tier added to inventory
- **animation-played**: Loot box opening animation shown
- **mila-message**: "Ich habe ein paar extra Sticker gedruckt!" displayed

#### Test: loot-box-insufficient-points (covers R24)

**Given**: User has 50 points (need 75)  
**When**: User attempts to open loot box  
**Then** (assertions):
- **error-shown**: "Not enough points" message displayed
- **loot-box-unopened**: No items generated
- **balance-unchanged**: User still has 50 points
- **retry-button**: User can see they need 25 more points

#### Test: chat-buddy-activation (covers R25)

**Given**: User unlocks "Berliner Bär" chat buddy via legendary loot box  
**When**: User starts a drill session  
**Then** (assertions):
- **buddy-appears**: Animated bear appears in UI corner
- **personality-active**: Sarcastic encouragement messages shown
- **animations-play**: Bear reacts to correct/incorrect answers
- **toggleable**: User can turn buddy on/off in settings

#### Test: seasonal-quest-activation (covers R26)

**Given**: Current date is October 15  
**When**: System checks seasonal event calendar  
**Then** (assertions):
- **quest-appears**: "Oktoberfest-Meister" quest added to quest list
- **time-indicator**: ⏰ icon shows quest is time-limited
- **special-rewards**: Quest offers exclusive Oktoberfest badge
- **auto-expires**: Quest removed on November 1

#### Test: tier-1-quest-language (covers R27)

**Given**: User is viewing Tier 1 quest "Erste Bestellung"  
**When**: Quest details are displayed  
**Then** (assertions):
- **german-title**: "Erste Bestellung" shown prominently
- **english-subtitle**: "First Order" shown below in smaller text
- **instructions-bilingual**: Both German and English instructions provided
- **accessible**: Beginner can understand what to do

#### Test: tier-3-quest-language (covers R27)

**Given**: User is viewing Tier 3+ quest "Der Jazzclub"  
**When**: Quest details are displayed  
**Then** (assertions):
- **german-only**: "Besuche eine Underground-Jazzshow und verstehe die Ansagen."
- **no-english**: No English translation provided
- **skill-gate**: If user can't read it, they're not ready for the content
- **vocabulary-appropriate**: German text uses only words within mastery level

#### Test: iris-proactive-speed-suggestion (covers R19, R21)

**Given**: Iris detects user taking 8-10 seconds to respond in conversations  
**When**: Iris analyzes conversation patterns  
**Then** (assertions):
- **suggestion-generated**: Quest card suggests Karl's bakery for speed practice
- **context-explained**: "Karl gives you 5 second timers, so you HAVE to think on your feet"
- **deep-link-ready**: [Go to Karl's Bakery →] button available
- **motivation-provided**: "It's tough, but if you can handle Karl, you can handle anything!"

#### Test: iris-content-triggered-suggestion (covers R21, R22)

**Given**: User just learned about Stollen in Saxony from Henrik  
**When**: Conversation ends and Iris analyzes content  
**Then** (assertions):
- **suggestion-generated**: "Henrik mentioned Stollen! Karl has stories about DDR-era Stollen."
- **score-agnostic**: Appears regardless of Karl relationship level
- **new-content-promised**: Suggests emotional/historical conversation (not repeat)
- **quest-card-shown**: One-tap to start Karl revisit

#### Test: pen-pal-cross-reference (covers R23)

**Given**: User received wine label from Klaus  
**When**: Lena sends next letter  
**Then** (assertions):
- **cross-reference-appears**: "Klaus hat mir erzählt, dass er dir Weinetiketten schickt."
- **living-world**: Pen pals know each other and comment on gifts
- **dialogue-natural**: Feels like real friend group conversations
- **relationship-depth**: Creates sense of interconnected social network

#### Test: pen-pal-priority-scheduling (covers R12, R23)

**Given**:
- Mila attention score: 85
- Lena attention score: 60
- Klaus attention score: 40
- All want to send letters this week

**When**: System schedules weekly letters  
**Then** (assertions):
- **top-three-selected**: Mila, Lena, Klaus selected (not others)
- **prioritized-by-score**: Highest attention scores first
- **max-three-enforced**: Exactly 3 letters sent
- **others-wait**: Lower-scoring pen pals wait until next week

### Edge Cases

Boundaries, unusual inputs, concurrency, idempotency, ordering, time-dependent behavior, resource exhaustion.

#### Test: xp-overflow-on-level-up (covers R1)

**Given**:
- User at level 5 with 2950 XP
- Level 6 threshold is 3000 XP

**When**: User earns 100 XP from perfect first-try drill  
**Then** (assertions):
- **level-increased**: User now level 6
- **overflow-carried**: Current XP is 50 (2950 + 100 - 3000)
- **single-level-only**: Only advances one level even with large overflow
- **bar-accurate**: Progress bar shows 50 XP toward level 7

#### Test: multiple-badge-tiers-same-session (covers R4)

**Given**: User at 98 flashcards (near Silver threshold at 100)  
**When**: User completes 52 flashcards in one session (150 total)  
**Then** (assertions):
- **two-tiers-unlocked**: Silver unlocked at 100, Gold unlocked at 150
- **both-notifications**: Two separate badge notifications shown
- **points-awarded-twice**: Badge tier points awarded for both unlocks
- **final-tier-displayed**: Gold badge shown as current tier

#### Test: simultaneous-quest-completion (covers R3)

**Given**:
- User at 4/5 daily quest progress
- User at 9/10 Der Meister Bronze progress
- User completes flashcard drill

**When**: Drill completion triggers  
**Then** (assertions):
- **both-quests-complete**: Daily quest AND Der Meister progress incremented
- **points-from-both**: Daily quest points + badge tier points awarded
- **no-race-condition**: Both completions recorded without conflict
- **notifications-batched**: Both shown together or sequentially

#### Test: region-unlock-without-voice-purchase (covers R6, R7)

**Given**:
- User purchased Bavarian voice with points (Bavaria still locked)
- User later completes Berlin region

**When**: Berlin completion unlocks Bavaria  
**Then** (assertions):
- **bavaria-unlocked**: Bavaria appears unlocked on map
- **voice-already-owned**: Bavarian voice still owned (not duplicate)
- **no-duplicate-unlock**: Voice unlock message doesn't appear again
- **subquests-visible**: Bavaria subquests now available

#### Test: mastery-at-boundary-values (covers R2)

**Given**: Vocab item at 100% mastery (maximum)  
**When**: User gets it correct again  
**Then** (assertions):
- **mastery-capped**: Mastery stays at 100% (doesn't exceed)
- **consistency-maintained**: Consistency score remains high
- **no-overflow**: No error or data corruption

#### Test: mastery-zero-floor (covers R2)

**Given**: Vocab item at 5% mastery  
**When**: User gets it wrong and hasn't seen it in 60 days  
**Then** (assertions):
- **mastery-floored**: Mastery goes to 0% (doesn't go negative)
- **reinforcement-flagged**: Moved to "Reinforcement Opportunities"
- **drill-suggested**: System suggests relearning drill

#### Test: pen-pal-letter-collision (covers R12)

**Given**:
- System scheduled Mila letter for 2pm today
- User sends Mila a letter at 1:50pm

**When**: 2pm arrives and scheduled letter attempts to send  
**Then** (assertions):
- **letter-sent**: Scheduled letter still sent (user reply doesn't cancel it)
- **conversation-flow**: Letters appear in chronological order
- **no-duplicate**: Only one scheduled letter sent
- **attention-updated**: User's sent letter updates attention score

#### Test: letter-frequency-daily-cap (covers R30)

**Given**:
- Mila sent letter at 12:01am today
- Lena wants to send letter at 3pm today
- Klaus wants to send letter at 6pm today

**When**: System attempts to send second pen pal notification  
**Then** (assertions):
- **max-one-per-day**: Only Mila's letter sent today
- **others-queued**: Lena and Klaus letters queued for tomorrow
- **no-spam**: User doesn't receive multiple pen pal notifications same day

#### Test: quiet-hours-enforcement (covers R30)

**Given**:
- User's quiet hours: 10pm - 8am
- Pen pal letter generated at 11pm

**When**: System attempts to send notification  
**Then** (assertions):
- **notification-delayed**: No push notification sent at 11pm
- **letter-available**: Letter appears in app if user opens it
- **notification-sent-morning**: Push notification sent at 8am next day
- **no-night-disturbance**: User not woken up

#### Test: character-memory-first-visit (covers R14)

**Given**: User has never visited this character before  
**When**: User completes character's subquest  
**Then** (assertions):
- **memory-initialized**: CharacterInteraction record created
- **first-meeting-flagged**: `interaction_type: 'first_visit'`
- **baseline-snapshot**: User level and mastery scores saved
- **no-comparison**: No "improvement" or "regression" comments (nothing to compare to)

#### Test: character-revisit-same-day (covers R13, R14)

**Given**: User visited character 2 hours ago  
**When**: User revisits same character  
**Then** (assertions):
- **memory-loaded**: Previous visit data retrieved
- **recent-visit-acknowledged**: "Du schon wieder!" (You again!)
- **no-progress-comment**: Too soon to detect meaningful progress
- **conversation-continues**: Normal interaction proceeds

#### Test: karl-relationship-at-boundaries (covers R16)

**Given**: Karl relationship at 100 (maximum)  
**When**: User has another perfect conversation (+10)  
**Then** (assertions):
- **relationship-capped**: Stays at 100 (doesn't exceed)
- **no-overflow**: No error or data corruption
- **tier-maintained**: Remains in "Family" tier
- **dialogue-consistent**: Karl still treats user as family

#### Test: karl-relationship-zero-floor (covers R16)

**Given**: Karl relationship at 5  
**When**: User has terrible conversation (-8)  
**Then** (assertions):
- **relationship-floored**: Goes to 0 (minimum)
- **hostile-tier**: Tier = "Hostile"
- **kicked-out-immediately**: Karl refuses service
- **recovery-possible**: User can retry and rebuild from 0

#### Test: karl-timeout-countdown-edge (covers R15)

**Given**: User in Karl conversation with 4.9 seconds elapsed  
**When**: User starts speaking at 4.9 seconds  
**Then** (assertions):
- **response-accepted**: Timer stops, response recorded
- **no-timeout**: Not counted as timeout
- **grace-period**: System gives reasonable tolerance (< 100ms over)

#### Test: claude-grading-timeout (covers R17)

**Given**: User completes Karl conversation  
**When**: Claude API call times out after 30 seconds  
**Then** (assertions):
- **retry-attempted**: System retries grading once
- **fallback-score**: If retry fails, use fallback score (5/10 neutral)
- **no-user-error**: User sees "Conversation saved" not "Error"
- **logged**: Timeout logged for debugging

#### Test: claude-grading-malformed-response (covers R17)

**Given**: User completes character conversation  
**When**: Claude returns malformed JSON  
**Then** (assertions):
- **error-caught**: JSON parse error caught gracefully
- **fallback-applied**: Neutral scores (5/10) used
- **conversation-saved**: Interaction record still created
- **user-unaware**: No error shown to user

#### Test: foto-generation-failure (covers R8)

**Given**: User completes subquest with Foto reward  
**When**: Image generation API returns error  
**Then** (assertions):
- **retry-attempted**: System retries image generation once
- **placeholder-used**: If retry fails, placeholder image used
- **foto-record-created**: Foto record created with placeholder URL
- **background-retry**: System queues for background regeneration
- **user-notified**: "Foto unlocked! Processing..." message shown

#### Test: foto-duplicate-unlock-attempt (covers R8)

**Given**: User already unlocked "Sonnenaufgang über der Spree" Foto  
**When**: User completes same subquest again  
**Then** (assertions):
- **no-duplicate**: No second Foto record created
- **idempotent**: Operation safe to repeat
- **no-notification**: No "new Foto" notification shown
- **gallery-unchanged**: Foto gallery shows only one copy

#### Test: pen-pal-unlock-duplicate (covers R10)

**Given**: User already unlocked Mila (corrupted data causes re-trigger)  
**When**: System attempts to unlock Mila again  
**Then** (assertions):
- **idempotent**: No duplicate pen pal record created
- **no-second-letter**: First letter not re-sent
- **relationship-preserved**: Existing relationship score maintained
- **no-user-impact**: User doesn't see any error or change

#### Test: collectible-duplicate-gift (covers R11)

**Given**: User already owns "Der Apfel" sticker  
**When**: Mila tries to send "Der Apfel" again  
**Then** (assertions):
- **no-duplicate**: No second collectible record created
- **letter-still-sent**: Letter sent but without duplicate gift
- **message-adjusted**: Mila mentions: "Ich glaube, du hast diesen schon!"
- **different-gift-selected**: System selects different sticker user doesn't own

#### Test: loot-box-rarity-distribution-over-1000-opens (covers R24)

**Given**: System runs 1000 simulated loot box openings  
**When**: Rarity distribution calculated  
**Then** (assertions):
- **common-60-percent**: ~600 common items (58-62% tolerance)
- **uncommon-30-percent**: ~300 uncommon items (28-32% tolerance)
- **rare-9-percent**: ~90 rare items (7-11% tolerance)
- **legendary-1-percent**: ~10 legendary items (0-2% tolerance)
- **total-1000**: Exactly 1000 items generated

#### Test: concurrent-xp-updates (covers R1)

**Given**: User completes 3 drills simultaneously (parallel API calls)  
**When**: All three trigger XP updates  
**Then** (assertions):
- **all-updates-applied**: XP reflects all 3 drill completions
- **no-lost-updates**: No XP lost due to race condition
- **correct-total**: Total XP = starting + (3 × drill XP)
- **atomic-operations**: Database uses atomic increment

#### Test: concurrent-quest-progress (covers R3)

**Given**: User completes 2 flashcards in quick succession  
**When**: Both increment "Der Meister" quest progress  
**Then** (assertions):
- **both-counted**: Progress increases by 2
- **no-race-condition**: No lost increments
- **correct-threshold-check**: Badge unlock triggers at exact threshold
- **atomic-counter**: Database counter incremented atomically

#### Test: time-zone-midnight-boundary (covers R26)

**Given**:
- User in timezone UTC+1
- Seasonal quest ends at midnight UTC

**When**: User time is 11:30pm but UTC is already past midnight  
**Then** (assertions):
- **quest-removed**: Seasonal quest removed based on UTC time
- **consistent-globally**: All users see same quest availability
- **no-timezone-exploit**: User can't extend quest by changing timezone

#### Test: negative-points-prevention (covers R5)

**Given**: User has 50 points  
**When**: Bug causes attempt to spend 100 points  
**Then** (assertions):
- **transaction-rejected**: Spend operation fails
- **balance-unchanged**: User still has 50 points
- **error-logged**: Negative balance attempt logged
- **no-debt**: System never allows negative points

#### Test: xp-integer-overflow (covers R1)

**Given**: User has 2,147,483,640 XP (near 32-bit int max)  
**When**: User earns 100 XP  
**Then** (assertions):
- **no-overflow**: Total XP = 2,147,483,740 (stored correctly)
- **bigint-handling**: Database uses 64-bit integer
- **no-wrap-around**: XP doesn't wrap to negative or zero
- **display-formatted**: UI formats large number with commas

#### Test: empty-pen-pal-attention-score (covers R12)

**Given**: Pen pal just unlocked (all metrics at 0)  
**When**: System calculates attention score  
**Then** (assertions):
- **score-zero**: Attention score = 0
- **default-frequency**: Letter frequency = 1 per 7-10 days
- **first-letter-sent**: First letter sent within 24 hours regardless
- **no-division-by-zero**: No mathematical errors

#### Test: maximum-pen-pals-unlocked (covers R10, R12)

**Given**: User has unlocked all 8 pen pals  
**When**: All have high attention scores  
**Then** (assertions):
- **priority-queue-works**: Top 3 by score selected each week
- **rotation-fair**: Over 3 weeks, all 8 get a chance if scores similar
- **max-three-enforced**: Never more than 3 letters per week
- **system-handles-load**: No performance degradation with 8 active

#### Test: character-interaction-history-limit (covers R14)

**Given**: User has visited same character 1000 times  
**When**: System loads character memory  
**Then** (assertions):
- **recent-loaded**: Loads last 10-20 interactions only
- **performance-acceptable**: Query returns in < 500ms
- **pagination-works**: Older interactions paginated if user requests
- **comparison-accurate**: "Last visit" comparison uses most recent

#### Test: iris-suggestion-spam-prevention (covers R21)

**Given**: Multiple quest triggers fire simultaneously  
**When**: Iris generates suggestions  
**Then** (assertions):
- **max-one-suggestion**: Only one quest card shown at a time
- **prioritized**: Most relevant suggestion selected
- **others-queued**: Other suggestions available in "Suggestions" menu
- **no-ui-clutter**: User not overwhelmed with multiple cards

#### Test: seasonal-quest-year-boundary (covers R26)

**Given**: Oktoberfest quest active in October 2025  
**When**: October 2026 arrives  
**Then** (assertions):
- **quest-reactivated**: Oktoberfest quest appears again
- **progress-reset**: Previous year's progress doesn't carry over
- **new-rewards**: User can earn badge again (or new variant)
- **annual-recurrence**: Seasonal quests repeat yearly

#### Test: karl-relationship-tier-boundary (covers R16)

**Given**: Karl relationship at 59 (just below Neutral threshold of 60)  
**When**: User has good conversation (+6 points → 65 total)  
**Then** (assertions):
- **tier-upgraded**: Tier changes from "Cold" to "Neutral"
- **behavior-changed**: Timer increases from 5s to 7s
- **dialogue-updated**: Karl says "Du schon wieder" instead of "What do you want?"
- **threshold-exact**: Tier change happens at exactly 60

---

## Non-Goals

- Real-time pronunciation scoring via speech-to-text comparison (future consideration)
- Multiplayer features: friend system, leaderboards, co-op quests (future consideration)
- Sticker trading between users (future consideration)
- Live event triggers based on real-world German events (future consideration)
- Full lesson tool integration (depends on separate lesson system implementation)
- Native mobile app (web app only for now)
- Offline mode (requires internet connection for Claude grading and image generation)
- Gamification for languages other than German (German-only for MVP)

---

## Open Questions

### OQ-1: How should the system handle quests that display mistakes?

**Question**: If user gets a drill wrong, should there be a visual indication in the quest progress UI?

**Context**: Design specifies "no punishment mechanics" and "Reinforcement Opportunities" framing, but quest progress tracking might show things like "8/10 correct" which could feel negative.

**Options**:
1. Show only completion count: "8 completed" (hide incorrect count)
2. Show accuracy percentage but frame positively: "80% mastery!" not "20% wrong"
3. Never show individual drill accuracy in quest progress, only completion count

**Needs**: User feedback on which framing feels most motivating without feeling dishonest about progress.

---

### OQ-2: Can users skip ahead in Karl's regional discovery quests?

**Question**: If user completes Bavaria but hasn't discussed Bavarian bread with Karl, then completes Hamburg, what happens?

**Context**: Design says regional discovery quests are content-triggered after region completion, but doesn't specify if they must be done in order.

**Options**:
1. User can discuss any bread in any order (Karl remembers which ones you've covered)
2. Karl only discusses breads in order (forces you to backtrack if you skip)
3. Karl's dialogue adapts: "You skipped telling me about Brezel! What about Hamburg bread?"

**Needs**: Decision on whether Karl's arc must be linear or can be non-linear.

---

## Related Artifacts

- **Source Design**: `agent/design/local.gamification-engagement-system.md`
- **Widget System Design**: `agent/design/local.widget-system.md` (drills that feed XP into gamification)
- **Future Specs**: Will need specs for each phase:
  - Phase 1: Core Progress & Quests
  - Phase 2: Map & Regional Progression
  - Phase 3: Photo Collection
  - Phase 4: Pen Pal System
  - Phase 5: Character Revisit System
  - Phase 6: Full System Integration

---

**Status**: Active  
**Next Steps**: Address open questions, then create implementation tasks from this spec for Phase 1 (Core Progress & Quests MVP)
