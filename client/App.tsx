import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso'
import { Recorder, StreamingPlayer, playBlob, unlockAudioPlayback, stopActivePlayback, type PlaybackHandle } from './audio'
import { FlashcardActive, FlashcardResult } from './FlashcardWidget'
import { FlashcardFreeformActive, FlashcardFreeformResult } from './widgets/FlashcardFreeform'
import { GenderPickActive, GenderPickResult } from './widgets/GenderPick'
import { DefinitionActive, DefinitionResult } from './widgets/Definition'
import { FillBlankActive, FillBlankResult } from './widgets/FillBlank'
import type { AuthUser } from './AuthGate'
import LanguagePicker from './LanguagePicker'
import { findLanguage } from './languages'
import type {
  FlashcardMatchingWidget,
  FlashcardMatchingAnswer,
  FlashcardMatchingCardResult,
  FlashcardFreeformWidget,
  FlashcardFreeformResult as FlashcardFreeformResultType,
  GenderPickWidget,
  GenderPickAnswer,
  GenderPickCardResult,
  DefinitionWidget,
  DefinitionAnswer,
  DefinitionCardResult,
  FillBlankWidget,
  FillBlankAnswer,
  FillBlankCardResult,
  WidgetContentBlock,
  ContentBlock,
  Widget,
} from '../shared/types/widgets'

type Status = 'connecting' | 'reconnecting' | 'idle' | 'listening' | 'thinking' | 'speaking' | 'error'

interface WidgetTurn {
  widget: Widget
  result?: any
}

