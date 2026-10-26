/** 【领域·计时】时间戳计时纯函数。不碰 React/localStorage；真正“现在几点”由外面传入。 */
export type TimerStatus = 'idle' | 'running' | 'paused'

export interface TimerState {
  status: TimerStatus
  durationMs: number
  remainingMs: number
  startedAt: number | null
  endAt: number | null
  sessionId: string | null
}

export const DEFAULT_FOCUS_DURATION_MS = 25 * 60 * 1000

export function getDurationMs(minutes: number, millisecondsPerMinute = 60_000): number {
  return minutes * millisecondsPerMinute
}

export function createInitialTimer(durationMs = DEFAULT_FOCUS_DURATION_MS): TimerState {
  return {
    status: 'idle',
    durationMs,
    remainingMs: durationMs,
    startedAt: null,
    endAt: null,
    sessionId: null,
  }
}

export function createRunningTimer(
  durationMs: number,
  now: number,
  sessionId: string | null,
): TimerState {
  return {
    status: 'running',
    durationMs,
    remainingMs: durationMs,
    startedAt: now,
    endAt: now + durationMs,
    sessionId,
  }
}

export function getRemainingMs(timer: TimerState, now: number): number {
  if (timer.status !== 'running' || timer.endAt === null) return Math.max(0, timer.remainingMs)
  return Math.max(0, timer.endAt - now)
}

export function formatTime(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000))
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`
}
