import { useState } from 'react'
import type {
  FlashcardFreeformWidget,
  FlashcardFreeformResult,
} from '../../shared/types/widgets'

interface ActiveProps {
  widget: FlashcardFreeformWidget
  onSubmit: (answer: string) => void
}

export function FlashcardFreeformActive({ widget, onSubmit }: ActiveProps) {
  const [answer, setAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = () => {
    if (submitted) return
    setSubmitted(true)
    onSubmit(answer)
  }

  return (
    <div className="fcf-widget">
      <div className="fcf-word">{widget.word}</div>
      <div className="fcf-input-container">
        <input
          type="text"
          className="fcf-input"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSubmit()
            }
          }}
          placeholder="Type the English meaning..."
          disabled={submitted}
          autoFocus
        />
      </div>
      <button
        className="fcf-submit"
        onClick={handleSubmit}
        disabled={submitted || !answer.trim()}
      >
        {submitted ? 'Grading...' : 'Submit'}
      </button>
    </div>
  )
}

interface ResultProps {
  result: FlashcardFreeformResult
  onRetake?: () => void
}

export function FlashcardFreeformResult({ result, onRetake }: ResultProps) {
  return (
    <div className="fcf-widget fcf-result">
      <div className={`fcf-result-header ${result.correct ? 'fcf-correct' : 'fcf-incorrect'}`}>
        <span className="fcf-result-mark">{result.correct ? '✓' : '✗'}</span>
        <span className="fcf-result-word">{result.word}</span>
      </div>
      <div className="fcf-result-details">
        <div className="fcf-result-row">
          <span className="fcf-result-label">Your answer:</span>
          <span className="fcf-result-value">{result.user_answer || '(empty)'}</span>
        </div>
        {!result.correct && (
          <div className="fcf-result-row">
            <span className="fcf-result-label">Correct answer:</span>
            <span className="fcf-result-value">{result.correct_answer}</span>
          </div>
        )}
        {result.claude_explanation && (
          <div className="fcf-result-explanation">
            {result.claude_explanation}
          </div>
        )}
        {result.grading_method === 'fuzzy' && (
          <div className="fcf-result-explanation">
            Your answer is a synonym for "{result.correct_answer}"
          </div>
        )}
      </div>
      {onRetake && (
        <button className="fcf-retake" onClick={onRetake}>retake</button>
      )}
    </div>
  )
}
