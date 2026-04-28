import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * Wraps a block of text so each word can be hovered/tapped to show
 * a translation popover. Words are tokenized client-side; punctuation
 * is preserved verbatim. Only applies to assistant (Iris/character) messages.
 *
 * Behavior:
 *   - Hover on desktop, tap on mobile
 *   - Single popover visible at a time
 *   - Client-side cache for repeated lookups in the same session
 *   - Graceful loading / error states
 */

interface WordDefinition {
  lemma: string
  article: string | null
  gloss: string
  cefr_level: string | null
  example_de: string | null
  example_en: string | null
  source?: string
  error?: string
}

const cache = new Map<string, WordDefinition>()

async function lookupWord(word: string, lang: string): Promise<WordDefinition> {
  const key = `${word.toLowerCase()}::${lang}`
  const hit = cache.get(key)
  if (hit) return hit
  const res = await fetch(`/api/word?q=${encodeURIComponent(word)}&lang=${lang}`, {
    credentials: 'include',
  })
  const data = (await res.json()) as WordDefinition
  cache.set(key, data)
  return data
}

type Token =
  | { kind: 'word'; text: string }
  | { kind: 'space'; text: string }
  | { kind: 'punct'; text: string }

function tokenize(text: string): Token[] {
  // Split preserving whitespace, then classify each piece.
  // Leading/trailing punctuation is split off so the word itself is clean.
  const tokens: Token[] = []
  // Match: runs of whitespace, runs of word-chars (incl. German umlauts),
  // or single punctuation chars.
  const re = /(\s+)|([A-Za-zÄÖÜäöüß]+(?:-[A-Za-zÄÖÜäöüß]+)*)|([^A-Za-zÄÖÜäöüß\s]+)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    if (match[1]) tokens.push({ kind: 'space', text: match[1] })
    else if (match[2]) tokens.push({ kind: 'word', text: match[2] })
    else if (match[3]) tokens.push({ kind: 'punct', text: match[3] })
  }
  return tokens
}

export function WordHoverText({ text, lang }: { text: string; lang: string }) {
  const tokens = tokenize(text)
  return (
    <>
      {tokens.map((t, i) => {
        if (t.kind === 'word') return <WordToken key={i} word={t.text} lang={lang} />
        return <span key={i}>{t.text}</span>
      })}
    </>
  )
}

const VIEWPORT_MARGIN = 8
const BUBBLE_GAP = 6
const ARROW_HALF_WIDTH = 6
const ARROW_EDGE_PADDING = 12

