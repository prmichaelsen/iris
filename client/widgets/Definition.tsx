import { useState } from 'react'
import type {
  DefinitionWidget,
  DefinitionAnswer,
  DefinitionCardResult,
} from '../../shared/types/widgets'

interface ActiveProps {
  widget: DefinitionWidget
  onSubmit: (answers: DefinitionAnswer[]) => void
}

export function DefinitionActive({ widget, onSubmit }: ActiveProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Map<string, string>>(new Map())
  const [currentInput, setCurrentInput] = useState('')

  const card = widget.cards[currentIndex]
  const isLast = currentIndex === widget.cards.length - 1
  const hasAnswer = answers.has(card?.card_id)

  const handleSubmit = () => {
    if (!card || currentInput.trim() === '') return

    const next = new Map(answers)
    next.set(card.card_id, currentInput.trim())
    setAnswers(next)
    setCurrentInput('')

    if (isLast) {
      // Submit all answers
      setTimeout(() => {
        onSubmit(
          widget.cards.map((c) => ({
            card_id: c.card_id,
            answer: next.get(c.card_id) ?? '',
          })),
        )
      }, 200)
    } else {
      // Move to next card
      setTimeout(() => setCurrentIndex((i) => i + 1), 200)
    }
  }

  if (!card) return null

  return (
    <div className="def-widget">
      <div className="def-progress">{currentIndex + 1} / {widget.cards.length}</div>
      <div className="def-word">{card.word}</div>
      {card.audio_url && (
        <audio src={card.audio_url} autoPlay controls className="def-audio" />
      )}
      <div className="def-input-area">
        <input
          type="text"
          className="def-input"
          placeholder="Type the English meaning..."
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleSubmit()
            }
          }}
          disabled={hasAnswer}
          autoFocus
        />
        <button
          className="def-submit"
          onClick={handleSubmit}
          disabled={currentInput.trim() === '' || hasAnswer}
        >
          {isLast ? 'Submit' : 'Next'}
        </button>
      </div>
    </div>
  )
}

interface ResultProps {
  widget: DefinitionWidget
  cards: DefinitionCardResult[]
  score: number
  total: number
  onRetake?: () => void
}

export function DefinitionResult({ widget, cards, score, total, onRetake }: ResultProps) {
  return (
    <div className="def-widget def-result">
      <div className="def-score">
        {score} / {total}
        <span className="def-score-label">correct</span>
      </div>
      <div className="def-result-cards">
        {cards.map((card) => (
          <div key={card.card_id} className={`def-result-card ${card.correct ? 'def-correct' : 'def-incorrect'}`}>
            <div className="def-result-header">
              <span className="def-result-mark">{card.correct ? '✓' : '✗'}</span>
              <span className="def-result-word">{card.word}</span>
            </div>
            <div className="def-result-answers">
              <div className="def-result-row">
                <span className="def-result-label">You wrote:</span>
                <span className="def-result-value">{card.user_answer || '(no answer)'}</span>
              </div>
              <div className="def-result-row">
                <span className="def-result-label">Expected:</span>
                <span className="def-result-value">{card.expected_meaning}</span>
              </div>
            </div>
            {card.feedback && (
              <div className="def-result-feedback">{card.feedback}</div>
            )}
          </div>
        ))}
      </div>
      {onRetake && (
        <button className="def-retake" onClick={onRetake}>retake</button>
      )}
    </div>
  )
}
