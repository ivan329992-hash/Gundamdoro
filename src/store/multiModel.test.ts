import { describe, expect, it, vi } from 'vitest'
import { APP_STORAGE_KEY, APP_STORAGE_VERSION } from '../application/snapshot'
import { createDefaultData } from '../application/state'
import { createMechaCatalog } from '../domain/catalog'
import type { AppPhase } from '../domain/types'
import { createFakeApp } from '../test/fakeApp'
import { createAppStore, initializeAppStore } from './createAppStore'
import { bundledCatalog } from '../adapters/catalog/bundledCatalog'

function multiModelApp() {
  const fake = createFakeApp()
  fake.dependencies.catalog = createMechaCatalog(
    [
      fake.dependencies.catalog.defaultMecha,
      {
        id: 'second-model',
        name: 'SECOND MODEL',
        totalStages: 2,
        finalAsset: 'final/second.png',
        stages: [
          { stage: 1, name: 'SECOND CORE', asset: 'parts/core.png' },
          { stage: 2, name: 'SECOND FRAME', asset: 'parts/frame.png' },
        ],
      },
    ],
    'test-model',
  )
  return fake
}

function finishBuild(
  store: ReturnType<typeof createAppStore>,
  fake: ReturnType<typeof multiModelApp>,
) {
  while (store.getState().assembly.currentStage < store.getState().assembly.totalStages) {
    store.getState().startFocus()
    fake.setNow(store.getState().timer.endAt!)
    store.getState().syncTimer()
    store.getState().finishPartReveal()
    if (store.getState().phase === 'BREAK') store.getState().endBreak()
  }
  store.getState().startAssembly()
  store.getState().finishAssemblyAnimation()
}

