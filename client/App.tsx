import { useEffect, useRef, useState } from 'react'
import { Recorder, StreamingPlayer, playBlob, unlockAudioPlayback } from './audio'
import type { AuthUser } from './AuthGate'
import LanguagePicker from './LanguagePicker'
import { findLanguage } from './languages'

type Status = 'connecting' | 'reconnecting' | 'idle' | 'listening' | 'thinking' | 'speaking' | 'error'
type Turn = { role: 'user' | 'assistant'; text: string; audio?: Blob }

interface AppProps {
  user: AuthUser
  signOut: () => Promise<void>
}

export default function App({ user, signOut }: AppProps) {
  const [status, setStatus] = useState<Status>('connecting')
  const [history, setHistory] = useState<Turn[]>([])
  const [partial, setPartial] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [lang, setLang] = useState<string>(user.targetLang?.code ?? 'auto')

  const wsRef = useRef<WebSocket | null>(null)
  const recorderRef = useRef(new Recorder())
  const playerRef = useRef(new StreamingPlayer())
  const partialRef = useRef('')

  useEffect(() => {
    let active = true
    let attempts = 0
    let reconnectTimer: number | null = null

    const onMessage = async (e: MessageEvent) => {
      if (!active) return
      if (typeof e.data === 'string') {
        const msg = JSON.parse(e.data)
        if (msg.type === 'history') {
          setHistory(
            (msg.turns as { role: 'user' | 'assistant'; text: string }[]).map((t) => ({
              role: t.role,
              text: t.text,
            })),
          )
        } else if (msg.type === 'transcript') {
          setHistory((h) => [...h, { role: 'user', text: msg.text }])
          setStatus('thinking')
        } else if (msg.type === 'response_text') {
          partialRef.current += msg.delta
          setPartial(partialRef.current)
          if (status !== 'speaking') setStatus('speaking')
        } else if (msg.type === 'done') {
          const finalText = partialRef.current
          partialRef.current = ''
          setPartial('')
          const audio = playerRef.current.takeBlob()
          if (finalText) {
            setHistory((h) => [...h, { role: 'assistant', text: finalText, audio: audio ?? undefined }])
          }
          if (audio) {
            try {
              await playBlob(audio)
            } catch {
              // iOS may reject autoplay; ▶ button still works
            }
          }
          setStatus('idle')
        } else if (msg.type === 'error') {
          setError(msg.message)
          setStatus('idle')
        }
      } else {
        playerRef.current.push(e.data as ArrayBuffer)
      }
    }

    const connect = () => {
      if (!active) return
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
      const ws = new WebSocket(`${proto}//${location.host}/api/voice`)
      ws.binaryType = 'arraybuffer'
      wsRef.current = ws
      setStatus(attempts === 0 ? 'connecting' : 'reconnecting')

      ws.onopen = () => {
        if (!active) return
        attempts = 0
        setError(null)
        setStatus('idle')
        // Mid-turn state from before the drop is gone — reset partial buffer.
        // Server will replay history via the 'history' message.
        partialRef.current = ''
        setPartial('')
      }

      ws.onmessage = onMessage

      // onerror is always followed by onclose; do reconnect logic in onclose.
      ws.onerror = () => {}

      ws.onclose = () => {
        if (!active) return
        wsRef.current = null
        // Cap exponential backoff at 30s, jitter up to 250ms
        const backoff = Math.min(1000 * 2 ** Math.min(attempts, 5), 30000)
        const delay = backoff + Math.floor(Math.random() * 250)
        attempts++
        setStatus('reconnecting')
        reconnectTimer = window.setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      active = false
      if (reconnectTimer != null) clearTimeout(reconnectTimer)
      const ws = wsRef.current
      wsRef.current = null
      // Mark closed before invoking close() so onclose handler short-circuits
      if (ws) {
        ws.onclose = null
        ws.onerror = null
        ws.close()
      }
    }
  }, [])

  const startTalk = async () => {
    setError(null)
    // Must be SYNC, before any await — iOS forgets the gesture otherwise
    unlockAudioPlayback()
    try {
      await recorderRef.current.start()
      setStatus('listening')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mic access denied')
    }
  }

  const stopTalk = async () => {
    if (status !== 'listening') return
    // iOS 17+ doesn't always count touchstart as activation — re-unlock here
    // (touchend / mouseup) to be safe; idempotent.
    unlockAudioPlayback()
    setStatus('thinking')
    const blob = await recorderRef.current.stop()
    if (blob.size === 0) {
      setStatus('idle')
      return
    }
    wsRef.current?.send(await blob.arrayBuffer())
  }

  const reset = () => {
    setHistory([])
    partialRef.current = ''
    setPartial('')
    wsRef.current?.send(JSON.stringify({ type: 'reset' }))
  }

  const setLanguage = (next: string) => {
    setLang(next)
    if (next === 'auto') {
      wsRef.current?.send(JSON.stringify({ type: 'language', code: 'auto' }))
    } else {
      const meta = findLanguage(next)
      if (meta) {
        wsRef.current?.send(
          JSON.stringify({ type: 'language', code: meta.code, name: meta.name, english: meta.english }),
        )
      }
    }
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && status === 'idle') {
        e.preventDefault()
        startTalk()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && status === 'listening') {
        e.preventDefault()
        stopTalk()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [status])

  return (
    <main className="app">
      <header>
        <h1>Iris</h1>
        <p className="subtitle">Bilingual voice chat — German & English</p>
        <div className="user-bar">
          <span className="user-email">{user.email}</span>
          <button className="signout" onClick={signOut} title="Sign out">sign out</button>
        </div>
      </header>

      <section className="transcript">
        {history.length === 0 && status === 'idle' && (
          <p className="hint">Hold the button (or Space) and say something. Try mixing German and English.</p>
        )}
        {history.map((turn, i) => (
          <div key={i} className={`turn turn-${turn.role}`}>
            <div className="role">
              {turn.role === 'user' ? 'You' : 'Iris'}
              {turn.audio && (
                <button
                  className="replay"
                  onClick={() => playBlob(turn.audio!).catch(() => {})}
                  title="Play again"
                  aria-label="Replay audio"
                >
                  ▶
                </button>
              )}
            </div>
            <div className="text">{turn.text}</div>
          </div>
        ))}
        {partial && (
          <div className="turn turn-assistant">
            <div className="role">Iris</div>
            <div className="text">{partial}</div>
          </div>
        )}
      </section>

      {error && <div className="error">{error}</div>}

      <div className="lang-bar">
        <span className="lang-bar-label">learning</span>
        <LanguagePicker value={lang} onChange={setLanguage} />
      </div>

      <footer>
        <button
          className={`mic mic-${status}`}
          onMouseDown={startTalk}
          onMouseUp={stopTalk}
          onMouseLeave={() => status === 'listening' && stopTalk()}
          onTouchStart={startTalk}
          onTouchEnd={stopTalk}
          disabled={status !== 'idle' && status !== 'listening'}
        >
          {status === 'connecting' && 'connecting…'}
          {status === 'reconnecting' && 'reconnecting…'}
          {status === 'idle' && 'hold to talk'}
          {status === 'listening' && 'listening…'}
          {status === 'thinking' && 'thinking…'}
          {status === 'speaking' && 'speaking…'}
          {status === 'error' && 'disconnected'}
        </button>
        <button className="reset" onClick={reset} disabled={history.length === 0}>
          new chat
        </button>
      </footer>
    </main>
  )
}
