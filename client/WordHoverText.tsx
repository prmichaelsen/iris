import { useState, useRef, useEffect } from 'react'

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

function WordToken({ word, lang }: { word: string; lang: string }) {
  const [open, setOpen] = useState(false)
  const [def, setDef] = useState<WordDefinition | null>(null)
  const [loading, setLoading] = useState(false)
  const spanRef = useRef<HTMLSpanElement>(null)
  const hoverTimerRef = useRef<number | null>(null)
  const leaveTimerRef = useRef<number | null>(null)

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
      if (spanRef.current && !spanRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [open])

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
      {open && (
        <span className="word-popover" onMouseEnter={() => {
          if (leaveTimerRef.current) { window.clearTimeout(leaveTimerRef.current); leaveTimerRef.current = null }
        }} onMouseLeave={endHover}>
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
        </span>
      )}
    </span>
  )
}
