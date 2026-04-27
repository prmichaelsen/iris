# Gamification & Engagement System

**Concept**: Comprehensive progress tracking, rewards, and narrative systems to make language learning visible, motivating, and emotionally engaging  
**Created**: 2026-04-27  
**Status**: Design Specification  

---

## Overview

Iris currently operates as a conversation-based voice tutor with interactive learning widgets (flashcards, quizzes, drills). This design adds **gamification layers** that transform abstract language progress into tangible, collectible rewards and meaningful narrative experiences. The system includes:

- **Progress tracking** with dynamic mastery calculation
- **Quest system** with badge progression across skill tiers
- **Point economy** for unlocking vanity items and voices
- **Map-based progression** through German regions (sequential story campaign)
- **Photo collection system** (Fotos) earned through subquests
- **Pen pal collectible systems** - each pen pal sends themed gifts that reflect their personality (stickers, vinyl records, wine labels, pressed flowers, etc.)
- **Pen pal relationships** that deepen with engagement
- **Character revisit system** that validates progress over time

The overarching goal: users should **feel** their progress, not just see abstract numbers. Every drill completed, every conversation held, every region explored creates visible rewards and lasting relationships.

---

## Problem Statement

Language learning apps struggle with three core engagement challenges:

1. **Invisible Progress**: Users can't tell if they're actually improving. They complete lessons but have no tangible evidence of growth beyond abstract XP numbers.

2. **Motivation Decay**: Initial enthusiasm fades after weeks of repetition. Without clear milestones, rewards, or narrative hooks, users abandon the app before reaching fluency.

3. **Lack of Emotional Connection**: Most apps treat language as pure mechanics (vocab lists, grammar drills) without the cultural richness and human relationships that make language learning meaningful.

**Consequences of not solving this**:
- High churn rates after 2-4 weeks
- Users feel like they're "going through motions" without measurable improvement
- No emotional investment in continuing the journey
- Learning becomes a chore rather than an adventure

---

## Solution

Transform Iris from a tutoring tool into a **narrative-driven journey through Germany** where:

- **Quests and badges** create clear short/medium/long-term goals
- **Photo collection** provides aesthetic, collectible rewards for completing subquests
- **Pen pal relationships** add emotional depth and cultural context
- **Map progression** with regional unlocks creates a sense of exploration
- **Character revisits** validate improvement and gently catch regressions
- **Point economy** lets users choose between grinding drills or progressing through story
- **Dynamic mastery tracking** shows real progress across multiple signals (accuracy, speed, retention, context transfer)

The system creates **overlapping dopamine loops**:
- **Immediate** (seconds): Drill correct → XP bar fills → satisfying animation
- **Short-term** (minutes): Complete quest → pen pal sends you a gift (sticker, vinyl record, etc.) with a personal message
- **Medium-term** (days/weeks): Complete region → voice unlock + Foto series + full collectible set from that region's pen pal
- **Long-term** (months): Platinum badges → prestige unlocks → full photo journal + complete all 8 pen pal collections

---

## Implementation

### 1. Progress Page & Mastery Calculation

#### Progress Page Layout

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
│  • "deren"   ███░░░░░░ 88% → 45% ⬇️     │
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

#### Mastery Calculation Signals

Mastery level is **dynamic and multi-dimensional** — users can improve OR regress based on multiple signals:

**Positive Signals:**
- **Accuracy Rate** - % correct over last N attempts (weighted recent > old)
- **Consistency** - No regression after mastery (getting it right repeatedly)
- **Speed** - Response time decreasing (fluency indicator)
- **Retention** - Correctly answering after longer intervals (spaced repetition success)
- **Context Transfer** - Using correctly across different drill types (flashcard vs fill-blank vs conversation)
- **First-Try Success** - Getting it right on first exposure in new contexts
- **Trend Direction** - Improving accuracy over time

**Negative Signals (Degrade Mastery):**
- **Regression** - Getting wrong after previous correct answers
- **Declining Accuracy** - Success rate dropping over recent attempts
- **Inconsistency** - Alternating right/wrong pattern
- **Long Absence** - Haven't practiced in 30+ days (natural decay)
- **Context Failure** - Correct in flashcards but wrong in conversation
- **Speed Regression** - Taking longer than before (hesitation = uncertainty)

**Mastery Formula:**
```
Mastery = (
  accuracy_rate * 0.35 +
  consistency_score * 0.25 +
  retention_strength * 0.20 +
  speed_fluency * 0.10 +
  context_breadth * 0.10
) * recency_decay_factor * trend_multiplier
```

This prevents gaming the system — users need **true fluency across contexts**, not just repetition of the same easy drill.

---

### 2. Quest System & Badge Progression

#### Badge Tier Progression

Every skill has 6 tiers of badges representing mastery levels:

```
Grey Star (Beginner) → 
Bronze Medal (Experienced) → 
Silver Shield (Intermediate) → 
Gold Crown (Proficient) → 
Diamond Ring (Conversational) → 
Platinum Trophy (Fluent)
```

#### Quest Categories

**Core Skill Quests (Badge Progression):**
- **Der Meister** - Complete 10/50/100/500/1000 flashcard exercises
- **Lauscher** (Listener) - Complete 5/25/50/100/250 dictation exercises
- **Grammatik-Ass** (Grammar Ace) - Complete 10/50/100/250/500 fill-blank exercises
- **Geschlechts-Kenner** (Gender Expert) - Complete 25/100/250/500 gender quizzes
- **Konjugator** - Complete 10/50/100/250 conjugation drills
- **Pluralprofi** - Master pluralization (20/75/150 correct)
- **Artikelakrobat** (Article Acrobat) - Complete 25/100/250/500 article-in-context drills

**Achievement Quests (One-Time):**
- **Erste Schritte** (First Steps) - Complete your first exercise of any type
- **Perfektionist** - Get 100% on any 10-card drill
- **Perfekter Start** - Get 100% on a new drill type on first attempt
- **Comeback Kid** - Get a word wrong, then right on next attempt in same session
- **Marathon-Läufer** - Complete 20 exercises in a single session
- **Frühaufsteher** (Early Bird) - Complete session before 8am
- **Nachteule** (Night Owl) - Complete session after 10pm
- **Wochenend-Krieger** - Complete sessions on both Saturday and Sunday
- **Guten Appetit!** - Complete 3 lessons about food vocabulary
- **Weltreisender** (World Traveler) - Complete all transportation vocabulary
- **Wort-Sammler** - Encounter 500 unique German words

**Streak Quests (Repeatable/Progressive):**
- **Beständig** (Consistent) - Complete at least 1 exercise per day for 3/7/14/30/100 days
- **Unaufhaltsam** (Unstoppable) - Complete 10+ drills per day for 7 consecutive days
- **Tägliche Dosis** - Complete at least 1 exercise per day for a week

