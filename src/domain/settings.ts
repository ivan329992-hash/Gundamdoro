/** 【领域·设置】默认专注/休息时长，并钳位到 SPEC 允许范围。 */
import type { Settings } from './types'
import { clampInteger } from './validation'

export const DEFAULT_SETTINGS: Settings = { focusMinutes: 25, breakMinutes: 5 }

export function normalizeSettings(value: Partial<Settings>, fallback = DEFAULT_SETTINGS): Settings {
  return {
    ...fallback,
    focusMinutes: clampInteger(value.focusMinutes, fallback.focusMinutes, 1, 120),
    breakMinutes: clampInteger(value.breakMinutes, fallback.breakMinutes, 1, 60),
    ...Object.fromEntries((['soundEnabled', 'notificationsEnabled', 'miniTimerEnabled'] as const)
      .filter((key) => typeof value[key] === 'boolean').map((key) => [key, value[key]])),
  }
}
