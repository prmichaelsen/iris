import http from 'node:http'
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

const BASE_PROMPT = `You are Iris, a warm and patient language tutor. The user's native language is English; you should treat English as their fallback for explanations.

Style guidelines:
- This is voice chat. Keep replies short — 1 to 3 sentences. Conversational, not lecture-like.
- Gently model correct phrasing when the user makes a small mistake, instead of explicitly correcting them — unless they ask to be corrected.
- Occasionally ask a follow-up question to keep practice flowing.
- Never break character to mention you are an AI or a language model. You are Iris.
- Use plain text only. No markdown, no emoji, no asterisks for emphasis — your output is read aloud.`

const NO_TARGET_PROMPT = `The user has not picked a target language yet. Greet them in English and ask which language they would like to practice. Until they pick one, keep the conversation in English.`

function targetPrompt(nativeName: string, englishName: string): string {
  return `The user is learning ${nativeName} (${englishName}).
- Speak ${nativeName} with them by default. Match the user's level — if their ${nativeName} is shaky, slow down and simplify; if it's strong, push them with richer vocabulary or new phrasing.
- Drop into English (1) when the user asks something in English, (2) when they appear stuck or confused, or (3) to briefly explain a word, idiom, or grammar point. After explaining, return to ${nativeName} on the next turn.
- Each reply, when natural, gently introduce one new ${nativeName} word or phrase the user can pick up — don't lecture, just weave it in.
- If the transcript looks garbled, assume the user was attempting ${nativeName} with imperfect pronunciation and make your best guess from context.`
}

function buildSystemPrompt(targetLang: { code: string; name: string; english: string } | null): string {
  return targetLang
    ? `${BASE_PROMPT}\n\n${targetPrompt(targetLang.name, targetLang.english)}`
    : `${BASE_PROMPT}\n\n${NO_TARGET_PROMPT}`
}

const app = express()
app.get('/healthz', (_req, res) => res.json({ ok: true }))

const server = http.createServer(app)
const wss = new WebSocketServer({ server, path: '/api/voice' })

wss.on('connection', (ws) => {
  console.log('[iris] client connected')
  const history: Anthropic.MessageParam[] = []
  let nextLanguage: string | undefined
  let targetLang: { code: string; name: string; english: string } | null = null

  ws.on('message', async (data, isBinary) => {
    if (!isBinary) {
      try {
        const msg = JSON.parse(data.toString())
        if (msg.type === 'reset') history.length = 0
        else if (msg.type === 'language') {
          if (msg.code === 'auto' || !msg.code) {
            nextLanguage = undefined
            targetLang = null
          } else if (typeof msg.code === 'string' && typeof msg.name === 'string' && typeof msg.english === 'string') {
            nextLanguage = msg.code
            targetLang = { code: msg.code, name: msg.name, english: msg.english }
          }
        }
      } catch {}
      return
    }

    try {
      const audio = data as Buffer

      const transcript = await transcribe(audio, nextLanguage)
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
        system: buildSystemPrompt(targetLang),
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
    // Audio arrives as whatever MediaRecorder produced (audio/mp4 on Safari,
    // audio/webm;codecs=opus on Chrome/Firefox). Scribe sniffs the format.
    form.append('file', new Blob([new Uint8Array(buf)], { type: 'application/octet-stream' }), 'audio')
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
