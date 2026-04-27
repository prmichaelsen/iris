/// <reference types="@cloudflare/workers-types" />
import Anthropic from '@anthropic-ai/sdk'
import type {
  FlashcardMatchingAnswer,
  WidgetContentBlock,
  ContentBlock,
} from '../shared/types/widgets'
import { isJson } from '../shared/utils'
import {
  clearSessionCookieHeader,
  createSession,
  deleteSession,
  getCurrentUser,
  hashPassword,
  normalizeEmail,
  setSessionCookieHeader,
  validatePassword,
  verifyPassword,
} from './auth'
import { getTools, executeToolCall, pickVocab, newId, nowSec, type Env, type PendingWidget } from './tools'
import { sanitizeToolMessages } from './sanitize-tool-messages'
import {
  getOrCreateConversationState,
  incrementStrike,
  resetStrikes,
  recordUserResponse,
  clearConversationState,
  characterUsesTimer,
  getCharacterTimerConfig,
  type ConversationState,
} from './conversation-state'
import { updateSessionCharacterState } from './session-state'
import { buildSystemPrompt as injectorsBuildSystemPrompt } from './prompt-injectors'
import { lookupWord } from './word-lookup'

const ELEVEN_API = 'https://api.elevenlabs.io/v1'
const MODEL = 'claude-opus-4-7'
const DEFAULT_VOICE_ID = 'XB0fDUnXU5powFXDhCwa'
const MAX_TOOL_ITERATIONS = 10

const BASE_PROMPT = `You are Iris, a warm and patient language tutor. The user's native language is English; you should treat English as their fallback for explanations.

Style guidelines:
- This is voice chat. Keep replies short — 1 to 3 sentences. Conversational, not lecture-like.
- Gently model correct phrasing when the user makes a small mistake, instead of explicitly correcting them — unless they ask to be corrected.
- Occasionally ask a follow-up question to keep practice flowing.
- Never break character to mention you are an AI or a language model. You are Iris.
- Use plain text only. No markdown, no emoji, no asterisks for emphasis — your output is read aloud.

Gamification tools (use proactively):
- When the user asks about quests, places to visit, or wants to practice with a character, use the \`quests\` or \`regions\` tools.
- \`regions\` tool with action="list" shows all German regions and which are unlocked.
- \`quests\` tool with action="list" shows available quests. Pass region_id="berlin" to filter.
- \`quests\` tool with action="activate" starts a quest (switches you into that character's voice and personality).
- When the user says something like "Hast du eine Quest für mich mit Karl?" or "Can I talk to Karl?", call \`quests\` action=list region_id=berlin to find Karl's quests, then describe them.
- Karl der Bäcker (Berlin baker) offers the "Erste Bestellung" quest — a time-pressured ordering challenge.
- Mila (Berlin street artist) can be unlocked by completing Tier 2 Berlin quests.

Study list tool (use proactively):
- When the user says "add X to my study list", "I keep forgetting Y", "let's practice Z", or similar, call \`study_list\` action="add" with the word AND its English gloss.
- When the user asks "what's on my study list" or "what am I studying", call \`study_list\` action="list".
- A Study List section may appear later in this system prompt with the user's active words — when it does, follow its rules exactly (inline gloss format is mandatory for study words).`

const NO_TARGET_PROMPT = `The user has not picked a target language yet. Greet them in English and ask which language they would like to practice. Until they pick one, keep the conversation in English.`

function targetPrompt(nativeName: string, englishName: string): string {
  return `The user is learning ${nativeName} (${englishName}).
- Speak ${nativeName} with them by default. Match the user's level — if their ${nativeName} is shaky, slow down and simplify; if it's strong, push them with richer vocabulary or new phrasing.
- Drop into English (1) when the user asks something in English, (2) when they appear stuck or confused, or (3) to briefly explain a word, idiom, or grammar point. After explaining, return to ${nativeName} on the next turn.
- Each reply, when natural, gently introduce one new ${nativeName} word or phrase the user can pick up — don't lecture, just weave it in.
- If the transcript looks garbled, assume the user was attempting ${nativeName} with imperfect pronunciation and make your best guess from context.`
}

