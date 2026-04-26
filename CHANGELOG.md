# Changelog

All notable changes to Iris are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning follows [SemVer](https://semver.org/).

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