type Turn = {
  role: 'user' | 'assistant'
  text: string
  audio?: Blob
  widgets?: WidgetTurn[]
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
  const [lang, setLang] = useState<string>(user.targetLang?.code ?? 'auto')
  const [activeWidget, setActiveWidget] = useState<Widget | null>(null)
  const [playingTurnIndex, setPlayingTurnIndex] = useState<number | null>(null)
  const playbackRef = useRef<PlaybackHandle | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const recorderRef = useRef(new Recorder())
  const playerRef = useRef(new StreamingPlayer())
  const partialRef = useRef('')

  // Virtualized chat list. `atBottom` gates whether streaming/new messages
  // pull the viewport down — if the user scrolled up to read older turns
  // they don't get yanked back.
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const [atBottom, setAtBottom] = useState(true)

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      virtuosoRef.current?.scrollToIndex({ index: 'LAST', align: 'end', behavior: 'smooth' })
    })
  }, [])

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
            (msg.turns as { role: 'user' | 'assistant'; text: string; content_blocks?: ContentBlock[] | null }[]).map((t) => {
              const turn: Turn = { role: t.role, text: t.text }
              if (t.content_blocks) {
                const widgetBlocks = t.content_blocks.filter(
                  (b): b is WidgetContentBlock => b.type === 'widget',
                )
                if (widgetBlocks.length > 0) {
                  turn.widgets = widgetBlocks.map((wb) => ({
                    widget: wb.payload,
                    result: wb.result || undefined,
                  }))
                }
              }
              return turn
            }),
          )
          scrollToBottom()
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
              setStatus('speaking')
              const handle = await playBlob(audio)
              await handle.done
            } catch {
              // iOS may reject autoplay; ▶ button still works
            }
          }
          setStatus('idle')
        } else if (msg.type === 'widget') {
          const w = msg.widget as Widget
          setActiveWidget(w)
          // Attach to current or create new assistant turn with the widget
          setHistory((h) => {
            const last = h[h.length - 1]
            if (last?.role === 'assistant') {
              return [...h.slice(0, -1), { ...last, widgets: [...(last.widgets || []), { widget: w }] }]
            }
            return [...h, { role: 'assistant', text: '', widgets: [{ widget: w }] }]
          })
        } else if (msg.type === 'widget_result') {
          const result = msg as any
          setActiveWidget(null)
          // Attach widget result to the most recent assistant turn
          setHistory((h) => {
            const last = h[h.length - 1]
            if (last?.role === 'assistant') {
              const widgets = last.widgets || []
              // Find the widget turn matching this result
              const updated = widgets.map((w) =>
                w.widget.widget_id === result.widget_id
                  ? { ...w, result }
                  : w,
              )
              return [...h.slice(0, -1), { ...last, widgets: updated }]
            }
            return h
          })
        } else if (msg.type === 'widget_cancel') {
          setActiveWidget(null)
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

    // Barge-in: if Iris is speaking, stop her audio but keep the text
    if (status === 'speaking') {
      stopActivePlayback()
    }

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

  // Display items: persisted turns plus the in-flight assistant partial as a
  // synthetic last item. When `partial` arrives, item count grows by 1 once;
  // followOutput handles that. Subsequent token deltas grow the same item's
  // content — the count is stable, so we manually scroll below.
  type DisplayItem =
    | { type: 'turn'; turn: Turn; key: string }
    | { type: 'partial'; text: string }

  const displayItems = useMemo<DisplayItem[]>(() => {
    const items: DisplayItem[] = history.map((turn, i) => ({
      type: 'turn',
      turn,
      key: `t:${i}`,
    }))
    if (partial) items.push({ type: 'partial', text: partial })
    return items
  }, [history, partial])

  useEffect(() => {
    if (!atBottom) return
    if (!partial) return
    virtuosoRef.current?.scrollToIndex({ index: 'LAST', align: 'end', behavior: 'auto' })
  }, [partial, atBottom])

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
      if (e.code === 'Space' && !e.repeat && (status === 'idle' || status === 'speaking')) {
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

      {displayItems.length === 0 && status === 'idle' ? (
        <section className="transcript transcript-empty">
          <p className="hint">Hold the button (or Space) and say something. Try mixing German and English.</p>
        </section>
      ) : (
        <Virtuoso
          ref={virtuosoRef}
          className="transcript"
          data={displayItems}
          initialTopMostItemIndex={Math.max(displayItems.length - 1, 0)}
          atBottomStateChange={setAtBottom}
          atBottomThreshold={48}
          followOutput={(isAtBottom) => (isAtBottom ? 'auto' : false)}
          computeItemKey={(_index, item) => (item.type === 'turn' ? item.key : '__partial__')}
          itemContent={(_index, item) => {
            if (item.type === 'partial') {
              return (
                <div className="turn turn-assistant">
                  <div className="role">Iris</div>
                  <div className="text">{item.text}</div>
                </div>
              )
            }
            const turn = item.turn
            return (
              <div className={`turn turn-${turn.role}`}>
                <div className="role">
                  {turn.role === 'user' ? 'You' : 'Iris'}
                  {turn.audio && (
                    <button
                      className="replay"
                      onClick={async () => {
                        const turnIdx = _index
                        if (playingTurnIndex === turnIdx && playbackRef.current) {
                          if (playbackRef.current.playing) {
                            playbackRef.current.pause()
                            setPlayingTurnIndex(null)
                          } else {
                            playbackRef.current.resume()
                            setPlayingTurnIndex(turnIdx)
                          }
                          return
                        }
                        try {
                          const handle = await playBlob(turn.audio!)
                          playbackRef.current = handle
                          setPlayingTurnIndex(turnIdx)
                          handle.done.then(() => {
                            if (playbackRef.current === handle) {
                              playbackRef.current = null
                              setPlayingTurnIndex(null)
                            }
                          })
                        } catch {}
                      }}
                      title={playingTurnIndex === _index ? 'Pause' : 'Play'}
                      aria-label={playingTurnIndex === _index ? 'Pause audio' : 'Replay audio'}
                    >
                      {playingTurnIndex === _index ? '⏸' : '▶'}
                    </button>
                  )}
                </div>
                {turn.text && !turn.text.startsWith('[{') && <div className="text">{turn.text}</div>}
                {turn.widgets?.map((wt) => {
                  const isActive = activeWidget?.widget_id === wt.widget.widget_id

                  if (wt.widget.type === 'flashcard-matching') {
                    return wt.result ? (
                      <FlashcardResult
                        key={wt.widget.widget_id}
                        widget={wt.widget as FlashcardMatchingWidget}
                        cards={wt.result.cards as FlashcardMatchingCardResult[]}
                        score={wt.result.score}
                        total={wt.result.total}
                        onRetake={() => {
                          wsRef.current?.send(JSON.stringify({ type: 'widget_retake', widget_id: wt.widget.widget_id }))
                        }}
                      />
                    ) : isActive ? (
                      <FlashcardActive
                        key={wt.widget.widget_id}
                        widget={wt.widget as FlashcardMatchingWidget}
                        onSubmit={(answers) => {
                          wsRef.current?.send(JSON.stringify({
                            type: 'widget_response',
                            widget_id: wt.widget.widget_id,
                            answers,
                          }))
                        }}
                      />
                    ) : null
                  } else if (wt.widget.type === 'flashcard-freeform') {
                    return wt.result ? (
                      <FlashcardFreeformResult
                        key={wt.widget.widget_id}
                        result={wt.result as FlashcardFreeformResultType}
                        onRetake={() => {
                          wsRef.current?.send(JSON.stringify({ type: 'widget_retake', widget_id: wt.widget.widget_id }))
                        }}
                      />
                    ) : isActive ? (
                      <FlashcardFreeformActive
                        key={wt.widget.widget_id}
                        widget={wt.widget as FlashcardFreeformWidget}
                        onSubmit={(answer) => {
                          wsRef.current?.send(JSON.stringify({
                            type: 'widget_response',
                            widget_id: wt.widget.widget_id,
                            answer,
                          }))
                        }}
                      />
                    ) : null
                  } else if (wt.widget.type === 'gender-pick') {
                    return wt.result ? (
                      <GenderPickResult
                        key={wt.widget.widget_id}
                        widget={wt.widget as GenderPickWidget}
                        cards={wt.result.cards as GenderPickCardResult[]}
                        score={wt.result.score}
                        total={wt.result.total}
                        onRetake={() => {
                          wsRef.current?.send(JSON.stringify({ type: 'widget_retake', widget_id: wt.widget.widget_id }))
                        }}
                      />
                    ) : isActive ? (
                      <GenderPickActive
                        key={wt.widget.widget_id}
                        widget={wt.widget as GenderPickWidget}
                        onSubmit={(answers) => {
                          wsRef.current?.send(JSON.stringify({
                            type: 'widget_response',
                            widget_id: wt.widget.widget_id,
                            answers,
                          }))
                        }}
                      />
                    ) : null
                  } else if (wt.widget.type === 'definition') {
                    return wt.result ? (
                      <DefinitionResult
                        key={wt.widget.widget_id}
                        widget={wt.widget as DefinitionWidget}
                        cards={wt.result.cards as DefinitionCardResult[]}
                        score={wt.result.score}
                        total={wt.result.total}
                        onRetake={() => {
                          wsRef.current?.send(JSON.stringify({ type: 'widget_retake', widget_id: wt.widget.widget_id }))
                        }}
                      />
                    ) : isActive ? (
                      <DefinitionActive
                        key={wt.widget.widget_id}
                        widget={wt.widget as DefinitionWidget}
                        onSubmit={(answers) => {
                          wsRef.current?.send(JSON.stringify({
                            type: 'widget_response',
                            widget_id: wt.widget.widget_id,
                            answers,
                          }))
                        }}
                      />
                    ) : null
                  } else if (wt.widget.type === 'fill-blank') {
                    return wt.result ? (
                      <FillBlankResult
                        key={wt.widget.widget_id}
                        widget={wt.widget as FillBlankWidget}
                        cards={wt.result.cards as FillBlankCardResult[]}
                        score={wt.result.score}
                        total={wt.result.total}
                        onRetake={() => {
                          wsRef.current?.send(JSON.stringify({ type: 'widget_retake', widget_id: wt.widget.widget_id }))
                        }}
                      />
                    ) : isActive ? (
                      <FillBlankActive
                        key={wt.widget.widget_id}
                        widget={wt.widget as FillBlankWidget}
                        onSubmit={(answers) => {
                          wsRef.current?.send(JSON.stringify({
                            type: 'widget_response',
                            widget_id: wt.widget.widget_id,
                            answers,
                          }))
                        }}
                      />
                    ) : null
                  }
                  return null
                })}
              </div>
            )
          }}
        />
      )}

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
          disabled={status !== 'idle' && status !== 'listening' && status !== 'speaking'}
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
