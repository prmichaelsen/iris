/// <reference types="@cloudflare/workers-types" />
import Anthropic from '@anthropic-ai/sdk'
import {
  clearSessionCookieHeader,
  createSession,
  deleteSession,
  getCurrentUser,
  hashPassword,
  newId,
  normalizeEmail,
  nowSec,
  setSessionCookieHeader,
  validatePassword,
  verifyPassword,
} from './auth'

interface Env {
  ANTHROPIC_API_KEY: string
  ELEVENLABS_API_KEY: string
  ELEVENLABS_VOICE_ID?: string
  ASSETS: { fetch: (req: Request) => Promise<Response> }
  DB: D1Database
}

const ELEVEN_API = 'https://api.elevenlabs.io/v1'
const MODEL = 'claude-opus-4-7'
const DEFAULT_VOICE_ID = 'XB0fDUnXU5powFXDhCwa'

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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/api/voice') {
      return handleWebSocket(request, env)
    }

    if (url.pathname === '/api/auth/signup' && request.method === 'POST') {
      return handleSignup(request, env)
    }
    if (url.pathname === '/api/auth/login' && request.method === 'POST') {
      return handleLogin(request, env)
    }
    if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
      return handleLogout(request, env)
    }
    if (url.pathname === '/api/auth/me' && request.method === 'GET') {
      return handleMe(request, env)
    }

    if (url.pathname === '/healthz') {
      return Response.json({ ok: true })
    }

    return env.ASSETS.fetch(request)
  },
}

// ---- Auth routes ----

interface AuthBody {
  email?: unknown
  password?: unknown
}

async function handleSignup(request: Request, env: Env): Promise<Response> {
  let body: AuthBody
  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid JSON', 400)
  }
  const email = normalizeEmail(body.email)
  const password = validatePassword(body.password)
  if (!email) return jsonError('Invalid email', 400)
  if (!password) return jsonError('Password must be 8+ characters', 400)

  const existing = await env.DB
    .prepare('SELECT id FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: string }>()
  if (existing) return jsonError('Email already registered', 409)

  const userId = newId()
  const passwordHash = await hashPassword(password)
  await env.DB
    .prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)')
    .bind(userId, email, passwordHash, nowSec())
    .run()
  const token = await createSession(env.DB, userId)
  return new Response(JSON.stringify({ user: { id: userId, email, targetLang: null } }), {
    status: 201,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': setSessionCookieHeader(token),
    },
  })
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  let body: AuthBody
  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid JSON', 400)
  }
  const email = normalizeEmail(body.email)
  const password = typeof body.password === 'string' ? body.password : null
  if (!email || !password) return jsonError('Email and password required', 400)

  const user = await env.DB
    .prepare('SELECT id, email, password_hash, target_lang_code, target_lang_name, target_lang_english FROM users WHERE email = ?')
    .bind(email)
    .first<{
      id: string
      email: string
      password_hash: string
      target_lang_code: string | null
      target_lang_name: string | null
      target_lang_english: string | null
    }>()
  if (!user) return jsonError('Invalid email or password', 401)
  const ok = await verifyPassword(password, user.password_hash)
  if (!ok) return jsonError('Invalid email or password', 401)

  const targetLang = user.target_lang_code && user.target_lang_name && user.target_lang_english
    ? { code: user.target_lang_code, name: user.target_lang_name, english: user.target_lang_english }
    : null
  const token = await createSession(env.DB, user.id)
  return new Response(JSON.stringify({ user: { id: user.id, email: user.email, targetLang } }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': setSessionCookieHeader(token),
    },
  })
}

async function handleLogout(request: Request, env: Env): Promise<Response> {
  const session = await getCurrentUser(env.DB, request)
  if (session) await deleteSession(env.DB, session.sessionToken)
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': clearSessionCookieHeader(),
    },
  })
}

