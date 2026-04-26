import http from 'node:http'
import express from 'express'
import { WebSocketServer, type WebSocket } from 'ws'
import Anthropic from '@anthropic-ai/sdk'

const PORT = Number(process.env.PORT ?? 3001)
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? 'pNInz6obpgDQGcFmaJgB'
const ELEVEN_API = 'https://api.elevenlabs.io/v1'
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY
const MODEL = 'claude-opus-4-7'

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('[iris] ANTHROPIC_API_KEY not set — Claude calls will fail')
}
if (!ELEVEN_KEY) {
  console.warn('[iris] ELEVENLABS_API_KEY not set — STT/TTS will fail')
}

const anthropic = new Anthropic()

const SYSTEM_PROMPT = `You are Iris, a warm and patient bilingual conversation partner who is fluent in German and English. You help people practice both languages through natural conversation.

Style guidelines:
- This is voice chat. Keep replies short — 1 to 3 sentences. Conversational, not lecture-like.
- Mirror the user's language mix. If they speak German, reply in German. If they speak English, reply in English. If they code-switch, code-switch back.
- When the user is clearly the learner, gently weave in target-language vocabulary or phrasing — don't overload, one or two new words per turn.
- If they make a small mistake, you can gently model the correct phrasing in your reply without explicitly correcting them, unless they ask for correction.
- Occasionally ask a follow-up question to keep the conversation flowing.
- Never break character to mention you are an AI or a language model. You are Iris.
- Use plain text only. No markdown, no emoji, no asterisks for emphasis — your output is read aloud.`

const app = express()
app.get('/healthz', (_req, res) => res.json({ ok: true }))

const server = http.createServer(app)
const wss = new WebSocketServer({ server, path: '/api/voice' })

wss.on('connection', (ws) => {
  console.log('[iris] client connected')
  const history: Anthropic.MessageParam[] = []

  ws.on('message', async (data, isBinary) => {
    if (!isBinary) {
      try {
        const msg = JSON.parse(data.toString())
        if (msg.type === 'reset') history.length = 0
      } catch {}
      return
    }

    try {
      const audio = data as Buffer

      const transcript = await transcribe(audio)
      if (!transcript.trim()) {
        send(ws, { type: 'error', message: 'No speech detected' })
        send(ws, { type: 'done' })
        return
      }
      send(ws, { type: 'transcript', text: transcript })
      history.push({ role: 'user', content: transcript })

      let assistantText = ''
      const stream = anthropic.messages.stream({
        model: MODEL,
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: history,
      })

      stream.on('text', (delta) => {
        assistantText += delta
        send(ws, { type: 'response_text', delta })
      })

      const finalMessage = await stream.finalMessage()
      const finalText = finalMessage.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')
      assistantText = finalText || assistantText

      history.push({ role: 'assistant', content: assistantText })

      await streamTTS(assistantText, ws)
      send(ws, { type: 'done' })
    } catch (err) {
      console.error('[iris] turn failed:', err)
      send(ws, {
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
      })
      send(ws, { type: 'done' })
    }
  })

  ws.on('close', () => console.log('[iris] client disconnected'))
})

function send(ws: WebSocket, payload: Record<string, unknown>) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload))
}

async function transcribe(buf: Buffer): Promise<string> {
  if (!ELEVEN_KEY) throw new Error('ELEVENLABS_API_KEY not set')
  const form = new FormData()
  form.append('file', new Blob([new Uint8Array(buf)], { type: 'audio/webm' }), 'audio.webm')
  form.append('model_id', 'scribe_v1')
  const res = await fetch(`${ELEVEN_API}/speech-to-text`, {
    method: 'POST',
    headers: { 'xi-api-key': ELEVEN_KEY },
    body: form,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Scribe ${res.status}: ${body.slice(0, 200)}`)
  }
  const json = (await res.json()) as { text?: string }
  return (json.text ?? '').trim()
}

async function streamTTS(text: string, ws: WebSocket): Promise<void> {
  if (!ELEVEN_KEY) throw new Error('ELEVENLABS_API_KEY not set')
  const url = `${ELEVEN_API}/text-to-speech/${VOICE_ID}/stream?output_format=mp3_44100_128`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVEN_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  })
  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => '')
    throw new Error(`TTS ${res.status}: ${body.slice(0, 200)}`)
  }
  const reader = res.body.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (ws.readyState !== ws.OPEN) return
    ws.send(value, { binary: true })
  }
}

server.listen(PORT, () => {
  console.log(`[iris] listening on http://localhost:${PORT}`)
})
