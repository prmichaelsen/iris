import { useEffect, useRef, useState } from 'react'
import { Recorder, StreamingPlayer, playBlob, unlockAudioPlayback } from './audio'
import type { AuthUser } from './AuthGate'

type Status = 'connecting' | 'idle' | 'listening' | 'thinking' | 'speaking' | 'error'
type Turn = { role: 'user' | 'assistant'; text: string; audio?: Blob }
type Lang = 'auto' | 'eng' | 'deu'

const LANG_LABEL: Record<Lang, string> = {
  auto: 'auto',
  eng: 'english',
  deu: 'deutsch',
}

interface AppProps {
  user: AuthUser
  signOut: () => Promise<void>
}

export default function App({ user, signOut }: AppProps) {
  const [status, setStatus] = useState<Status>('connecting')
  const [history, setHistory] = useState<Turn[]>([])
  const [partial, setPartial] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [lang, setLang] = useState<Lang>('auto')

  const wsRef = useRef<WebSocket | null>(null)
  const recorderRef = useRef(new Recorder())
  const playerRef = useRef(new StreamingPlayer())
  const partialRef = useRef('')

  useEffect(() => {
    let active = true
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${proto}//${location.host}/api/voice`)
    ws.binaryType = 'arraybuffer'
    wsRef.current = ws

    ws.onopen = () => active && setStatus('idle')
    ws.onclose = () => active && setStatus('error')
    ws.onerror = () => active && setError('WebSocket connection failed')

    ws.onmessage = async (e) => {
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
          // Snapshot the audio NOW so we can attach it to the turn at the
          // same moment we append the text — replay button shows up as soon
          // as the turn renders, even before playback finishes.
          const audio = playerRef.current.takeBlob()
          if (finalText) {
            setHistory((h) => [...h, { role: 'assistant', text: finalText, audio: audio ?? undefined }])
          }
          if (audio) {
            try {
              await playBlob(audio)
            } catch {
              // iOS / Safari may reject autoplay even after unlock —
              // user can still tap the replay (▶) button on the turn.
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

    return () => {
      active = false
      ws.close()
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

  const setLanguage = (next: Lang) => {
    setLang(next)
    wsRef.current?.send(JSON.stringify({ type: 'language', code: next }))
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

      <div className="lang-toggle">
        {(['auto', 'eng', 'deu'] as const).map((opt) => (
          <button
            key={opt}
            className={`lang-btn ${lang === opt ? 'lang-btn-active' : ''}`}
            onClick={() => setLanguage(opt)}
            title={
              opt === 'auto'
                ? 'Let Scribe detect the language (may pick Dutch on bad German)'
                : `Force input language to ${LANG_LABEL[opt]}`
            }
          >
            {LANG_LABEL[opt]}
          </button>
        ))}
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