async function handleMe(request: Request, env: Env): Promise<Response> {
  const session = await getCurrentUser(env.DB, request)
  if (!session) return new Response(JSON.stringify({ user: null }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
  const target = await env.DB
    .prepare('SELECT target_lang_code AS code, target_lang_name AS name, target_lang_english AS english FROM users WHERE id = ?')
    .bind(session.user.id)
    .first<{ code: string | null; name: string | null; english: string | null }>()
  const targetLang = target && target.code && target.name && target.english
    ? { code: target.code, name: target.name, english: target.english }
    : null
  return Response.json({
    user: { id: session.user.id, email: session.user.email, targetLang },
  })
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function handleWebSocket(request: Request, env: Env): Promise<Response> {
  if (request.headers.get('Upgrade') !== 'websocket') {
    return new Response('Expected WebSocket', { status: 426 })
  }

  const session = await getCurrentUser(env.DB, request)
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }
  const userId = session.user.id

  const pair = new WebSocketPair()
  const client = pair[0]
  const server = pair[1]

  server.accept()
  console.log(`[iris] client connected (user=${session.user.email})`)

  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

  // Load the user's saved target language (set last time they picked one).
  const savedLang = await env.DB
    .prepare('SELECT target_lang_code AS code, target_lang_name AS name, target_lang_english AS english FROM users WHERE id = ?')
    .bind(userId)
    .first<{ code: string | null; name: string | null; english: string | null }>()
  let targetLang: { code: string; name: string; english: string } | null =
    savedLang && savedLang.code && savedLang.name && savedLang.english
      ? { code: savedLang.code, name: savedLang.name, english: savedLang.english }
      : null
  let nextLanguage: string | undefined = targetLang?.code

  // Find or create the user's active conversation, then load history from D1.
  const conversationId = await getOrCreateActiveConversation(env.DB, userId)
  const history: Anthropic.MessageParam[] = await loadHistory(env.DB, conversationId)
  console.log(`[iris] loaded ${history.length} prior messages for conversation ${conversationId}`)

  // Send the loaded history to the client so it can render past turns.
  if (history.length > 0) {
    server.send(
      JSON.stringify({
        type: 'history',
        turns: history.map((m) => ({
          role: m.role,
          text: typeof m.content === 'string' ? m.content : '',
        })),
      }),
    )
  }

  const send = (payload: Record<string, unknown>) => {
    try {
      server.send(JSON.stringify(payload))
    } catch {
      /* socket closed */
    }
  }

  server.addEventListener('message', async (event: MessageEvent) => {
    const data = event.data

    if (typeof data === 'string') {
      try {
        const msg = JSON.parse(data)
        if (msg.type === 'reset') {
          history.length = 0
          await env.DB
            .prepare('DELETE FROM messages WHERE conversation_id = ?')
            .bind(conversationId)
            .run()
        } else if (msg.type === 'language') {
          if (msg.code === 'auto' || !msg.code) {
            nextLanguage = undefined
            targetLang = null
            await env.DB
              .prepare('UPDATE users SET target_lang_code = NULL, target_lang_name = NULL, target_lang_english = NULL WHERE id = ?')
              .bind(userId)
              .run()
          } else if (typeof msg.code === 'string' && typeof msg.name === 'string' && typeof msg.english === 'string') {
            nextLanguage = msg.code
            targetLang = { code: msg.code, name: msg.name, english: msg.english }
            await env.DB
              .prepare('UPDATE users SET target_lang_code = ?, target_lang_name = ?, target_lang_english = ? WHERE id = ?')
              .bind(msg.code, msg.name, msg.english, userId)
              .run()
          }
        }
      } catch {}
      return
    }

    try {
      // Cloudflare Workers delivers binary WS frames as Blob (despite some
      // docs saying ArrayBuffer). Browsers default to Blob too unless you
      // set ws.binaryType = 'arraybuffer'. Coerce here.
      let buf: ArrayBuffer
      if (data instanceof Blob) {
        buf = await data.arrayBuffer()
      } else if (data instanceof ArrayBuffer) {
        buf = data
      } else {
        console.warn(`[iris] unexpected message data type: ${typeof data}`)
        return
      }
      const audio = new Uint8Array(buf)

      const transcript = await transcribe(audio, nextLanguage, env)
      if (!transcript.trim()) {
        send({ type: 'error', message: 'No speech detected' })
        send({ type: 'done' })
        return
      }
      send({ type: 'transcript', text: transcript })
      history.push({ role: 'user', content: transcript })
      await persistMessage(env.DB, conversationId, 'user', transcript)

      let assistantText = ''
      const stream = anthropic.messages.stream({
        model: MODEL,
        max_tokens: 512,
        system: buildSystemPrompt(targetLang),
        messages: history,
      })

      stream.on('text', (delta) => {
        assistantText += delta
        send({ type: 'response_text', delta })
      })

      const finalMessage = await stream.finalMessage()
      const finalText = finalMessage.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')
      assistantText = finalText || assistantText

      history.push({ role: 'assistant', content: assistantText })
      await persistMessage(env.DB, conversationId, 'assistant', assistantText)

      await streamTTS(assistantText, server, env)
      send({ type: 'done' })
    } catch (err) {
      console.error('[iris] turn failed:', err)
      send({
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
      })
      send({ type: 'done' })
    }
  })

  server.addEventListener('close', () => {
    console.log('[iris] client disconnected')
  })

  return new Response(null, { status: 101, webSocket: client })
}

async function transcribe(
  audio: Uint8Array,
  language: string | undefined,
  env: Env,
): Promise<string> {
  const res = await fetchWithRetry(`${ELEVEN_API}/speech-to-text`, () => {
    const form = new FormData()
    form.append('file', new Blob([audio], { type: 'application/octet-stream' }), 'audio')
    form.append('model_id', 'scribe_v1')
    if (language) form.append('language_code', language)
    return {
      method: 'POST',
      headers: { 'xi-api-key': env.ELEVENLABS_API_KEY },
      body: form,
    }
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Scribe ${res.status}: ${body.slice(0, 200)}`)
  }
  const json = (await res.json()) as {
    text?: string
    language_code?: string
    language_probability?: number
  }
  console.log(
    `[iris] scribe: lang=${json.language_code} p=${json.language_probability?.toFixed(2)} text="${(json.text ?? '').slice(0, 60)}"`,
  )
  return (json.text ?? '').trim()
}

async function streamTTS(text: string, ws: WebSocket, env: Env): Promise<void> {
  const voiceId = env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID
  const url = `${ELEVEN_API}/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`
  const res = await fetchWithRetry(url, () => ({
    method: 'POST',
    headers: {
      'xi-api-key': env.ELEVENLABS_API_KEY,
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
    try {
      ws.send(value)
    } catch {
      return
    }
  }
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
          console.warn(
            `[iris] ${url.split('/').slice(-2).join('/')} ${res.status}, retry in ${Math.round(backoffMs)}ms`,
          )
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

// ---- Conversation persistence (D1) ----

async function getOrCreateActiveConversation(db: D1Database, userId: string): Promise<string> {
  const existing = await db
    .prepare('SELECT id FROM conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1')
    .bind(userId)
    .first<{ id: string }>()
  if (existing) return existing.id

  const id = newId()
  const t = nowSec()
  await db
    .prepare('INSERT INTO conversations (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    .bind(id, userId, null, t, t)
    .run()
  return id
}

async function loadHistory(db: D1Database, conversationId: string): Promise<Anthropic.MessageParam[]> {
  const result = await db
    .prepare(
      'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
    )
    .bind(conversationId)
    .all<{ role: 'user' | 'assistant'; content: string }>()
  return (result.results || []).map((r) => ({ role: r.role, content: r.content }))
}

async function persistMessage(
  db: D1Database,
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
): Promise<void> {
  const id = newId()
  const t = nowSec()
  await db.batch([
    db
      .prepare('INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(id, conversationId, role, content, t),
    db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').bind(t, conversationId),
  ])
}