function WordToken({ word, lang }: { word: string; lang: string }) {
  const [open, setOpen] = useState(false)
  const [def, setDef] = useState<WordDefinition | null>(null)
  const [loading, setLoading] = useState(false)
  const spanRef = useRef<HTMLSpanElement>(null)
  const popoverRef = useRef<HTMLSpanElement>(null)
  const hoverTimerRef = useRef<number | null>(null)
  const leaveTimerRef = useRef<number | null>(null)
  const [pos, setPos] = useState<{ left: number; top: number; arrowLeft: number; placement: 'above' | 'below' } | null>(null)

  const beginHover = () => {
    if (leaveTimerRef.current) {
      window.clearTimeout(leaveTimerRef.current)
      leaveTimerRef.current = null
    }
    if (hoverTimerRef.current) return
    hoverTimerRef.current = window.setTimeout(() => {
      hoverTimerRef.current = null
      setOpen(true)
      if (!def && !loading) {
        setLoading(true)
        lookupWord(word, lang)
          .then((d) => setDef(d))
          .catch(() => setDef({ lemma: word, article: null, gloss: 'lookup failed', cefr_level: null, example_de: null, example_en: null, error: 'lookup_failed' }))
          .finally(() => setLoading(false))
      }
    }, 150)
  }

  const endHover = () => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
    leaveTimerRef.current = window.setTimeout(() => {
      setOpen(false)
      leaveTimerRef.current = null
    }, 200)
  }

  const toggleTap = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (open) {
      setOpen(false)
      return
    }
    setOpen(true)
    if (!def && !loading) {
      setLoading(true)
      lookupWord(word, lang)
        .then((d) => setDef(d))
        .catch(() => setDef({ lemma: word, article: null, gloss: 'lookup failed', cefr_level: null, example_de: null, example_en: null, error: 'lookup_failed' }))
        .finally(() => setLoading(false))
    }
  }

  // Close popover on outside click (for tap mode)
  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (spanRef.current?.contains(target)) return
      if (popoverRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [open])

  // Position the popover and keep it tracking on scroll/resize.
  useLayoutEffect(() => {
    if (!open) return

    let rafId: number | null = null
    const recompute = () => {
      rafId = null
      const anchor = spanRef.current
      const bubble = popoverRef.current
      if (!anchor || !bubble) return

      const aRect = anchor.getBoundingClientRect()
      const bRect = bubble.getBoundingClientRect()
      const vw = document.documentElement.clientWidth
      const vh = document.documentElement.clientHeight

      // Close if anchor is fully off-screen vertically
      if (aRect.bottom < 0 || aRect.top > vh) {
        setOpen(false)
        return
      }

      const wordCenterX = aRect.left + aRect.width / 2
      const desiredLeft = wordCenterX - bRect.width / 2
      const left = Math.max(
        VIEWPORT_MARGIN,
        Math.min(desiredLeft, vw - bRect.width - VIEWPORT_MARGIN),
      )

      const spaceAbove = aRect.top
      const spaceBelow = vh - aRect.bottom
      const needed = bRect.height + BUBBLE_GAP + VIEWPORT_MARGIN
      const placement: 'above' | 'below' =
        spaceAbove >= needed || spaceAbove >= spaceBelow ? 'above' : 'below'
      const top =
        placement === 'above'
          ? aRect.top - bRect.height - BUBBLE_GAP
          : aRect.bottom + BUBBLE_GAP

      const arrowLeft = Math.max(
        ARROW_EDGE_PADDING,
        Math.min(wordCenterX - left, bRect.width - ARROW_EDGE_PADDING),
      ) - ARROW_HALF_WIDTH

      setPos({ left, top, arrowLeft, placement })
    }

    const schedule = () => {
      if (rafId != null) return
      rafId = window.requestAnimationFrame(recompute)
    }

    recompute()

    window.addEventListener('scroll', schedule, { passive: true, capture: true })
    window.addEventListener('resize', schedule)
    const vv = window.visualViewport
    vv?.addEventListener('scroll', schedule)
    vv?.addEventListener('resize', schedule)

    let ro: ResizeObserver | null = null
    if (popoverRef.current && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(schedule)
      ro.observe(popoverRef.current)
    }

    return () => {
      if (rafId != null) window.cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', schedule, { capture: true } as any)
      window.removeEventListener('resize', schedule)
      vv?.removeEventListener('scroll', schedule)
      vv?.removeEventListener('resize', schedule)
      ro?.disconnect()
    }
  }, [open, def, loading])

  return (
    <span
      ref={spanRef}
      className="word-token"
      onMouseEnter={beginHover}
      onMouseLeave={endHover}
      onClick={toggleTap}
      role="button"
      tabIndex={0}
    >
      {word}
      {open && createPortal(
        <span
          ref={popoverRef}
          className={`word-popover word-popover-${pos?.placement ?? 'above'}`}
          style={{
            position: 'fixed',
            left: pos?.left ?? -9999,
            top: pos?.top ?? -9999,
            ['--arrow-left' as any]: `${pos?.arrowLeft ?? 0}px`,
          }}
          onMouseEnter={() => {
            if (leaveTimerRef.current) { window.clearTimeout(leaveTimerRef.current); leaveTimerRef.current = null }
          }}
          onMouseLeave={endHover}
        >
          {loading && <span className="word-popover-loading">Looking up…</span>}
          {!loading && def && (
            <>
              <div className="word-popover-header">
                <span className="word-popover-lemma">
                  {def.article ? `${def.article} ` : ''}
                  <strong>{def.lemma}</strong>
                </span>
                {def.cefr_level && (
                  <span className={`word-popover-cefr cefr-${def.cefr_level.toLowerCase()}`}>
                    {def.cefr_level}
                  </span>
                )}
              </div>
              <div className="word-popover-gloss">{def.gloss}</div>
              {def.example_de && (
                <div className="word-popover-example">
                  <div className="example-de">{def.example_de}</div>
                  {def.example_en && <div className="example-en">{def.example_en}</div>}
                </div>
              )}
            </>
          )}
        </span>,
        document.body,
      )}
    </span>
  )
}
