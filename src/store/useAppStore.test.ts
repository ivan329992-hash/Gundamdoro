import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createJSONStorage } from 'zustand/middleware'
import { createInitialTimer } from '../lib/timer'
import { useAppStore } from './useAppStore'

const FOCUS_DURATION_MS = 60_000
const BREAK_DURATION_MS = 60_000
const { storageItems, memoryStorage } = vi.hoisted(() => {
  const storageItems = new Map<string, string>()
  const memoryStorage = {
    getItem: (key: string) => storageItems.get(key) ?? null,
    setItem: (key: string, value: string) => { storageItems.set(key, value) },
    removeItem: (key: string) => { storageItems.delete(key) },
  }
  vi.stubGlobal('localStorage', memoryStorage)
  vi.stubGlobal('window', { localStorage: memoryStorage, location: { search: '' } })
  return { storageItems, memoryStorage }
})

async function loadSnapshot(state: unknown, version = 2) {
  memoryStorage.setItem('gundamdoro-app-state', JSON.stringify({ state, version }))
  await useAppStore.persist.rehydrate()
}

function snapshot() {
  return JSON.parse(memoryStorage.getItem('gundamdoro-app-state')!).state
}

function finishFocus(now: number) {
  useAppStore.getState().startFocus(now)
  const { endAt, sessionId } = useAppStore.getState().timer
  useAppStore.getState().completeFocus(sessionId!, endAt!)
  return endAt!
}

function resetStore() {
  storageItems.clear()
  useAppStore.persist.setOptions({ storage: createJSONStorage(() => memoryStorage) })
  useAppStore.setState({
    phase: 'READY',
    timer: createInitialTimer(FOCUS_DURATION_MS),
    assembly: {
      mechaId: 'mecha-01',
      currentStage: 0,
      totalStages: 5,
      completedFocusSessions: 0,
    },
    totalFocusedMinutes: 0,
    settings: { focusMinutes: 1, breakMinutes: 1 },
    lastProcessedFocusSessionId: null,
    hangar: [],
    currentBuildId: null,
    unlockedParts: [],
    workbench: { id: null, name: '自定义机体', parts: {} },
  })
}

function setRunningFocus(sessionId: string, endAt: number) {
  useAppStore.setState({
    phase: 'FOCUS',
    timer: {
      status: 'running',
      durationMs: FOCUS_DURATION_MS,
      remainingMs: Math.max(0, endAt - 1_000),
      startedAt: endAt - FOCUS_DURATION_MS,
      endAt,
      sessionId,
    },
  })
}

