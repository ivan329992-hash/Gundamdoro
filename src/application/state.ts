/** 【应用·默认态】构造一份干净的初始 AppData（新用户/重置用）。 */
import { createCollection } from '../domain/collection'
import { DEFAULT_SETTINGS } from '../domain/settings'
import { createInitialTimer, getDurationMs } from '../domain/timer'
import type { AppData } from '../domain/types'
import type { AppDependencies } from './ports'
import { createWorkbench } from '../domain/inventory'

export function createDefaultData(dependencies: AppDependencies): AppData {
  return {
    phase: 'READY',
    timer: createInitialTimer(
      getDurationMs(DEFAULT_SETTINGS.focusMinutes, dependencies.runtime.millisecondsPerMinute()),
    ),
    assembly: createCollection(dependencies.catalog.defaultMecha),
    totalFocusedMinutes: 0,
    settings: { ...DEFAULT_SETTINGS },
    lastProcessedFocusSessionId: null,
    hangar: [],
    currentBuildId: null,
    unlockedParts: [],
    workbench: createWorkbench(),
  }
}
