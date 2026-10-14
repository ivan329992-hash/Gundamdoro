import { describe, expect, it } from 'vitest'
import { bundledCatalog } from '../adapters/catalog/bundledCatalog'
import { APP_STORAGE_KEY, APP_STORAGE_VERSION } from '../application/snapshot'
import { createDefaultData } from '../application/state'
import { createMechaCatalog } from '../domain/catalog'
import { getPartDefinitions, PART_SLOTS } from '../domain/inventory'
import { createFakeApp } from '../test/fakeApp'
import { createAppStore, initializeAppStore } from './createAppStore'

function wingApp() {
  const fake = createFakeApp()
  fake.dependencies.catalog = bundledCatalog
  return fake
}

function legacyWing(fake: ReturnType<typeof wingApp>, phase: 'READY' | 'FOCUS' | 'PART_REWARD' | 'ASSEMBLY' | 'COMPLETE', stage: number) {
  const data = createDefaultData(fake.dependencies)
  data.phase = phase
  data.assembly = { mechaId: 'wing-zero-ew', currentStage: stage, totalStages: 5, completedFocusSessions: stage }
  data.totalFocusedMinutes = stage * 25
  data.unlockedParts = PART_SLOTS.slice(0, stage).map((slot) => `wing-zero-ew:${slot}`)
  return data
}

