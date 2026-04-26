# Iris

Bilingual voice chat for language learning — Claude + ElevenLabs streaming over WebSocket.

> Built with [Agent Context Protocol](https://github.com/prmichaelsen/agent-context-protocol)

## What it does

Iris is a real-time voice tutor that holds a natural conversation in two languages at once (initial target: German + English). You speak in either language; Iris hears, understands, and replies — code-switching mid-sentence the way a fluent bilingual speaker does. The streaming experience matches the Claude iOS app: token-by-token audio playback, no page reloads, low perceived latency.

Named for **Iris**, the Greek messenger goddess who carried words between worlds on a rainbow bridge.

## Stack

- **Frontend**: TanStack Start (React) on Cloudflare Workers
- **Realtime**: Cloudflare Durable Objects WebSocket relay
- **STT**: streaming speech-to-text (Deepgram or Whisper)
- **LLM**: Anthropic Claude Sonnet 4.6 streaming
- **TTS**: ElevenLabs multilingual v2 streaming
- **Auth**: Firebase (anonymous sessions for hackathon)

## Quick Start

```bash
cd ~/.acp/projects/iris
# (scaffold from acp-tanstack-cloudflare package, see agent/files/src/)
```

API keys needed in `.env.local`:

```
ANTHROPIC_API_KEY=...
ELEVENLABS_API_KEY=...
```

## Development with ACP

- `@acp.init` — load agent context
- `@acp.plan` — plan milestones and tasks
- `@acp.proceed` — implement the next task
- `@acp.status` — check progress

See [AGENT.md](./AGENT.md) for complete ACP documentation.

## License

MIT

## Author

Patrick Michaelsen
