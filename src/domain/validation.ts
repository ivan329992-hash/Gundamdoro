/** 【领域·校验】读档时用的类型守卫和数值钳位，避免坏 JSON 弄崩应用。 */
import type { AppPhase } from './types'
import type { TimerStatus } from './timer'

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function clampInteger(value: unknown, fallback: number, min: number, max: number): number {
  if (!isFiniteNumber(value)) {
    return fallback
  }

  return Math.min(max, Math.max(min, Math.round(value)))
}

export function clampNumber(value: unknown, fallback: number, min: number): number {
  if (!isFiniteNumber(value)) {
    return fallback
  }

  return Math.max(min, value)
}

export function isAppPhase(value: unknown): value is AppPhase {
  return value === 'READY'
    || value === 'FOCUS'
    || value === 'PART_REWARD'
    || value === 'ASSEMBLY'
    || value === 'BREAK'
    || value === 'COMPLETE'
}

export function isTimerStatus(value: unknown): value is TimerStatus {
  return value === 'idle' || value === 'running' || value === 'paused'
}
