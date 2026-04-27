import { useState } from 'react'
import type {
  FillBlankWidget,
  FillBlankAnswer,
  FillBlankCardResult,
} from '../../shared/types/widgets'

interface ActiveProps {
  widget: FillBlankWidget
  onSubmit: (answers: FillBlankAnswer[]) => void
}

export function FillBlankActive({ widget, onSubmit }: ActiveProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Map<string, string>>(new Map())
  const [currentInput, setCurrentInput] = useState('')

  const card = widget.cards[currentIndex]
  const isLast = currentIndex === widget.cards.length - 1
  const hasAnswer = answers.has(card?.card_id)

  const handleSubmit = () => {
    if (!card || currentInput.trim() === '' && !hasAnswer) return

    const next = new Map(answers)
    next.set(card.card_id, currentInput.trim())
    setAnswers(next)

    if (isLast) {
      // Submit all answers
      setTimeout(() => {
        onSubmit(
          widget.cards.map((c) => ({
            card_id: c.card_id,
            typed_answer: next.get(c.card_id) ?? '',
          })),
        )
      }, 100)
    } else {
      // Move to next card
      setCurrentInput('')
      setTimeout(() => setCurrentIndex((i) => i + 1), 100)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  if (!card) return null

  // Highlight the blank (___) in the sentence
  const parts = card.sentence.split('___')

  return (
    <div className="fb-widget">
      <div className="fb-progress">{currentIndex + 1} / {widget.cards.length}</div>
      <div className="fb-sentence">
        {parts[0]}
        <span className="fb-blank">___</span>
        {parts[1]}
      </div>
      {card.hint && <div className="fb-hint">{card.hint}</div>}
      <div className="fb-input-row">
        <input
          type="text"
          className="fb-input"
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type the missing word..."
          autoFocus
        />
        <button
          className="fb-submit"
          onClick={handleSubmit}
          disabled={currentInput.trim() === '' && !hasAnswer}
        >
          {isLast ? 'Submit' : 'Next'}
        </button>
      </div>
    </div>
  )
}

interface ResultProps {
  widget: FillBlankWidget
  cards: FillBlankCardResult[]
  score: number
  total: number
  onRetake?: () => void
}

export function FillBlankResult({ widget, cards, score, total, onRetake }: ResultProps) {
  return (
    <div className="fb-widget fb-result">
      <div className="fb-score">
        {score} / {total}
        <span className="fb-score-label">correct</span>
      </div>
      <div className="fb-result-cards">
        {cards.map((card) => (
          <div key={card.card_id} className={`fb-result-card ${card.correct ? 'fb-correct' : 'fb-incorrect'}`}>
            <span className="fb-result-mark">{card.correct ? '✓' : '✗'}</span>
            <div className="fb-result-content">
              <div className="fb-result-sentence">{card.sentence}</div>
              {!card.correct && (
                <div className="fb-result-correction">
                  <span className="fb-result-user-answer">{card.typed_answer || '(empty)'}</span>
                  <span className="fb-result-arrow">→</span>
                  <span className="fb-result-expected">{card.expected}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {onRetake && (
        <button className="fb-retake" onClick={onRetake}>retake</button>
      )}
    </div>
  )
}
