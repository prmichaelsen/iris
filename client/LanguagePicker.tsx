import { useEffect, useRef, useState } from 'react'
import { findLanguage, searchLanguages, type Language } from './languages'

interface Props {
  value: string  // 'auto' or ISO 639-3 code
  onChange: (next: string) => void
}

export default function LanguagePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const lang = value === 'auto' ? null : findLanguage(value)
  const display = lang ? `${lang.name} (${lang.english})` : 'pick a language…'

  const matches = searchLanguages(query, 12)
  // "Clear" entry available at the top so the user can deselect a target
  const items: Array<{ key: string; label: string; sub?: string; pick: () => void }> = [
    ...(value !== 'auto'
      ? [{
          key: 'auto',
          label: '— none —',
          sub: 'no target picked',
          pick: () => choose('auto'),
        }]
      : []),
    ...matches.map((l) => ({
      key: l.code,
      label: l.name,
      sub: l.english,
      pick: () => choose(l.code),
    })),
  ]

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close()
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const choose = (next: string) => {
    onChange(next)
    close()
  }

  const close = () => {
    setOpen(false)
    setQuery('')
    setHighlight(0)
  }

  const openIfClosed = () => {
    if (!open) {
      setOpen(true)
      setHighlight(0)
      // Defer focus to after the input mounts
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      items[highlight]?.pick()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    }
  }

  return (
    <div className="lang-picker" ref={containerRef}>
      <button
        type="button"
        className="lang-picker-button"
        onClick={openIfClosed}
        title="Pick language"
      >
        <span className="lang-picker-label">{display}</span>
        <span className="lang-picker-caret">▾</span>
      </button>
      {open && (
        <div className="lang-picker-open">
          <ul className="lang-picker-list" role="listbox">
            {items.map((item, i) => (
              <li
                key={item.key}
                role="option"
                aria-selected={i === highlight}
                className={`lang-picker-item ${i === highlight ? 'is-highlight' : ''}`}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => {
                  // mousedown so we fire before the input loses focus
                  e.preventDefault()
                  item.pick()
                }}
              >
                <span className="lang-picker-item-label">{item.label}</span>
                {item.sub && <span className="lang-picker-item-sub">{item.sub}</span>}
              </li>
            ))}
            {items.length === 0 && query && (
              <li className="lang-picker-empty">no matches</li>
            )}
          </ul>
          <input
            ref={inputRef}
            type="text"
            className="lang-picker-input"
            placeholder="search language…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setHighlight(0)
            }}
            onKeyDown={onKeyDown}
            autoComplete="off"
          />
        </div>
      )}
    </div>
  )
}
