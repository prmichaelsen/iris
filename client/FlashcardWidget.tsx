import { useState } from 'react'
import type {
  FlashcardMatchingWidget,
  FlashcardMatchingAnswer,
  FlashcardMatchingCardResult,
} from '../shared/types/widgets'

interface ActiveProps {
  widget: FlashcardMatchingWidget
  onSubmit: (answers: FlashcardMatchingAnswer[]) => void
}

export function FlashcardActive({ widget, onSubmit }: ActiveProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Map<string, number>>(new Map())

  const card = widget.cards[currentIndex]
  const isLast = currentIndex === widget.cards.length - 1
  const selected = answers.get(card?.card_id)

  const selectOption = (optionIndex: number) => {
    if (selected !== undefined) return
    const next = new Map(answers)
    next.set(card.card_id, optionIndex)
    setAnswers(next)

    if (isLast) {
      // Auto-submit after brief delay so user sees their pick
      setTimeout(() => {
        onSubmit(
          widget.cards.map((c) => ({
            card_id: c.card_id,
            selected_index: next.get(c.card_id) ?? -1,
          })),
        )
      }, 400)
    } else {
      setTimeout(() => setCurrentIndex((i) => i + 1), 400)
    }
  }

  if (!card) return null

  return (
    <div className="fc-widget">
      <div className="fc-progress">{currentIndex + 1} / {widget.cards.length}</div>
      <div className="fc-word">{card.word}</div>
      <div className="fc-options">
        {card.options.map((opt, i) => (
          <button
            key={i}
            className={`fc-option ${selected === i ? 'fc-option-selected' : ''}`}
            onClick={() => selectOption(i)}
            disabled={selected !== undefined}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

interface ResultProps {
  widget: FlashcardMatchingWidget
  cards: FlashcardMatchingCardResult[]
  score: number
  total: number
  onRetake?: () => void
}

export function FlashcardResult({ widget, cards, score, total, onRetake }: ResultProps) {
  return (
    <div className="fc-widget fc-result">
      <div className="fc-score">
        {score} / {total}
        <span className="fc-score-label">correct</span>
      </div>
      <div className="fc-result-cards">
        {cards.map((card) => (
          <div key={card.card_id} className={`fc-result-card ${card.correct ? 'fc-correct' : 'fc-incorrect'}`}>
            <span className="fc-result-mark">{card.correct ? '✓' : '✗'}</span>
            <span className="fc-result-word">{card.word}</span>
            <span className="fc-result-answer">
              {card.correct
                ? card.correct_answer
                : `${widget.cards.find((c) => c.card_id === card.card_id)?.options[card.selected_index] ?? '?'} → ${card.correct_answer}`
              }
            </span>
          </div>
        ))}
      </div>
      {onRetake && (
        <button className="fc-retake" onClick={onRetake}>retake</button>
      )}
    </div>
  )
}