**Fun/Hidden Quests:**
- **Blitzschnell** (Lightning Fast) - Complete 5 flashcards in under 10 seconds total
- **Geschwindigkeitsdämon** - Complete a flashcard in under 2 seconds
- **Scharfes Ohr** (Sharp Ear) - Get 10 dictation exercises correct in a row
- **Zungenbrecher** (Tongue Twister) - Tiered by syllables:
  - Bronze: 4-syllable word
  - Silver: 6-syllable word
  - Gold: 8-syllable word
  - Platinum: 9+ syllable word (e.g., "Geschwindigkeitsbegrenzung")
- **Redemption Arc** - Finally master a word you'd gotten wrong 5+ times
- **Favorit gefunden** - Use the same word correctly 10 times in conversation
- **False Friend** - Encounter and correctly identify a false cognate
- **Muttersprachler?** (Native Speaker?) - Get 20 consecutive exercises correct

**Lesson Quests:**
- **Lektion [X] Abgeschlossen** - Complete lesson 1/2/3/etc.
- **A1 Champion** - Complete all A1 lessons
- **B1 Beherrscher** (B1 Master) - Complete all B1 lessons
- **Lehrer's Pet** - Complete 5 lessons without getting any wrong

**Personality/Cultural Quests:**
- **Höflichkeitsmeister** (Politeness Master) - Master formal vs. informal (Sie/du)
- **Small Talk König** - Complete 5 conversation practice sessions
- **Komplimente-Künstler** - Master giving compliments in German
- **Beschwerdeführer** (Complainer) - Master complaint vocabulary
- **Bäcker-Freund** - Master bakery ordering (Brötchen, Brezel, etc.)
- **Pünktlich!** - Complete exercises at scheduled time 5 days in a row

**Meta/System Quests:**
- **Entdecker** (Explorer) - Try every widget type at least once
- **Ziele-Setzer** (Goal Setter) - Create your first custom goal
- **Teilen ist Kümmern** - Share your sticker page
- **Sammler** - Collect 10/25/50/100 unique stickers
- **Glückspilz** (Lucky Mushroom) - Open 10 loot boxes
- **Stimmen-Wechsler** - Unlock and use 3 different ElevenLabs voices
- **Stil-Ikone** - Unlock 5 vanity items (fonts, colors, etc.)

---

### 3. Point Economy & Voice Unlocks

#### Point Sources

| Activity | Points Earned |
|---|---|
| Complete any drill | 10 points |
| Complete drill with 100% | +10 bonus (20 total) |
| Complete drill with 100% first try | +15 bonus (25 total) |
| Daily quest complete | 50 points |
| Weekly quest complete | 200 points |
| Lesson complete | 150 points |
| Map region unlocked | 500 points |
| First perfect score on new drill type | 50 points (one-time) |
| 7-day streak milestone | 100 points |
| 30-day streak milestone | 500 points |
| Badge tier increase | 100-300 points (scales with tier) |

#### Point Sinks

