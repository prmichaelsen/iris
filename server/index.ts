import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import { WebSocketServer, type WebSocket } from 'ws'
import Anthropic from '@anthropic-ai/sdk'

const PORT = Number(process.env.PORT ?? 3001)
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? 'XB0fDUnXU5powFXDhCwa'
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
- Use plain text only. No markdown, no emoji, no asterisks for emphasis — your output is read aloud.

The user is speaking through a speech-to-text system that only knows English and German. If a transcript looks garbled, partly nonsensical, or like a different language entirely, assume it is mistranscribed German or English from a learner with imperfect pronunciation. Make your best guess at what they meant given the conversation so far, and respond naturally. If you genuinely cannot guess, ask them to repeat in a friendly way — in the language that fits the conversation.`

const PREFIX_TEXT = 'I speak English. Ich spreche Deutsch.'
const PREFIX_WORDS = PREFIX_TEXT.split(/\s+/).filter(Boolean).length
const PREFIX_PATH = path.resolve('./data/prefix.mp3')

const app = express()
app.get('/healthz', (_req, res) => res.json({ ok: true }))

app.get('/api/prefix.mp3', async (_req, res) => {
  try {
    if (!fs.existsSync(PREFIX_PATH)) {
      console.log('[iris] generating bilingual prefix audio…')
      fs.mkdirSync(path.dirname(PREFIX_PATH), { recursive: true })
      const audio = await synthesizePrefix(PREFIX_TEXT)
      fs.writeFileSync(PREFIX_PATH, audio)
      console.log(`[iris] cached ${PREFIX_PATH} (${audio.length} bytes)`)
    }
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.sendFile(PREFIX_PATH)
  } catch (err) {
    console.error('[iris] prefix generation failed:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
})

async function synthesizePrefix(text: string): Promise<Buffer> {
  if (!ELEVEN_KEY) throw new Error('ELEVENLABS_API_KEY not set')
  const url = `${ELEVEN_API}/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`
  const res = await fetchWithRetry(url, () => ({
    method: 'POST',
    headers: {
      'xi-api-key': ELEVEN_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.7, similarity_boost: 0.75 },
    }),
  }))
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Prefix TTS ${res.status}: ${body.slice(0, 200)}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

function stripPrefix(transcript: string): string {
  const words = transcript.trim().split(/\s+/)
  if (words.length <= PREFIX_WORDS) return ''
  return words.slice(PREFIX_WORDS).join(' ')
}

const server = http.createServer(app)
const wss = new WebSocketServer({ server, path: '/api/voice' })

wss.on('connection', (ws) => {
  console.log('[iris] client connected')
  const history: Anthropic.MessageParam[] = []
  let nextLanguage: string | undefined // ISO-639-3: 'eng' | 'deu' | undefined (auto)

  ws.on('message', async (data, isBinary) => {
    if (!isBinary) {
      try {
        const msg = JSON.parse(data.toString())
        if (msg.type === 'reset') history.length = 0
        else if (msg.type === 'language') {
          nextLanguage = msg.code === 'auto' ? undefined : msg.code
        }
      } catch {}
      return
    }

    try {
      const audio = data as Buffer

      const rawTranscript = await transcribe(audio, nextLanguage)
      const transcript = stripPrefix(rawTranscript)
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

async function transcribe(buf: Buffer, language?: string): Promise<string> {
  if (!ELEVEN_KEY) throw new Error('ELEVENLABS_API_KEY not set')
  const res = await fetchWithRetry(`${ELEVEN_API}/speech-to-text`, () => {
    const form = new FormData()
    // Audio arrives from the client as WAV (browser-side concat with the
    // bilingual prefix). Sending raw bytes; Scribe sniffs the format.
    form.append('file', new Blob([new Uint8Array(buf)], { type: 'audio/wav' }), 'audio.wav')
    form.append('model_id', 'scribe_v1')
    if (language) form.append('language_code', language)
    return {
      method: 'POST',
      headers: { 'xi-api-key': ELEVEN_KEY! },
      body: form,
    }
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Scribe ${res.status}: ${body.slice(0, 200)}`)
  }
  const json = (await res.json()) as { text?: string; language_code?: string; language_probability?: number }
  console.log(
    `[iris] scribe: lang=${json.language_code} p=${json.language_probability?.toFixed(2)} text="${(json.text ?? '').slice(0, 60)}"`,
  )
  return (json.text ?? '').trim()
}

async function fetchWithRetry(
  url: string,
  buildInit: () => RequestInit,
  attempts = 4,
): Promise<Response> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, buildInit())
      if (res.status === 429 || res.status >= 500) {
        if (i < attempts - 1) {
          const backoffMs = 600 * Math.pow(2, i) + Math.random() * 300
          console.warn(`[iris] ${url.split('/').slice(-2).join('/')} ${res.status}, retry in ${Math.round(backoffMs)}ms`)
          await sleep(backoffMs)
          continue
        }
      }
      return res
    } catch (err) {
      lastErr = err
      if (i < attempts - 1) await sleep(600 * Math.pow(2, i))
    }
  }
  throw lastErr ?? new Error('fetchWithRetry exhausted')
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function streamTTS(text: string, ws: WebSocket): Promise<void> {
  if (!ELEVEN_KEY) throw new Error('ELEVENLABS_API_KEY not set')
  const url = `${ELEVEN_API}/text-to-speech/${VOICE_ID}/stream?output_format=mp3_44100_128`
  const res = await fetchWithRetry(url, () => ({
    method: 'POST',
    headers: {
      'xi-api-key': ELEVEN_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  }))
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
