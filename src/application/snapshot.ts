/** 【应用·存档】快照校验与旧版→v5 迁移；库存和拼装配方独立持久化。 */
import { normalizeSettings } from '../domain/settings'
import { createInitialTimer, getDurationMs, type TimerState } from '../domain/timer'
import type { AppData, AppPhase, BuiltMecha, Composition, DraftComposition, WorkbenchDraft } from '../domain/types'
import { clampInteger, clampNumber, isAppPhase, isFiniteNumber, isRecord, isTimerStatus } from '../domain/validation'
import type { AppDependencies } from './ports'
import { archiveCompletedBuild } from './archiveBuild'
import { createWorkbench, getPartDefinitions, getPartIdKey, getPartIdSlot, PART_SLOTS } from '../domain/inventory'

export const APP_STORAGE_KEY = 'gundamdoro-app-state'
export const APP_STORAGE_VERSION = 5

export function createSnapshotCodec(dependencies: AppDependencies) {
  const durationMs = (minutes: number) => getDurationMs(minutes, dependencies.runtime.millisecondsPerMinute())
  const createIdleTimer = createInitialTimer

  function normalizeParts(value: unknown): DraftComposition {
    if (!isRecord(value)) return {}
    const parts: DraftComposition = {}
    for (const slot of PART_SLOTS) {
      const id = value[slot]
      if (getPartIdSlot(id) === slot) parts[slot] = id as string
    }
    return parts
  }

  function normalizeInventory(value: unknown): string[] {
    if (!Array.isArray(value)) return []
    return [...new Set(value.filter((id): id is string => getPartIdKey(id) !== null))]
  }

  function normalizeWorkbench(value: unknown): WorkbenchDraft {
    if (!isRecord(value)) return createWorkbench()
    return {
      id: typeof value.id === 'string' && value.id.trim() ? value.id : null,
      name: typeof value.name === 'string' ? Array.from(value.name).slice(0, 40).join('') : '自定义机体',
      parts: normalizeParts(value.parts),
    }
  }

  function normalizeHangar(value: unknown): BuiltMecha[] {
    if (!Array.isArray(value)) return []
    const seen = new Set<string>()
    const entries: BuiltMecha[] = []
    for (const item of value) {
      if (!isRecord(item)
        || typeof item.id !== 'string' || !item.id.trim()
        || typeof item.mechaId !== 'string' || !item.mechaId.trim()
        || seen.has(item.id)) continue

      const customParts = item.kind === 'custom' ? normalizeParts(item.composition) : null
      if (customParts && !PART_SLOTS.every((slot) => customParts[slot])) continue
      seen.add(item.id)
      entries.push({
        id: item.id,
        mechaId: item.mechaId,
        mechaName: typeof item.mechaName === 'string' && item.mechaName.trim()
          ? item.mechaName : dependencies.catalog.find(item.mechaId)?.name ?? item.mechaId,
        completedAt: isFiniteNumber(item.completedAt) && item.completedAt >= 0 && item.completedAt <= 8_640_000_000_000_000
          ? item.completedAt : null,
        completedFocusSessions: clampInteger(item.completedFocusSessions, 0, 0, Number.MAX_SAFE_INTEGER),
        totalFocusedMinutes: clampNumber(item.totalFocusedMinutes, 0, 0),
        ...(customParts ? { kind: 'custom' as const, composition: customParts as Composition } : {}),
      })
    }
    return entries
  }

  function normalizeTimer(value: unknown, fallbackDurationMs: number, phase: AppPhase): TimerState {
    if (!isRecord(value)) {
      return createIdleTimer(fallbackDurationMs)
    }

    const status = isTimerStatus(value.status) ? value.status : 'idle'
    const durationMs = clampNumber(value.durationMs, fallbackDurationMs, 1)
    const remainingMs = Math.min(
      durationMs,
      clampNumber(value.remainingMs, durationMs, 0),
    )
    const startedAt = isFiniteNumber(value.startedAt) ? value.startedAt : null
    const endAt = isFiniteNumber(value.endAt) ? value.endAt : null
    const sessionId = typeof value.sessionId === 'string' && value.sessionId.length > 0
      ? value.sessionId
      : null

    if (phase === 'FOCUS' && status !== 'idle' && sessionId === null) {
      return createIdleTimer(fallbackDurationMs)
    }

    if (phase !== 'FOCUS' && phase !== 'BREAK') {
      return createIdleTimer(fallbackDurationMs)
    }

    if (status === 'idle') {
      return createIdleTimer(durationMs)
    }

    if (status === 'paused') {
      return {
        status,
        durationMs,
        remainingMs,
        startedAt,
        endAt: null,
        sessionId: phase === 'FOCUS' ? sessionId : null,
      }
    }

    if (endAt === null) {
      return createIdleTimer(fallbackDurationMs)
    }

    return {
      status,
      durationMs,
      remainingMs,
      startedAt,
      endAt,
      sessionId: phase === 'FOCUS' ? sessionId : null,
    }
  }

  function normalizeData(value: unknown, migrateInventory = false, migratePartCount = false): AppData {
    const source = isRecord(value) ? value : {}
    const rawSettings = isRecord(source.settings) ? source.settings : {}
    const settings = normalizeSettings(rawSettings)
    let phase = isAppPhase(source.phase) ? source.phase : 'READY'
    const rawAssembly = isRecord(source.assembly) ? source.assembly : {}
    const mechaId = typeof rawAssembly.mechaId === 'string' && rawAssembly.mechaId.trim()
      ? rawAssembly.mechaId : dependencies.catalog.defaultMecha.id
    const mecha = dependencies.catalog.find(mechaId)
    if (!mecha) throw new Error(`The saved model is unavailable: ${mechaId}`)
    const totalStages = mecha.totalStages
    const assembly = {
      mechaId: mecha.id,
      currentStage: clampInteger(rawAssembly.currentStage, 0, 0, totalStages),
      totalStages,
      completedFocusSessions: clampInteger(rawAssembly.completedFocusSessions, 0, 0, Number.MAX_SAFE_INTEGER),
    }
    const formerTotal = rawAssembly.totalStages
    if (migratePartCount && typeof formerTotal === 'number' && Number.isInteger(formerTotal)
      && formerTotal > 0 && formerTotal < totalStages && assembly.currentStage >= formerTotal) {
      if (phase === 'ASSEMBLY' || phase === 'COMPLETE') assembly.currentStage = totalStages
      else if (phase === 'FOCUS' || phase === 'BREAK') phase = 'READY'
    }
    if ((phase === 'ASSEMBLY' || phase === 'COMPLETE') && assembly.currentStage < totalStages) {
      phase = 'READY'
    }
    if (phase === 'PART_REWARD' && assembly.currentStage === 0) {
      phase = 'READY'
    }
    if ((phase === 'FOCUS' || phase === 'BREAK') && assembly.currentStage >= totalStages) {
      phase = 'READY'
    }
    const totalFocusedMinutes = clampNumber(source.totalFocusedMinutes, 0, 0)
    const lastProcessedFocusSessionId = typeof source.lastProcessedFocusSessionId === 'string'
      ? source.lastProcessedFocusSessionId
      : null
    const focusDurationMs = durationMs(settings.focusMinutes)
    const breakDurationMs = durationMs(settings.breakMinutes)
    const timer = normalizeTimer(
      source.timer,
      phase === 'BREAK' ? breakDurationMs : focusDurationMs,
      phase,
    )

    const data: AppData = {
      phase,
      timer,
      assembly,
      totalFocusedMinutes,
      settings,
      lastProcessedFocusSessionId,
      hangar: normalizeHangar(source.hangar),
      currentBuildId: (phase === 'ASSEMBLY' || phase === 'COMPLETE')
        && typeof source.currentBuildId === 'string' && source.currentBuildId.trim()
        ? source.currentBuildId : null,
      unlockedParts: normalizeInventory(source.unlockedParts),
      workbench: normalizeWorkbench(source.workbench),
    }

    if (migrateInventory) {
      const definitions = getPartDefinitions(dependencies.catalog)
      const earned = definitions.filter((part) => (part.mechaId === assembly.mechaId && part.stage <= assembly.currentStage)
        || data.hangar.some((entry) => entry.kind !== 'custom' && entry.mechaId === part.mechaId)).map((part) => part.id)
      data.unlockedParts = [...new Set([...data.unlockedParts, ...earned])]
    }

    if (phase === 'ASSEMBLY' && data.currentBuildId === null) {
      data.currentBuildId = dependencies.runtime.newId()
    }

    if ((phase === 'FOCUS' || phase === 'BREAK') && timer.status === 'idle') {
      return {
        ...data,
        phase: 'READY',
        timer: createIdleTimer(focusDurationMs),
      }
    }

    return phase === 'COMPLETE' ? archiveCompletedBuild(data, null, dependencies) : data
  }

  function migrateLegacyData(value: unknown, version: number): AppData {
    if (version > APP_STORAGE_VERSION) throw new Error('The saved state requires a newer app version')
    const source = isRecord(value) ? value : {}
    return normalizeData({ ...source, phase: version === 0 && source.phase === 'ASSEMBLY' ? 'PART_REWARD' : source.phase }, version < 5, version < 5)
  }

  function encode(state: AppData): AppData {
    return {
      phase: state.phase, timer: state.timer, assembly: state.assembly,
      totalFocusedMinutes: state.totalFocusedMinutes, settings: state.settings,
      lastProcessedFocusSessionId: state.lastProcessedFocusSessionId,
      hangar: state.hangar, currentBuildId: state.currentBuildId,
      unlockedParts: state.unlockedParts, workbench: state.workbench,
    }
  }

  return { decode: normalizeData, migrate: migrateLegacyData, encode }
}
