import { describe, expect, it } from 'vitest'
import { bundledCatalog } from '../adapters/catalog/bundledCatalog'
import { registeredAssemblyPolicy } from '../adapters/assets/registeredAssembly'
import { APP_STORAGE_KEY, APP_STORAGE_VERSION } from '../application/snapshot'
import { createDefaultData } from '../application/state'
import { getPartDefinitions, MODULAR_PART_SLOTS, PART_SLOTS } from '../domain/inventory'
import type { AppData, AppPhase, BuiltMecha, Composition } from '../domain/types'
import { createFakeApp } from '../test/fakeApp'
import { createAppStore, initializeAppStore } from './createAppStore'

function pilot() {
  const fake = createFakeApp()
  fake.dependencies.catalog = bundledCatalog
  fake.dependencies.assembly = registeredAssemblyPolicy
  return fake
}

function legacy(fake: ReturnType<typeof pilot>, modelId = 'mecha-01', stage = 5, phase: AppPhase = 'READY'): AppData {
  const data = createDefaultData(fake.dependencies)
  data.phase = phase
  data.assembly = { mechaId: modelId, currentStage: stage, totalStages: 5, completedFocusSessions: stage }
  data.totalFocusedMinutes = stage * 25
  data.unlockedParts = PART_SLOTS.slice(0, stage).map((slot) => `${modelId}:${slot}`)
  return data
}

async function restore(fake: ReturnType<typeof pilot>, data: AppData, version = 5) {
  fake.values.set(APP_STORAGE_KEY, JSON.stringify({ state: data, version }))
  const store = createAppStore(fake.dependencies)
  await initializeAppStore(store)
  return store
}

