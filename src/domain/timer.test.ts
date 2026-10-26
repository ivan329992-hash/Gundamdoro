import { describe, expect, it } from 'vitest'
import {
  createInitialTimer,
  createRunningTimer,
  formatTime,
  getDurationMs,
  getRemainingMs,
} from './timer'

describe('timer utilities', () => {
  it('converts minutes with an explicit runtime scale', () => {
    expect(getDurationMs(25)).toBe(1_500_000)
    expect(getDurationMs(25, 1000)).toBe(25_000)
  })

  it('creates idle and timestamp-based running timers without a platform clock', () => {
    expect(createInitialTimer()).toEqual({
      status: 'idle',
      durationMs: 1_500_000,
      remainingMs: 1_500_000,
      startedAt: null,
      endAt: null,
      sessionId: null,
    })
    expect(createRunningTimer(5000, 1000, 'focus-id')).toEqual({
      status: 'running',
      durationMs: 5000,
      remainingMs: 5000,
      startedAt: 1000,
      endAt: 6000,
      sessionId: 'focus-id',
    })
  })

  it('derives remaining time from endAt while running', () => {
    const timer = {
      ...createInitialTimer(5_000),
      status: 'running' as const,
      startedAt: 1_000,
      endAt: 6_000,
      sessionId: 'timer-session',
    }

    expect(getRemainingMs(timer, 2_000)).toBe(4_000)
    expect(getRemainingMs(timer, 7_000)).toBe(0)
  })

  it('formats countdown values as MM:SS', () => {
    expect(formatTime(0)).toBe('00:00')
    expect(formatTime(61_000)).toBe('01:01')
    expect(formatTime(1_500)).toBe('00:02')
  })

  it('keeps idle and paused remaining time independent of wall-clock changes', () => {
    expect(getRemainingMs(createInitialTimer(5000), 1_000_000)).toBe(5000)
    expect(
      getRemainingMs(
        { ...createInitialTimer(5000), status: 'paused', remainingMs: 2000 },
        1_000_000,
      ),
    ).toBe(2000)
    expect(getRemainingMs({ ...createInitialTimer(5000), remainingMs: -1 }, 1_000_000)).toBe(0)
  })
})
