/// <reference types="@cloudflare/workers-types" />
import Anthropic from '@anthropic-ai/sdk'
import type {
  FlashcardMatchingWidget,
  FlashcardMatchingCard,
  FlashcardMatchingCardResult,
  FlashcardMatchingAnswer,
  WidgetContentBlock,
  ContentBlock,
} from '../shared/types/widgets'
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
const MAX_TOOL_ITERATIONS = 10
const WIDGET_TIMEOUT_MS = 300_000

const FLASHCARD_TOOL: Anthropic.Tool = {
  name: 'flashcard',
  description: `Start a flashcard exercise. The server generates matching-mode cards from the user's vocabulary at their CEFR level. Use when the user wants to practice, drill, or review vocabulary. Say something encouraging before calling this tool.`,
  input_schema: {
    type: 'object' as const,
    properties: {
      mode: { type: 'string', enum: ['matching'], description: 'Quiz mode. Only matching is supported.' },
      count: { type: 'integer', description: 'Number of cards (1-20). Default 10.' },
      cefr_level: { type: 'string', enum: ['A1', 'A2', 'B1'], description: 'Target CEFR level. Omit to auto-detect.' },
    },
    required: ['mode'],
  },
}

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

interface VocabCard {
  lemma: string
  display: string
  article: string | null
  cefr_level: string
  sentence_de: string
  sentence_en: string
}

function vocabBlock(cards: VocabCard[]): string {
  if (cards.length === 0) return ''
  const lines = cards.map((c) => {
    const word = c.article ? `${c.article} ${c.lemma}` : c.lemma
    return `- ${word} (${c.cefr_level}) — "${c.sentence_de}" / "${c.sentence_en}"`
  })
  return `\n\nToday's vocabulary to weave into conversation (use at least 2–3 of these naturally in your replies — don't drill or list them, just use them as if they're normal words you'd choose):\n${lines.join('\n')}`
}

function buildSystemPrompt(
  targetLang: { code: string; name: string; english: string } | null,
  vocab: VocabCard[] = [],
): string {
  const base = targetLang
    ? `${BASE_PROMPT}\n\n${targetPrompt(targetLang.name, targetLang.english)}`
    : `${BASE_PROMPT}\n\n${NO_TARGET_PROMPT}`
  return base + vocabBlock(vocab)
}

