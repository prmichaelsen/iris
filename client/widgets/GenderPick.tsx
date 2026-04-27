import { useState } from 'react'
import type {
  GenderPickWidget,
  GenderPickAnswer,
  GenderPickCardResult,
} from '../../shared/types/widgets'

interface ActiveProps {
  widget: GenderPickWidget
  onSubmit: (answers: GenderPickAnswer[]) => void
}

export function GenderPickActive({ widget, onSubmit }: ActiveProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Map<string, 'der' | 'die' | 'das'>>(new Map())

  const card = widget.cards[currentIndex]
  const isLast = currentIndex === widget.cards.length - 1
  const selected = answers.get(card?.card_id)

  const selectArticle = (article: 'der' | 'die' | 'das') => {
    if (selected !== undefined) return
    const next = new Map(answers)
    next.set(card.card_id, article)
    setAnswers(next)

    if (isLast) {
      setTimeout(() => {
        onSubmit(
          widget.cards.map((c) => ({
            card_id: c.card_id,
            selected_article: next.get(c.card_id) || 'der',
          })),
        )
      }, 400)
    } else {
      setTimeout(() => setCurrentIndex((i) => i + 1), 400)
    }
  }

  if (!card) return null

  return (
    <div className="gp-widget">
      <div className="gp-progress">{currentIndex + 1} / {widget.cards.length}</div>
      <div className="gp-noun">{card.noun}</div>
      <div className="gp-options">
        {(['der', 'die', 'das'] as const).map((article) => (
          <button
            key={article}
            className={`gp-option ${selected === article ? 'gp-option-selected' : ''}`}
            onClick={() => selectArticle(article)}
            disabled={selected !== undefined}
          >
            {article}
          </button>
        ))}
      </div>
    </div>
  )
}

interface ResultProps {
  widget: GenderPickWidget
  cards: GenderPickCardResult[]
  score: number
  total: number
  onRetake?: () => void
}

export function GenderPickResult({ widget, cards, score, total, onRetake }: ResultProps) {
  return (
    <div className="gp-widget gp-result">
      <div className="gp-score">
        {score} / {total}
        <span className="gp-score-label">correct</span>
      </div>
      <div className="gp-result-cards">
        {cards.map((card) => (
          <div key={card.card_id} className={`gp-result-card ${card.correct ? 'gp-correct' : 'gp-incorrect'}`}>
            <span className="gp-result-mark">{card.correct ? '✓' : '✗'}</span>
            <span className="gp-result-noun">{card.noun}</span>
            <span className="gp-result-answer">
              {card.correct
                ? card.correct_article
                : `${card.selected_article} → ${card.correct_article}`
              }
            </span>
          </div>
        ))}
      </div>
      {onRetake && (
        <button className="gp-retake" onClick={onRetake}>retake</button>
      )}
    </div>
  )
}
