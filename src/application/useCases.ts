/** 【应用·用例】状态机核心：startFocus/completeFocus/拼装/休息等。纯函数 (state)=>(state)。 */
import { canSelectMecha, collectNextPart, createCollection, isCollectionComplete } from '../domain/collection'
import { normalizeSettings } from '../domain/settings'
import { createInitialTimer, createRunningTimer, getDurationMs, getRemainingMs } from '../domain/timer'
import type { AppData, MechaManifest, Settings } from '../domain/types'
import type { AppDependencies } from './ports'
import { archiveCompletedBuild } from './archiveBuild'
import { getPartDefinitions, unlockPart } from '../domain/inventory'

export function createAppUseCases(dependencies: AppDependencies) {
  const { runtime, catalog } = dependencies
  const durationMs = (minutes: number) => getDurationMs(minutes, runtime.millisecondsPerMinute())
  const idleFocus = (state: AppData) => createInitialTimer(durationMs(state.settings.focusMinutes))

  function startFocus(state: AppData, now = runtime.now()): AppData {
    if (state.phase !== 'READY' || isCollectionComplete(state.assembly)) return state
    return { ...state, phase: 'FOCUS', timer: createRunningTimer(durationMs(state.settings.focusMinutes), now, runtime.newId()) }
  }

  function completeFocus(state: AppData, sessionId: string, now = runtime.now()): AppData {
    if (state.phase !== 'FOCUS' || state.timer.status !== 'running'
      || state.timer.sessionId !== sessionId || state.timer.endAt === null || state.timer.endAt > now
      || sessionId === state.lastProcessedFocusSessionId || isCollectionComplete(state.assembly)) return state
    const part = getPartDefinitions(catalog).find((part) => part.mechaId === state.assembly.mechaId && part.stage === state.assembly.currentStage + 1)
    return {
      ...state,
      phase: 'PART_REWARD',
      timer: createInitialTimer(state.timer.durationMs),
      assembly: collectNextPart(state.assembly),
      totalFocusedMinutes: state.totalFocusedMinutes + state.timer.durationMs / 60000,
      lastProcessedFocusSessionId: sessionId,
      unlockedParts: part ? unlockPart(state.unlockedParts, part.id) : state.unlockedParts,
    }
  }

  function pauseTimer(state: AppData, now = runtime.now()): AppData {
    if (state.phase !== 'FOCUS' || state.timer.status !== 'running' || state.timer.endAt === null) return state
    if (state.timer.endAt <= now && state.timer.sessionId) return completeFocus(state, state.timer.sessionId, now)
    return { ...state, timer: { ...state.timer, status: 'paused', remainingMs: getRemainingMs(state.timer, now), endAt: null } }
  }

  function resumeTimer(state: AppData, now = runtime.now()): AppData {
    if (state.phase !== 'FOCUS' || state.timer.status !== 'paused' || state.timer.remainingMs <= 0) return state
    return { ...state, timer: { ...state.timer, status: 'running', endAt: now + state.timer.remainingMs } }
  }

  function cancelTimer(state: AppData): AppData {
    return state.phase === 'FOCUS' ? { ...state, phase: 'READY', timer: idleFocus(state) } : state
  }

  function finishPartReveal(state: AppData, now = runtime.now()): AppData {
    if (state.phase !== 'PART_REWARD') return state
    return isCollectionComplete(state.assembly)
      ? { ...state, phase: 'READY', timer: idleFocus(state) }
      : { ...state, phase: 'BREAK', timer: createRunningTimer(durationMs(state.settings.breakMinutes), now, null) }
  }

  function startBreak(state: AppData, now = runtime.now()): AppData {
    return state.phase === 'PART_REWARD' && !isCollectionComplete(state.assembly) ? finishPartReveal(state, now) : state
  }

  function completeBreak(state: AppData, now = runtime.now()): AppData {
    if (state.phase !== 'BREAK' || state.timer.status !== 'running'
      || state.timer.endAt === null || state.timer.endAt > now) return state
    return { ...state, phase: 'READY', timer: idleFocus(state) }
  }

  function endBreak(state: AppData): AppData {
    return state.phase === 'BREAK' ? { ...state, phase: 'READY', timer: idleFocus(state) } : state
  }

  function startAssembly(state: AppData): AppData {
    if (state.phase !== 'READY' || state.assembly.currentStage !== state.assembly.totalStages) return state
    return { ...state, phase: 'ASSEMBLY', currentBuildId: runtime.newId(), timer: idleFocus(state) }
  }

  function finishAssemblyAnimation(state: AppData, now = runtime.now()): AppData {
    if (state.phase !== 'ASSEMBLY' || state.assembly.currentStage !== state.assembly.totalStages) return state
    return { ...archiveCompletedBuild(state, now, dependencies), phase: 'COMPLETE', timer: idleFocus(state) }
  }

  function beginBuild(state: AppData, mecha: MechaManifest): AppData {
    return {
      ...state,
      phase: 'READY',
      timer: idleFocus(state),
      assembly: createCollection(mecha),
      totalFocusedMinutes: 0,
      lastProcessedFocusSessionId: null,
      currentBuildId: null,
    }
  }

  function selectMecha(state: AppData, mechaId: string): AppData {
    if (!canSelectMecha(state)) return state
    const mecha = catalog.find(mechaId)
    if (!mecha || (state.phase === 'READY' && mechaId === state.assembly.mechaId)) return state
    return beginBuild(state, mecha)
  }

  function resetMecha(state: AppData): AppData {
    if (state.phase !== 'COMPLETE') return state
    const mecha = catalog.find(state.assembly.mechaId)
    return mecha ? beginBuild(state, mecha) : state
  }

  function updateSettings(state: AppData, value: Partial<Settings>): AppData {
    if (state.phase !== 'READY' && state.phase !== 'COMPLETE') return state
    const settings = normalizeSettings(value, state.settings)
    return { ...state, settings, timer: createInitialTimer(durationMs(settings.focusMinutes)) }
  }

  function syncTimer(state: AppData, now = runtime.now()): AppData {
    if ((state.phase !== 'FOCUS' && state.phase !== 'BREAK') || state.timer.status !== 'running' || state.timer.endAt === null) return state
    if (state.timer.endAt <= now) {
      if (state.phase === 'FOCUS' && state.timer.sessionId !== null) return completeFocus(state, state.timer.sessionId, now)
      if (state.phase === 'BREAK') return completeBreak(state, now)
    }
    return { ...state, timer: { ...state.timer, remainingMs: getRemainingMs(state.timer, now) } }
  }

  return {
    selectMecha, startFocus, completeFocus, pauseTimer, resumeTimer,
    cancelTimer, finishPartReveal, startBreak, completeBreak, endBreak, startAssembly,
    finishAssemblyAnimation, resetMecha, updateSettings, syncTimer, recoverState: syncTimer,
  }
}
