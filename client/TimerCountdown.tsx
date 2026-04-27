import { useEffect, useState, useRef } from 'react'

interface TimerCountdownProps {
  /** Duration in milliseconds */
  duration: number
  /** Called when timer expires */
  onTimeout: () => void
  /** Whether the timer is active */
  active: boolean
  /** Optional CSS class */
  className?: string
}

/**
 * Circular countdown timer for Karl's time pressure mechanic
 * Shows a countdown from N seconds to 0, then calls onTimeout
 */
export default function TimerCountdown({ duration, onTimeout, active, className = '' }: TimerCountdownProps) {
  const [remaining, setRemaining] = useState(duration)
  const [isVisible, setIsVisible] = useState(false)
  const startTimeRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active) {
      // Timer not active — hide and reset
      setIsVisible(false)
      setRemaining(duration)
      startTimeRef.current = null
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }

    // Timer activated
    setIsVisible(true)
    startTimeRef.current = Date.now()
    setRemaining(duration)

    const tick = () => {
      if (!startTimeRef.current) return

      const elapsed = Date.now() - startTimeRef.current
      const left = Math.max(0, duration - elapsed)
      setRemaining(left)

      if (left === 0) {
        // Timer expired
        onTimeout()
        rafRef.current = null
      } else {
        // Continue ticking
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [active, duration, onTimeout])

  if (!isVisible) return null

  const seconds = Math.ceil(remaining / 1000)
  const progress = remaining / duration // 0 to 1

  // Red when under 2 seconds
  const isUrgent = seconds <= 2
  const colorClass = isUrgent ? 'timer-urgent' : 'timer-normal'

  return (
    <div className={`timer-countdown ${colorClass} ${className}`}>
      <svg className="timer-svg" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          className="timer-bg"
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="6"
        />
        {/* Progress arc */}
        <circle
          className="timer-progress"
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeDasharray={`${2 * Math.PI * 45}`}
          strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress)}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="timer-text">{seconds}</div>
    </div>
  )
}