async function pickVocab(
  db: D1Database,
  userId: string,
  langCode: string,
  count = 5,
  cefrLevel?: string,
): Promise<VocabCard[]> {
  const cefrFilter = cefrLevel ? `AND v.cefr_level = '${cefrLevel}'` : ''
  const result = await db
    .prepare(
      `SELECT v.lemma, v.display, v.article, v.cefr_level,
              e.sentence_de, e.sentence_en
       FROM vocab_items v
       LEFT JOIN vocab_examples e ON e.vocab_item_id = v.id
       LEFT JOIN user_vocab_progress p ON p.vocab_item_id = v.id AND p.user_id = ?
       WHERE v.language = ? ${cefrFilter}
       ORDER BY
         CASE WHEN p.due_at IS NULL THEN 0 ELSE 1 END,
         CASE WHEN p.due_at IS NOT NULL AND p.due_at <= ? THEN 0 ELSE 1 END,
         v.cefr_level ASC,
         RANDOM()
       LIMIT ?`,
    )
    .bind(userId, langCode, nowSec(), count)
    .all<{
      lemma: string
      display: string
      article: string | null
      cefr_level: string
      sentence_de: string | null
      sentence_en: string | null
    }>()

  return (result.results || []).map((r) => ({
    lemma: r.lemma,
    display: r.display,
    article: r.article,
    cefr_level: r.cefr_level,
    sentence_de: r.sentence_de ?? '',
    sentence_en: r.sentence_en ?? '',
  }))
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

  // Pending widget state — at most one widget active per connection.
  // When a widget is pending, the promise resolves with the user's answers
  // or rejects on timeout/cancel.
  const pendingWidget: {
    widgetId: string | null
    resolve: ((answers: FlashcardMatchingAnswer[]) => void) | null
    reject: ((reason: string) => void) | null
    timer: ReturnType<typeof setTimeout> | null
    correctMap: Map<string, { correct_index: number; correct_answer: string; word: string }>
  } = { widgetId: null, resolve: null, reject: null, timer: null, correctMap: new Map() }

  // Find or create the user's active conversation, then load history from D1.
  const conversationId = await getOrCreateActiveConversation(env.DB, userId)
  const history: Anthropic.MessageParam[] = await loadHistory(env.DB, conversationId)
  console.log(`[iris] loaded ${history.length} prior messages for conversation ${conversationId}`)

  // Send the loaded history to the client so it can render past turns.
  // Uses loadHistoryForClient which parses content_blocks for widget turns.
  if (history.length > 0) {
    const clientHistory = await loadHistoryForClient(env.DB, conversationId)
    server.send(
      JSON.stringify({
        type: 'history',
        turns: clientHistory.map((m) => ({
          role: m.role,
          text: m.content_blocks
            ? m.content_blocks.filter((b): b is import('../shared/types/widgets').TextContentBlock => b.type === 'text').map((b) => b.text).join('')
            : m.content,
          content_blocks: m.content_blocks,
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
        } else if (msg.type === 'widget_response' && pendingWidget.widgetId === msg.widget_id && pendingWidget.resolve) {
          if (pendingWidget.timer) clearTimeout(pendingWidget.timer)
          pendingWidget.resolve(msg.answers ?? [])
          pendingWidget.resolve = null
          pendingWidget.reject = null
          pendingWidget.timer = null
        } else if (msg.type === 'language') {
          // Cancel pending widget on language change
          if (pendingWidget.widgetId && pendingWidget.reject) {
            send({ type: 'widget_cancel', widget_id: pendingWidget.widgetId, reason: 'Language changed' })
            if (pendingWidget.timer) clearTimeout(pendingWidget.timer)
            pendingWidget.reject('Language changed')
            pendingWidget.widgetId = null
            pendingWidget.resolve = null
            pendingWidget.reject = null
            pendingWidget.timer = null
          }
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

      // Pick vocabulary cards for this turn — injected into the system prompt
      const vocab = targetLang
        ? await pickVocab(env.DB, userId, targetLang.code, 5)
        : []

      const tools: Anthropic.Tool[] = targetLang ? [FLASHCARD_TOOL] : []
      let fullAssistantText = ''
      const turnWidgetBlocks: WidgetContentBlock[] = []

      // Tool-use loop: stream Claude, execute any tool calls, feed results back
      for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
        let iterationText = ''
        const stream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: 1024,
          system: buildSystemPrompt(targetLang, vocab),
          messages: history,
          ...(tools.length > 0 ? { tools } : {}),
        })

        stream.on('text', (delta) => {
          iterationText += delta
          fullAssistantText += delta
          send({ type: 'response_text', delta })
        })

        const finalMessage = await stream.finalMessage()

        // Collect text from the response
        const textBlocks = finalMessage.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('')
        if (textBlocks && !iterationText) {
          fullAssistantText += textBlocks
        }

        // Check for tool calls
        const toolUseBlocks = finalMessage.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
        )

        if (finalMessage.stop_reason !== 'tool_use' || toolUseBlocks.length === 0) {
          // No tool calls — normal end of turn
          break
        }

        // Append the assistant's response (with tool_use blocks) to history
        history.push({ role: 'assistant', content: finalMessage.content })

        // Execute each tool call and collect results
        const toolResults: Anthropic.ToolResultBlockParam[] = []
        for (const block of toolUseBlocks) {
          const result = await executeToolCall(
            block.name,
            block.input as Record<string, unknown>,
            block.id,
            { env, userId, server, send, targetLang, turnWidgetBlocks, pendingWidget },
          )
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result,
          })
        }

        // Feed tool results back as a user message
        history.push({ role: 'user', content: toolResults })
      }

      // Persist the assistant turn — as content blocks if widgets were involved
      if (fullAssistantText.trim() || turnWidgetBlocks.length > 0) {
        const blocks: ContentBlock[] = []
        if (fullAssistantText.trim()) {
          blocks.push({ type: 'text', text: fullAssistantText })
        }
        blocks.push(...turnWidgetBlocks)

        history.push({ role: 'assistant', content: fullAssistantText || '(widget interaction)' })
        await persistMessage(
          env.DB,
          conversationId,
          'assistant',
          turnWidgetBlocks.length > 0 ? blocks : fullAssistantText,
        )
      }

      // TTS the text response (skip if the turn was pure tool calls with no text)
      if (fullAssistantText.trim()) {
        await streamTTS(fullAssistantText, server, env)
      }

      // Mark vocab as seen
      if (vocab.length > 0) {
        await markVocabSeen(env.DB, userId, vocab).catch((err) =>
          console.warn('[iris] markVocabSeen failed:', err),
        )
      }

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

// ---- Tool execution ----

interface ToolContext {
  env: Env
  userId: string
  server: WebSocket
  send: (payload: Record<string, unknown>) => void
  targetLang: { code: string; name: string; english: string } | null
  turnWidgetBlocks: WidgetContentBlock[]
  pendingWidget: {
    widgetId: string | null
    resolve: ((answers: FlashcardMatchingAnswer[]) => void) | null
    reject: ((reason: string) => void) | null
    timer: ReturnType<typeof setTimeout> | null
    correctMap: Map<string, { correct_index: number; correct_answer: string; word: string }>
  }
}

async function executeToolCall(
  name: string,
  input: Record<string, unknown>,
  toolUseId: string,
  ctx: ToolContext,
): Promise<string> {
  if (name === 'flashcard') {
    return executeFlashcard(input, ctx)
  }
  return `Unknown tool: ${name}`
}

async function executeFlashcard(
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<string> {
  const { env, userId, send, targetLang, pendingWidget } = ctx

  // Validate
  if (!targetLang) return 'Please select a language first.'
  const mode = input.mode as string
  if (mode !== 'matching') return 'Only matching mode is supported in Phase 1.'
  const count = Math.max(1, Math.min(20, Number(input.count) || 10))
  const cefrLevel = (input.cefr_level as string) || undefined

  // Query vocab
  const vocabCards = await pickVocab(env.DB, userId, targetLang.code, count, cefrLevel)
  if (vocabCards.length === 0) {
    return `No vocabulary available for ${targetLang.english}. Try a different CEFR level.`
  }

  // Generate distractors for each card
  const widgetId = newId()
  const cards: FlashcardMatchingCard[] = []
  const correctMap = new Map<string, { correct_index: number; correct_answer: string; word: string }>()

  for (const vc of vocabCards) {
    const cardId = newId()
    const correctAnswer = vc.sentence_en || vc.lemma

    // Get distractors: other words at same CEFR level
    const distractorResult = await env.DB
      .prepare(
        `SELECT DISTINCT e.sentence_en FROM vocab_items v
         JOIN vocab_examples e ON e.vocab_item_id = v.id
         WHERE v.language = ? AND v.cefr_level = ? AND v.lemma != ?
         ORDER BY RANDOM() LIMIT 3`,
      )
      .bind(targetLang.code, vc.cefr_level, vc.lemma)
      .all<{ sentence_en: string }>()

    let distractors = (distractorResult.results || []).map((r) => r.sentence_en)

    // Fallback to adjacent CEFR levels if not enough distractors
    if (distractors.length < 3) {
      const fallbackResult = await env.DB
        .prepare(
          `SELECT DISTINCT e.sentence_en FROM vocab_items v
           JOIN vocab_examples e ON e.vocab_item_id = v.id
           WHERE v.language = ? AND v.lemma != ? AND e.sentence_en != ?
           ORDER BY RANDOM() LIMIT ?`,
        )
        .bind(targetLang.code, vc.lemma, correctAnswer, 3 - distractors.length)
        .all<{ sentence_en: string }>()
      distractors = distractors.concat((fallbackResult.results || []).map((r) => r.sentence_en))
    }

    // Ensure exactly 3 distractors (pad with generic if DB is sparse)
    while (distractors.length < 3) {
      distractors.push(`[option ${distractors.length + 2}]`)
    }

    // Shuffle options: correct answer + 3 distractors
    const options = [correctAnswer, ...distractors.slice(0, 3)]
    const shuffled = options
      .map((o, i) => ({ o, sort: Math.random(), origIdx: i }))
      .sort((a, b) => a.sort - b.sort)
    const shuffledOptions = shuffled.map((s) => s.o)
    const correctIndex = shuffled.findIndex((s) => s.origIdx === 0)

    cards.push({ card_id: cardId, word: vc.display || `${vc.article ? vc.article + ' ' : ''}${vc.lemma}`, options: shuffledOptions })
    correctMap.set(cardId, { correct_index: correctIndex, correct_answer: correctAnswer, word: vc.display || vc.lemma })
  }

  // Store correct answers server-side
  pendingWidget.correctMap = correctMap
  pendingWidget.widgetId = widgetId

  // Send widget to client (no correct_index!)
  const widget: FlashcardMatchingWidget = {
    type: 'flashcard-matching',
    widget_id: widgetId,
    cards,
    cefr_level: vocabCards[0]?.cefr_level || 'A1',
  }
  send({ type: 'widget', widget })

  // Wait for response or timeout
  let answers: FlashcardMatchingAnswer[]
  try {
    answers = await new Promise<FlashcardMatchingAnswer[]>((resolve, reject) => {
      pendingWidget.resolve = resolve
      pendingWidget.reject = reject
      pendingWidget.timer = setTimeout(() => {
        pendingWidget.widgetId = null
        pendingWidget.resolve = null
        pendingWidget.reject = null
        pendingWidget.timer = null
        reject('Widget timed out — user did not respond within 5 minutes')
      }, WIDGET_TIMEOUT_MS)
    })
  } catch (reason) {
    pendingWidget.widgetId = null
    pendingWidget.correctMap.clear()
    return typeof reason === 'string' ? reason : 'Widget cancelled'
  }

  // Grade
  const answerMap = new Map(answers.map((a) => [a.card_id, a.selected_index]))
  const cardResults: FlashcardMatchingCardResult[] = []
  let correctCount = 0

  for (const card of cards) {
    const correct = correctMap.get(card.card_id)!
    const selectedIndex = answerMap.get(card.card_id) ?? -1
    const isCorrect = selectedIndex === correct.correct_index
    if (isCorrect) correctCount++
    cardResults.push({
      card_id: card.card_id,
      word: correct.word,
      correct_answer: correct.correct_answer,
      correct_index: correct.correct_index,
      selected_index: selectedIndex,
      correct: isCorrect,
    })
  }

  // Send result to client (with revealed answers)
  send({
    type: 'widget_result',
    widget_id: widgetId,
    widget_type: 'flashcard-matching',
    score: correctCount,
    total: cards.length,
    cards: cardResults,
  })

  // SM-2 updates
  for (const cr of cardResults) {
    const vocab = vocabCards.find((v) => correctMap.get(cr.card_id)?.word === (v.display || v.lemma))
    if (!vocab) continue
    try {
      await updateSm2(env.DB, userId, vocab.lemma, targetLang.code, cr.correct)
    } catch (err) {
      console.warn(`[iris] SM-2 update failed for ${vocab.lemma}:`, err)
    }
  }

  // Persist widget lifecycle as a content block
  ctx.turnWidgetBlocks.push({
    type: 'widget',
    widget_type: 'flashcard-matching',
    widget_id: widgetId,
    payload: widget,
    response: { type: 'widget_response', widget_id: widgetId, answers },
    result: {
      type: 'widget_result',
      widget_id: widgetId,
      widget_type: 'flashcard-matching',
      score: correctCount,
      total: cards.length,
      cards: cardResults,
    },
    status: 'completed',
  })

  // Clean up
  pendingWidget.widgetId = null
  pendingWidget.correctMap.clear()

  // Build text summary for Claude
  const summary = cardResults.map((c) => `${c.word} ${c.correct ? '✓' : '✗'}`).join(', ')
  return `User scored ${correctCount}/${cards.length}: ${summary}`
}

async function updateSm2(
  db: D1Database,
  userId: string,
  lemma: string,
  langCode: string,
  correct: boolean,
): Promise<void> {
  const now = nowSec()
  const prev = await db
    .prepare(
      `SELECT p.ease, p.interval_days FROM user_vocab_progress p
       JOIN vocab_items v ON v.id = p.vocab_item_id
       WHERE p.user_id = ? AND v.lemma = ? AND v.language = ?
       LIMIT 1`,
    )
    .bind(userId, lemma, langCode)
    .first<{ ease: number; interval_days: number }>()

  const ease = prev?.ease ?? 2.5
  const interval = prev?.interval_days ?? 0

  let newEase: number
  let newInterval: number
  if (correct) {
    newInterval = interval === 0 ? 1 : interval === 1 ? 6 : Math.round(interval * ease)
    newEase = Math.max(1.3, ease + 0.1)
  } else {
    newInterval = 0
    newEase = Math.max(1.3, ease - 0.2)
  }

  const dueAt = now + newInterval * 86400

  await db
    .prepare(
      `INSERT INTO user_vocab_progress (user_id, vocab_item_id, ease, interval_days, due_at, last_seen_at, correct_count, incorrect_count)
       SELECT ?, v.id, ?, ?, ?, ?, ?, ?
       FROM vocab_items v WHERE v.lemma = ? AND v.language = ? AND v.source = 'goethe' LIMIT 1
       ON CONFLICT (user_id, vocab_item_id)
       DO UPDATE SET ease = excluded.ease, interval_days = excluded.interval_days,
         due_at = excluded.due_at, last_seen_at = excluded.last_seen_at,
         correct_count = correct_count + excluded.correct_count,
         incorrect_count = incorrect_count + excluded.incorrect_count`,
    )
    .bind(userId, newEase, newInterval, dueAt, now, correct ? 1 : 0, correct ? 0 : 1, lemma, langCode)
    .run()
}

async function markVocabSeen(
  db: D1Database,
  userId: string,
  cards: VocabCard[],
): Promise<void> {
  const now = nowSec()
  const stmts = cards.map((c) =>
    db
      .prepare(
        `INSERT INTO user_vocab_progress (user_id, vocab_item_id, last_seen_at, due_at, correct_count)
         SELECT ?, v.id, ?, ? + 86400, 0
         FROM vocab_items v
         WHERE v.lemma = ? AND v.language = 'deu' AND v.source = 'goethe'
         LIMIT 1
         ON CONFLICT (user_id, vocab_item_id)
         DO UPDATE SET last_seen_at = excluded.last_seen_at`,
      )
      .bind(userId, now, now, c.lemma),
  )
  await db.batch(stmts)
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

interface HistoryMessage {
  role: 'user' | 'assistant'
  content: string
  content_blocks?: ContentBlock[] | null
}

async function loadHistory(db: D1Database, conversationId: string): Promise<Anthropic.MessageParam[]> {
  const result = await db
    .prepare(
      'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
    )
    .bind(conversationId)
    .all<{ role: 'user' | 'assistant'; content: string }>()
  return (result.results || []).map((r) => {
    // Content might be JSON (content blocks) or plain text
    if (r.content.startsWith('[')) {
      try {
        JSON.parse(r.content)
      } catch {}
    }
    return { role: r.role, content: r.content }
  })
}

function loadHistoryForClient(db: D1Database, conversationId: string): Promise<HistoryMessage[]> {
  return db
    .prepare(
      'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
    )
    .bind(conversationId)
    .all<{ role: 'user' | 'assistant'; content: string }>()
    .then((result) =>
      (result.results || []).map((r) => {
        let contentBlocks: ContentBlock[] | null = null
        if (r.content.startsWith('[')) {
          try {
            contentBlocks = JSON.parse(r.content) as ContentBlock[]
          } catch {}
        }
        return { role: r.role, content: r.content, content_blocks: contentBlocks }
      }),
    )
}

async function persistMessage(
  db: D1Database,
  conversationId: string,
  role: 'user' | 'assistant',
  content: string | ContentBlock[],
): Promise<void> {
  const id = newId()
  const t = nowSec()
  const serialized = typeof content === 'string' ? content : JSON.stringify(content)
  await db.batch([
    db
      .prepare('INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(id, conversationId, role, serialized, t),
    db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').bind(t, conversationId),
  ])
}
