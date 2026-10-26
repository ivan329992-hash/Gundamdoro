import { describe, expect, it } from 'vitest'
import { bundledCatalog } from '../adapters/catalog/bundledCatalog'
import { registeredAssemblyPolicy } from '../adapters/assets/registeredAssembly'
import { APP_STORAGE_KEY, APP_STORAGE_VERSION } from '../application/snapshot'
import { createDefaultData } from '../application/state'
import { getPartDefinitions, MODULAR_PART_SLOTS, PART_SLOTS } from '../domain/inventory'
import type { AppData, AppPhase, Composition } from '../domain/types'
import { createFakeApp } from '../test/fakeApp'
import { createAppStore, initializeAppStore } from './createAppStore'

const remaining = ['mecha-03', 'mecha-04', 'mecha-05', 'mecha-06', 'wing-zero-ew']
function app() {
  const fake = createFakeApp()
  fake.dependencies.catalog = bundledCatalog
  fake.dependencies.assembly = registeredAssemblyPolicy
  return fake
}
function old(
  fake: ReturnType<typeof app>,
  mechaId: string,
  stage = 5,
  phase: AppPhase = 'READY',
): AppData {
  return {
    ...createDefaultData(fake.dependencies),
    phase,
    assembly: {
      mechaId,
      currentStage: stage,
      totalStages: mechaId === 'wing-zero-ew' ? 6 : 5,
      completedFocusSessions: stage,
    },
    totalFocusedMinutes: stage * 25,
    unlockedParts: [
      ...PART_SLOTS.slice(0, stage).map((slot) => `${mechaId}:${slot}`),
      ...(stage === 6 ? [`${mechaId}:wings`] : []),
    ],
  }
}
async function restore(fake: ReturnType<typeof app>, data: AppData, version = 6) {
  fake.values.set(APP_STORAGE_KEY, JSON.stringify({ state: data, version }))
  const store = createAppStore(fake.dependencies)
  await initializeAppStore(store)
  return store
}

