# Milestone 1: Voice Chat POC

**Status**: ✅ Complete
**Versions**: v0.1.0 – v0.3.0
**Completed**: 2026-04-26

## Goal

Prove the core voice-chat loop: browser captures audio → server transcribes (ElevenLabs Scribe) → Claude streams a response → ElevenLabs TTS synthesizes audio → browser plays it back. Push-to-talk, multi-turn history, bilingual (German + English).

## Deliverables

- [x] Node + Express + `ws` server with WebSocket relay
- [x] React + Vite client with hold-to-talk (mouse, touch, Space)
- [x] ElevenLabs Scribe STT integration with retry/backoff
- [x] Claude Opus 4.7 streaming via Anthropic SDK
- [x] ElevenLabs `eleven_multilingual_v2` TTS streaming
- [x] Multi-turn conversation history per WS connection
- [x] Bilingual system prompt (Iris persona)
- [x] iOS Safari support (AudioContext playback, mp4 capture, MediaStream lifecycle)
- [x] Replay button (▶) per assistant turn
- [x] Mobile touch UX (user-select none, touch-callout, tap-highlight)
