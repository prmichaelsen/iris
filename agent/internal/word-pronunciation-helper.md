---
slug: word-pronunciation-helper
type: feature
status: open
created: 2026-05-06
effort: small
---

# Click-a-word-to-hear-it pronunciation helper

## Idea

Inside the existing word-popover (`client/WordHoverText.tsx`), let the user
trigger TTS for that single word in the active character's voice. Useful
when the popover gloss isn't enough — the user wants to hear how the word
sounds, on demand, without asking Iris to repeat.

## UX

- Add a small speaker icon to the popover header (or next to the lemma).
- Click → request audio for that word → play through the same
  `playBlob` / shared `AudioContext` used for assistant turns.
- Cache audio blobs per `(word, voice_id, lang)` so repeated clicks on
  the same word don't re-bill TTS.
- While playing: stop any currently-active assistant playback (reuse
  `stopActivePlayback()` from `client/audio.ts`). The user wanted *this*
  word, not whatever Iris was finishing saying.
- Don't run during PTT recording (status === 'listening') — pause until
  release.

## Wire-level options

**Option A — new WS message (recommended).** Add `{type: 'speak_word', word,
voice_id?, lang?}` to the existing voice WebSocket. Worker calls
`streamTTS(word, ws, env, voiceId)`. Leverages the existing audio framing
(binary frames into `StreamingPlayer`) and avoids a second auth round-trip.

**Option B — REST endpoint `POST /api/tts`.** Returns mp3 directly. Simpler
to think about, but adds a second auth path and cache layer; the WS already
has the right context (active voice id).

## Effort estimate

**Small — about half a day** of focused work.

| Piece | Effort |
|---|---|
| Worker WS handler for `speak_word` (~10 lines, calls existing `streamTTS`) | 15 min |
| Voice selection: default to active character's voice; optional override | 10 min |
| Client cache (Map keyed by `${word}|${voice}|${lang}`, value `Blob`) | 30 min |
| Popover UI: speaker icon, loading spinner, error state | 30 min |
| Wire click → send WS message → collect binary frames → playBlob | 1 hr |
| Edge cases: stop ongoing playback, debounce double-clicks, abort if popover closes mid-fetch | 30 min |
| Manual test (3 voices, 5 words each, mobile + desktop) | 30 min |

## Risks / footguns

- **Cost.** Every click is a TTS call. Cache aggressively. Consider a
  per-session cap if abuse becomes real (probably not — humans don't click
  thousands of words).
- **Audio collision.** If the user clicks word A, then word B before A
  finishes, B should preempt A. Use the existing single-active-playback
  pattern (`stopActivePlayback` is already idempotent).
- **Voice mismatch.** If Iris is mid-quest as Karl, clicking a word in
  Iris's earlier message will read it in Karl's voice unless we persist
  the voice that *was* used for that turn. Probably fine for v1; revisit
  if it's confusing.
- **Mobile gesture.** The popover already opens on tap. The speaker icon
  has to be tappable without dismissing the popover (it's already
  click-to-toggle; the icon is inside the popover so its click won't bubble
  to the document handler).

## Reuses

- `client/audio.ts` — `StreamingPlayer`, `playBlob`, `stopActivePlayback`,
  `unlockAudioPlayback` (all unchanged)
- `worker/index.ts` — `streamTTS` (unchanged)
- WS already authenticated per session; no new auth surface

## Out of scope

- IPA or phonetic display in popover
- Slowing down playback ("say it slow")
- Sentence-level pronunciation (full message replay)

These are obvious next steps if the v1 lands well.