import type { VocabCard } from './tools'
import { getCharacter, type Character } from './characters'

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
  character?: Character,
): string {
  // If a character is provided, use their custom system prompt
  if (character && character.additional_instructions) {
    const charPrompt = character.additional_instructions
    const langPrompt = targetLang
      ? targetPrompt(targetLang.name, targetLang.english)
      : NO_TARGET_PROMPT
    return `${charPrompt}\n\n${langPrompt}${vocabBlock(vocab)}`
  }

  // Default Iris prompt (backward compatibility)
  const base = targetLang
    ? `${BASE_PROMPT}\n\n${targetPrompt(targetLang.name, targetLang.english)}`
    : `${BASE_PROMPT}\n\n${NO_TARGET_PROMPT}`
  return base + vocabBlock(vocab)
}

/**
 * Async variant that runs the prompt injector registry to append
 * dynamic sections (study list, quest conditions, etc.). Falls back
 * to the sync buildSystemPrompt if no injectors match.
 */
async function buildSystemPromptAsync(
  targetLang: { code: string; name: string; english: string } | null,
  vocab: VocabCard[],
  character: Character | undefined,
  db: D1Database,
  userId: string,
  activeCharacterId: string,
  activeQuestId: string | undefined,
  currentRegion: string,
): Promise<string> {
  const basePrompt = buildSystemPrompt(targetLang, vocab, character)

  try {
    const { prompt: injectedSections } = await injectorsBuildSystemPrompt({
      context: {
        userId,
        db,
        activeCharacterId,
        activeQuestId,
        currentRegion,
      },
    })
    if (injectedSections.trim().length === 0) return basePrompt
    return `${basePrompt}\n\n${injectedSections}`
  } catch (err) {
    console.error('Prompt injector failure (falling back to base):', err)
    return basePrompt
  }
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

    if (url.pathname === '/api/word' && request.method === 'GET') {
      return handleWordLookup(request, env)
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

async function handleWordLookup(request: Request, env: Env): Promise<Response> {
  const session = await getCurrentUser(env.DB, request)
  if (!session) return jsonError('unauthorized', 401)

  const url = new URL(request.url)
  const q = url.searchParams.get('q')
  const lang = url.searchParams.get('lang') || 'de'
  if (!q) return jsonError('missing q', 400)

  const result = await lookupWord(env.DB, env.ANTHROPIC_API_KEY, q, lang)
  return Response.json(result)
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

  // Load character state from session (or use default)
  const sessionState = await env.DB
    .prepare('SELECT active_character, active_quest, current_region, active_voice_id FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1')
    .bind(userId)
    .first<{
      active_character: string | null
      active_quest: string | null
      current_region: string | null
      active_voice_id: string | null
    }>()

  let activeCharacterId = sessionState?.active_character || 'iris'
  let activeQuest = sessionState?.active_quest || null
  let currentRegion = sessionState?.current_region || 'berlin'
  let activeVoiceId = sessionState?.active_voice_id || DEFAULT_VOICE_ID

  // Load the character definition
  let activeCharacter = getCharacter(activeCharacterId) || getCharacter('iris')!

  // Sync voice ID with character (in case they got out of sync)
  if (activeCharacter.voice_id !== activeVoiceId) {
    activeVoiceId = activeCharacter.voice_id
  }

  // Notify client of current character and voice
  server.send(
    JSON.stringify({
      type: 'character_state',
      character_id: activeCharacterId,
      voice_id: activeVoiceId,
      quest_id: activeQuest,
      region: currentRegion,
    }),
  )

  // Find or create the user's active conversation, then load history from D1.
  const conversationId = await getOrCreateActiveConversation(env.DB, userId)

  // Initialize conversation state for strike tracking
  const conversationState = getOrCreateConversationState(conversationId, activeCharacterId, activeQuest || undefined)

  // Send timer config to client if this character uses timers
  const timerDuration = getCharacterTimerConfig(activeCharacterId)
  if (timerDuration !== null) {
    server.send(
      JSON.stringify({
        type: 'timer_config',
        enabled: true,
        duration_ms: timerDuration,
      }),
    )
  }

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

  // Load history from D1 (cap at most recent 100 turns to keep context manageable)
  const HISTORY_CAP = 100
  const fullHistory: Anthropic.MessageParam[] = await loadHistory(env.DB, conversationId)
  const history = fullHistory.slice(-HISTORY_CAP)
  console.log(`[iris] loaded ${fullHistory.length} prior messages for conversation ${conversationId}, sending last ${history.length}`)

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
            : (isJson(m.content) ? '' : m.content),
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
          // Clear conversation state on reset
          clearConversationState(conversationId)
        } else if (msg.type === 'timeout') {
          // User failed to respond in time (client-side timeout detection)
          const state = incrementStrike(conversationId)
          if (!state) return

          console.log(`[iris] timeout strike ${state.strikes}/${state.maxStrikes} for conversation ${conversationId}`)

          // Notify client of strike count
          send({ type: 'strike', strikes: state.strikes, max_strikes: state.maxStrikes })

          if (state.strikes >= state.maxStrikes) {
            // Quest failed — inject failure message into history
            // Karl will say "NÄCHSTER!" via the quest conditions prompt
            const failureMessage = 'The user did not respond in time. This is strike 3.'
            history.push({ role: 'user', content: failureMessage })
            await persistMessage(env.DB, conversationId, 'user', failureMessage, 'system')

            // Trigger assistant response (Karl will say NÄCHSTER!)
            const vocab = targetLang ? await pickVocab(env.DB, userId, targetLang.code, 5) : []
            const tools = getTools(targetLang)
            const stream = anthropic.messages.stream({
              model: MODEL,
              max_tokens: 512,
              system: await buildSystemPromptAsync(targetLang, vocab, activeCharacter, env.DB, userId, activeCharacterId, activeQuest || undefined, currentRegion),
              messages: sanitizeToolMessages(history),
              ...(tools.length > 0 ? { tools } : {}),
            })

            let failureText = ''
            stream.on('text', (delta) => {
              failureText += delta
              send({ type: 'response_text', delta })
            })
            stream.on('error', (err) => {
              console.error('[iris] stream error (failure path):', err)
            })

            await stream.finalMessage()

            if (failureText.trim()) {
              history.push({ role: 'assistant', content: failureText })
              await persistMessage(env.DB, conversationId, 'assistant', failureText, activeCharacterId)
              await streamTTS(failureText, server, env, activeVoiceId)
            }

            send({ type: 'quest_failed', reason: 'timeout', strikes: state.strikes })
            send({ type: 'done' })
          }
          return
        } else if (msg.type === 'widget_response' && pendingWidget.widgetId === msg.widget_id && pendingWidget.resolve) {
          if (pendingWidget.timer) clearTimeout(pendingWidget.timer)
          // Handle both array answers (matching/gender-pick) and single answer (freeform)
          const payload = msg.answer !== undefined ? msg.answer : (msg.answers ?? [])
          pendingWidget.resolve(payload)
          pendingWidget.resolve = null
          pendingWidget.reject = null
          pendingWidget.timer = null
        } else if (msg.type === 'widget_retake') {
          // Retake: treat as a new voice turn with a retake request
          const retakeText = 'Please start another round of the same type of quiz.'
          history.push({ role: 'user', content: retakeText })
          await persistMessage(env.DB, conversationId, 'user', retakeText, 'user')

          // Re-use the same tool-use loop as a normal voice turn
          const vocab = targetLang ? await pickVocab(env.DB, userId, targetLang.code, 5) : []
          const tools = getTools(targetLang)
          const turnWidgetBlocks: WidgetContentBlock[] = []
          let fullAssistantText = ''

          for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
            const stream = anthropic.messages.stream({
              model: MODEL,
              max_tokens: 1024,
              system: await buildSystemPromptAsync(targetLang, vocab, activeCharacter, env.DB, userId, activeCharacterId, activeQuest || undefined, currentRegion),
              messages: sanitizeToolMessages(history),
              ...(tools.length > 0 ? { tools } : {}),
            })
            stream.on('text', (delta) => {
              fullAssistantText += delta
              send({ type: 'response_text', delta })
            })
            stream.on('error', (err) => {
              console.error('[iris] stream error (main path):', err)
            })
            const finalMessage = await stream.finalMessage()
            const toolUseBlocks = finalMessage.content.filter(
              (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
            )
            if (finalMessage.stop_reason !== 'tool_use' || toolUseBlocks.length === 0) break
            history.push({ role: 'assistant', content: finalMessage.content })
            const toolResults: Anthropic.ToolResultBlockParam[] = []
            for (const block of toolUseBlocks) {
              const result = await executeToolCall(
                block.name,
                block.input as Record<string, unknown>,
                { env, userId, server, send, targetLang, turnWidgetBlocks, pendingWidget, conversationHistory: history },
              )
              toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
            }
            history.push({ role: 'user', content: toolResults })
          }

          if (fullAssistantText.trim() || turnWidgetBlocks.length > 0) {
            const blocks: ContentBlock[] = []
            if (fullAssistantText.trim()) blocks.push({ type: 'text', text: fullAssistantText })
            blocks.push(...turnWidgetBlocks)
            history.push({ role: 'assistant', content: fullAssistantText || '(widget interaction)' })
            await persistMessage(env.DB, conversationId, 'assistant', turnWidgetBlocks.length > 0 ? blocks : fullAssistantText, activeCharacterId)
          }
          if (fullAssistantText.trim()) await streamTTS(fullAssistantText, server, env, activeVoiceId)
          send({ type: 'done' })
          return
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
      await persistMessage(env.DB, conversationId, 'user', transcript, 'user')

      // Record user response timestamp (reset timer, strikes NOT reset per quest rules)
      recordUserResponse(conversationId)

      // Stop timer on user response
      if (characterUsesTimer(activeCharacterId)) {
        send({ type: 'timer_stop' })
      }

      // Pick vocabulary cards for this turn — injected into the system prompt
      const vocab = targetLang
        ? await pickVocab(env.DB, userId, targetLang.code, 5)
        : []

      const tools = getTools(targetLang)
      let fullAssistantText = ''
      const turnWidgetBlocks: WidgetContentBlock[] = []

      // Tool-use loop: stream Claude, execute any tool calls, feed results back
      for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
        let iterationText = ''
        const stream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: 1024,
          system: await buildSystemPromptAsync(targetLang, vocab, activeCharacter, env.DB, userId, activeCharacterId, activeQuest || undefined, currentRegion),
          messages: sanitizeToolMessages(history),
          ...(tools.length > 0 ? { tools } : {}),
        })

        stream.on('error', (err) => {
          console.error('[iris] stream error (tool-loop path):', err)
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
            { env, userId, server, send, targetLang, turnWidgetBlocks, pendingWidget, conversationHistory: history },
          )
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result,
          })
        }

        // Feed tool results back as a user message
        history.push({ role: 'user', content: toolResults })

        // Refresh session state in case a tool (quests.activate / quests.complete /
        // regions.travel) mutated it. Keeps local closure vars in sync with DB,
        // and handles 3-strike lifecycle per spec.
        const refreshed = await env.DB
          .prepare(
            'SELECT active_character, active_quest, current_region, active_voice_id FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
          )
          .bind(userId)
          .first<{
            active_character: string | null
            active_quest: string | null
            current_region: string | null
            active_voice_id: string | null
          }>()

        if (refreshed) {
          const nextCharacterId = refreshed.active_character || 'iris'
          const nextQuest = refreshed.active_quest
          const nextRegion = refreshed.current_region || currentRegion

          // Quest activated (new quest started) — reset strikes per spec R15a
          if (nextQuest && nextQuest !== activeQuest) {
            resetStrikes(conversationId)
          }
          // Quest completed (no longer active) — clear per-conversation state
          if (!nextQuest && activeQuest) {
            clearConversationState(conversationId)
            // Recreate a fresh conversation-state entry for the returning-to-Iris context
            getOrCreateConversationState(conversationId, nextCharacterId, undefined)
          }

          if (nextCharacterId !== activeCharacterId) {
            const nextCharacter = getCharacter(nextCharacterId) || getCharacter('iris')!
            activeCharacter = nextCharacter
            activeCharacterId = nextCharacterId
            activeVoiceId = refreshed.active_voice_id || nextCharacter.voice_id
          } else if (refreshed.active_voice_id && refreshed.active_voice_id !== activeVoiceId) {
            activeVoiceId = refreshed.active_voice_id
          }
          activeQuest = nextQuest
          currentRegion = nextRegion
        }
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
          activeCharacterId,
        )
      }

      // TTS the text response (skip if the turn was pure tool calls with no text)
      if (fullAssistantText.trim()) {
        await streamTTS(fullAssistantText, server, env, activeVoiceId)
      }

      // If this character uses timer pressure, signal client to start countdown
      if (characterUsesTimer(activeCharacterId)) {
        send({ type: 'timer_start' })
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

async function streamTTS(text: string, ws: WebSocket, env: Env, voiceId: string = DEFAULT_VOICE_ID): Promise<void> {
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

// Inline executeToolCall REMOVED — use the imported one from ./tools/index.ts

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

  // Ensure all words have glosses + distractors cached in D1.
  // On first encounter per word, a small Claude call generates them.
  await ensureGlossesAndDistractors(env, vocabCards, targetLang.code)

  // Build flashcard cards from cached data
  const widgetId = newId()
  const cards: FlashcardMatchingCard[] = []
  const correctMap = new Map<string, { correct_index: number; correct_answer: string; word: string }>()

  for (const vc of vocabCards) {
    const cardId = newId()

    // Fetch cached gloss + distractors
    const vocabRow = await env.DB
      .prepare('SELECT id, gloss_en FROM vocab_items WHERE lemma = ? AND language = ? AND source = \'goethe\' LIMIT 1')
      .bind(vc.lemma, targetLang.code)
      .first<{ id: number; gloss_en: string | null }>()

    const correctAnswer = vocabRow?.gloss_en || vc.lemma
    const word = vc.article ? `${vc.article} ${vc.lemma}` : vc.lemma

    let distractors: string[] = []
    if (vocabRow) {
      const dResult = await env.DB
        .prepare('SELECT distractor_en FROM vocab_distractors WHERE vocab_item_id = ? ORDER BY RANDOM() LIMIT 3')
        .bind(vocabRow.id)
        .all<{ distractor_en: string }>()
      distractors = (dResult.results || []).map((r) => r.distractor_en)
    }

    // Pad if somehow we don't have 3 distractors
    while (distractors.length < 3) {
      const fallback = await env.DB
        .prepare('SELECT gloss_en FROM vocab_items WHERE language = ? AND lemma != ? AND gloss_en IS NOT NULL ORDER BY RANDOM() LIMIT 1')
        .bind(targetLang.code, vc.lemma)
        .first<{ gloss_en: string }>()
      distractors.push(fallback?.gloss_en || `option ${distractors.length + 2}`)
    }

    // Shuffle: correct answer + 3 distractors
    const options = [correctAnswer, ...distractors.slice(0, 3)]
    const shuffled = options
      .map((o, i) => ({ o, sort: Math.random(), origIdx: i }))
      .sort((a, b) => a.sort - b.sort)
    const shuffledOptions = shuffled.map((s) => s.o)
    const correctIndex = shuffled.findIndex((s) => s.origIdx === 0)

    cards.push({ card_id: cardId, word, options: shuffledOptions })
    correctMap.set(cardId, { correct_index: correctIndex, correct_answer: correctAnswer, word })
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

async function ensureGlossesAndDistractors(
  env: Env,
  vocabCards: VocabCard[],
  langCode: string,
): Promise<void> {
  // Find words missing glosses
  const needsGloss: { id: number; lemma: string; article: string | null }[] = []
  for (const vc of vocabCards) {
    const row = await env.DB
      .prepare('SELECT id, gloss_en FROM vocab_items WHERE lemma = ? AND language = ? AND source = \'goethe\' LIMIT 1')
      .bind(vc.lemma, langCode)
      .first<{ id: number; gloss_en: string | null }>()
    if (!row) continue
    // Check if this word has both a gloss and distractors
    if (!row.gloss_en) {
      needsGloss.push({ id: row.id, lemma: vc.lemma, article: vc.article })
      continue
    }
    const dCount = await env.DB
      .prepare('SELECT COUNT(*) AS c FROM vocab_distractors WHERE vocab_item_id = ?')
      .bind(row.id)
      .first<{ c: number }>()
    if (!dCount || dCount.c < 3) {
      needsGloss.push({ id: row.id, lemma: vc.lemma, article: vc.article })
    }
  }

  if (needsGloss.length === 0) return

  // Ask Claude (Haiku for speed + cost) to generate glosses + distractors
  console.log(`[iris] generating glosses + distractors for ${needsGloss.length} words`)
  const wordList = needsGloss
    .map((w) => `${w.id}|${w.article ? w.article + ' ' : ''}${w.lemma}`)
    .join('\n')

  const glossClient = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  const response = await glossClient.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `For each German word, provide:
1. A short English gloss (1-3 words, like a dictionary entry)
2. Three plausible-but-wrong English distractors (similar category/difficulty, 1-3 words each)

Format each line as: ID|gloss|distractor1|distractor2|distractor3
No extra text, just the lines.

Example:
123|greeting|farewell|question|answer
456|departure|arrival|entrance|delay

Words:
${wordList}`,
      },
    ],
  })

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')

  // Parse and cache
  for (const line of text.split('\n')) {
    const parts = line.trim().split('|')
    if (parts.length < 4) continue
    const id = parseInt(parts[0], 10)
    if (isNaN(id)) continue
    const gloss = parts[1].trim()
    const d1 = parts[2]?.trim()
    const d2 = parts[3]?.trim()
    const d3 = parts[4]?.trim()

    if (gloss) {
      await env.DB
        .prepare('UPDATE vocab_items SET gloss_en = ? WHERE id = ?')
        .bind(gloss, id)
        .run()
    }
    for (const d of [d1, d2, d3]) {
      if (d) {
        await env.DB
          .prepare('INSERT OR IGNORE INTO vocab_distractors (vocab_item_id, distractor_en) VALUES (?, ?)')
          .bind(id, d)
          .run()
          .catch(() => {})
      }
    }
  }
  console.log(`[iris] cached glosses + distractors for ${needsGloss.length} words`)
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
  characterId: string = 'iris',
): Promise<void> {
  const id = newId()
  const t = nowSec()
  const serialized = typeof content === 'string' ? content : JSON.stringify(content)
  await db.batch([
    db
      .prepare('INSERT INTO messages (id, conversation_id, role, content, character, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, conversationId, role, serialized, characterId, t),
    db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').bind(t, conversationId),
  ])
}
