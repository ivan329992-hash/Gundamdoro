import { describe, expect, it } from 'vitest'
import { createMechaCatalog } from '../domain/catalog'
import { getPartDefinitions, PART_SLOTS } from '../domain/inventory'
import { createDefaultData } from '../application/state'
import { APP_STORAGE_KEY, APP_STORAGE_VERSION } from '../application/snapshot'
import { createFakeApp } from '../test/fakeApp'
import { createAppStore, initializeAppStore } from './createAppStore'
import type { Composition } from '../domain/types'

function pilotApp() {
  const fake = createFakeApp()
  fake.dependencies.catalog = createMechaCatalog(['mecha-01', 'mecha-02', 'mecha-03'].map((id) => ({
    id, name: id, totalStages: 5, finalAsset: 'final/model.png',
    stages: PART_SLOTS.map((slot, index) => ({ stage: index + 1, slot, name: slot, asset: `parts/${slot}.png` })),
  })), 'mecha-01')
  fake.dependencies.assembly = { profile: 'standard-front-v1', modelIds: ['mecha-01', 'mecha-02'] }
  return fake
}

describe('compatible assembly application guards', () => {
  it('filters preparation, selection and randomization even when unsupported parts are owned', () => {
    const fake = pilotApp()
    const store = createAppStore({ ...fake.dependencies, runtime: { ...fake.dependencies.runtime, random: () => 1 } })
    store.setState({ unlockedParts: getPartDefinitions(fake.dependencies.catalog).map((part) => part.id) })
    store.getState().prepareWorkbench()
    store.getState().selectWorkbenchPart('head', 'mecha-03:head')
    store.getState().selectWorkbenchPart('head', 'mecha-02:torso')
    expect(store.getState().workbench.parts.head).toBe('mecha-01:head')
    store.getState().randomizeWorkbench()
    expect(Object.values(store.getState().workbench.parts).every((id) => id?.startsWith('mecha-02:'))).toBe(true)
  })

  it('preserves old unsupported draft choices and blocks saving until explicitly replaced', () => {
    const fake = pilotApp()
    const store = createAppStore(fake.dependencies)
    const parts = Object.fromEntries(PART_SLOTS.map((slot) => [slot, `mecha-03:${slot}`])) as Composition
    store.setState({ unlockedParts: getPartDefinitions(fake.dependencies.catalog).map((part) => part.id), workbench: { id: 'legacy-draft', name: '旧配方', parts } })
    store.getState().prepareWorkbench()
    store.getState().saveCustomBuild()
    expect(store.getState().workbench.parts).toEqual(parts)
    expect(store.getState().hangar).toEqual([])
    for (const slot of PART_SLOTS) store.getState().selectWorkbenchPart(slot, `mecha-01:${slot}`)
    store.getState().saveCustomBuild()
    store.getState().saveCustomBuild()
    expect(store.getState().hangar).toHaveLength(1)
    expect(store.getState().hangar[0].assemblyProfile).toBe('standard-front-v1')
    expect(store.getState().assembly.completedFocusSessions).toBe(0)
    expect(store.getState().totalFocusedMinutes).toBe(0)
  })

  it('does not grant compatible parts when only other models have been collected', () => {
    const fake = pilotApp()
    const store = createAppStore(fake.dependencies)
    store.setState({ unlockedParts: PART_SLOTS.map((slot) => `mecha-03:${slot}`) })
    store.getState().prepareWorkbench()
    store.getState().randomizeWorkbench()
    store.getState().selectWorkbenchPart('head', 'mecha-01:head')
    store.getState().saveCustomBuild()
    expect(store.getState().workbench.parts).toEqual({})
    expect(store.getState().hangar).toEqual([])
    expect(store.getState().unlockedParts).toHaveLength(5)
  })

  it('persists new profiles while preserving legacy and unknown future profiles in version 8', async () => {
    const fake = pilotApp()
    const data = createDefaultData(fake.dependencies)
    data.unlockedParts = getPartDefinitions(fake.dependencies.catalog).map((part) => part.id)
    const store = createAppStore(fake.dependencies)
    store.setState(data)
    store.getState().prepareWorkbench()
    store.getState().saveCustomBuild()
    const fresh = store.getState().hangar[0]
    const { assemblyProfile: _profile, ...legacy } = fresh
    const records = [fresh, { ...legacy, id: 'legacy' }, { ...fresh, id: 'future', assemblyProfile: 'future-frame-v9' }]
    fake.values.set(APP_STORAGE_KEY, JSON.stringify({ version: APP_STORAGE_VERSION, state: { ...store.getState(), hangar: records } }))
    const restored = createAppStore(fake.dependencies)
    await initializeAppStore(restored)
    expect(restored.getState().hangar).toEqual(records)
    expect(JSON.parse(fake.values.get(APP_STORAGE_KEY)!).version).toBe(8)
    expect(restored.getState().unlockedParts).toEqual(data.unlockedParts)
  })
})