describe('remaining models use independent lower-body components', () => {
  it.each(remaining)(
    'collects %s in the declared order and archives only after manual assembly',
    async (id) => {
      const fake = app(),
        store = createAppStore(fake.dependencies)
      store.getState().selectMecha(id)
      const keys = [...MODULAR_PART_SLOTS, ...(id === 'wing-zero-ew' ? ['wings'] : [])]
      for (let index = 0; index < keys.length; index++) {
        store.getState().startFocus()
        const { sessionId, endAt } = store.getState().timer
        fake.setNow(endAt!)
        store.getState().syncTimer()
        store.getState().completeFocus(sessionId!)
        expect(store.getState().unlockedParts).toEqual(
          keys.slice(0, index + 1).map((key) => `${id}:${key}`),
        )
        store.getState().finishPartReveal()
        expect(store.getState().phase).toBe(index < keys.length - 1 ? 'BREAK' : 'READY')
        if (index < keys.length - 1) store.getState().endBreak()
      }
      expect(store.getState().hangar).toEqual([])
      store.getState().startFocus()
      expect(store.getState().phase).toBe('READY')
      store.getState().startAssembly()
      store.getState().finishAssemblyAnimation()
      store.getState().finishAssemblyAnimation()
      expect(store.getState().hangar).toHaveLength(1)
      expect(store.getState().hangar[0]).toMatchObject({
        mechaId: id,
        completedFocusSessions: keys.length,
        totalFocusedMinutes: keys.length * 25,
      })
      const again = createAppStore(fake.dependencies)
      await initializeAppStore(again)
      expect(again.getState().hangar).toEqual(store.getState().hangar)
    },
  )

  it.each(Array.from({ length: 7 }, (_, version) => version))(
    'migrates earned remaining-model paired legs from version %i exactly once',
    async (version) => {
      for (const id of remaining) {
        const fake = app(),
          data = old(fake, id)
        const store = await restore(fake, data, version)
        expect(store.getState().assembly).toMatchObject({
          currentStage: 7,
          totalStages: id === 'wing-zero-ew' ? 8 : 7,
          completedFocusSessions: 5,
        })
        expect(store.getState().totalFocusedMinutes).toBe(125)
        expect(store.getState().unlockedParts).toEqual(
          expect.arrayContaining([
            `${id}:legs`,
            ...MODULAR_PART_SLOTS.map((slot) => `${id}:${slot}`),
          ]),
        )
        if (id === 'wing-zero-ew')
          expect(store.getState().unlockedParts).not.toContain(`${id}:wings`)
        const saved = fake.values.get(APP_STORAGE_KEY)
        const again = createAppStore(fake.dependencies)
        await initializeAppStore(again)
        expect(fake.values.get(APP_STORAGE_KEY)).toBe(saved)
        expect(JSON.parse(saved!).version).toBe(APP_STORAGE_VERSION)
      }
    },
  )

  it.each(['running', 'paused'] as const)(
    'preserves a %s old sixth wing focus and earns only the pending wings once',
    async (status) => {
      const fake = app(),
        data = old(fake, 'wing-zero-ew', 5, 'FOCUS')
      data.timer = {
        status,
        durationMs: 60_000,
        remainingMs: 30_000,
        startedAt: 100,
        endAt: status === 'running' ? 31_000 : null,
        sessionId: 'wing-pending',
      }
      const store = await restore(fake, data)
      expect(store.getState().timer).toEqual(data.timer)
      expect(store.getState().assembly.currentStage).toBe(7)
      if (status === 'paused') store.getState().resumeTimer()
      fake.setNow(store.getState().timer.endAt!)
      store.getState().syncTimer()
      store.getState().completeFocus('wing-pending')
      expect(store.getState().assembly).toMatchObject({
        currentStage: 8,
        completedFocusSessions: 6,
      })
      expect(store.getState().totalFocusedMinutes).toBe(126)
      expect(
        store.getState().unlockedParts.filter((id) => id === 'wing-zero-ew:wings'),
      ).toHaveLength(1)
    },
  )

  it.each(remaining)(
    'preserves an unfinished fifth focus on %s and grants hips only',
    async (id) => {
      const fake = app(),
        data = old(fake, id, 4, 'FOCUS')
      data.timer = {
        status: 'paused',
        durationMs: 60_000,
        remainingMs: 20_000,
        startedAt: 100,
        endAt: null,
        sessionId: 'fifth',
      }
      const store = await restore(fake, data)
      expect(store.getState().timer).toEqual(data.timer)
      store.getState().resumeTimer()
      fake.setNow(store.getState().timer.endAt!)
      store.getState().syncTimer()
      expect(store.getState().assembly.currentStage).toBe(5)
      expect(store.getState().unlockedParts).toContain(`${id}:hips`)
      expect(store.getState().unlockedParts).not.toContain(`${id}:left-leg`)
      const again = createAppStore(fake.dependencies)
      await initializeAppStore(again)
      expect(again.getState().assembly.currentStage).toBe(5)
    },
  )

  it.each(['PART_REWARD', 'BREAK'] as const)(
    'does not replay an old paired-leg %s as the right-leg reward',
    async (phase) => {
      const fake = app(),
        store = await restore(fake, old(fake, 'wing-zero-ew', 5, phase))
      expect(store.getState().phase).toBe('READY')
      expect(store.getState().assembly.currentStage).toBe(7)
      expect(store.getState().unlockedParts).not.toContain('wing-zero-ew:wings')
    },
  )

  it('preserves completed wing identities, wings and actual six-session archive statistics', async () => {
    const fake = app(),
      data = old(fake, 'wing-zero-ew', 6, 'COMPLETE')
    data.currentBuildId = 'wing-complete'
    data.hangar = [
      {
        id: data.currentBuildId,
        mechaId: 'wing-zero-ew',
        mechaName: '飞翼零式 EW',
        completedAt: 100,
        completedFocusSessions: 6,
        totalFocusedMinutes: 150,
      },
    ]
    const store = await restore(fake, data)
    expect(store.getState().phase).toBe('COMPLETE')
    expect(store.getState().currentBuildId).toBe(data.currentBuildId)
    expect(store.getState().hangar).toEqual(data.hangar)
    expect(store.getState().assembly).toMatchObject({ currentStage: 8, completedFocusSessions: 6 })
    expect(store.getState().unlockedParts).toContain('wing-zero-ew:wings')
  })

  it.each(['mecha-01', 'mecha-02'])(
    'does not split v6 hips-only progress again on %s',
    async (id) => {
      const fake = app(),
        data = old(fake, id)
      data.assembly.totalStages = 7
      data.unlockedParts = [
        ...MODULAR_PART_SLOTS.slice(0, 5).map((slot) => `${id}:${slot}`),
        `${id}:legs`,
      ]
      const store = await restore(fake, data)
      expect(store.getState().assembly.currentStage).toBe(5)
      expect(store.getState().unlockedParts).toEqual(data.unlockedParts)
    },
  )

  it('saves all seven model origins in v4, preserves v2 history and never grants parts from recipes', async () => {
    const fake = app(),
      data = old(fake, 'mecha-03', 0)
    const composition = Object.fromEntries(
      MODULAR_PART_SLOTS.map((slot, i) => [slot, `${bundledCatalog.list()[i].id}:${slot}`]),
    ) as Composition
    data.hangar = [
      {
        id: 'v2',
        kind: 'custom',
        mechaId: 'custom',
        mechaName: '历史',
        composition: Object.fromEntries(
          MODULAR_PART_SLOTS.map((slot) => [slot, `mecha-01:${slot}`]),
        ) as Composition,
        assemblyProfile: 'standard-front-v2',
        completedAt: null,
        completedFocusSessions: 0,
        totalFocusedMinutes: 0,
      },
    ]
    const store = await restore(fake, data)
    expect(store.getState().unlockedParts).toEqual([])
    store.setState({ unlockedParts: getPartDefinitions(bundledCatalog).map((part) => part.id) })
    const owned = [...store.getState().unlockedParts]
    for (const slot of MODULAR_PART_SLOTS)
      store.getState().selectWorkbenchPart(slot, composition[slot]!)
    store.getState().saveCustomBuild()
    store.getState().saveCustomBuild()
    expect(store.getState().hangar).toHaveLength(2)
    expect(store.getState().hangar[0]).toMatchObject({
      composition,
      assemblyProfile: 'standard-front-v4',
      completedFocusSessions: 0,
      totalFocusedMinutes: 0,
    })
    expect(store.getState().hangar[1]).toEqual(data.hangar[0])
    expect(store.getState().unlockedParts).toEqual(owned)
  })
})