describe('multiple buildable models', () => {
  it.each(bundledCatalog.list())(
    'completes and restores the manifest-sized focus loop for $id',
    async (model) => {
      const fake = createFakeApp()
      fake.dependencies.catalog = bundledCatalog
      const store = createAppStore(fake.dependencies)
      store.getState().selectMecha(model.id)
      for (let stage = 1; stage <= model.totalStages; stage++) {
        store.getState().startFocus()
        const sessionId = store.getState().timer.sessionId!
        fake.setNow(store.getState().timer.endAt!)
        store.getState().syncTimer()
        store.getState().completeFocus(sessionId)
        expect(store.getState().assembly.currentStage).toBe(stage)
        store.getState().finishPartReveal()
        expect(store.getState().phase).toBe(stage < model.totalStages ? 'BREAK' : 'READY')
        if (stage < model.totalStages) store.getState().endBreak()
      }
      expect(store.getState().hangar).toHaveLength(0)
      store.getState().startAssembly()
      store.getState().finishAssemblyAnimation()
      store.getState().finishAssemblyAnimation()
      expect(store.getState().hangar).toHaveLength(1)
      expect(store.getState().hangar[0]).toMatchObject({
        mechaId: model.id,
        mechaName: model.name,
        completedFocusSessions: model.totalStages,
        totalFocusedMinutes: model.totalStages * 25,
      })
      const restored = createAppStore(fake.dependencies)
      await initializeAppStore(restored)
      expect(restored.getState().assembly.mechaId).toBe(model.id)
      expect(restored.getState().unlockedParts).toHaveLength(model.totalStages)
      expect(restored.getState().hangar).toEqual(store.getState().hangar)
      restored.getState().resetMecha()
      expect(restored.getState().assembly.mechaId).toBe(model.id)
      expect(restored.getState().hangar).toHaveLength(1)
    },
  )

  it('selects a registered model with its own part count and retains settings', () => {
    const fake = multiModelApp()
    const store = createAppStore(fake.dependencies)
    store.getState().updateSettings({ focusMinutes: 12, breakMinutes: 3 })
    store.getState().selectMecha('second-model')
    expect(store.getState().assembly).toEqual({
      mechaId: 'second-model',
      totalStages: 2,
      currentStage: 0,
      completedFocusSessions: 0,
    })
    expect(store.getState().timer.durationMs).toBe(12 * 60_000)
    expect(store.getState().settings).toEqual({ focusMinutes: 12, breakMinutes: 3 })
    const selected = store.getState()
    store.getState().selectMecha('not-installed')
    store.getState().selectMecha('second-model')
    expect(store.getState()).toBe(selected)
  })

  it.each<AppPhase>(['FOCUS', 'PART_REWARD', 'BREAK', 'ASSEMBLY'])(
    'rejects changing models during %s',
    (phase) => {
      const fake = multiModelApp()
      const store = createAppStore(fake.dependencies)
      store.setState({ phase })
      const before = store.getState()
      store.getState().selectMecha('second-model')
      expect(store.getState()).toBe(before)
    },
  )

  it('keeps a paused session and collected parts when a switch is attempted', () => {
    const fake = multiModelApp()
    const store = createAppStore(fake.dependencies)
    store.getState().startFocus()
    store.getState().pauseTimer()
    const paused = store.getState()
    store.getState().selectMecha('second-model')
    expect(store.getState()).toBe(paused)
    store.getState().resumeTimer()
    fake.setNow(store.getState().timer.endAt!)
    store.getState().syncTimer()
    store.getState().finishPartReveal()
    store.getState().endBreak()
    const collected = store.getState()
    expect(collected.assembly.currentStage).toBe(1)
    store.getState().selectMecha('second-model')
    expect(store.getState()).toBe(collected)
  })

  it('allows switching after canceling the first focus without awarding a part', () => {
    const fake = multiModelApp()
    const store = createAppStore(fake.dependencies)
    store.getState().startFocus()
    const staleSession = store.getState().timer.sessionId!
    store.getState().cancelTimer()
    store.getState().selectMecha('second-model')
    store.getState().startFocus()
    fake.setNow(store.getState().timer.endAt!)
    store.getState().completeFocus(staleSession)
    expect(store.getState().assembly.mechaId).toBe('second-model')
    expect(store.getState().assembly.currentStage).toBe(0)
    store.getState().syncTimer()
    expect(store.getState().assembly.currentStage).toBe(1)
  })

  it('archives two different models separately and Build Again retains the selected model', async () => {
    const fake = multiModelApp()
    const store = createAppStore(fake.dependencies)
    finishBuild(store, fake)
    const first = store.getState().hangar[0]
    store.getState().selectMecha('second-model')
    expect(store.getState().phase).toBe('READY')
    expect(store.getState().totalFocusedMinutes).toBe(0)
    expect(store.getState().hangar).toEqual([first])
    finishBuild(store, fake)
    const second = store.getState().hangar[0]
    expect(second).toMatchObject({
      mechaId: 'second-model',
      mechaName: 'SECOND MODEL',
      completedFocusSessions: 2,
      totalFocusedMinutes: 50,
    })
    expect(first).toMatchObject({
      mechaId: 'test-model',
      mechaName: 'TEST MODEL',
      completedFocusSessions: 3,
      totalFocusedMinutes: 75,
    })
    expect(first.id).not.toBe(second.id)
    const restored = createAppStore(fake.dependencies)
    await initializeAppStore(restored)
    expect(restored.getState().assembly.mechaId).toBe('second-model')
    expect(restored.getState().hangar).toEqual([second, first])
    restored.getState().finishAssemblyAnimation()
    expect(restored.getState().hangar).toHaveLength(2)
    restored.getState().resetMecha()
    expect(restored.getState().assembly).toEqual({
      mechaId: 'second-model',
      totalStages: 2,
      currentStage: 0,
      completedFocusSessions: 0,
    })
    expect(restored.getState().hangar).toEqual([second, first])
  })

  it('recovers an expired non-default focus on the correct model exactly once', async () => {
    const fake = multiModelApp()
    const store = createAppStore(fake.dependencies)
    store.getState().selectMecha('second-model')
    store.getState().startFocus()
    fake.setNow(store.getState().timer.endAt!)
    const restored = createAppStore(fake.dependencies)
    await initializeAppStore(restored)
    expect(restored.getState().phase).toBe('PART_REWARD')
    expect(restored.getState().assembly).toEqual({
      mechaId: 'second-model',
      totalStages: 2,
      currentStage: 1,
      completedFocusSessions: 1,
    })
    const again = createAppStore(fake.dependencies)
    await initializeAppStore(again)
    expect(again.getState().assembly).toEqual(restored.getState().assembly)
  })

  it.each([0, 1, 2])(
    'migrates a version-%i save without losing progress or archived models',
    async (version) => {
      const fake = multiModelApp()
      const data = createDefaultData(fake.dependencies)
      data.assembly.currentStage = 1
      data.assembly.completedFocusSessions = 1
      data.totalFocusedMinutes = 25
      data.hangar = [
        {
          id: 'old-build',
          mechaId: 'test-model',
          mechaName: 'TEST MODEL',
          completedAt: null,
          completedFocusSessions: 3,
          totalFocusedMinutes: 75,
        },
      ]
      fake.values.set(APP_STORAGE_KEY, JSON.stringify({ state: data, version }))
      const store = createAppStore(fake.dependencies)
      await initializeAppStore(store)
      expect(store.getState().assembly).toEqual(data.assembly)
      expect(store.getState().hangar).toEqual(data.hangar)
      expect(store.getState().totalFocusedMinutes).toBe(25)
      expect(JSON.parse(fake.values.get(APP_STORAGE_KEY)!).version).toBe(APP_STORAGE_VERSION)
    },
  )

  it('preserves the original save when the active model is unavailable', async () => {
    const fake = multiModelApp()
    const data = createDefaultData(fake.dependencies)
    data.assembly = {
      mechaId: 'uninstalled-model',
      currentStage: 4,
      totalStages: 5,
      completedFocusSessions: 4,
    }
    const original = JSON.stringify({ state: data, version: APP_STORAGE_VERSION })
    fake.values.set(APP_STORAGE_KEY, original)
    const write = vi.spyOn(fake.storage, 'setItem')
    await expect(initializeAppStore(createAppStore(fake.dependencies))).rejects.toThrow()
    expect(write).not.toHaveBeenCalled()
    expect(fake.values.get(APP_STORAGE_KEY)).toBe(original)
  })
})
