import { describe, expect, it } from 'vitest'
import { createMechaCatalog } from '../domain/catalog'
import { getPartDefinitions, PART_SLOTS } from '../domain/inventory'
import { createDefaultData } from '../application/state'
import { APP_STORAGE_KEY, APP_STORAGE_VERSION } from '../application/snapshot'
import { createFakeApp } from '../test/fakeApp'
import { createAppStore, initializeAppStore } from './createAppStore'

function inventoryApp() {
  const fake = createFakeApp()
  fake.dependencies.catalog = createMechaCatalog(
    ['alpha', 'beta'].map((id) => ({
      id,
      name: id.toUpperCase(),
      totalStages: 5,
      finalAsset: 'final/model.png',
      stages: PART_SLOTS.map((slot, index) => ({
        stage: index + 1,
        slot,
        name: slot,
        asset: `parts/${slot}.png`,
      })),
    })),
    'alpha',
  )
  return fake
}

describe('permanent component inventory and custom builds', () => {
  it('uses the same Unicode character limit for workbench input and restored drafts', async () => {
    const fake = inventoryApp()
    const store = createAppStore(fake.dependencies)
    store.getState().setWorkbenchName('🙂'.repeat(41))
    expect(store.getState().workbench.name).toBe('🙂'.repeat(40))

    const restored = createAppStore(fake.dependencies)
    await initializeAppStore(restored)
    expect(restored.getState().workbench.name).toBe('🙂'.repeat(40))
    restored.getState().setWorkbenchName('A'.repeat(41))
    expect(restored.getState().workbench.name).toBe('A'.repeat(40))
  })

  it('unlocks one correct component once at focus expiry and retains it after model switching', () => {
    const fake = inventoryApp()
    const store = createAppStore(fake.dependencies)
    store.getState().startFocus()
    const { sessionId, endAt } = store.getState().timer
    store.getState().completeFocus(sessionId!, endAt! - 1)
    expect(store.getState().unlockedParts).toEqual([])
    store.getState().completeFocus(sessionId!, endAt!)
    store.getState().completeFocus(sessionId!, endAt!)
    expect(store.getState().unlockedParts).toEqual(['alpha:torso'])
    store.getState().finishPartReveal()
    store.getState().endBreak()
    store.setState({ phase: 'COMPLETE' })
    store.getState().resetMecha()
    store.getState().selectMecha('beta')
    expect(store.getState().unlockedParts).toEqual(['alpha:torso'])
    store.getState().startFocus()
    store.getState().cancelTimer()
    expect(store.getState().unlockedParts).toHaveLength(1)
  })

  it.each([0, 1, 2, 3, 4])(
    'backfills earned active parts and completed models during version-%i migration',
    async (version) => {
      const fake = inventoryApp()
      const old = createDefaultData(fake.dependencies)
      old.assembly.currentStage = 2
      old.hangar = [
        {
          id: 'old-beta',
          mechaId: 'beta',
          mechaName: 'BETA',
          completedAt: null,
          completedFocusSessions: 5,
          totalFocusedMinutes: 125,
        },
      ]
      fake.values.set(APP_STORAGE_KEY, JSON.stringify({ state: old, version }))
      const store = createAppStore(fake.dependencies)
      await initializeAppStore(store)
      expect(store.getState().unlockedParts).toEqual([
        'alpha:torso',
        'alpha:head',
        ...PART_SLOTS.map((slot) => `beta:${slot}`),
      ])
      expect(store.getState().hangar).toEqual(old.hangar)
      expect(store.getState().assembly).toEqual(old.assembly)
      const restored = createAppStore(fake.dependencies)
      await initializeAppStore(restored)
      expect(restored.getState().unlockedParts).toEqual(store.getState().unlockedParts)
      expect(JSON.parse(fake.values.get(APP_STORAGE_KEY)!).version).toBe(8)
    },
  )

  it('rejects locked components, wrong slots, partial recipes and blank names', () => {
    const fake = inventoryApp()
    const store = createAppStore(fake.dependencies)
    store.setState({ unlockedParts: ['alpha:head'] })
    store.getState().prepareWorkbench()
    store.getState().selectWorkbenchPart('head', 'beta:head')
    store.getState().selectWorkbenchPart('head', 'alpha:torso')
    expect(store.getState().workbench.parts).toEqual({ head: 'alpha:head' })
    store.getState().saveCustomBuild()
    expect(store.getState().hangar).toEqual([])
    store.setState({
      unlockedParts: getPartDefinitions(fake.dependencies.catalog).map((part) => part.id),
    })
    store.getState().prepareWorkbench()
    store.getState().setWorkbenchName('   ')
    store.getState().saveCustomBuild()
    expect(store.getState().hangar).toEqual([])
  })

  it('randomizes only owned slot-compatible components and accepts boundary random samples', () => {
    const fake = inventoryApp()
    const store = createAppStore({
      ...fake.dependencies,
      runtime: { ...fake.dependencies.runtime, random: () => 1 },
    })
    const owned = [...PART_SLOTS.map((slot) => `alpha:${slot}`), 'beta:head']
    store.setState({ unlockedParts: owned })
    store.getState().randomizeWorkbench()
    expect(store.getState().workbench.parts).toEqual({
      torso: 'alpha:torso',
      head: 'beta:head',
      'left-arm': 'alpha:left-arm',
      'right-arm': 'alpha:right-arm',
      legs: 'alpha:legs',
    })
    expect(Object.values(store.getState().workbench.parts).every((id) => owned.includes(id!))).toBe(
      true,
    )
  })

  it('persists draft and complete recipe, saves once, never consumes parts or awards extra focus', async () => {
    const fake = inventoryApp()
    const store = createAppStore(fake.dependencies)
    const owned = getPartDefinitions(fake.dependencies.catalog).map((part) => part.id)
    store.setState({ unlockedParts: owned, totalFocusedMinutes: 75 })
    store.getState().prepareWorkbench()
    store.getState().selectWorkbenchPart('head', 'beta:head')
    store.getState().setWorkbenchName('混搭一号')
    const draft = structuredClone(store.getState().workbench)
    store.getState().saveCustomBuild()
    store.getState().saveCustomBuild()
    expect(store.getState().hangar).toHaveLength(1)
    expect(store.getState().hangar[0]).toMatchObject({
      kind: 'custom',
      mechaName: '混搭一号',
      composition: draft.parts,
      completedFocusSessions: 0,
      totalFocusedMinutes: 0,
    })
    expect(store.getState().unlockedParts).toEqual(owned)
    expect(store.getState().totalFocusedMinutes).toBe(75)
    expect(store.getState().phase).toBe('READY')
    const restored = createAppStore(fake.dependencies)
    await initializeAppStore(restored)
    expect(restored.getState().workbench).toEqual(draft)
    restored.getState().saveCustomBuild()
    expect(restored.getState().hangar).toHaveLength(1)
    restored.getState().selectWorkbenchPart('head', 'alpha:head')
    restored.getState().saveCustomBuild()
    expect(restored.getState().hangar).toHaveLength(2)
    expect(restored.getState().hangar[1].composition).toEqual(draft.parts)
  })

  it.each(['FOCUS', 'PART_REWARD', 'BREAK', 'ASSEMBLY'] as const)(
    'ignores workshop changes during %s',
    (phase) => {
      const fake = inventoryApp()
      const store = createAppStore(fake.dependencies)
      store.setState({
        unlockedParts: getPartDefinitions(fake.dependencies.catalog).map((part) => part.id),
      })
      store.getState().prepareWorkbench()
      store.setState({ phase })
      const before = store.getState()
      store.getState().selectWorkbenchPart('head', 'beta:head')
      store.getState().setWorkbenchName('not allowed')
      store.getState().randomizeWorkbench()
      store.getState().saveCustomBuild()
      expect(store.getState()).toBe(before)
    },
  )

  it('preserves unknown component records and custom recipes without unlocking their components', async () => {
    const fake = inventoryApp()
    const data = createDefaultData(fake.dependencies)
    const composition = Object.fromEntries(PART_SLOTS.map((slot) => [slot, `future:${slot}`]))
    const record = {
      id: 'future-custom',
      kind: 'custom',
      mechaId: 'custom',
      mechaName: '未来机体',
      completedAt: null,
      completedFocusSessions: 0,
      totalFocusedMinutes: 0,
      composition,
    }
    fake.values.set(
      APP_STORAGE_KEY,
      JSON.stringify({
        version: APP_STORAGE_VERSION,
        state: {
          ...data,
          unlockedParts: ['future:head', 'future:head', null, 'invalid'],
          hangar: [record],
        },
      }),
    )
    const store = createAppStore(fake.dependencies)
    await initializeAppStore(store)
    expect(store.getState().hangar).toEqual([record])
    expect(store.getState().unlockedParts).toEqual(['future:head'])
    expect(store.getState().workbench.parts).toEqual({})
  })

  it('restores a missing draft identity without losing a valid selection', async () => {
    const fake = inventoryApp()
    const data = createDefaultData(fake.dependencies)
    data.unlockedParts = PART_SLOTS.map((slot) => `alpha:${slot}`)
    data.workbench.parts = Object.fromEntries(PART_SLOTS.map((slot) => [slot, `alpha:${slot}`]))
    fake.values.set(APP_STORAGE_KEY, JSON.stringify({ state: data, version: APP_STORAGE_VERSION }))
    const store = createAppStore(fake.dependencies)
    await initializeAppStore(store)
    store.getState().prepareWorkbench()
    expect(store.getState().workbench.id).toBeTruthy()
    expect(store.getState().workbench.parts).toEqual(data.workbench.parts)
    store.getState().saveCustomBuild()
    expect(store.getState().hangar).toHaveLength(1)
  })
})