describe('useAppStore', () => {
  beforeEach(resetStore)

  it('starts, pauses, and resumes a focus timer from timestamps', () => {
    useAppStore.getState().startFocus(1_000)
    let state = useAppStore.getState()
    expect(state.phase).toBe('FOCUS')
    expect(state.timer.status).toBe('running')
    expect(state.timer.endAt).toBe(61_000)

    useAppStore.getState().pauseTimer(2_000)
    state = useAppStore.getState()
    expect(state.timer.status).toBe('paused')
    expect(state.timer.remainingMs).toBe(59_000)
    expect(state.timer.endAt).toBeNull()

    useAppStore.getState().resumeTimer(5_000)
    state = useAppStore.getState()
    expect(state.timer.status).toBe('running')
    expect(state.timer.endAt).toBe(64_000)
  })

  it('advances focus exactly once for a session id', () => {
    setRunningFocus('focus-1', 5_000)
    useAppStore.getState().completeFocus('focus-1', 5_000)
    let state = useAppStore.getState()

    expect(state.phase).toBe('PART_REWARD')
    expect(state.assembly.currentStage).toBe(1)
    expect(state.assembly.completedFocusSessions).toBe(1)
    expect(state.lastProcessedFocusSessionId).toBe('focus-1')

    useAppStore.getState().completeFocus('focus-1', 6_000)
    state = useAppStore.getState()
    expect(state.assembly.currentStage).toBe(1)
    expect(state.assembly.completedFocusSessions).toBe(1)
  })

  it('recovers an expired focus and remains idempotent on repeated recovery', () => {
    setRunningFocus('expired-focus', 5_000)
    useAppStore.getState().recoverState(6_000)
    let state = useAppStore.getState()

    expect(state.phase).toBe('PART_REWARD')
    expect(state.assembly.currentStage).toBe(1)
    expect(state.lastProcessedFocusSessionId).toBe('expired-focus')

    useAppStore.getState().recoverState(7_000)
    state = useAppStore.getState()
    expect(state.assembly.currentStage).toBe(1)
    expect(state.assembly.completedFocusSessions).toBe(1)
  })

  it('moves a non-final part reveal through break and back to ready', () => {
    setRunningFocus('focus-2', 5_000)
    useAppStore.getState().completeFocus('focus-2', 5_000)
    useAppStore.getState().finishPartReveal(5_001)
    let state = useAppStore.getState()

    expect(state.phase).toBe('BREAK')
    expect(state.timer.durationMs).toBe(BREAK_DURATION_MS)

    useAppStore.getState().completeBreak((state.timer.endAt ?? 0) + 1)
    state = useAppStore.getState()
    expect(state.phase).toBe('READY')
    expect(state.timer.status).toBe('idle')
  })

  it('waits for a manual assembly click after the fifth focus without a break', () => {
    useAppStore.setState({
      assembly: { mechaId: 'mecha-01', currentStage: 4, totalStages: 5, completedFocusSessions: 4 },
    })
    setRunningFocus('focus-final', 5_000)
    useAppStore.getState().completeFocus('focus-final', 5_000)
    useAppStore.getState().finishPartReveal(5_001)

    expect(useAppStore.getState().phase).toBe('READY')
    expect(useAppStore.getState().assembly.currentStage).toBe(5)
    expect(useAppStore.getState().timer.status).toBe('idle')
    const beforeAssembly = useAppStore.getState()
    useAppStore.getState().startFocus(6_000)
    expect(useAppStore.getState().phase).toBe('READY')
    useAppStore.getState().startAssembly()
    useAppStore.getState().startAssembly()
    expect(useAppStore.getState().phase).toBe('ASSEMBLY')
    useAppStore.getState().finishAssemblyAnimation()
    useAppStore.getState().finishAssemblyAnimation()

    expect(useAppStore.getState().phase).toBe('COMPLETE')
    expect(useAppStore.getState().assembly.currentStage).toBe(5)
    expect(useAppStore.getState().assembly.completedFocusSessions).toBe(5)
    expect(useAppStore.getState().totalFocusedMinutes).toBe(beforeAssembly.totalFocusedMinutes)
  })

  it('cancels without advancing progress and build again preserves settings', () => {
    useAppStore.getState().startFocus(1_000)
    useAppStore.getState().cancelTimer()
    let state = useAppStore.getState()
    expect(state.phase).toBe('READY')
    expect(state.assembly.completedFocusSessions).toBe(0)

    useAppStore.setState({
      phase: 'COMPLETE',
      assembly: { mechaId: 'mecha-01', currentStage: 5, totalStages: 5, completedFocusSessions: 5 },
      totalFocusedMinutes: 125,
      settings: { focusMinutes: 40, breakMinutes: 10 },
    })
    useAppStore.getState().resetMecha()
    state = useAppStore.getState()
    expect(state.phase).toBe('READY')
    expect(state.assembly.currentStage).toBe(0)
    expect(state.totalFocusedMinutes).toBe(0)
    expect(state.settings).toEqual({ focusMinutes: 40, breakMinutes: 10 })
  })

  it('ends a break early without changing parts, totals or settings', () => {
    const finishedAt = finishFocus(1_000)
    useAppStore.getState().finishPartReveal(finishedAt + 1)
    const before = useAppStore.getState()
    const oldEndAt = before.timer.endAt!
    useAppStore.getState().endBreak()
    useAppStore.getState().endBreak()
    useAppStore.getState().completeBreak(oldEndAt + 1)
    const after = useAppStore.getState()
    expect(after.phase).toBe('READY')
    expect(after.timer).toEqual(createInitialTimer(FOCUS_DURATION_MS))
    expect(after.assembly).toEqual(before.assembly)
    expect(after.totalFocusedMinutes).toBe(before.totalFocusedMinutes)
    expect(after.settings).toEqual(before.settings)
    expect(after.lastProcessedFocusSessionId).toBe(before.lastProcessedFocusSessionId)
    expect(snapshot().phase).toBe('READY')
  })

  it('does not let End Break cancel an active focus or manual assembly', () => {
    useAppStore.getState().startFocus(1_000)
    useAppStore.getState().endBreak()
    expect(useAppStore.getState().phase).toBe('FOCUS')
    useAppStore.getState().startAssembly()
    expect(useAppStore.getState().phase).toBe('FOCUS')
  })

  it('does not assemble an incomplete collection or complete without a manual start', () => {
    useAppStore.getState().startAssembly()
    useAppStore.getState().finishAssemblyAnimation()
    expect(useAppStore.getState().phase).toBe('READY')
    finishFocus(1_000)
    useAppStore.getState().startAssembly()
    useAppStore.getState().finishAssemblyAnimation()
    expect(useAppStore.getState().phase).toBe('PART_REWARD')
  })

  it('runs all five focus sessions and manual assembly with no sixth session', () => {
    let now = 1_000
    for (let part = 1; part <= 5; part++) {
      now = finishFocus(now)
      expect(useAppStore.getState().assembly.currentStage).toBe(part)
      expect(useAppStore.getState().phase).toBe('PART_REWARD')
      useAppStore.getState().finishPartReveal(now)
      useAppStore.getState().finishPartReveal(now + 1)
      if (part < 5) {
        expect(useAppStore.getState().phase).toBe('BREAK')
        useAppStore.getState().endBreak()
      }
      expect(useAppStore.getState().phase).toBe('READY')
      now += 1_000
    }
    expect(useAppStore.getState().totalFocusedMinutes).toBe(5)
    useAppStore.getState().startAssembly()
    useAppStore.getState().finishAssemblyAnimation()
    expect(useAppStore.getState().phase).toBe('COMPLETE')
    expect(useAppStore.getState().assembly.completedFocusSessions).toBe(5)
    expect(useAppStore.getState().totalFocusedMinutes).toBe(5)
  })

  it('preserves a waiting five-part collection after hydration and recovery', async () => {
    const data = { ...snapshot(), assembly: { ...snapshot().assembly, currentStage: 5, completedFocusSessions: 5 }, totalFocusedMinutes: 5 }
    await loadSnapshot(data)
    useAppStore.getState().recoverState(999_999)
    expect(useAppStore.getState().phase).toBe('READY')
    expect(useAppStore.getState().assembly.currentStage).toBe(5)
    expect(useAppStore.getState().totalFocusedMinutes).toBe(5)
    useAppStore.getState().finishAssemblyAnimation()
    expect(useAppStore.getState().phase).toBe('READY')
  })

  it('hydrates expired focus using the same idempotent completion path', async () => {
    useAppStore.getState().startFocus(1_000)
    const data = snapshot()
    const id = data.timer.sessionId
    await loadSnapshot(data)
    useAppStore.getState().recoverState(70_000)
    useAppStore.getState().recoverState(80_000)
    useAppStore.getState().completeFocus(id, 90_000)
    expect(useAppStore.getState().phase).toBe('PART_REWARD')
    expect(useAppStore.getState().assembly.currentStage).toBe(1)
    expect(useAppStore.getState().totalFocusedMinutes).toBe(1)
  })

  it('reconstructs running remaining time and preserves paused time after reload', async () => {
    useAppStore.getState().startFocus(1_000)
    await loadSnapshot(snapshot())
    useAppStore.getState().recoverState(11_000)
    expect(useAppStore.getState().timer.remainingMs).toBe(50_000)
    useAppStore.getState().pauseTimer(11_000)
    await loadSnapshot(snapshot())
    useAppStore.getState().recoverState(111_000)
    expect(useAppStore.getState().timer.status).toBe('paused')
    expect(useAppStore.getState().timer.remainingMs).toBe(50_000)
  })

  it('recovers expired break to READY without starting focus', async () => {
    const endAt = finishFocus(1_000)
    useAppStore.getState().finishPartReveal(endAt)
    const data = snapshot()
    await loadSnapshot(data)
    useAppStore.getState().recoverState(data.timer.endAt + 1)
    expect(useAppStore.getState().phase).toBe('READY')
    expect(useAppStore.getState().timer.status).toBe('idle')
    expect(useAppStore.getState().assembly.currentStage).toBe(1)
  })

  it('handles pause after expiry as completion instead of a stuck paused zero', () => {
    useAppStore.getState().startFocus(1_000)
    useAppStore.getState().pauseTimer(61_001)
    expect(useAppStore.getState().phase).toBe('PART_REWARD')
    expect(useAppStore.getState().assembly.currentStage).toBe(1)
  })

  it('ignores unknown, early and stale completion callbacks', () => {
    useAppStore.getState().startFocus(1_000)
    const id = useAppStore.getState().timer.sessionId!
    useAppStore.getState().completeFocus('unknown', 100_000)
    useAppStore.getState().completeFocus(id, 2_000)
    expect(useAppStore.getState().phase).toBe('FOCUS')
    useAppStore.getState().cancelTimer()
    useAppStore.getState().completeFocus(id, 100_000)
    expect(useAppStore.getState().assembly.currentStage).toBe(0)
    expect(useAppStore.getState().totalFocusedMinutes).toBe(0)
  })

  it('migrates a legacy part-assembly snapshot to a reveal without adding progress', async () => {
    const data = { ...snapshot(), phase: 'ASSEMBLY', assembly: { mechaId: 'mecha-01', currentStage: 3, totalStages: 6, completedFocusSessions: 3 }, totalFocusedMinutes: 75 }
    await loadSnapshot(data, 0)
    expect(useAppStore.getState().phase).toBe('PART_REWARD')
    expect(useAppStore.getState().assembly).toEqual({ ...data.assembly, totalStages: 5 })
    expect(useAppStore.getState().totalFocusedMinutes).toBe(75)
    useAppStore.getState().finishPartReveal(1_000)
    expect(useAppStore.getState().phase).toBe('BREAK')
    expect(JSON.parse(memoryStorage.getItem('gundamdoro-app-state')!).version).toBe(4)
  })

  it('migrates legacy completion while keeping actual six-session history', async () => {
    await loadSnapshot({ ...snapshot(), phase: 'COMPLETE', assembly: { mechaId: 'mecha-01', currentStage: 6, totalStages: 6, completedFocusSessions: 6 }, totalFocusedMinutes: 150 }, 0)
    expect(useAppStore.getState().phase).toBe('COMPLETE')
    expect(useAppStore.getState().assembly.currentStage).toBe(5)
    expect(useAppStore.getState().assembly.completedFocusSessions).toBe(6)
    expect(useAppStore.getState().totalFocusedMinutes).toBe(150)
  })

  it('converts legacy sixth focus to manual-assembly readiness without extra totals', async () => {
    useAppStore.getState().startFocus(1_000)
    await loadSnapshot({ ...snapshot(), assembly: { mechaId: 'mecha-01', currentStage: 5, totalStages: 6, completedFocusSessions: 5 }, totalFocusedMinutes: 125 }, 0)
    useAppStore.getState().recoverState(1_000_000)
    expect(useAppStore.getState().phase).toBe('READY')
    expect(useAppStore.getState().assembly.currentStage).toBe(5)
    expect(useAppStore.getState().assembly.completedFocusSessions).toBe(5)
    expect(useAppStore.getState().totalFocusedMinutes).toBe(125)
  })

  it('clamps corrupt part counts and never unlocks manual assembly early', async () => {
    await loadSnapshot({ ...snapshot(), assembly: { ...snapshot().assembly, currentStage: 99 } })
    expect(useAppStore.getState().assembly.currentStage).toBe(5)
    await loadSnapshot({ ...snapshot(), phase: 'ASSEMBLY', assembly: { ...snapshot().assembly, currentStage: -2 } })
    expect(useAppStore.getState().assembly.currentStage).toBe(0)
    expect(useAppStore.getState().phase).toBe('READY')
  })

  it('locks settings during reveal and assembly', () => {
    finishFocus(1_000)
    useAppStore.getState().updateSettings({ focusMinutes: 40 })
    expect(useAppStore.getState().settings.focusMinutes).toBe(1)
    useAppStore.setState({ phase: 'READY', assembly: { mechaId: 'mecha-01', currentStage: 5, totalStages: 5, completedFocusSessions: 5 } })
    useAppStore.getState().startAssembly()
    useAppStore.getState().updateSettings({ focusMinutes: 40 })
    expect(useAppStore.getState().settings.focusMinutes).toBe(1)
  })

  it('archives a finished build exactly once with an immutable statistics snapshot', () => {
    useAppStore.setState({
      assembly: { mechaId: 'mecha-01', currentStage: 5, totalStages: 5, completedFocusSessions: 5 },
      totalFocusedMinutes: 125,
    })
    useAppStore.getState().startAssembly()
    const id = useAppStore.getState().currentBuildId
    expect(useAppStore.getState().hangar).toEqual([])
    useAppStore.getState().finishAssemblyAnimation(10_000)
    useAppStore.getState().finishAssemblyAnimation(20_000)
    expect(useAppStore.getState().hangar).toEqual([{
      id, mechaId: 'mecha-01', mechaName: 'MECHA-01', completedAt: 10_000,
      completedFocusSessions: 5, totalFocusedMinutes: 125,
    }])
    useAppStore.getState().resetMecha()
    expect(useAppStore.getState().currentBuildId).toBeNull()
    expect(useAppStore.getState().hangar[0].totalFocusedMinutes).toBe(125)
    expect(useAppStore.getState().totalFocusedMinutes).toBe(0)
    finishFocus(30_000)
    expect(useAppStore.getState().hangar).toHaveLength(1)
    expect(useAppStore.getState().hangar[0].completedFocusSessions).toBe(5)
  })

  it('keeps separate instances when the same model is built again', () => {
    for (let build = 1; build <= 2; build++) {
      useAppStore.setState({
        assembly: { mechaId: 'mecha-01', currentStage: 5, totalStages: 5, completedFocusSessions: 5 },
        totalFocusedMinutes: build * 25,
      })
      useAppStore.getState().startAssembly()
      useAppStore.getState().finishAssemblyAnimation(build * 10_000)
      useAppStore.getState().resetMecha()
    }
    const entries = useAppStore.getState().hangar
    expect(entries).toHaveLength(2)
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(2)
    expect(entries.map((entry) => entry.totalFocusedMinutes)).toEqual([50, 25])
    expect(entries.map((entry) => entry.completedAt)).toEqual([20_000, 10_000])
  })

  it('does not archive unfinished focus sessions or collected parts', () => {
    finishFocus(1_000)
    useAppStore.getState().finishPartReveal(62_000)
    useAppStore.getState().endBreak()
    useAppStore.getState().startAssembly()
    useAppStore.getState().finishAssemblyAnimation(70_000)
    expect(useAppStore.getState().hangar).toEqual([])
  })

  it('restores a build interrupted during assembly and archives once on completion', async () => {
    useAppStore.setState({ assembly: { mechaId: 'mecha-01', currentStage: 5, totalStages: 5, completedFocusSessions: 5 }, totalFocusedMinutes: 125 })
    useAppStore.getState().startAssembly()
    const id = useAppStore.getState().currentBuildId
    await loadSnapshot(snapshot())
    useAppStore.getState().recoverState(10_000)
    expect(useAppStore.getState().phase).toBe('ASSEMBLY')
    expect(useAppStore.getState().currentBuildId).toBe(id)
    useAppStore.getState().finishAssemblyAnimation(20_000)
    await loadSnapshot(snapshot())
    useAppStore.getState().recoverState(30_000)
    await loadSnapshot(snapshot())
    expect(useAppStore.getState().hangar).toHaveLength(1)
    expect(useAppStore.getState().hangar[0].id).toBe(id)
    expect(useAppStore.getState().hangar[0].completedAt).toBe(20_000)
  })

  it('migrates a version-1 completed mecha into the hangar without inventing a date', async () => {
    const oldState = { ...snapshot(), phase: 'COMPLETE', assembly: { mechaId: 'mecha-01', currentStage: 5, totalStages: 5, completedFocusSessions: 5 }, totalFocusedMinutes: 125 }
    await loadSnapshot(oldState, 1)
    expect(useAppStore.getState().phase).toBe('COMPLETE')
    expect(useAppStore.getState().hangar).toHaveLength(1)
    const entry = useAppStore.getState().hangar[0]
    expect(entry.completedAt).toBeNull()
    expect(entry.completedFocusSessions).toBe(5)
    expect(entry.totalFocusedMinutes).toBe(125)
    await loadSnapshot(snapshot())
    expect(useAppStore.getState().hangar).toEqual([entry])
    useAppStore.getState().resetMecha()
    await loadSnapshot(snapshot())
    expect(useAppStore.getState().hangar).toEqual([entry])
  })

  it('preserves a version-1 manual assembly during migration', async () => {
    await loadSnapshot({ ...snapshot(), phase: 'ASSEMBLY', assembly: { mechaId: 'mecha-01', currentStage: 5, totalStages: 5, completedFocusSessions: 5 }, totalFocusedMinutes: 125 }, 1)
    expect(useAppStore.getState().phase).toBe('ASSEMBLY')
    expect(useAppStore.getState().hangar).toHaveLength(0)
    expect(useAppStore.getState().currentBuildId).toBeTruthy()
    useAppStore.getState().finishAssemblyAnimation(50_000)
    expect(useAppStore.getState().hangar).toHaveLength(1)
    expect(useAppStore.getState().hangar[0].completedAt).toBe(50_000)
  })

  it('preserves archives when a corrupt active timer falls back to READY', async () => {
    const entry = { id: 'saved-build', mechaId: 'mecha-01', mechaName: 'MECHA-01', completedAt: 10_000, completedFocusSessions: 5, totalFocusedMinutes: 125 }
    await loadSnapshot({ ...snapshot(), phase: 'FOCUS', timer: { status: 'running', endAt: null }, hangar: [entry] })
    expect(useAppStore.getState().phase).toBe('READY')
    expect(useAppStore.getState().hangar).toEqual([entry])
  })

  it('keeps unknown model records and normalizes malformed hangar data safely', async () => {
    const future = { id: 'future-build', mechaId: 'mecha-future', mechaName: 'FUTURE MODEL', completedAt: 20_000, completedFocusSessions: 7, totalFocusedMinutes: 175 }
    await loadSnapshot({ ...snapshot(), hangar: [null, {}, future, future, { id: 'bad-stats', mechaId: 'mecha-01', completedAt: Infinity, completedFocusSessions: -1, totalFocusedMinutes: -10 }] })
    const entries = useAppStore.getState().hangar
    expect(entries).toHaveLength(2)
    expect(entries[0]).toEqual(future)
    expect(entries[1].completedAt).toBeNull()
    expect(entries[1].completedFocusSessions).toBe(0)
    expect(entries[1].totalFocusedMinutes).toBe(0)
    expect(entries[1].mechaName).toBe('MECHA-01')
  })
})
