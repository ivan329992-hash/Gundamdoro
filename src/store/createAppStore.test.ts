import { describe, expect, it, vi } from 'vitest'
import { APP_STORAGE_KEY, APP_STORAGE_VERSION } from '../application/snapshot'
import { createDefaultData } from '../application/state'
import { createFakeApp } from '../test/fakeApp'
import { createAppStore, initializeAppStore } from './createAppStore'

describe('storage adapter contract', () => {
  it('writes a version-4 envelope and excludes actions and platform dependencies', () => {
    const fake = createFakeApp()
    const store = createAppStore(fake.dependencies)
    store.getState().startFocus()
    const saved = JSON.parse(fake.values.get(APP_STORAGE_KEY)!)
    expect(APP_STORAGE_KEY).toBe('gundamdoro-app-state')
    expect(saved.version).toBe(APP_STORAGE_VERSION)
    expect(saved.version).toBe(4)
    expect(Object.keys(saved.state).sort()).toEqual(Object.keys(createDefaultData(fake.dependencies)).sort())
    expect(saved.state.startFocus).toBeUndefined()
    expect(saved.state.runtime).toBeUndefined()
    expect(saved.state.timer.sessionId).toBe('test-id-1')
  })

  it('awaits asynchronous hydration before reconstructing an expired focus', async () => {
    const fake = createFakeApp()
    const data = createDefaultData(fake.dependencies)
    data.phase = 'FOCUS'
    data.timer = { status: 'running', durationMs: 60_000, remainingMs: 60_000, startedAt: 0, endAt: 60_000, sessionId: 'old-session' }
    let resolveRead!: (value: string | null) => void
    const read = new Promise<string | null>((resolve) => { resolveRead = resolve })
    const store = createAppStore({
      ...fake.dependencies,
      storage: () => ({ ...fake.storage, getItem: () => read }),
    })
    fake.setNow(70_000)
    const initialization = initializeAppStore(store)
    expect(store.getState().phase).toBe('READY')
    expect(store.persist.hasHydrated()).toBe(false)
    resolveRead(JSON.stringify({ state: data, version: 2 }))
    await initialization
    expect(store.persist.hasHydrated()).toBe(true)
    expect(store.getState().phase).toBe('PART_REWARD')
    expect(store.getState().assembly.currentStage).toBe(1)
    expect(store.getState().lastProcessedFocusSessionId).toBe('old-session')
    store.getState().recoverState()
    expect(store.getState().assembly.currentStage).toBe(1)
  })

  it('restores synchronous storage with the same IDs and records across instances', async () => {
    const fake = createFakeApp()
    const first = createAppStore(fake.dependencies)
    first.setState({ assembly: { mechaId: 'test-model', currentStage: 3, totalStages: 3, completedFocusSessions: 3 }, totalFocusedMinutes: 75 })
    first.getState().startAssembly()
    first.getState().finishAssemblyAnimation()
    const saved = first.getState().hangar[0]
    const restored = createAppStore(fake.dependencies)
    await initializeAppStore(restored)
    expect(restored.getState().phase).toBe('COMPLETE')
    expect(restored.getState().hangar).toEqual([saved])
    restored.getState().resetMecha()
    expect(restored.getState().hangar).toEqual([saved])
  })

  it('does not overwrite an unparseable snapshot or recover from defaults', async () => {
    const fake = createFakeApp()
    const original = '{"state":{"hangar":['
    fake.values.set(APP_STORAGE_KEY, original)
    const write = vi.spyOn(fake.storage, 'setItem')
    const remove = vi.spyOn(fake.storage, 'removeItem')
    const store = createAppStore(fake.dependencies)

    await expect(initializeAppStore(store)).rejects.toThrow()
    expect(store.persist.hasHydrated()).toBe(false)
    expect(write).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
    expect(fake.values.get(APP_STORAGE_KEY)).toBe(original)
  })

  it('retries a failed storage read without losing collection or hangar records', async () => {
    const fake = createFakeApp()
    const data = createDefaultData(fake.dependencies)
    data.assembly.currentStage = 2
    data.hangar = [{ id: 'existing-build', mechaId: 'test-model', mechaName: 'TEST MODEL', completedAt: 100, completedFocusSessions: 3, totalFocusedMinutes: 75 }]
    const original = JSON.stringify({ state: data, version: 2 })
    fake.values.set(APP_STORAGE_KEY, original)
    const read = vi.spyOn(fake.storage, 'getItem').mockImplementationOnce(() => { throw new Error('Storage unavailable') })
    const write = vi.spyOn(fake.storage, 'setItem')
    const store = createAppStore(fake.dependencies)

    await expect(initializeAppStore(store)).rejects.toThrow()
    expect(write).not.toHaveBeenCalled()
    expect(fake.values.get(APP_STORAGE_KEY)).toBe(original)
    await initializeAppStore(store)
    expect(read).toHaveBeenCalledTimes(2)
    expect(store.getState().assembly.currentStage).toBe(2)
    expect(store.getState().hangar).toEqual(data.hangar)
  })

  it('rejects asynchronous read failures without saving default state', async () => {
    const fake = createFakeApp()
    const write = vi.spyOn(fake.storage, 'setItem')
    const store = createAppStore({
      ...fake.dependencies,
      storage: () => ({ ...fake.storage, getItem: async () => { throw new Error('Read failed') } }),
    })

    await expect(initializeAppStore(store)).rejects.toThrow()
    expect(write).not.toHaveBeenCalled()
    expect(store.persist.hasHydrated()).toBe(false)
  })

  it('can retry when acquiring storage initially fails', async () => {
    const fake = createFakeApp()
    let unavailable = true
    const store = createAppStore({
      ...fake.dependencies,
      storage: () => {
        if (unavailable) throw new Error('Access denied')
        return fake.storage
      },
    })

    await expect(initializeAppStore(store)).rejects.toThrow()
    expect(fake.values.size).toBe(0)
    unavailable = false
    await initializeAppStore(store)
    expect(store.persist.hasHydrated()).toBe(true)
    expect(store.getState().phase).toBe('READY')
  })

  it('does not downgrade and overwrite snapshots from a newer app', async () => {
    const fake = createFakeApp()
    const original = JSON.stringify({ state: { ...createDefaultData(fake.dependencies), futureInventory: ['rare-part'] }, version: APP_STORAGE_VERSION + 1 })
    fake.values.set(APP_STORAGE_KEY, original)
    const write = vi.spyOn(fake.storage, 'setItem')
    const store = createAppStore(fake.dependencies)

    await expect(initializeAppStore(store)).rejects.toThrow()
    expect(write).not.toHaveBeenCalled()
    expect(fake.values.get(APP_STORAGE_KEY)).toBe(original)
  })

  it('awaits startup recovery writes and permits retry after a rejected write', async () => {
    const fake = createFakeApp()
    const data = createDefaultData(fake.dependencies)
    data.phase = 'FOCUS'
    data.timer = { status: 'running', durationMs: 60_000, remainingMs: 60_000, startedAt: 0, endAt: 60_000, sessionId: 'expired-session' }
    fake.values.set(APP_STORAGE_KEY, JSON.stringify({ state: data, version: APP_STORAGE_VERSION }))
    fake.setNow(70_000)
    const store = createAppStore({
      ...fake.dependencies,
      storage: () => ({ ...fake.storage, setItem: async () => { throw new Error('Write failed') } }),
    })

    await expect(initializeAppStore(store)).rejects.toThrow('Write failed')
    expect(store.getState().assembly.currentStage).toBe(1)
    expect(store.getState().lastProcessedFocusSessionId).toBe('expired-session')
    store.persist.setOptions({ storage: {
      getItem: () => ({ state: data, version: 2 }),
      setItem: (key, value) => { fake.storage.setItem(key, JSON.stringify(value)) },
      removeItem: fake.storage.removeItem,
    } })
    await initializeAppStore(store)
    expect(store.getState().assembly.currentStage).toBe(1)
    expect(JSON.parse(fake.values.get(APP_STORAGE_KEY)!).state.assembly.currentStage).toBe(1)
  })

  it('does not finish initialization while the recovery write is pending', async () => {
    const fake = createFakeApp()
    let resolveWrite!: () => void
    const pendingWrite = new Promise<void>((resolve) => { resolveWrite = resolve })
    const write = vi.fn(() => pendingWrite)
    const store = createAppStore({
      ...fake.dependencies,
      storage: () => ({ ...fake.storage, setItem: write }),
    })
    let finished = false
    const initialization = initializeAppStore(store).then(() => { finished = true })

    await vi.waitFor(() => expect(write).toHaveBeenCalledOnce())
    expect(store.persist.hasHydrated()).toBe(true)
    expect(finished).toBe(false)
    resolveWrite()
    await initialization
    expect(finished).toBe(true)
  })
})