describe('variable part counts and compatibility', () => {
  it.each([1, 3, 8])('collects exactly %i arbitrary modules, then waits for manual assembly', async (count) => {
    const fake = createFakeApp()
    fake.dependencies.catalog = createMechaCatalog([{
      id: 'modules', name: 'MODULES', finalAsset: 'final/model.png',
      stages: Array.from({ length: count }, (_, index) => ({ stage: index + 1, name: `MODULE ${index + 1}`, asset: `parts/${index + 1}.png`, partId: `unit-${index + 1}` })),
    }], 'modules')
    const store = createAppStore(fake.dependencies)
    for (let stage = 1; stage <= count; stage++) {
      store.getState().startAssembly()
      expect(store.getState().phase).toBe('READY')
      store.getState().startFocus()
      fake.setNow(store.getState().timer.endAt!)
      store.getState().syncTimer()
      expect(store.getState().unlockedParts).toHaveLength(stage)
      store.getState().finishPartReveal()
      expect(store.getState().phase).toBe(stage < count ? 'BREAK' : 'READY')
      if (stage < count) store.getState().endBreak()
    }
    store.getState().startFocus()
    expect(store.getState().phase).toBe('READY')
    store.getState().startAssembly()
    store.getState().finishAssemblyAnimation()
    const restored = createAppStore(fake.dependencies)
    await initializeAppStore(restored)
    expect(restored.getState().unlockedParts).toEqual(Array.from({ length: count }, (_, i) => `modules:unit-${i + 1}`))
    expect(restored.getState().hangar[0]).toMatchObject({ completedFocusSessions: count, totalFocusedMinutes: count * 25 })
    expect(restored.getState().phase).toBe('COMPLETE')
  })

  it.each([1, 4, 5])('retains version-4 wing progress at %i without granting an extra focus or wing', async (stage) => {
    const fake = wingApp()
    const data = legacyWing(fake, 'READY', stage)
    fake.values.set(APP_STORAGE_KEY, JSON.stringify({ state: data, version: 4 }))
    const store = createAppStore(fake.dependencies)
    await initializeAppStore(store)
    expect(store.getState().assembly).toEqual({ ...data.assembly, currentStage: stage >= 5 ? stage + 2 : stage, totalStages: 8 })
    expect(store.getState().totalFocusedMinutes).toBe(data.totalFocusedMinutes)
    expect(store.getState().unlockedParts).toEqual(expect.arrayContaining(data.unlockedParts))
    if (stage >= 5) expect(store.getState().unlockedParts).toEqual(expect.arrayContaining(['wing-zero-ew:hips', 'wing-zero-ew:left-leg', 'wing-zero-ew:right-leg']))
    expect(store.getState().unlockedParts).not.toContain('wing-zero-ew:wings')
    store.getState().startAssembly()
    expect(store.getState().phase).toBe('READY')
    expect(JSON.parse(fake.values.get(APP_STORAGE_KEY)!).version).toBe(APP_STORAGE_VERSION)
  })

  it.each(['ASSEMBLY', 'COMPLETE'] as const)('preserves an already accepted legacy %s without inventing a sixth focus', async (phase) => {
    const fake = wingApp()
    const data = legacyWing(fake, phase, 5)
    data.currentBuildId = 'existing-wing-build'
    if (phase === 'COMPLETE') data.hangar = [{ id: data.currentBuildId, mechaId: 'wing-zero-ew', mechaName: '飞翼零式 EW', completedAt: 500, completedFocusSessions: 5, totalFocusedMinutes: 125 }]
    fake.values.set(APP_STORAGE_KEY, JSON.stringify({ state: data, version: 4 }))
    const store = createAppStore(fake.dependencies)
    await initializeAppStore(store)
    expect(store.getState().phase).toBe(phase)
    expect(store.getState().currentBuildId).toBe(data.currentBuildId)
    expect(store.getState().assembly.currentStage).toBe(8)
    expect(store.getState().assembly.completedFocusSessions).toBe(5)
    expect(store.getState().totalFocusedMinutes).toBe(125)
    expect(store.getState().unlockedParts).toContain('wing-zero-ew:wings')
    if (phase === 'ASSEMBLY') store.getState().finishAssemblyAnimation()
    expect(store.getState().hangar).toHaveLength(1)
    expect(store.getState().hangar[0]).toMatchObject({ id: data.currentBuildId, completedFocusSessions: 5, totalFocusedMinutes: 125 })
    if (phase === 'COMPLETE') expect(store.getState().hangar).toEqual(data.hangar)
    const restored = createAppStore(fake.dependencies)
    await initializeAppStore(restored)
    expect(restored.getState().hangar).toHaveLength(1)
    restored.getState().resetMecha()
    expect(restored.getState().assembly).toMatchObject({ currentStage: 0, totalStages: 8, completedFocusSessions: 0 })
  })

  it('restores a paused legacy focus on its original part and processes it once', async () => {
    const fake = wingApp()
    const data = legacyWing(fake, 'FOCUS', 4)
    data.timer = { status: 'paused', durationMs: 60_000, remainingMs: 30_000, startedAt: 1000, endAt: null, sessionId: 'paused-leg-focus' }
    fake.values.set(APP_STORAGE_KEY, JSON.stringify({ state: data, version: 4 }))
    const store = createAppStore(fake.dependencies)
    await initializeAppStore(store)
    expect(store.getState().timer).toEqual(data.timer)
    store.getState().resumeTimer()
    fake.setNow(store.getState().timer.endAt!)
    store.getState().syncTimer()
    store.getState().completeFocus('paused-leg-focus')
    expect(store.getState().assembly.currentStage).toBe(5)
    expect(store.getState().unlockedParts).toContain('wing-zero-ew:hips')
    expect(store.getState().unlockedParts).not.toContain('wing-zero-ew:left-leg')
    expect(store.getState().unlockedParts).not.toContain('wing-zero-ew:wings')
    store.getState().finishPartReveal()
    expect(store.getState().phase).toBe('BREAK')
  })

  it('recovers an expired old sixth focus once as wings and retains it after reload', async () => {
    const fake = wingApp()
    const data = legacyWing(fake, 'READY', 5)
    data.assembly.totalStages = 6
    fake.values.set(APP_STORAGE_KEY, JSON.stringify({ state: data, version: 6 }))
    const store = createAppStore(fake.dependencies)
    await initializeAppStore(store)
    store.getState().startFocus()
    fake.setNow(store.getState().timer.endAt!)
    const restored = createAppStore(fake.dependencies)
    await initializeAppStore(restored)
    restored.getState().recoverState()
    expect(restored.getState().phase).toBe('PART_REWARD')
    expect(restored.getState().assembly).toMatchObject({ currentStage: 8, completedFocusSessions: 6 })
    expect(restored.getState().unlockedParts.filter((id) => id === 'wing-zero-ew:wings')).toHaveLength(1)
    restored.getState().finishPartReveal()
    expect(restored.getState().phase).toBe('READY')
    expect(restored.getState().totalFocusedMinutes).toBe(150)
    const again = createAppStore(fake.dependencies)
    await initializeAppStore(again)
    expect(again.getState().unlockedParts).toContain('wing-zero-ew:wings')
    again.getState().startFocus()
    expect(again.getState().phase).toBe('READY')
  })
})
