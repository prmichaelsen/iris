# Changelog

All notable changes to Iris are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning follows [SemVer](https://semver.org/).

## [Unreleased]

### Added
- **M9 milestone planning (Foundation + UX + OpenAPI)**: comprehensive 2-week milestone with 8 tasks (~60 hours) establishing gamification foundation before vertical slice implementation
  - OpenAPI 3.0+ specification for all 40+ gamification endpoints (progress, quests, badges, points, map, characters, pen pals, collections)
  - UX patterns document covering 10 major surfaces (progress page, badges, map, character interactions, foto gallery, pen pal interface, collections)
  - D1 schema design with 20+ tables (user_progress, quests, badges, points, regions, characters, pen_pals, fotos, fairy_tales)
  - Base MCP tools (set_context, view_progress, debug_state) enabling early testing via Claude conversations
  - Visual design system (badge tiers with chrome effects, color palettes, animations, typography)
  - Testing strategy with TDD-first workflow (write tests before implementation, watch mode, pre-commit hooks)
- **M10-M15 roadmap**: vertical slice strategy for gamification implementation
  - M10: Berlin Vertical Slice (Karl + Mila E2E) validates full stack
  - M11: Hamburg + Lena (map system)
  - M12: Bavaria + Thomas (photo system)
  - M13: Rhine + Black Forest (Klaus + Emma)
  - M14: Saxony + Austria + Switzerland (Henrik + Sophie + Marco)
  - M15: Polish + UI Implementation
- **TDD approach mandated**: all M10+ features must write tests first based on spec, then implement. Watch mode runs tests on every file change, pre-commit hooks prevent broken code from entering repo.
- **Image generation approach documented**: use nanobanana + Vertex API (same as scenecraft-engine) for Foto generation. Images pre-generated and cached in R2, not generated on unlock.

### Changed
- **MCP-first development strategy**: backend features testable via Claude conversations before UI exists. Enables parallel backend/frontend work and early E2E validation without waiting for UI implementation.
- **UX design upfront, UI implementation later**: M9 defines interaction patterns and flows, M15 implements React components. Prevents blocking backend work on UI decisions.

## [0.9.0] - 2026-04-27

### Added
- **Audio playback controls**: Replay buttons now show play/pause state (▶/⏸) and can pause/resume audio mid-playback
- **Barge-in support**: Pressing Space or mic button while Iris is speaking stops her audio immediately, allowing interruption
- **PlaybackHandle API**: `playBlob()` now returns handle with `stop()`, `pause()`, `resume()`, `playing` state, and `done` promise for programmatic audio control

### Changed
- Audio playback refactored to use GainNode for pause/resume simulation (AudioBufferSourceNode doesn't support native pause)
- Mic button now enabled during 'speaking' status to allow barge-in
- Active playback tracked globally with automatic cleanup on new playback start

## [Unreleased - Design Phase]

### Added
- **Character mini-games (9 total)**: each character unlocks unique mini-game at high relationship tier (70-90+) that reinforces their specialty and provides replay value:
  - **Karl (80+)**: Bread-Making Recipe Game - interactive step-by-step baking with timed actions and Karl's coaching
  - **Mila (70+)**: Art Critique - describe artwork and express opinions, graded on vocabulary richness and metaphorical thinking
  - **Thomas (75+)**: Mountain Navigation - follow German directions on map interface with progressive spatial complexity
  - **Lena (80+)**: Stadt-Land-Fluss (Categories Game) - competitive rapid vocabulary recall with 10-second timer and trash talk
  - **Klaus (85+)**: Wine Stories - interpret wine descriptions and expand poetically with metaphors and subjunctive mood
  - **Emma (80+)**: Fairy Tale Co-Writing - collaborative storytelling where Emma reacts excitedly to elements she loves (clocks, classic tropes, precision). Stories saved to "Märchenbuch" archive where users can revisit and benchmark progress (earlier stories show more errors, later stories show mastery). Teaches creative thinking in German, narrative structure, and Präteritum.
  - **Henrik (90+)**: Philosophical Debate - multi-turn debate requiring perfect grammar and sophisticated vocabulary (hardest mini-game)
  - **Sophie (85+)**: Viennese Café Service - take orders using Austrian vocabulary and formal politeness
  - **Marco (90+)**: Chocolate Making - follow code-switched instructions (Hochdeutsch/Swiss German/French/Italian) with Swiss precision
- **Märchenbuch (Fairy Tale Book) collection**: archive of all fairy tales co-written with Emma, includes creation date, user level at time, grammar/vocabulary scores for progress tracking. Visual benchmark showing improvement over time.
- **OpenAPI 3.0+ requirement**: all API endpoints must be formally defined in `openapi.yaml` with code generation before Phase 2+ implementation. Rationale: 40+ new endpoints require single source of truth to prevent client/server type drift and enable automatic validation.
- **Adaptive difficulty for all 9 characters**: each pen pal + Karl now has unique language progression tied to relationship tier:
  - **Karl**: idiom evolution (literal → common → Berlin-specific idioms like "Dit is Berlin")
  - **Mila**: artistic expression (simple → critique vocabulary + metaphors + street slang mix)
  - **Thomas**: spatial language (simple directions → complex spatial relations + Bavarian dialect) + talks faster in exciting situations
  - **Lena**: slang progression (standard casual → heavy Hamburg slang: "Moin", "digga", "krass")
  - **Klaus**: sensory/poetic language (basic wine terms → sophisticated sensory + subjunctive + philosophical metaphors)
  - **Emma**: dual vocabulary (basic fairy tale → Grimm archaic + clockwork technical terms, mixes both: "verzaubertes Zahnrad")
  - **Henrik**: academic rigor (simple → philosophical vocab: Dasein, Weltanschauung) - inverse difficulty, gets HARDER at high tiers
  - **Sophie**: Austrian formality (standard polite → Viennese courtly + Austrian lexical differences + escalating diminutives: -erl, -i)
  - **Marco**: code-switching (Hochdeutsch → Swiss German/French/Italian mixing + perfectionist precision)

### Changed
- **Character relationship system generalized**: replaced Karl-specific `UserKarlRelationship` table with generic `UserCharacterRelationship` supporting all revisitable characters. Each character is now a "mini-game" with unique specialty. Characters use flexible metadata field for character-specific tracking (regional bread discussions, slang tiers, philosophical concepts, etc.). Supports adaptive difficulty where characters scale language complexity based on relationship tier.
- **Character grading weights formalized**: each character has unique Claude grading weights matching their specialty (Karl prioritizes fluency/confidence, Henrik prioritizes grammar/vocabulary, Lena prioritizes confidence/cultural awareness, etc.)
- **Badge visual design unified**: all badge tiers now use consistent star-in-circle design with tier-specific chrome finishes (matte grey → brushed bronze → polished silver → polished gold → crystalline diamond → brushed platinum). Star is slightly darker than circle background. Replaces previous mixed iconography (Medal, Shield, Crown, Ring, Trophy).
- **Pen pal collectible system redesign**: transformed generic stickers/loot boxes into narrative-integrated gifts from pen pals. Each of 8 pen pals sends themed collectibles matching their personality: Mila (hand-drawn stickers), Thomas (pressed alpine flowers & hiking patches), Lena (vintage vinyl records with YouTube/Bandcamp links), Klaus (wine bottle labels), Emma (mechanical curiosities & fairy tale trinkets), Henrik (historical postcards & DDR artifacts), Sophie (vintage coffee/tea tins), Marco (Swiss chocolates & desserts with cultural context). Quest rewards now say "Mila sent you a new sticker!" with personal messages instead of generic "You earned a reward!" — transforms game mechanics into friendship artifacts.
- **Loot boxes reframed**: now Mila's "sticker packs" she sells at Berlin art markets ("Ich habe ein paar extra Sticker gedruckt für den Flohmarkt. Willst du einen?") — maintains narrative coherence, feels like supporting friend's art
- **Cross-referencing social network**: pen pals mention each other's collections in letters ("Emma aus dem Schwarzwald hat mir das Originalrezept gegeben!") — creates living world where your friends know each other

## [0.8.0] - 2026-04-27

### Added
- **Gamification & engagement system design**: comprehensive design document (`agent/design/local.gamification-engagement-system.md`) covering progress tracking, quest system with badge progression (Grey → Platinum), point economy with dual-path voice unlocks, map-based regional progression through Germany, photo collection system (Fotos), pen pal relationships with 8 unique characters, character revisit system, collectible systems, and special event quests. Defines all dopamine loops (immediate, short-term, medium-term, long-term) and positive reinforcement mechanisms.
- **Key design decisions captured**: multi-signal mastery calculation (accuracy, consistency, retention, speed, context transfer), adaptive pen pal letter frequency based on engagement, escalating voice unlock costs (600 → 4000 points) to incentivize story progression, sequential map progression with narrative framing (solo backpacker photographer), gated subquests requiring mastery achievements, premium locations (Berghain bouncer challenge, Jazzclub), cultural recommendations from pen pals, contextual drill suggestions from character revisits.
- **Design indexed**: added to `agent/index/acp.core.yaml` with weight 0.9 — core engagement layer that must be understood when working on motivation, progress visualization, rewards, or narrative systems.

### Design Philosophy
- **No punishment mechanics**: "Reinforcement Opportunities" instead of highlighting failures; celebrate effort and progress only
- **Multiple playstyles**: explorers (follow story), grinders (farm points), collectors (complete pen pal collections)
- **Emotional connection**: pen pals and characters feel like real relationships with memory and personality
- **Cultural richness**: recommendations open doors to authentic German media (music, films, books, podcasts via YouTube/Bandcamp)
- **Dynamic mastery**: skills can improve OR degrade based on multiple signals; reflects reality that skills decay without practice

### Implementation Phases
1. Core Progress & Quests (MVP)
2. Map & Regional Progression
3. Photo Collection
4. Pen Pal System & Collectibles
5. Character Revisits
6. Full System Integration (loot boxes, chat buddies, special events)

## [0.7.0] - 2026-04-27

### Added
- **Iris-aware vocabulary**: each voice turn now queries D1 for 5 CEFR-graded vocab items and injects them into the system prompt. Iris weaves them into conversation naturally — no drilling, no listing, just organic usage. Words are selected from the Goethe Wortlisten seeded in v0.6.0.
- **Spaced-repetition tracking**: after each turn, the 5 vocab items are recorded in `user_vocab_progress` with `last_seen_at` and `due_at` (24h from now). Subsequent turns prioritize unseen words first, then words due for review, then lowest CEFR level, then random. Over time the user works through A1 → A2 → B1 organically.
- **`pickVocab()` query**: LEFT JOINs `vocab_items` with `user_vocab_progress` and orders by unseen → due → CEFR → random. Efficient single query, ~1.4ms on D1.
- **`markVocabSeen()`**: batched `INSERT ... ON CONFLICT DO UPDATE` via `db.batch()` — upserts 5 progress rows per turn. Fire-and-forget with error swallowed (non-critical path).

### Changed
- `buildSystemPrompt()` now accepts an optional `VocabCard[]` parameter. When cards are present, a "Today's vocabulary" block is appended instructing Iris to use at least 2–3 of the words naturally.

### Notes
- Vocab injection only fires when a target language is selected (German for now). Auto mode skips it since we don't know which language to pull from.
- The SM-2 `ease` and `interval_days` fields exist in the schema but aren't updated yet — the current implementation uses a flat 24h `due_at`. Full SM-2 scoring (based on user recall accuracy) is a follow-up once we have a review UI where the user rates their own recall.

## [0.6.0] - 2026-04-26

### Added
- **Curriculum schema** (`migrations/0003_curriculum_schema.sql`): `vocab_items`, `vocab_examples`, `sentences`, `sentence_pairs`, `sentence_vocab`, `lessons`, `lesson_vocab`, `user_vocab_progress` (with SM-2 spaced-repetition fields: `ease`, `interval_days`, `due_at`), and `user_lesson_progress`. CASCADE deletes everywhere on user/vocab/lesson removal.
- **Goethe-Institut Wortlisten ingested into D1**: 4,870 unique vocab items across A1 (678) / A2 (1,400) / B1 (2,792) plus 7,311 curated example sentences with English translations. Source: community mirror at `github.com/ilkermeliksitki/goethe-institute-wordlist` (Goethe-Institut official PDFs).
- **Ingest script** `scripts/seed/goethe.ts` (run via `npm run seed:goethe`) — fetches all three CEFR-level TSVs, normalizes lemmas (strips articles into a separate column, drops sense numbers, drops plural suffix markers), and emits `migrations/0004_seed_goethe.sql` as a versioned, replayable migration.

### Notes
- **D1 has no `BEGIN TRANSACTION`** — Workers Durable Objects own transaction semantics. The seed script writes plain auto-commit statements. (D1's "statement too long" error in this case was misleading; actual cause was the `BEGIN TRANSACTION` keyword.)
- Per-statement size cap: keep multi-row INSERTs to ≤25 rows (~3.7KB max) to stay safely under D1's per-statement bounds.
- The Goethe wordlist treats different senses of a word (`abholen(1)`, `abholen(2)`) as separate entries; the normalizer collapses them by lemma but each sense's example sentence is preserved on the canonical row.

## [0.5.1] - 2026-04-26

### Changed
- **Virtualized chat list with `react-virtuoso`** (pattern adapted from scenecraft's `ChatPanel.tsx`). The `<section className="transcript">` flex column is replaced with `<Virtuoso>` so only the visible viewport (plus a small overscan) is mounted as DOM — long conversation histories scroll smoothly.
- **Smart auto-scroll** that doesn't yank the user back when they've scrolled up to read older messages:
  - `atBottomStateChange` + `atBottomThreshold={48}` (48px) tracks "near enough to the bottom" — generous enough that streaming text growing the layout doesn't flip the state
  - `followOutput((isAtBottom) => isAtBottom ? 'auto' : false)` handles new turn appended (item count change)
  - A `useEffect` on `[partial, atBottom]` calls `scrollToIndex({ index: 'LAST', align: 'end' })` while the in-flight assistant text grows the same item (followOutput doesn't fire for content growth, only count changes)
  - Unconditional `scrollToBottom()` on initial history load — user just opened the app, they want their most recent
- CSS: turn spacing moved from flex `gap` to per-turn `margin-bottom`, alignment from `align-self` to `margin-left/right: auto`. Visual result is identical.

### Notes
- Bundle size: +20KB gzipped (`react-virtuoso` and its deps). Acceptable for the virtualization win once histories grow.

## [0.5.0] - 2026-04-26

### Added
- **Tutor mode**: Iris is no longer a generic polyglot — she's a language tutor with **English as the user's L1**. When a target language is picked, she speaks the target by default, drops into English to explain words/grammar/clarification, and weaves one new vocabulary word per reply.
- **Typeahead language picker** (`LanguagePicker.tsx`) replacing the 3-button toggle. 53 curated languages with native + English names; fuzzy match on either, ordered by exact → prefix → substring. Keyboard nav (↑/↓/Enter/Esc) and click-select.
- **Per-user persisted target language** in D1 (migration `0002_user_target_lang.sql` adds `target_lang_code/name/english` columns to `users`). Worker writes on every language pick, reads on `/api/auth/me`, login, and WS connect — picker initializes to the saved value across sessions and devices.
- **WebSocket auto-reconnect** with capped exponential backoff (1s → 2s → 4s → 8s → 16s → 30s, jittered). New `reconnecting…` status appears on the mic button while a retry is pending. Cleanup on unmount detaches handlers so close events don't trigger phantom reconnects.

### Changed
- WebSocket `language` message now carries `{ code, name, english }` instead of just `code`. The worker uses native + English names directly in the system prompt without needing a server-side language lookup.
- Picker dropdown opens **upward** (`bottom: 100%`) so it doesn't get clipped by the viewport bottom on mobile.
- Trigger button stays in place when the picker opens — previous "swap button↔input" approach caused a vertical layout shift.

### Notes
- Non-English-speaking users will get an English-anchored experience for now. Adding a second picker for L1 is straightforward when needed.

## [0.4.0] - 2026-04-26

### Added
- **Cloudflare Workers backend.** Production deployment runs as a Worker with WebSocket support via `WebSocketPair`. The Node + Express + `ws` server in `server/` stays for local dev (`npm run dev`); production uses `worker/index.ts` (`npm run deploy`).
- **Custom domain.** `askiris.site` and `www.askiris.site` bound as Worker custom domains via `[[routes]]` in `wrangler.toml` plus the workers.dev fallback URL.
- **Email + password auth on D1.** PBKDF2 password hashing via Web Crypto (no deps), session cookies (`HttpOnly`, `Secure`, `SameSite=Lax`, 30-day TTL). Routes: `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.
- **Per-user conversation persistence on D1.** Schema: `users`, `sessions`, `conversations`, `messages`. WebSocket gated on auth — rejects 401 if no valid session. On connect, the Worker loads the user's most-recent conversation and replays it to the client; each user/assistant turn is persisted to D1 as it happens.
- **Login / signup UI** (`AuthGate.tsx`) — single email + password form, login/signup toggle, redirects to chat on success. App header shows the signed-in user's email and a sign-out button.
- `npm run deploy` script: `vite build && wrangler deploy`. `npm run secrets:put` walks through pushing both Anthropic and ElevenLabs keys via `wrangler secret put`.

### Changed
- WebSocket protocol: server now sends an initial `{type: 'history', turns: [...]}` message on connect when the user has prior turns, so the client renders existing conversation immediately.
- Reset (`{type: 'reset'}`) now also deletes the conversation's persisted messages on the server side.

### Fixed
- **Cloudflare Workers WebSocket binary frames arrive as `Blob`, not `ArrayBuffer`** (despite some docs suggesting otherwise — runtime behavior matches the browser default). My initial `new Uint8Array(data as ArrayBuffer)` cast was silently producing a zero-length array, causing every transcription to fail with Scribe's "uploaded file is empty or corrupted" error in production. Worker now branches on `data instanceof Blob` and calls `await data.arrayBuffer()` first.

## [0.3.0] - 2026-04-26

### Added
- **iOS Safari + Chrome support**: response playback now works on mobile WebKit. Routed through `AudioContext.createBufferSource()` instead of `new Audio()` because WebKit's HTMLAudioElement unlock is per-element — playing a silent clip during a gesture only unlocks that specific element, not subsequent `new Audio()` instances. AudioContext, by contrast, unlocks globally on `resume()`.
- **Replay button (▶)** next to each Iris turn — taps the audio blob from that turn's playback. Doubles as a fallback when autoplay is blocked, useful for language-learning replay.
- `unlockAudioPlayback()` is now called on both press AND release of the mic button — iOS 17+ doesn't always count `touchstart` as an activating gesture.

### Changed
- **Capture format prefers `audio/mp4` over `audio/webm;codecs=opus`** for cross-browser reliability. iOS WebKit reports `audio/webm;codecs=opus` as supported by `MediaRecorder` but `AudioContext.decodeAudioData` then refuses to decode the same bytes (WebKit Bugzilla 226922 / 238546 / 245428). mp4/AAC works in both APIs on every modern browser; Firefox falls through to webm where its own decoder handles it cleanly.
- **`MediaRecorder.start()` no longer uses a timeslice.** Timeslice produced fragmented mp4 on iOS (moov + multiple moof/mdat fragments meant for streaming transmission) which Scribe rejected as "file corrupted." A single complete file is emitted at stop() instead.
- **`MediaStream` is held for the page lifetime.** iOS WebKit returns muted/empty streams when re-acquiring the mic too soon after release — only the `MediaRecorder` cycles per turn now.
- Mic button has `user-select: none`, `-webkit-touch-callout: none`, `-webkit-tap-highlight-color: transparent`, `touch-action: manipulation` so long-press on mobile no longer pops the iOS copy/paste callout.

### Removed
- **Audio-prefix biasing experiment.** Per research (Whisper prompt-following studies, ElevenLabs Scribe API docs), prepending a known utterance to user audio is not a documented pattern for biasing language detection — and Scribe has no audio-prompt channel. The 2-second prefix was outvoted by the longer user-speech segment in the language-detection logic. Removed: `/api/prefix.mp3` server endpoint, prefix synthesis, prefix stripping from transcripts, browser-side `decodeAudioData` + concat + WAV encode pipeline. Net delete: ~150 lines.

### Fixed
- iOS Safari "speaking…" forever: `playBlob()` swallowed exceptions silently, so when iOS autoplay rejected, the status never returned to idle. Now uses AudioContext (which doesn't reject) and the surrounding code wraps in try/catch as a defensive belt.
- iOS Safari second-turn empty recording (5-byte capture): caused by `getUserMedia` returning a muted stream after release/re-acquire. Fixed by holding the MediaStream alive.
- Scribe "file corrupted" 400s: caused by fragmented mp4 from `MediaRecorder.start(250)`. Fixed by removing the timeslice.

### Notes
- Language guard now relies on (a) the EN/DE toggle in the UI, and (b) a system-prompt instruction telling Iris to interpret garbled transcripts charitably as imperfect German or English.

## [0.2.0] - 2026-04-26

### Added
- Bilingual prefix audio that gets prepended to every user utterance to bias ElevenLabs Scribe away from Dutch and toward German/English. Server pre-generates `"I speak English. Ich spreche Deutsch."` once via ElevenLabs TTS and caches at `data/prefix.mp3`.
- Client-side audio concat using Web Audio API (`AudioContext.decodeAudioData` + manual WAV encode) — no `ffmpeg`, no native deps. User mp3 is decoded, concatenated with the prefix in PCM, encoded as 16-bit WAV, then sent over WebSocket.
- Language toggle in the UI (auto / english / deutsch) — the explicit options pass `language_code` to Scribe to force a single-language transcription.
- Retry-with-backoff (4 attempts, exponential) on Scribe and TTS calls for `system_busy` / 5xx — ElevenLabs occasionally returns transient `system_busy` even with quota remaining.
- `/api/prefix.mp3` endpoint that lazy-generates the prefix on first request.
- Vite proxy now covers all `/api/*` routes (was only `/api/voice` WS) so HTTP API endpoints reach the Node server.
- Public exposure: Vite `host: true` + `allowedHosts: true` for accessing through Cloudflare Tunnel without host-header rejection.

### Changed
- Default ElevenLabs voice → **Charlotte** (`XB0fDUnXU5powFXDhCwa`), multilingual female with strong German pronunciation. Override via `ELEVENLABS_VOICE_ID` env var.
- Server strips the prefix words from every transcript before pushing to Claude, so the assistant never sees the bilingual seed phrase.
- Server logs each Scribe call: detected language code, probability, and a snippet of the transcript.

### Fixed
- Dutch misclassification when speaking imperfect German (Scribe would sometimes detect `nld` instead of `deu`). Mitigated by audio prefix biasing rather than `language_code` constraints.
- WebSocket `connection failed` false positive caused by React 18 StrictMode double-mounting the connect effect — handlers now no-op after cleanup.
- TypeScript strictness around `Buffer<ArrayBufferLike>` → `Blob` conversion (wrap in `Uint8Array`).

### Notes
- The dev `.env.local` file contains a leaked ElevenLabs key from earlier in the session — should be rotated before this is shared. Pre-existing concern, not introduced in this version.

## [0.1.0] - 2026-04-26

### Added
- Initial POC: push-to-talk bilingual voice chat using Anthropic Claude Opus 4.7 + ElevenLabs Scribe (STT) + ElevenLabs `eleven_multilingual_v2` (TTS).
- Node + Express + `ws` server (`server/index.ts`) relays browser audio through the three providers and streams text + mp3 audio chunks back over a single WebSocket.
- React + Vite client with hold-to-talk (mouse, touch, Space).
- Multi-turn conversation history per WebSocket connection.
- Bilingual system prompt: Iris mirrors the user's language, gently introduces vocabulary, never breaks character.