| Item | Point Cost | Alternative Path |
|---|---|---|
| **Voices** (early regions) | 600-800 | Complete region (free) |
| **Voices** (mid regions) | 1200-1600 | Complete region (free) |
| **Voices** (late regions) | 2400-3200 | Complete region (free) |
| **Voices** (bonus regions) | 4000 | Complete region (free) |
| **Loot boxes** (Mila's sticker packs) | 75 points | Earned via quests |
| **Chat buddies** | 500 points | Some unlocked via badges |
| **Personality packs** | 400 points | - |
| **Font packs** | 150 points | - |
| **Color schemes** | 200 points | - |
| **Specific collectibles** | 250 points | Most earned via pen pal quests |

#### Voice Unlock System (Dual Path)

Users can unlock regional voices by **either** completing the region's campaign OR spending points:

| Region Order | Voice | Free Path | Point Cost |
|---|---|---|---|
| 1️⃣ | Berliner accent | Complete Berlin | 600 |
| 2️⃣ | Bavarian accent | Complete Bavaria | 800 |
| 3️⃣ | Northern German | Complete Hamburg | 1200 |
| 4️⃣ | Rhineland accent | Complete Rhine Valley | 1600 |
| 5️⃣ | Swabian accent | Complete Black Forest | 2400 |
| 6️⃣ | Saxon accent | Complete Saxony | 3200 |
| 🎁 | Austrian accent | Complete Austria (bonus) | 4000 |
| 🎁 | Swiss German | Complete Switzerland (bonus) | 4000 |

**Design Intent:**
- **Explorers** progress through map naturally → get voices as campaign rewards
- **Grinders** drill hardcore → can buy voices directly (but costs escalate steeply)
- Early costs (600-800) feel theoretically grindable but campaign is still faster
- Late costs (2400-4000) make grinding irrational → incentivizes campaign progression
- Points become better spent on vanity items by late game

---

### 4. Map Progression & Regional Story

#### Narrative Frame: Der Wanderer (The Wanderer)

You're a solo backpacker traveling through Germany with your camera, documenting the journey while improving your German. Each region has its own story arc, characters, and photography objectives.

#### Sequential Map Progression

Regions must be completed **in order** (no skipping):

```
Berlin (starting region, always unlocked)
  ↓ Must complete Berlin to unlock
Bavaria
  ↓ Must complete Bavaria to unlock
Hamburg
  ↓ Must complete Hamburg to unlock
Rhine Valley
  ↓ Must complete Rhine Valley to unlock
Black Forest
  ↓ Must complete Black Forest to unlock
Saxony
  ↓ Must complete any 4 main regions to unlock
Austria & Switzerland (bonus regions, unlockable in any order)
```

#### Regional Narratives (Examples)

**Berlin: "Arrival - Finding Your Feet"**
- You've just arrived in Berlin. The city is overwhelming, fast-paced, full of history and subcultures.
- **Photography Goal:** Capture the contrast between old and new Berlin
- **Subquests:** Order at a Spätkauf, navigate the U-Bahn, visit Mauerpark flea market, find the best Döner
- **Voice Unlock:** Berliner accent
- **Pen Pal:** Mila (Artist, 27) - Creative, slightly chaotic, passionate about street art

**Bavaria: "Tradition Meets Modernity"**
- Heading south to Bavaria. Alpine villages, beer gardens, surprisingly tech-savvy locals.
- **Photography Goal:** Document Bavarian traditions
- **Subquests:** Attend beer garden, hike in Alps, visit Neuschwanstein, learn Bavarian dialect quirks
- **Voice Unlock:** Bavarian accent
- **Pen Pal:** Thomas (Mountain Guide, 35) - Down-to-earth, traditional but open-minded

**Hamburg: "The Port City"**
- Northern coast. Maritime culture, fish markets, rainy weather, famous Reeperbahn nightlife.
- **Photography Goal:** Capture Hamburg's relationship with the sea
- **Subquests:** Visit Fischmarkt at dawn, tour harbor, explore Speicherstadt, understand northern directness
- **Voice Unlock:** Northern German accent
- **Pen Pal:** Lena (Harbor Worker/DJ, 29) - Tough exterior, warm heart, loves electronic music

---

### 5. Photo Collection System (Fotos)

#### Core Concept

Earn AI-generated photorealistic images by completing subquests. Each Foto is a high-quality, film-photography-style image with German caption + English translation.

#### Foto Categories

**Menschen (People):**
- Der Bäcker am Morgen (The baker in the morning)
- Straßenmusikant in Kreuzberg (Street musician in Kreuzberg)
- Oma beim Kaffeetrinken (Grandma having coffee)

**Orte (Places):**
- Sonnenaufgang über der Spree (Sunrise over the Spree)
- Herbstlaub im Englischen Garten (Autumn leaves in English Garden)
- Alte Gasse in Rothenburg (Old alley in Rothenburg)

**Kultur (Culture):**
- Weihnachtsmarkt bei Nacht (Christmas market at night)
- Graffiti an der East Side Gallery
- Biergarten im Sommer (Beer garden in summer)

**Essen & Trinken (Food & Drink):**
- Frische Brezeln (Fresh pretzels)
- Currywurst mit Pommes
- Kaffee und Kuchen (Coffee and cake)

#### Gated Subquests (Mastery Requirements)

Certain special locations require mastery achievements before unlocking:

**Tier 1 Subquests (Always Available):**
- Basic interactions (order coffee, buy ticket, introduce yourself)
- **Fotos:** Tourist landmarks, basic street scenes

**Tier 2 Subquests (Requires Bronze badges):**
- Deeper cultural interactions (flea market negotiation, bar conversation)
- **Fotos:** Local hangouts, behind-the-scenes places

**Tier 3 Subquests (Requires Silver badges in Grammar + Listening):**
- Underground jazz club, poet's bookshop, artist interview
- **Fotos:** Intimate cultural scenes, artistic spaces, rare moments

**Tier 4 Subquests (Requires Gold badge in Conversation OR complete 3+ regions):**
- Locals share secret spots, exclusive viewpoints, underground art scene
- **Fotos:** Hidden locations, locals-only spots, "how did you even find this?"

#### Premium Location Unlocks

Major milestones with significant mastery requirements:

**Berlin: Der Jazzclub "Quasimodo"**
- **Unlock:** Complete 15 Berlin subquests + Gold in Listening Comprehension
- **Reward:** 5 exclusive Fotos + "Jazzkenner" badge + jazz cat chat buddy

**Berlin: Berghain (The Ultimate Challenge)**
- **Unlock:** Gold in Conversational German + Silver in Cultural Knowledge + 20 Berlin subquests + Mastery in casual/slang vocabulary
- **Challenge:** Real-time voice conversation with bouncer (AI character). No correct answers — he evaluates vibe, fluency, cultural awareness.
- **Evaluation:** Natural conversational flow, casual German (not textbook), cultural awareness, confidence
- **Reward:** Exclusive Berghain Foto series (8 images of legendary interior), "Berliner Nachtleben" badge, bouncer respect

**Bavaria: Neuschwanstein at Golden Hour**
- **Unlock:** Complete 20 Bavaria subquests + Silver in Cultural Knowledge
- **Reward:** Stunning castle photo series (8 Fotos) + "Märchenkönig" badge

**Hamburg: Elbphilharmonie Rooftop**
- **Unlock:** Complete 18 Hamburg subquests + Gold in Conversation
- **Reward:** Panoramic harbor Fotos (6 images) + "Hafenmeister" badge

**Rhine Valley: Private Wine Cellar Tour**
- **Unlock:** Complete 25 Rhine subquests + Platinum in Vocabulary
- **Reward:** Vineyard & cellar Fotos (10 images) + "Weinkenner" badge + Rhineland personality pack

---

### 6. Pen Pal System

#### Core Concept

Each region has **one special character** you can befriend through completing their personal quest chain. Once unlocked, they become your pen pal — a persistent relationship that continues even after leaving their region.

#### Pen Pal Roster

**Berlin: Mila** (Artist, 27)
- **Personality:** Creative, slightly chaotic, passionate about street art and underground culture
- **Unlock:** Help her find inspiration for next gallery show (Tier 2 Berlin quest)
- **Topics:** Art openings, Berlin politics, gentrification, graffiti spots, techno parties
- **Recommendations:** Âme, Modeselektor (music), Lola rennt (film), Faserland (book)

**Bavaria: Thomas** (Mountain Guide, 35)
- **Personality:** Down-to-earth, traditional but open-minded, loves nature and beer
- **Unlock:** Complete hiking trip learning Alpine culture (Tier 2 Bavaria)
- **Topics:** Mountain weather, hiking routes, beer garden philosophy, Bavarian traditions, family life
- **Recommendations:** LaBrassBanda (music), Wer früher stirbt ist länger tot (film), Rita Falk crime novels

**Hamburg: Lena** (Harbor Worker/DJ, 29)
- **Personality:** Tough exterior, warm heart, loves electronic music and maritime history
- **Unlock:** Help her find vintage records at Fischmarkt (Tier 2 Hamburg)
- **Topics:** DJ sets, harbor gossip, northern German pride, rainy day moods, vinyl finds
- **Recommendations:** Robin Schulz (music), Soul Kitchen (film), Tschick (book)

**Rhine Valley: Klaus** (Winemaker, 52)
- **Personality:** Philosophical, patient, storyteller, deeply connected to tradition and land
- **Unlock:** Learn winemaking through family vineyard tour (Tier 2 Rhine)
- **Topics:** Harvest seasons, family legacy, philosophy of slow living, wine pairings, local folklore
- **Recommendations:** Beethoven (music), Das Boot (film), Hermann Hesse (Siddharta, Steppenwolf)

**Black Forest: Emma** (Clockmaker's Apprentice, 24)
- **Personality:** Precise, curious, loves fairy tales and mechanical things, bit of a nerd
- **Unlock:** Help repair historical cuckoo clock (Tier 2 Black Forest)
- **Topics:** Clockwork mechanisms, fairy tale locations, forest hikes, apprenticeship challenges
- **Recommendations:** AnnenMayKantereit (music), Die unendliche Geschichte (book), Grimm Märchen

**Saxony: Henrik** (History Professor, 41)
- **Personality:** Intellectual, witty, passionate about reunification history and social change
- **Unlock:** Explore Leipzig's peaceful revolution history (Tier 2 Saxony)
- **Topics:** Historical reflections, book recommendations, political discussions, Dresden reconstruction
- **Recommendations:** Bach (music), Das Leben der Anderen (film), Der Vorleser (book)

**Austria: Sophie** (Café Owner, 33)
- **Personality:** Warm, sophisticated, loves classical music and coffee culture, romantic
- **Unlock:** Learn Viennese coffee service at her café (Tier 2 Austria)
- **Topics:** Opera reviews, café philosophy, Austrian vs. German differences, pastry recipes
- **Recommendations:** Falco (music), Before Sunrise (film), Stefan Zweig (Die Welt von Gestern)

**Switzerland: Marco** (Chocolatier, 38)
- **Personality:** Precise, perfectionistic, multilingual, dry humor, foodie
- **Unlock:** Master Swiss German dialect while learning chocolate-making (Tier 2 Switzerland)
- **Topics:** Chocolate experiments, Swiss German vs. Hochdeutsch, mountain adventures, multilingual life
- **Recommendations:** Patent Ochsner (music), Die Herbstzeitlosen (film), Dürrenmatt/Max Frisch (books)

#### Adaptive Letter Frequency

Letters adapt based on user engagement to prevent notification overload:

| User Behavior | Letter Frequency |
|---|---|
| No responses | 1 letter every 14 days (minimum contact) |
| Rare responses (1-2 letters) | 1 letter every 7-10 days |
| Occasional responses (3-5 letters) | 1 letter every 4-6 days |
| Active correspondence (6-10 letters) | 1 letter every 2-4 days |
| Deep friendship (10+ letters) | 1 letter every 1-3 days + special events |

**Attention Score System:**
```typescript
attentionScore = (
  letters_sent_by_user * 3 +
  letters_read_by_user * 1 +
  recommendations_engaged * 2 +
  days_since_last_interaction * -0.5
)
```

- System sends **max 3 pen pal letters per week** across all pen pals
- Letters prioritized by highest attention score
- If user ignores pen pals for 30+ days, letters stop (except 1/month check-in)
- **No push notifications** if user hasn't opened app in 7 days

#### Pen Pal Temperature Indicator

```
🔥🔥🔥 = Enge Freundin (Close friend) - frequent correspondence
🔥🔥 = Bekannter (Acquaintance) - occasional letters
🔥 = Flüchtig (Fleeting) - rare contact, cooling
💤 = Eingeschlafen (Dormant) - no engagement, stopped writing
```

#### Cultural Recommendations Hook

Pen pals recommend German books, movies, music, podcasts based on their personality:
- Mila → Underground techno, alternative cinema, Berlin art scene
- Thomas → Bavarian brass music, nature documentaries, regional literature
- Klaus → Classical music, philosophical books, wine culture
- Emma → Indie music, fantasy literature, fairy tales

This creates conversation hooks: "I listened to Âme like you suggested!" → Mila responds with more recommendations → deepening relationship and cultural engagement.

---

### 7. Character Revisit System

#### Core Mechanic

Any character-based subquest unlocks a **revisitable location** with that character. When you return, the character:
- Recognizes you
- Comments on your progress since last visit
- Has new conversation topics
- Can suggest contextual drills if they notice weakness

#### Progress Recognition Scenarios

**Clear Improvement ⬆️**
```
Baker: "Oh, willkommen zurück! Dein Deutsch ist viel besser 
geworden! Letzes Mal hast du noch mit den Artikeln gekämpft, 
aber jetzt klingt es sehr natürlich."

(Welcome back! Your German has gotten much better! Last time 
you were struggling with articles, but now it sounds very natural.)
```

**Regression Detected ⬇️**
```
Baker: "Hmm, du hast doch früher den Namen von allem hier 
gewusst... 'Brötchen', 'Brezel', 'Roggenbrot'... Brauchst du 
vielleicht eine kleine Auffrischung?"

(Hmm, you used to know the name of everything here... Maybe 
you need a little refresher?)

[Drill] [Maybe later]
```

If user clicks **[Drill]**, launches contextual flashcard drill with bakery vocabulary. After completing: "Siehst du? Es kommt schnell zurück!" (See? It comes back quickly!)

**Long Absence 📅**
```
Baker: "Wow, lange nicht gesehen! Wo warst du? Ich hatte 
schon gedacht, du hast uns vergessen!"

(Wow, long time no see! Where have you been? I was starting 
to think you forgot about us!)
```

#### Character Memory System

Each character tracks:
- First meeting date & your level then
- Last visit date & your level then
- Current visit & your level now
- Topics you've discussed
- Drills they've suggested

#### Contextual Drill Suggestions

Characters suggest drills relevant to their role:
- **Baker** → Flashcard with bakery vocabulary
- **Train Conductor** → Fill-blank with transport sentences
- **Bartender** → Conversation drill (ordering practice)
- **Professor** → Article-in-context drills focused on dative

---

### 8. Pen Pal Collectible System

#### Core Concept

Each pen pal sends **themed collectible gifts** that reflect their personality, profession, and passions. When you complete quests, instead of generic system rewards, you receive personalized gifts from friends with accompanying messages. This transforms game mechanics into meaningful relationship artifacts.

**Key Innovation:** "Mila sent you a new sticker!" feels completely different from "You earned a reward!" The collectible comes from a person who cares about you and wants to share their world.

#### Collectible Types by Pen Pal

**🎨 Berlin: Mila (Artist, 27)**  
**Sends:** Hand-drawn Stickers (cute anthropomorphized objects)
- She's the artist who draws these as part of her creative work
- Sends them when you complete quests: "Ich habe dir was gezeichnet zur Feier des Tages!" (I drew something for you to celebrate!)
- **Examples:** Der Apfel (apple with rosy cheeks), Das Brot (sleepy bread loaf), Der Zug (happy train), Die Katze (napping cat), Der Bär (bear in lederhosen)
- **Collection Display:** Sticker album pages you can arrange and share
- **Her Messages:** "Welcher Sticker ist dein Favorit?" (Which sticker is your favorite?), "Ich arbeite gerade an einer neuen Serie!" (I'm working on a new series!)

**🏔️ Bavaria: Thomas (Mountain Guide, 35)**  
**Sends:** Pressed Alpine Flowers & Hiking Patches
- Pressed wildflowers from his mountain hikes with German botanical names (Edelweiß, Enzian, Alpenrose, Arnika)
- Vintage-style hiking patches from mountain huts, peaks, and trails
- **Examples:** Zugspitze patch, Neuschwanstein hiking trail, pressed gentian flower with date/location
- **Collection Display:** Naturalist's journal or patch collection board
- **His Messages:** "Ich habe diese Blume auf dem Zugspitze gefunden!" (I found this flower on Zugspitze!), "Dieser Weg ist mein Favorit im Herbst." (This trail is my favorite in autumn.)

**🎵 Hamburg: Lena (Harbor Worker/DJ, 29)**  
**Sends:** Vintage Vinyl Records
- Album covers featuring German electronic/indie artists she finds at flea markets
- Each has artist name, album title, year, genre notes
- **Examples:** Âme - Rej (2011), Paul Kalkbrenner - Berlin Calling (2008), Moderat - II (2013), AnnenMayKantereit
- **Collection Display:** Record crate or vinyl shelf
- **Links:** YouTube and Bandcamp links to listen (no Spotify)
- **Her Messages:** "Hab das beim Fischmarkt gefunden – musst du hören!" (Found this at the fish market - you have to listen!), "Das Album ist der Hammer! 🎧" (This album is awesome!)

**🍷 Rhine Valley: Klaus (Winemaker, 52)**  
**Sends:** Wine Bottle Labels
- Beautiful illustrated labels from his family vineyard and Rhine region wineries
- Each has vintage year, grape variety (Riesling, Spätburgunder), tasting notes in German, terroir information
- **Examples:** Klaus Familie Riesling 2019, Rheingau Spätlese, Mosel Eiswein, historic labels from 1970s
- **Collection Display:** Wine cellar wall or tasting journal
- **His Messages:** "Dieser Jahrgang war außergewöhnlich. Die Trauben waren perfekt." (This vintage was exceptional. The grapes were perfect.), "Die Mineralität kommt vom Schieferboden." (The minerality comes from the slate soil.)

**⚙️ Black Forest: Emma (Clockmaker's Apprentice, 24)**  
**Sends:** Mechanical Curiosities & Fairy Tale Trinkets
- Tiny gears, clock keys, miniature cuckoo clocks, watch parts from historical repairs
- Fairy tale items: glass slipper charm, golden key, enchanted rose, magic mirror
- **Examples:** Brass gear from 1823 clock, cuckoo clock miniature, Brothers Grimm illustrated key, Black Forest fairy tale charms
- **Collection Display:** Wunderkammer (curiosity cabinet)
- **Her Messages:** "Dieses Zahnrad ist von einer Uhr aus 1823!" (This gear is from a clock from 1823!), "Diese Geschichte ist von den Gebrüdern Grimm!" (This story is from the Brothers Grimm!)

**📜 Saxony: Henrik (History Professor, 41)**  
**Sends:** Historical Postcards & Artifacts
- Vintage postcards from DDR era, reunification period, pre-war Leipzig/Dresden
- Small historical items: Berlin Wall fragment replica, old East German currency (Mark der DDR), stamps, propaganda posters
- **Examples:** DDR postcard of Leipzig Hauptbahnhof (1985), reunification commemorative item, Dresden Frauenkirche before/after photos
- **Collection Display:** Historian's archive or timeline
- **His Messages:** "Diese Postkarte zeigt Leipzig vor dem Fall der Mauer." (This postcard shows Leipzig before the fall of the wall.), "Geschichte ist lebendig, nicht tot." (History is alive, not dead.)

**☕ Austria: Sophie (Café Owner, 33)**  
**Sends:** Vintage Coffee & Tea Tins
- Beautiful Art Nouveau packaging from famous Viennese brands (Julius Meinl, Haag, Eduscho)
- Each tin features period graphics, brand history, blend descriptions in German
- **Examples:** Julius Meinl Jubiläumsmischung (1920s Art Nouveau), Haag Mokka (1930s geometric), K.u.K. Hoflieferant tin (Imperial era), Café Central commemorative
- **Collection Display:** Vintage pantry shelf or cabinet
- **Her Messages:** "Diese Dose ist von 1925. Damals war Kaffee noch ein Luxusgut!" (This tin is from 1925. Back then coffee was still a luxury!), "Ich benutze diese alten Dosen in meinem Café zur Dekoration!" (I use these old tins as decoration in my café!)

**🍫 Switzerland: Marco (Chocolatier, 38)**  
**Sends:** Swiss Chocolates & Desserts
- Beautifully illustrated specialty Swiss and German desserts
- Each with German name, origin story, regional traditions, craftsmanship notes
- **Swiss Examples:** Toblerone, Luxemburgerli (Sprüngli macarons), Vermicelles (chestnut "spaghetti"), Zuger Kirschtorte, Bündner Nusstorte
- **German Examples:** Schwarzwälder Kirschtorte (authentic recipe), Baumkuchen, Stollen, Berliner, Apfelstrudel
- **Collection Display:** Chocolatier's portfolio or dessert encyclopedia
- **His Messages:** "Diese Schokolade stammt aus dem Wallis. Die Kakaobohnen wurden langsam bei 45°C temperiert." (This chocolate comes from Valais. The cocoa beans were slowly tempered at 45°C.), "Emma aus dem Schwarzwald hat mir das Originalrezept gegeben!" (Emma from the Black Forest gave me the original recipe!)

#### Gift Delivery Flow

**Quest Completion → Gift Notification:**
```
✨ Quest Complete: "Harbor Tour"

📬 Lena hat dir etwas geschickt!
   (Lena sent you something!)

[Tap to open]
```

**Opening the Gift:**
```
┌─────────────────────────────────────────┐
│  Von: Lena 🎵                           │
│                                          │
│  [Envelope opens with animation]        │
│                                          │
│  Moin! Du warst also am Hafen? Krass,   │
│  oder? Ich habe dieses Album letzte     │
│  Woche beim Fischmarkt gefunden. Es     │
│  passt perfekt zur Hafenstimmung.       │
│  Check it mal aus!                       │
│                                          │
│  [Album cover appears]                   │
│  🎵 Paul Kalkbrenner                     │
│      Berlin Calling (2008)               │
│                                          │
│  [▶️ Listen on YouTube]                 │
│  [▶️ Listen on Bandcamp]                │
│                                          │
│  - Lena                                  │
│                                          │
│  [Add to Vinyl Collection]               │
└─────────────────────────────────────────┘
```

#### Collection Browser UI

```
┌─ MEINE SAMMLUNG ────────────────────────┐
│                                          │
│  [Mila] [Thomas] [Lena] [Klaus] ...     │
│    🎨      🏔️      🎵      🍷            │
│                                          │
│  Currently viewing: Lena's Vinyl Records │
│  📀 12 / 25 collected                    │
│                                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│  │ 🎵  │ │ 🎵  │ │ 🔒  │ │ 🎵  │   │
│  │ Âme │ │Moder│ │ ??? │ │Paul │   │
│  │2011 │ │ at  │      │Kalk │   │
│  └──────┘ └──────┘ └──────┘ └──────┘   │
│  "Melodic  "Deep    Locked  "Berlin    │
│   Techno"  Techno"          Calling"   │
│                                          │
│  Recent Gift from Lena:                  │
│  "Hab das beim Fischmarkt gefunden –     │
│   das Album ist der Hammer! 🎧"          │
│                                          │
│  [View All] [Write to Lena]             │
└─────────────────────────────────────────┘
```

#### Cross-Referencing Between Pen Pals

Pen pals mention each other's collections in their letters:

**Mila → Thomas:**  
"Thomas hat mir Fotos von seinen Blumenpressen gezeigt – wunderschön! Ich überlege, einige davon zu zeichnen."

**Marco → Emma:**  
"Emma aus dem Schwarzwald hat mir das Originalrezept für Schwarzwälder Kirschtorte gegeben. Respekt für Tradition!"

**Klaus → Lena:**  
"Lena hat mir erzählt, dass sie dir ein paar Platten geschickt hat. Sehr cool! Musik und Wein – beides Kunst, oder?"

**Henrik → Sophie:**  
"Sophies Kaffeehausmenüs sind faszinierende historische Dokumente. Die Preise von 1925!"

This creates a **living social network** where your pen pals know each other, comment on what they're sending you, and create a cohesive world.

#### Benefits

**Narrative Integration:**
- Gifts aren't magic rewards, they're art/treasures from friends
- Each pen pal's identity becomes functionally relevant
- Creates ongoing relationship touchpoints

**Emotional Connection:**
- "Mila made this for me" > "system gave me reward"
- Want to write back: "Ich liebe den Apfel-Sticker! Danke!"
- Social reciprocity: they're giving gifts, you want to engage

**Cultural Learning:**
- Each collectible teaches vocabulary and context
- Wine labels → terroir, grape varieties
- Historical postcards → DDR history, reunification
- Desserts → regional traditions, how to order in bakeries

**Variety:**
- 8 different aesthetic styles (hand-drawn art, pressed flowers, vinyl covers, wine labels, mechanical curiosities, vintage postcards, Art Nouveau tins, illustrated desserts)
- Different users gravitate toward different collections

**Completion Incentive:**
- "I need more Hamburg quests to complete Lena's vinyl collection!"
- Each pen pal has finite collection (20-30 items)
- Completionists want all 8 collections

**Display & Sharing:**
- Share favorite collections with friends
- "Look at my complete wine label collection from Klaus!"
- Each collection has unique display aesthetic

---

### 9. Loot Box System

#### Narrative Justification

Loot boxes are **Mila's "sticker packs"** she sells at Berlin art markets. When you buy one with points:

```
"Hey! Ich habe ein paar extra Sticker gedruckt 
für den Flohmarkt. Willst du einen? Nur 75 
Punkte!" 

(Hey! I printed some extra stickers for the flea 
market. Want one? Only 75 points!)
```

#### Contents Distribution

**Common (60%):** Random sticker from Mila, 50 bonus points, color accent unlock  
**Uncommon (30%):** Rare sticker variant (special edition with different colors/animations), font pack, 150 bonus points  
**Rare (9%):** Chat buddy, color scheme bundle, 300 bonus points, collectible from another pen pal  
**Legendary (1%):** Random voice unlock, personality pack, premium animated sticker, complete mini-collection (3-5 related items)

**Cost:** 75 points per loot box

Loot boxes are fun but not essential — everything is earnable through quest completion. The narrative framing makes them feel like supporting Mila's art rather than gambling mechanics.

---

### 10. Chat Buddy System

#### Concept

Optional animated companions that appear during sessions and cheer you on (think Clippy from Microsoft, but cuter and less annoying).

**Unlock Methods:**
- Purchase with 500 points
- Earn via specific badges
- Legendary loot box drop

**Personality Examples:**
- **Berliner Bär** - Sarcastic but encouraging Berlin bear
- **Bavarian Pretzel** - Overly enthusiastic, uses "Servus!"
- **Rhine Grape** - Relaxed wine-country vibes
- **Jazz Cat** (unlocked via Jazzclub quest) - Smooth, plays saxophone animation

---

### 11. Special Event Quests

**Seasonal:**
- **Karneval-Narr** (Carnival Fool) - Complete 5 drills during February
- **Weihnachtsengel** (Christmas Angel) - Complete holiday vocab in December
- **Osterhasenjagd** (Easter Bunny Hunt) - Complete 10 drills during Easter week
- **Oktoberfest-Meister** - Complete Bavarian food/drink vocab in September/October

**Cultural:**
- **Tag der Deutschen Einheit** (Oct 3) - Complete a history lesson
- **Adventskalender** - Complete one drill per day for all 24 days of December

---

### 12. Language Progression in UI

**Quest Language by Tier:**

**Tier 1 (Beginner):** German title + English subtitle
```
☕ Erste Bestellung (First Order)
"Order a coffee at a café"
```

**Tier 2 (Intermediate):** German title + German instructions with English translation below
```
🗣️ Smalltalk am Markt
"Führe ein Gespräch mit einem Verkäufer auf dem Flohmarkt."
(Have a conversation with a vendor at the flea market.)
```

**Tier 3+ (Advanced):** German only (vocabulary within mastery level)
```
🎷 Der Jazzclub
"Besuche eine Underground-Jazzshow und verstehe die Ansagen."
```

By Tier 3, if they can't read the quest text, they're not ready for the content — language barrier becomes natural skill gate.

---

## Benefits

**For Learning:**
- **Visible Progress** - Multiple overlapping reward loops make improvement tangible
- **Contextual Practice** - Drills tied to narrative quests feel purposeful, not arbitrary
- **Progress Validation** - Characters notice and celebrate improvement
- **Gentle Regression Catching** - Characters suggest refreshers before skills decay seriously
- **Spaced Repetition Through Narrative** - Revisiting regions = reviewing old content

**For Engagement:**
- **Multiple Playstyles** - Explorers follow story, grinders farm points, collectors chase Fotos/stickers
- **Emotional Connection** - Pen pals and characters feel like real relationships
- **Cultural Richness** - Recommendations open doors to authentic German media
- **Clear Goals** - Always something to work toward (next badge tier, region unlock, quest completion)
- **Replayability** - Return to old regions with new mastery to unlock gated content

**For Motivation:**
- **Dopamine Loops** - Immediate (XP bar), short-term (Fotos), medium-term (badges), long-term (map completion)
- **No Punishment** - "Reinforcement Opportunities" instead of "failures"
- **Choice & Agency** - Pick which quests to pursue, which pen pals to befriend, which regions to explore
- **Prestige Unlocks** - Late-game content (Berghain, Platinum badges) gives long-term goals
- **Social Sharing** - Sticker pages, Foto collections shareable with friends

---

## Trade-offs

**Complexity vs. Simplicity:**
- **Trade-off:** Many interconnected systems (quests, badges, Fotos, pen pals, points, etc.) could feel overwhelming
- **Mitigation:** Progressive onboarding — introduce one system at a time. Start with basic quests and XP, unlock pen pals after completing first region, introduce Fotos gradually through subquests.

**Content Generation Cost:**
- **Trade-off:** AI-generated Fotos, pen pal letters, character conversations = significant Claude API + image generation costs
- **Mitigation:** Pre-generate common Fotos and cache in R2. Use prompt caching for pen pal conversations. Generate letters in batches during low-usage hours. Image generation only happens once per Foto (then cached permanently).

**Balancing Grind vs. Story:**
- **Trade-off:** Point costs for voices must be high enough to incentivize story progression but not so high that grinders feel punished
- **Mitigation:** Escalating costs (600 → 4000) create clear incentives. Early voices feel grindable (3-4 days), late voices feel irrational (20+ days), so users naturally shift to story progression by mid-game.

**Notification Fatigue:**
- **Trade-off:** Pen pal letters, quest completions, level-ups could spam users with notifications
- **Mitigation:** Max 1 pen pal notification per day. Adaptive letter frequency based on engagement. User controls (Favorites Only, Quiet Hours). No notifications if user inactive 7+ days.

**Mastery Calculation Accuracy:**
- **Trade-off:** Multi-signal mastery is more accurate but more complex to implement and debug
- **Mitigation:** Start with simple accuracy + recency decay. Add additional signals (speed, context transfer) in phases. Surface mastery scores to users so they can verify accuracy.

**Cultural Recommendations Relevance:**
- **Trade-off:** Pen pals recommending obscure German media might not resonate with all users
- **Mitigation:** Each pen pal has different taste (Mila = underground, Klaus = classical, Emma = indie). Users naturally gravitate to pen pals whose recommendations match their interests. Don't force engagement — just provide hooks.

---

## Dependencies

**Existing Systems:**
- Widget system (local.widget-system.md) - Drills provide XP and quest progress
- D1 database - Stores user progress, mastery scores, quest completion, pen pal conversations
- WebSocket protocol - Real-time updates for XP bars, quest notifications, loot box animations
- ElevenLabs TTS - Regional voice unlocks require TTS integration
- Cloudflare Workers + Durable Objects - Pen pal letter scheduling, attention score calculation

**External Services:**
- Claude API - Pen pal letter generation, character conversations, progress validation
- Image Generation API (Midjourney/DALL-E/Stable Diffusion) - AI-generated Fotos
- R2 Storage - Cache Fotos and voice audio permanently

**Data Schema Extensions:**
- `user_progress` table - Overall level, XP, region completion
- `user_quests` table - Quest progress, completion timestamps
- `user_badges` table - Badge tiers per skill
- `user_fotos` table - Unlocked photos with metadata
- `user_pen_pals` table - Pen pal relationships, attention scores, last interaction
- `user_characters` table - Character visit history, mastery snapshots
- `user_stickers` table - Sticker collection, loot box history
- `pen_pal_conversations` table - Full conversation history for each pen pal
- `character_interactions` table - Revisit tracking, drill suggestions

---

## Testing Strategy

**Unit Tests:**
- Mastery calculation formula (accuracy, consistency, retention, speed)
- Attention score calculation for pen pal priority
- Point economy balance (ensure costs scale correctly)
- Quest completion logic (badge tier progression)
- Letter frequency algorithm (adaptive based on engagement)

**Integration Tests:**
- Full quest completion flow: drill → XP gain → quest progress → badge unlock → animation
- Loot box opening: point deduction → random item generation → inventory update → UI display
- Pen pal conversation: unlock → first letter → user reply → AI response → relationship deepening
- Character revisit: first visit → time passes + mastery change → revisit → appropriate greeting
- Regional progression: complete all subquests → region completion → voice unlock + Foto series

**User Experience Tests:**
- Progressive onboarding: new user sees systems introduced gradually, not all at once
- Notification timing: verify max 1 pen pal notification per day, respects quiet hours
- Mastery accuracy: users report whether mastery scores feel accurate to their actual skill
- Engagement hooks: track which systems users engage with most (quests? pen pals? Fotos?)

**Edge Cases:**
- User unlocks 6 pen pals but never replies → verify letters stop after 30 days
- User grinds to 4000 points but hasn't completed any regions → can buy Swiss voice, but map still locked
- User gets Berghain bouncer rejection → can retry, difficulty doesn't increase unfairly
- User abandons app for 90 days → mastery decay applied, pen pals dormant, gentle re-onboarding on return

---

## Migration Path

**Phase 1: Core Progress & Quests (MVP)**
- Implement XP, levels, progress page
- Basic quest system (5 core skill quests, 3 achievement quests)
- Badge progression (Grey → Platinum)
- Point economy basics (earn points from drills, daily quests)

**Phase 2: Map & Regional Progression**
- Berlin region with subquest tiers
- Regional voice unlock (Berlin only)
- Sequential map progression (must complete Berlin to unlock Bavaria)
- Point-based voice purchase option

**Phase 3: Photo Collection**
- Foto system with AI-generated images
- Subquest completion → Foto unlock
- Foto gallery UI
- Gated subquests (mastery requirements)

**Phase 4: Pen Pal System**
- Unlock Mila (Berlin pen pal)
- Letter sending/receiving UI
- Adaptive letter frequency
- Cultural recommendations hook

**Phase 5: Character Revisits**
- Character memory system
- Progress recognition (improvement, regression, stagnation)
- Contextual drill suggestions
- Integration with pen pal system (cross-referencing)

**Phase 6: Full System Integration**
- Complete all 8 regions with pen pals
- Premium locations (Berghain, Jazzclub, etc.)
- Sticker collection + loot boxes
- Chat buddies, vanity items (fonts, colors, personalities)
- Special event quests (seasonal, cultural)

---

## Key Design Decisions

### Progress & Mastery

| Decision | Choice | Rationale |
|---|---|---|
| Mastery calculation | Multi-signal (accuracy, consistency, retention, speed, context transfer) | Prevents gaming through repetition; requires true fluency across contexts |
| Mastery direction | Can improve OR degrade based on signals | Reflects reality (skills decay without practice); incentivizes continued engagement |
| Regression framing | "Reinforcement Opportunities" not "failures" | Positive framing reduces shame, positions struggle as growth opportunity |
| Progress visibility | Multiple overlapping displays (XP bar, mastery graphs, badge progression, Foto collection) | Different users connect with different reward types; redundancy ensures everyone sees progress |

### Quest System

| Decision | Choice | Rationale |
|---|---|---|
| Badge tiers | 6 tiers (Grey → Platinum) | Provides clear long-term progression; early tiers feel achievable, late tiers feel prestigious |
| Quest variety | Mix of skill-based, achievement, streak, hidden, cultural, meta | Different users motivated by different goals; variety prevents monotony |
| Hidden quests | Fun/surprise unlocks (Zungenbrecher, Redemption Arc, etc.) | Unexpected rewards create delight; encourages exploration and experimentation |
| No punishment quests | Removed "Fehler-Freund", "Langsam und Stetig", "Poltergeist" | Never highlight user failures; celebrate effort and progress only |

### Point Economy

| Decision | Choice | Rationale |
|---|---|---|
| Dual path for voices | Complete region (free) OR buy with points (expensive) | Respects different playstyles (explorers vs. grinders); escalating costs funnel users toward story |
| Point cost scaling | 600 → 4000 (early → late regions) | Early costs feel theoretically grindable; late costs make grinding irrational, incentivize campaign |
| Multiple point sinks | Voices, loot boxes, chat buddies, fonts, colors, personalities | Prevents point hoarding; gives users meaningful choices on spending |
| Point sources variety | Drills, quests, streaks, milestones, badge tiers | Multiple earn paths ensure all users accumulate points regardless of playstyle |

### Map Progression

| Decision | Choice | Rationale |
|---|---|---|
| Sequential progression | Must complete regions in order (no skipping) | Creates coherent narrative arc; ensures users build skills progressively |
| No point-based region skip | Can only advance by completing regions | Protects narrative integrity; prevents users from skipping essential content |
| Narrative frame | Solo backpacker photographer documenting journey | Gives emotional context for learning; makes quests feel purposeful not arbitrary |
| Regional voices | Each region unlocks accent from that region | Tangible, immediate reward for region completion; celebrates regional diversity |

### Photo System

| Decision | Choice | Rationale |
|---|---|---|
| Aesthetic style | Photorealistic, film photography aesthetic (slightly grainy, natural colors) | More mature and artistic than cartoon stickers; appeals to adult learners |
| Gated subquests | Require mastery achievements to unlock certain Fotos | Creates aspiration; incentivizes skill-building to access premium content |
| Premium locations | Major landmarks require significant mastery + subquest completion | Prestige unlocks for dedicated users; makes special content feel truly special |
| Foto metadata | German caption + English translation + location + date "taken" | Educational value (vocabulary exposure) + narrative flavor (feels like real travel photography) |

### Pen Pal Collectibles

| Decision | Choice | Rationale |
|---|---|---|
| Collectibles from pen pals | Each pen pal sends themed gifts matching their personality (stickers, vinyl, wine labels, etc.) | Transforms generic rewards into meaningful relationship artifacts; "Mila sent you a sticker" > "you earned a reward" |
| 8 unique collection types | Stickers, pressed flowers, vinyl records, wine labels, mechanical curiosities, historical postcards, coffee tins, desserts | Variety appeals to different users; each has unique aesthetic and educational value |
| Gifts include personal messages | Every collectible comes with note from sender | Creates ongoing conversation touchpoints; feels like receiving mail from a friend |
| Narrative justification | Mila is artist who draws stickers, Lena finds vinyl at flea markets, Klaus sends labels from his vineyard | Every gift feels organically connected to sender's life and passion |
| Cross-referencing | Pen pals mention each other's collections in letters | Creates living social network; your friends know each other and comment on what they send you |
| Loot boxes = Mila's sticker packs | "I printed extra stickers for the flea market" | Reframes gambling mechanic as supporting friend's art; maintains narrative coherence |

### Pen Pal System

| Decision | Choice | Rationale |
|---|---|---|
| One pen pal per region | 8 pen pals total | Manageable for users; each feels special and unique rather than generic NPCs |
| Adaptive letter frequency | Scales based on user engagement (attention score) | Prevents notification overload; rewards engaged users with richer content |
| Max 3 letters per week | Across all pen pals combined | Hard cap on notifications; prevents spam even if user engages with many pen pals |
| No notifications after 7 days inactive | Letters pause if user hasn't opened app | Respects user's disengagement; avoids annoying them when they're not using app |
| Cultural recommendations | Books, music, films, podcasts based on pen pal personality | Creates conversation hooks; opens doors to authentic German culture beyond app |
| Temperature indicator | 🔥🔥🔥 → 💤 shows relationship status | Visual feedback on relationship health; encourages continued engagement |

### Character Revisit

| Decision | Choice | Rationale |
|---|---|---|
| Character memory | Tracks first visit level, last visit level, current visit level | Enables meaningful progress recognition; characters feel like they truly know you |
| Progress comments | Characters notice improvement, regression, stagnation, long absence | Validates user effort; provides gentle feedback on skill maintenance |
| Contextual drills | Characters suggest drills relevant to their role (baker → food vocab) | Drills feel purposeful not arbitrary; tied to narrative and relationship |
| Drill optional | User can choose "Maybe later" | No forced practice; respects user agency; drill is offered as help not punishment |

### Language Progression

| Decision | Choice | Rationale |
|---|---|---|
| Tiered quest language | English → German+English → German only | Natural progression mirrors learning journey; language barrier becomes skill gate |
| No translation peek | Removed "🔍 translate" crutch for advanced quests | If you can't read it, you're not ready — clean skill check; encourages immersion |
| Character conversations adapt | Use simpler or more complex German based on user level | Feels responsive and personalized; avoids frustration (too hard) or boredom (too easy) |

### Notification Strategy

| Decision | Choice | Rationale |
|---|---|---|
| Max 1 pen pal notification per day | Hard limit | Prevents spam; ensures notifications feel special not overwhelming |
| Quiet hours | No notifications 10pm-8am user local time | Respects sleep schedules; avoids annoying late-night buzzes |
| User controls | Favorites Only, custom quiet hours, max per week settings | Empowers users to customize experience; respects different notification preferences |
| Dormant user = no notifications | If app not opened in 7 days, stop sending | Respects user's disengagement; doesn't spam them when they're clearly not using app |

---

## Future Considerations

**Pronunciation Scoring:**
- User records audio pronunciation → server compares via speech-to-text → scores accuracy
- Integrated into Berghain bouncer challenge (pronunciation matters for vibe check)
- Unlocks new quest type: "Aussprachemeister" (Pronunciation Master)

**Multiplayer / Social Features:**
- Friend system: see friends' progress, share sticker pages, send Fotos as gifts
- Leaderboards: weekly drill completion, longest streaks, most regions completed
- Co-op quests: two users complete a collaborative subquest (e.g., role-play conversation)

**Lesson Tool Integration:**
- `activate_lesson` tool for Claude to set session's active lesson
- Lessons constrain vocab selection and enable themed exercises
- Lesson completion triggers automatic quest progress

**Audio Caching:**
- TTS output cached in R2 by lemma+voice (eliminates repeat TTS calls for same word)
- Foto images cached permanently (generated once, served forever)
- Character voice clips pre-generated for common phrases

**Custom Goals System:**
- User creates personal learning goals (e.g., "Master restaurant ordering", "Understand soccer commentary")
- Goals function like lessons: prompt that influences agent behavior
- Goals can be activated for sessions alongside or instead of lessons

**Sticker Trading:**
- Users can trade duplicate stickers with friends
- Creates social loop and incentive to collect full sets

**Achievements Wall:**
- Visual display of all badges, premium location unlocks, milestone dates
- Shareable achievement page (like Xbox Gamerscore or Steam achievements)

**Dynamic Events:**
- Real-world German events trigger in-app quests (World Cup, Berlinale film festival, Christmas markets opening)
- Time-limited quests with exclusive rewards

---

**Status**: Design Specification  
**Recommendation**: Implement in 6 phases starting with Core Progress & Quests (Phase 1 MVP)  
**Related Documents**: 
- `agent/design/local.widget-system.md` (Widget system that drives drill XP)
- `agent/reports/audit-1-scenecraft-tool-architecture.md` (Tool-calling architecture reference)
