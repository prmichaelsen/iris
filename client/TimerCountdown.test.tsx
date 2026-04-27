// @vitest-environment jsdom
/**
 * UI tests for TimerCountdown.
 *
 * Requires devDependencies:
 *   - @testing-library/react
 *   - jsdom
 *
 * Install with:  npm i -D @testing-library/react jsdom
 *
 * vitest.config.ts auto-excludes this file when those deps are not installed,
 * so `npm test` runs the logic suites cleanly until the UI deps are added.
 *
 * This file is placed alongside the component (client/TimerCountdown.tsx)
 * because the project does not (yet) have a client/src/components/ directory.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act, cleanup } from '@testing-library/react'
import TimerCountdown from './TimerCountdown'

// Deterministic rAF backed by fake timers.
function installRafShim() {
  let id = 0
  ;(globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
    id++
    setTimeout(() => cb(performance.now()), 16)
    return id
  }
  ;(globalThis as any).cancelAnimationFrame = (handle: number) => {
    clearTimeout(handle as unknown as NodeJS.Timeout)
  }
}

describe('TimerCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    installRafShim()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('renders countdown starting at the full duration (5s → "5")', () => {
    const { container } = render(
      <TimerCountdown duration={5000} onTimeout={() => {}} active={true} />,
    )
    const text = container.querySelector('.timer-text')
    expect(text).not.toBeNull()
    expect(text!.textContent).toBe('5')
  })

  it('is hidden when disabled (active=false)', () => {
    const { container } = render(
      <TimerCountdown duration={5000} onTimeout={() => {}} active={false} />,
    )
    expect(container.querySelector('.timer-countdown')).toBeNull()
  })

  it('enters urgent state (red pulse) under 2 seconds', () => {
    vi.setSystemTime(0)
    const { container } = render(
      <TimerCountdown duration={5000} onTimeout={() => {}} active={true} />,
    )

    // 3.5s elapsed → 1.5s remaining → seconds=2 → urgent (seconds<=2)
    act(() => {
      vi.setSystemTime(3500)
      vi.advanceTimersByTime(3500)
    })
    let el = container.querySelector('.timer-countdown')!
    expect(el.classList.contains('timer-urgent')).toBe(true)

    // 4.5s elapsed → 0.5s remaining → seconds=1 → still urgent
    act(() => {
      vi.setSystemTime(4500)
      vi.advanceTimersByTime(1000)
    })
    el = container.querySelector('.timer-countdown')!
    expect(el.classList.contains('timer-urgent')).toBe(true)
  })

  it('shows non-urgent (timer-normal) early in the countdown', () => {
    vi.setSystemTime(0)
    const { container } = render(
      <TimerCountdown duration={5000} onTimeout={() => {}} active={true} />,
    )
    const el = container.querySelector('.timer-countdown')!
    expect(el.classList.contains('timer-normal')).toBe(true)
    expect(el.classList.contains('timer-urgent')).toBe(false)
  })

  it('calls onTimeout when it reaches 0', () => {
    const onTimeout = vi.fn()
    vi.setSystemTime(0)
    render(<TimerCountdown duration={2000} onTimeout={onTimeout} active={true} />)

    act(() => {
      vi.setSystemTime(2100)
      vi.advanceTimersByTime(2100)
    })

    expect(onTimeout).toHaveBeenCalledTimes(1)
  })

  it('does NOT call onTimeout before duration elapses (edge: 4.9s grace)', () => {
    const onTimeout = vi.fn()
    vi.setSystemTime(0)
    render(<TimerCountdown duration={5000} onTimeout={onTimeout} active={true} />)

    act(() => {
      vi.setSystemTime(4900)
      vi.advanceTimersByTime(4900)
    })

    expect(onTimeout).not.toHaveBeenCalled()
  })
})
