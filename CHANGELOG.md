# Changelog

All notable changes to Iris are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning follows [SemVer](https://semver.org/).

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
