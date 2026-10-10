/** 【兼容层】给 UI 的快捷入口；真正逻辑在 domain/timer，时长换算走注入的 runtime。 */
import { getDurationMs as calculateDurationMs, getRemainingMs as calculateRemainingMs, type TimerState } from '../domain/timer'
import { appDependencies } from '../app/dependencies'

export { createInitialTimer, DEFAULT_FOCUS_DURATION_MS, formatTime } from '../domain/timer'
export type { TimerState, TimerStatus } from '../domain/timer'

export function getDurationMs(minutes: number): number {
  return calculateDurationMs(minutes, appDependencies.runtime.millisecondsPerMinute())
}

export function getRemainingMs(timer: TimerState, now = appDependencies.runtime.now()): number {
  return calculateRemainingMs(timer, now)
}
