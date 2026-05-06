/// <reference types="@cloudflare/workers-types" />
// ElevenLabs Scribe v2 Realtime — outbound WebSocket client.
//
// Opens a WS to wss://api.elevenlabs.io/v1/speech-to-text/realtime with
// commit_strategy=vad so the server endpoints utterances for us. The caller
// streams 16 kHz Int16 LE PCM via sendPCM(); the server emits partial
// transcripts (for live captions / barge-in) and committed transcripts
// (one per finished utterance). Each committed transcript is a finalized
// user turn that the worker can feed into the existing Claude pipeline.
//
// Auth: `xi-api-key` header in the upgrade request — keeps the API key
// server-side. (The browser-side flow uses ?token=... single-use tokens.)
import type { Env } from './tools'

// Cloudflare Workers' fetch() requires an http(s):// URL even for WebSocket
// upgrades — passing wss:// throws "fetch API cannot load wss://...". The
// `Upgrade: websocket` header below is what triggers the protocol switch;
// the response then exposes resp.webSocket for accept().
const REALTIME_URL = 'https://api.elevenlabs.io/v1/speech-to-text/realtime'

export interface RealtimeSTTOptions {
  env: Env
  language?: string
  onPartial: (text: string) => void
  onCommitted: (text: string) => void
  onError: (msg: string) => void
  onClose?: () => void
}

export interface RealtimeSTTHandle {
  sendPCM: (pcm: ArrayBuffer) => void
  close: () => void
  readonly closed: boolean
}

interface ServerMsg {
  message_type: string
  text?: string
  session_id?: string
  error?: string
}

export async function openRealtimeSTT(
  opts: RealtimeSTTOptions,
): Promise<RealtimeSTTHandle> {
  const params = new URLSearchParams({
    model_id: 'scribe_v2_realtime',
    audio_format: 'pcm_16000',
    commit_strategy: 'vad',
  })
  if (opts.language) params.set('language_code', opts.language)

  // CF Workers outbound WebSocket: fetch() with Upgrade header, then read
  // .webSocket off the 101 response and accept() it.
  const url = `${REALTIME_URL}?${params.toString()}`
  const resp = await fetch(url, {
    headers: {
      Upgrade: 'websocket',
      'xi-api-key': opts.env.ELEVENLABS_API_KEY,
    },
  })

  if (resp.status !== 101 || !resp.webSocket) {
    const body = await resp.text().catch(() => '')
    throw new Error(
      `realtime STT upgrade failed: ${resp.status} ${body.slice(0, 200)}`,
    )
  }

  const ws = resp.webSocket
  ws.accept()

  let closed = false

  ws.addEventListener('message', (event: MessageEvent) => {
    if (typeof event.data !== 'string') return
    let msg: ServerMsg
    try {
      msg = JSON.parse(event.data)
    } catch {
      console.warn('[iris] realtime STT: non-JSON message')
      return
    }

    if (msg.message_type === 'partial_transcript') {
      if (msg.text) opts.onPartial(msg.text)
    } else if (msg.message_type === 'committed_transcript') {
      if (msg.text && msg.text.trim()) opts.onCommitted(msg.text)
    } else if (msg.message_type === 'session_started') {
      console.log(`[iris] realtime STT session ${msg.session_id} started`)
    } else if (msg.error) {
      console.error(`[iris] realtime STT ${msg.message_type}:`, msg.error)
      opts.onError(`${msg.message_type}: ${msg.error}`)
    }
  })

  ws.addEventListener('close', () => {
    if (closed) return
    closed = true
    opts.onClose?.()
  })

  ws.addEventListener('error', (e: Event) => {
    console.error('[iris] realtime STT socket error:', e)
    opts.onError('socket error')
  })

  return {
    get closed() {
      return closed
    },
    sendPCM(pcm: ArrayBuffer) {
      if (closed) return
      // Wire format: input_audio_chunk JSON with base64-encoded PCM. There is
      // no separate "end" or "commit" message — commit_strategy=vad means the
      // server endpoints utterances on its own.
      const bytes = new Uint8Array(pcm)
      // nodejs_compat is on (wrangler.toml), so Buffer is available and
      // handles arbitrary chunk sizes without the apply-stack-limit footgun
      // that String.fromCharCode(...arr) hits on big buffers.
      const audio_base_64 = Buffer.from(bytes).toString('base64')
      try {
        ws.send(
          JSON.stringify({
            message_type: 'input_audio_chunk',
            audio_base_64,
            sample_rate: 16000,
          }),
        )
      } catch (err) {
        console.warn('[iris] realtime STT send failed:', err)
      }
    },
    close() {
      if (closed) return
      closed = true
      try {
        ws.close(1000, 'client done')
      } catch {
        /* already gone */
      }
    },
  }
}