describe('seven-part collection and legacy lower-body migration', () => {
  it.each(['mecha-01', 'mecha-02'])('collects seven independent parts on a fresh %s build and assembles exactly once', async (modelId) => {
    const fake = pilot()
    const store = createAppStore(fake.dependencies)
    store.getState().selectMecha(modelId)
    for (let stage = 1; stage <= 7; stage++) {
      store.getState().startFocus()
      const { sessionId, endAt } = store.getState().timer
      fake.setNow(endAt!)
      store.getState().syncTimer()
      store.getState().completeFocus(sessionId!, endAt! + 1)
      expect(store.getState().assembly.currentStage).toBe(stage)
      expect(store.getState().unlockedParts).toHaveLength(stage)
      expect(store.getState().unlockedParts.at(-1)).toBe(`${modelId}:${MODULAR_PART_SLOTS[stage - 1]}`)
      store.getState().finishPartReveal()
      expect(store.getState().phase).toBe(stage < 7 ? 'BREAK' : 'READY')
      if (stage < 7) store.getState().endBreak()
      if (stage < 7) {
        store.getState().startAssembly()
        expect(store.getState().phase).toBe('READY')
      }
    }
    store.getState().startFocus()
    expect(store.getState().phase).toBe('READY')
    store.getState().startAssembly()
    store.getState().finishAssemblyAnimation()
    store.getState().finishAssemblyAnimation()
    expect(store.getState().hangar).toHaveLength(1)
    expect(store.getState().hangar[0]).toMatchObject({ completedFocusSessions: 7, totalFocusedMinutes: 175 })
    const again = createAppStore(fake.dependencies)
    await initializeAppStore(again)
    expect(again.getState().hangar).toEqual(store.getState().hangar)
    again.getState().resetMecha()
    expect(again.getState().assembly).toMatchObject({ totalStages: 7, currentStage: 0, completedFocusSessions: 0 })
  })

  it.each([0, 1, 2, 3, 4, 5])('splits already earned paired legs in version %i without manufacturing focus credit', async (version) => {
    for (const modelId of ['mecha-01', 'mecha-02']) {
      const fake = pilot()
      const data = legacy(fake, modelId)
      data.unlockedParts.push('future:shield')
      const store = await restore(fake, data, version)
      expect(store.getState().assembly).toEqual({ ...data.assembly, currentStage: 7, totalStages: 7 })
      expect(store.getState().totalFocusedMinutes).toBe(125)
      expect(store.getState().unlockedParts).toEqual(expect.arrayContaining([`${modelId}:legs`, 'future:shield', ...MODULAR_PART_SLOTS.map((slot) => `${modelId}:${slot}`)]))
      expect(store.getState().hangar).toEqual([])
      const saved = fake.values.get(APP_STORAGE_KEY)
      const again = createAppStore(fake.dependencies)
      await initializeAppStore(again)
      expect(fake.values.get(APP_STORAGE_KEY)).toBe(saved)
      expect(JSON.parse(saved!).version).toBe(8)
    }
  })

  it.each(['running', 'paused'] as const)('preserves a legacy fifth-focus %s timer, granting hips only after valid expiry', async (status) => {
    const fake = pilot()
    const data = legacy(fake, 'mecha-01', 4, 'FOCUS')
    data.timer = { status, durationMs: 90_000, remainingMs: 54_000, startedAt: 100, endAt: status === 'running' ? 55_000 : null, sessionId: 'old-fifth-focus' }
    const store = await restore(fake, data)
    expect(store.getState().timer).toEqual(data.timer)
    expect(store.getState().assembly).toMatchObject({ currentStage: 4, totalStages: 7, completedFocusSessions: 4 })
    expect(store.getState().unlockedParts).not.toContain('mecha-01:hips')
    if (status === 'paused') store.getState().resumeTimer()
    fake.setNow(store.getState().timer.endAt!)
    store.getState().syncTimer()
    store.getState().completeFocus('old-fifth-focus')
    expect(store.getState().assembly).toMatchObject({ currentStage: 5, completedFocusSessions: 5 })
    expect(store.getState().totalFocusedMinutes).toBe(101.5)
    expect(store.getState().unlockedParts).toEqual([...PART_SLOTS.slice(0, 4).map((slot) => `mecha-01:${slot}`), 'mecha-01:hips'])
    const again = createAppStore(fake.dependencies)
    await initializeAppStore(again)
    expect(again.getState().assembly.currentStage).toBe(5)
    expect(again.getState().unlockedParts).not.toContain('mecha-01:left-leg')
  })

  it('recovers an expired old fifth focus exactly once without promoting the new hips stage to complete', async () => {
    const fake = pilot()
    const data = legacy(fake, 'mecha-02', 4, 'FOCUS')
    data.timer = { status: 'running', durationMs: 60_000, remainingMs: 1, startedAt: 0, endAt: 500, sessionId: 'expired-fifth' }
    const store = await restore(fake, data)
    expect(store.getState().assembly).toMatchObject({ currentStage: 5, completedFocusSessions: 5, totalStages: 7 })
    expect(store.getState().totalFocusedMinutes).toBe(101)
    for (let attempt = 0; attempt < 2; attempt++) {
      const again = createAppStore(fake.dependencies)
      await initializeAppStore(again)
      again.getState().syncTimer()
      again.getState().completeFocus('expired-fifth')
      expect(again.getState().assembly.currentStage).toBe(5)
      expect(again.getState().unlockedParts).toHaveLength(5)
      expect(again.getState().unlockedParts).not.toContain('mecha-02:left-leg')
    }
  })

  it.each(['PART_REWARD', 'BREAK', 'FOCUS'] as const)('settles already-earned old lower-body %s without replaying a different reward', async (phase) => {
    const fake = pilot()
    const store = await restore(fake, legacy(fake, 'mecha-01', 5, phase))
    expect(store.getState().phase).toBe('READY')
    expect(store.getState().timer.status).toBe('idle')
    expect(store.getState().assembly.completedFocusSessions).toBe(5)
    expect(store.getState().totalFocusedMinutes).toBe(125)
  })

  it('preserves an old manual assembly identity and archived real statistics across reload', async () => {
    const fake = pilot()
    const data = legacy(fake, 'mecha-01', 5, 'ASSEMBLY')
    data.currentBuildId = 'old-assembly-id'
    const store = await restore(fake, data)
    expect(store.getState().phase).toBe('ASSEMBLY')
    expect(store.getState().currentBuildId).toBe('old-assembly-id')
    store.getState().finishAssemblyAnimation()
    store.getState().finishAssemblyAnimation()
    const again = createAppStore(fake.dependencies)
    await initializeAppStore(again)
    expect(again.getState().hangar).toHaveLength(1)
    expect(again.getState().hangar[0]).toMatchObject({ id: 'old-assembly-id', completedFocusSessions: 5, totalFocusedMinutes: 125 })
    expect(again.getState().assembly.currentStage).toBe(7)
  })

  it('retains old archive recipes and converts a draft without consuming inventory or reusing its saved identity', async () => {
    const fake = pilot()
    const data = legacy(fake)
    const oldParts = Object.fromEntries(PART_SLOTS.map((slot) => [slot, `mecha-01:${slot}`])) as Composition
    const base: BuiltMecha = { id: 'old-custom', kind: 'custom', mechaId: 'custom', mechaName: '旧配方', composition: oldParts, completedAt: 100, completedFocusSessions: 0, totalFocusedMinutes: 0 }
    data.hangar = [base, { ...base, id: 'old-v1', assemblyProfile: 'standard-front-v1' }]
    data.workbench = { id: 'old-v1', name: '保留草稿名', parts: oldParts }
    const before = JSON.stringify(data)
    const store = await restore(fake, data)
    expect(JSON.stringify(data)).toBe(before)
    expect(store.getState().hangar).toEqual(data.hangar)
    expect(store.getState().workbench.name).toBe('保留草稿名')
    expect(store.getState().workbench.id).not.toBe('old-v1')
    expect(store.getState().workbench.parts).toEqual(Object.fromEntries(MODULAR_PART_SLOTS.map((slot) => [slot, `mecha-01:${slot}`])))
    const owned = [...store.getState().unlockedParts]
    store.getState().saveCustomBuild()
    store.getState().saveCustomBuild()
    expect(store.getState().hangar).toHaveLength(3)
    expect(store.getState().hangar[0].assemblyProfile).toBe('standard-front-v4')
    expect(Object.keys(store.getState().hangar[0].composition!)).toHaveLength(7)
    expect(store.getState().unlockedParts).toEqual(owned)
    expect(store.getState().totalFocusedMinutes).toBe(125)
    const again = createAppStore(fake.dependencies)
    await initializeAppStore(again)
    expect(again.getState().hangar).toEqual(store.getState().hangar)
  })

  it('never awards ownership from custom recipes and preserves unknown seven-part future profiles', async () => {
    const fake = pilot()
    const data = legacy(fake, 'mecha-01', 0)
    data.hangar = [{ id: 'future', kind: 'custom', mechaId: 'custom', mechaName: '未来配方', composition: Object.fromEntries(MODULAR_PART_SLOTS.map((slot) => [slot, `future:${slot}`])) as Composition,
      completedAt: null, completedFocusSessions: 0, totalFocusedMinutes: 0, assemblyProfile: 'future-v10' }]
    data.workbench.parts = { legs: 'mecha-02:legs' }
    const store = await restore(fake, data)
    expect(store.getState().unlockedParts).toEqual([])
    expect(store.getState().hangar).toEqual(data.hangar)
    store.getState().saveCustomBuild()
    expect(store.getState().hangar).toHaveLength(1)
  })

  it('keeps other-model progress, unsupported drafts and fixed archive statistics intact', async () => {
    const fake = pilot()
    const data = legacy(fake, 'mecha-03', 2)
    data.workbench.parts = { legs: 'mecha-03:legs' }
    data.hangar = [{ id: 'old-fixed', mechaId: 'mecha-02', mechaName: 'MECHA-02', completedAt: null, completedFocusSessions: 5, totalFocusedMinutes: 125 }]
    const store = await restore(fake, data)
    expect(store.getState().assembly).toEqual({ ...data.assembly, totalStages: 7 })
    expect(store.getState().workbench.parts).toEqual({ hips: 'mecha-03:hips', 'left-leg': 'mecha-03:left-leg', 'right-leg': 'mecha-03:right-leg' })
    expect(store.getState().hangar).toEqual(data.hangar)
    expect(store.getState().unlockedParts).toEqual(expect.arrayContaining(MODULAR_PART_SLOTS.map((slot) => `mecha-02:${slot}`)))
    expect(bundledCatalog.list().map((model) => model.totalStages)).toEqual([7, 7, 7, 7, 7, 7, 8])
  })

  it('does not infer ownership from malformed or shadowed archive rows', async () => {
    const fake = pilot()
    const data = legacy(fake, 'mecha-01', 0)
    const composition = Object.fromEntries(PART_SLOTS.map((slot) => [slot, `mecha-01:${slot}`])) as Composition
    data.hangar = [
      { id: 'same-id', kind: 'custom', mechaId: 'custom', mechaName: '自定义', composition, completedAt: null, completedFocusSessions: 0, totalFocusedMinutes: 0 },
      { id: 'same-id', mechaId: 'mecha-01', mechaName: '重复固定记录', completedAt: null, completedFocusSessions: 5, totalFocusedMinutes: 125 },
      { id: '', mechaId: 'mecha-02', mechaName: '损坏记录', completedAt: null, completedFocusSessions: 5, totalFocusedMinutes: 125 },
    ]
    const store = await restore(fake, data)
    expect(store.getState().hangar).toHaveLength(1)
    expect(store.getState().unlockedParts).toEqual([])
  })

  it('does not reinterpret a current-version fifth stage as earned paired legs', async () => {
    const fake = pilot()
    const data = createDefaultData(fake.dependencies)
    data.assembly.currentStage = 5
    data.assembly.completedFocusSessions = 5
    data.totalFocusedMinutes = 125
    data.unlockedParts = getPartDefinitions(bundledCatalog).filter((part) => part.mechaId === 'mecha-01' && part.stage <= 5).map((part) => part.id)
    const store = await restore(fake, data, APP_STORAGE_VERSION)
    expect(store.getState().assembly.currentStage).toBe(5)
    expect(store.getState().unlockedParts).toEqual(data.unlockedParts)
    store.getState().startAssembly()
    expect(store.getState().phase).toBe('READY')
    store.getState().prepareWorkbench()
    store.getState().saveCustomBuild()
    expect(store.getState().hangar).toEqual([])
  })
})
