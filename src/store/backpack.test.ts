import { describe, expect, it } from 'vitest'
import { bundledCatalog } from '../adapters/catalog/bundledCatalog'
import { registeredAssemblyPolicy } from '../adapters/assets/registeredAssembly'
import { APP_STORAGE_KEY, APP_STORAGE_VERSION } from '../application/snapshot'
import { createDefaultData } from '../application/state'
import { getCompositionSlots, getPartDefinitions, MODULAR_PART_SLOTS } from '../domain/inventory'
import type { AppPhase, Composition } from '../domain/types'
import { groupHangar } from '../domain/hangar'
import { createFakeApp } from '../test/fakeApp'
import { createAppStore, initializeAppStore } from './createAppStore'

const wings = 'wing-zero-ew:wings'
function app(sample = 0) {
  const fake = createFakeApp()
  fake.dependencies.catalog = bundledCatalog
  fake.dependencies.assembly = registeredAssemblyPolicy
  fake.dependencies.runtime = { ...fake.dependencies.runtime, random: () => sample }
  return fake
}
const body = Object.fromEntries(MODULAR_PART_SLOTS.map((slot) => [slot, `mecha-01:${slot}`])) as Composition
const ownedBody = Object.values(body) as string[]

describe('optional backpack / wings', () => {
  it('prepares seven required slots without silently equipping an owned backpack and saves an empty slot', () => {
    const fake = app(), store = createAppStore(fake.dependencies)
    store.setState({ unlockedParts: [...ownedBody, wings] })
    store.getState().prepareWorkbench()
    expect(store.getState().workbench.parts).toEqual(body)
    store.getState().saveCustomBuild()
    expect(store.getState().hangar[0]).toMatchObject({ composition: body, assemblyProfile: 'standard-front-v4' })
    expect(store.getState().hangar[0].composition).not.toHaveProperty('wings')
  })

  it('blocks locked, wrong-slot and uncalibrated backpacks without changing the draft', () => {
    const fake = app(), store = createAppStore(fake.dependencies)
    store.setState({ unlockedParts: [...ownedBody, 'future:wings'] })
    store.getState().prepareWorkbench()
    const draft = store.getState().workbench
    store.getState().selectWorkbenchPart('wings', wings)
    store.getState().selectWorkbenchPart('wings', 'mecha-01:head')
    store.getState().selectWorkbenchPart('head', wings)
    store.getState().selectWorkbenchPart('wings', 'future:wings')
    expect(store.getState().workbench).toEqual(draft)
    store.setState({ workbench: { ...draft, parts: { ...body, wings } } })
    store.getState().saveCustomBuild()
    expect(store.getState().hangar).toEqual([])
    store.setState({ unlockedParts: [...ownedBody, 'future:wings'], workbench: { ...draft, parts: { ...body, wings: 'future:wings' } } })
    store.getState().saveCustomBuild()
    expect(store.getState().hangar).toEqual([])
  })

  it('equips, archives once, unequips with a fresh identity, and preserves both recipes after reload', async () => {
    const fake = app(), store = createAppStore(fake.dependencies)
    store.setState({ unlockedParts: [...ownedBody, wings], totalFocusedMinutes: 125 })
    store.getState().prepareWorkbench()
    const original = store.getState().workbench.id
    store.getState().selectWorkbenchPart('wings', wings)
    expect(store.getState().workbench.id).not.toBe(original)
    store.getState().saveCustomBuild()
    store.getState().saveCustomBuild()
    const equipped = store.getState().hangar[0]
    expect(equipped.composition?.wings).toBe(wings)
    expect(getCompositionSlots(equipped.composition!)).toHaveLength(8)
    expect(store.getState().hangar).toHaveLength(1)
    store.getState().clearWorkbenchPart('torso')
    expect(store.getState().workbench.parts.torso).toBe(body.torso)
    store.getState().clearWorkbenchPart('wings')
    expect(store.getState().workbench.id).not.toBe(equipped.id)
    const cleared = store.getState().workbench
    store.getState().clearWorkbenchPart('wings')
    expect(store.getState().workbench).toBe(cleared)
    store.getState().saveCustomBuild()
    expect(store.getState().hangar).toHaveLength(2)
    expect(store.getState().hangar[1]).toEqual(equipped)
    expect(groupHangar(store.getState().hangar)).toHaveLength(2)
    expect(store.getState().unlockedParts).toEqual([...ownedBody, wings])
    expect(store.getState().totalFocusedMinutes).toBe(125)
    expect(store.getState().assembly.completedFocusSessions).toBe(0)
    const again = createAppStore(fake.dependencies)
    await initializeAppStore(again)
    expect(again.getState().hangar).toEqual(store.getState().hangar)
    expect(again.getState().workbench.parts).not.toHaveProperty('wings')
  })

  it.each(['FOCUS', 'BREAK', 'PART_REWARD', 'ASSEMBLY'] as AppPhase[])('guards equipping, unequipping and saving during %s', (phase) => {
    const fake = app(), store = createAppStore(fake.dependencies)
    store.setState({ phase, unlockedParts: [...ownedBody, wings], workbench: { id: 'draft', name: '飞翼', parts: { ...body, wings } } })
    const draft = store.getState().workbench
    store.getState().clearWorkbenchPart('wings')
    store.getState().selectWorkbenchPart('wings', wings)
    store.getState().randomizeWorkbench()
    store.getState().saveCustomBuild()
    expect(store.getState().workbench).toEqual(draft)
    expect(store.getState().hangar).toEqual([])
  })

  it.each([0, 0.49, 0.5, 1, NaN, -1])('randomizes optional none/owned choices safely at sample %s', (sample) => {
    const fake = app(sample), store = createAppStore(fake.dependencies)
    store.setState({ unlockedParts: [...ownedBody, wings] })
    store.getState().randomizeWorkbench()
    expect(store.getState().workbench.parts.wings).toBe(sample >= 0.5 ? wings : undefined)
    expect(MODULAR_PART_SLOTS.every((slot) => store.getState().workbench.parts[slot] === body[slot])).toBe(true)
    store.setState({ unlockedParts: ownedBody })
    store.getState().randomizeWorkbench()
    expect(store.getState().workbench.parts).not.toHaveProperty('wings')
  })

  it('upgrades v7 without adding wings or repeating paired-leg migration, retaining all historical profiles', async () => {
    const fake = app(), data = createDefaultData(fake.dependencies)
    data.assembly.currentStage = 5
    data.assembly.completedFocusSessions = 5
    data.totalFocusedMinutes = 125
    data.phase = 'FOCUS'
    data.timer = { status: 'paused', durationMs: 90_000, remainingMs: 50_000, startedAt: 100, endAt: null, sessionId: 'old-v7-focus' }
    data.unlockedParts = ownedBody.slice(0, 5)
    data.workbench = { id: 'old-draft', name: '旧草稿', parts: body }
    data.hangar = ['standard-front-v2', 'standard-front-v3'].map((assemblyProfile, i) => ({ id: `old-${i}`, kind: 'custom' as const,
      mechaId: 'custom', mechaName: '旧机体', composition: body, assemblyProfile, completedAt: null, completedFocusSessions: 0, totalFocusedMinutes: 0 }))
    fake.values.set(APP_STORAGE_KEY, JSON.stringify({ state: data, version: 7 }))
    const store = createAppStore(fake.dependencies)
    await initializeAppStore(store)
    expect(store.getState().unlockedParts).toEqual(data.unlockedParts)
    expect(store.getState().assembly.currentStage).toBe(5)
    expect(store.getState().timer).toEqual(data.timer)
    expect(store.getState().phase).toBe('FOCUS')
    expect(store.getState().workbench).toEqual(data.workbench)
    expect(store.getState().hangar).toEqual(data.hangar)
    expect(JSON.parse(fake.values.get(APP_STORAGE_KEY)!).version).toBe(APP_STORAGE_VERSION)
  })

  it('preserves unavailable optional references and requires explicit unequip before saving', async () => {
    const fake = app(), data = createDefaultData(fake.dependencies)
    data.unlockedParts = [...ownedBody, 'future:wings']
    data.workbench = { id: 'future-draft', name: '待恢复', parts: { ...body, wings: 'future:wings' } }
    data.hangar = [{ id: 'future-archive', kind: 'custom', mechaId: 'custom', mechaName: '未来作品', composition: { ...body, wings: 'future:wings' },
      assemblyProfile: 'future-v9', completedAt: null, completedFocusSessions: 0, totalFocusedMinutes: 0 }]
    fake.values.set(APP_STORAGE_KEY, JSON.stringify({ state: data, version: APP_STORAGE_VERSION }))
    const store = createAppStore(fake.dependencies)
    await initializeAppStore(store)
    expect(store.getState().workbench).toEqual(data.workbench)
    expect(store.getState().hangar).toEqual(data.hangar)
    store.getState().saveCustomBuild()
    expect(store.getState().hangar).toHaveLength(1)
    store.getState().clearWorkbenchPart('wings')
    store.getState().saveCustomBuild()
    expect(store.getState().hangar).toHaveLength(2)
    expect(store.getState().unlockedParts).toEqual(data.unlockedParts)
  })

  it('retains an equipped draft and wing inventory across current-version restarts', async () => {
    const fake = app(), store = createAppStore(fake.dependencies)
    store.setState({ unlockedParts: getPartDefinitions(bundledCatalog).map((part) => part.id) })
    store.getState().prepareWorkbench()
    store.getState().selectWorkbenchPart('wings', wings)
    const again = createAppStore(fake.dependencies)
    await initializeAppStore(again)
    expect(again.getState().workbench).toEqual(store.getState().workbench)
    expect(again.getState().unlockedParts.filter((id) => id === wings)).toHaveLength(1)
  })
})
