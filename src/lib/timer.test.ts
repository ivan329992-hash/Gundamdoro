import { describe, expect, it } from 'vitest'
import {
  createInitialTimer,
  formatTime,
  getRemainingMs,
} from './timer'

describe('timer utilities', () => {
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
})
