import { describe, expect, it, vi } from 'vitest'
import { createUserModelLibrary, type StoredUserModel, type UserModelRepository } from '../adapters/catalog/userModelLibrary'
import { draftModel } from '../test/userModels'
import { createUserModelPackage } from '../domain/userModels'
import { createFakeApp } from '../test/fakeApp'
import { createAppStore, initializeAppStore } from './createAppStore'
import { APP_STORAGE_KEY } from '../application/snapshot'
import { supportsAssemblyPart } from '../domain/assembly'
import { getPartDefinitions } from '../domain/inventory'

function setup() {
  const fake = createFakeApp()
  const records: StoredUserModel[] = []
  const repository: UserModelRepository = {
    load: vi.fn(async () => [...records]),
    save: vi.fn(async (model) => {
      const record = { manifest: model.manifest, assets: Object.fromEntries(Object.keys(model.images).map((name) => [name, `local:${model.manifest.id}/${name}`])) }
      records.push(record)
      return record
    }),
  }
  const makeLibrary = () => createUserModelLibrary(fake.dependencies.catalog, { resolve: () => 'bundled:image' }, repository)
  const library = makeLibrary()
  const dependencies = { ...fake.dependencies, catalog: library.catalog, models: library.library }
  const store = createAppStore(dependencies)
  return { fake, records, repository, library, dependencies, store, makeLibrary }
}

describe('runtime user models and persisted progress', () => {
  it('registers only after a successful save without altering state, awarding parts or replacing builtins', async () => {
    const { store, library, repository } = setup()
    await initializeAppStore(store)
    const previous = store.getState()
    const id = await store.getState().importModel(draftModel())
    expect(store.getState()).toBe(previous)
    expect(repository.save).toHaveBeenCalledTimes(1)
    expect(library.catalog.list()).toHaveLength(2)
    expect(library.catalog.find('test-model')).not.toBeNull()
    expect(library.assets.resolve(id, 'part-1.png')).toBe(`local:${id}/part-1.png`)
    expect(library.assets.resolve('test-model', 'parts/core.png')).toBe('bundled:image')
    expect(getPartDefinitions(library.catalog).filter((part) => part.mechaId === id).some((part) => supportsAssemblyPart(part, { profile: 'standard-front-v4', modelIds: ['test-model'] }))).toBe(false)
  })

  it.each(['FOCUS', 'PART_REWARD', 'BREAK', 'ASSEMBLY'] as const)('rejects imports in %s before persistence', async (phase) => {
    const { store, repository } = setup()
    store.setState({ phase })
    await expect(store.getState().importModel(draftModel())).rejects.toThrow('待机')
    expect(repository.save).not.toHaveBeenCalled()
  })

  it('keeps the catalog and progress unchanged after persistence failure and permits retry', async () => {
    const { store, repository, library } = setup()
    await initializeAppStore(store)
    vi.mocked(repository.save).mockRejectedValueOnce(new Error('disk full'))
    const original = store.getState()
    await expect(store.getState().importModel(draftModel())).rejects.toThrow('disk full')
    expect(store.getState()).toBe(original)
    expect(library.catalog.list()).toHaveLength(1)
    await store.getState().importModel(draftModel())
    expect(library.catalog.list()).toHaveLength(2)
  })

  it('loads the model library before hydrating an active imported model and restores paused timer identity', async () => {
    const context = setup()
    const id = await context.store.getState().importModel(draftModel())
    context.store.getState().selectMecha(id)
    context.store.getState().startFocus(1000)
    context.store.getState().pauseTimer(2000)
    const timer = context.store.getState().timer
    const next = context.makeLibrary()
    const store = createAppStore({ ...context.fake.dependencies, catalog: next.catalog, models: next.library })
    expect(next.catalog.find(id)).toBeNull()
    await initializeAppStore(store)
    expect(next.catalog.find(id)).not.toBeNull()
    expect(store.getState().assembly.mechaId).toBe(id)
    expect(store.getState().timer).toEqual(timer)
    expect(store.getState().phase).toBe('FOCUS')
    await initializeAppStore(store)
    expect(context.repository.load).toHaveBeenCalledTimes(2)
  })

  it('collects one user component per focus, manually assembles once and retains it after reload and Build Again', async () => {
    const context = setup()
    const { store } = context
    const id = await store.getState().importModel(draftModel())
    store.getState().selectMecha(id)
    for (let i = 0; i < 3; i++) {
      store.getState().startFocus(1000)
      const { sessionId, endAt } = store.getState().timer
      store.getState().completeFocus(sessionId!, endAt!)
      store.getState().completeFocus(sessionId!, endAt!)
      expect(store.getState().unlockedParts).toHaveLength(i + 1)
      store.getState().finishPartReveal(endAt!)
      store.getState().endBreak()
    }
    expect(store.getState().phase).toBe('READY')
    expect(store.getState().totalFocusedMinutes).toBe(75)
    expect(store.getState().unlockedParts).toEqual([`${id}:part-1`, `${id}:part-2`, `${id}:part-3`])
    store.getState().startAssembly()
    store.getState().finishAssemblyAnimation()
    store.getState().finishAssemblyAnimation()
    expect(store.getState().hangar).toHaveLength(1)
    expect(store.getState().hangar[0]).toMatchObject({ mechaId: id, completedFocusSessions: 3, totalFocusedMinutes: 75 })
    const next = context.makeLibrary()
    const restored = createAppStore({ ...context.fake.dependencies, catalog: next.catalog, models: next.library })
    await initializeAppStore(restored)
    expect(restored.getState().phase).toBe('COMPLETE')
    restored.getState().resetMecha()
    expect(restored.getState().assembly.mechaId).toBe(id)
    expect(restored.getState().hangar).toHaveLength(1)
    expect(restored.getState().unlockedParts).toHaveLength(3)
    const saved = JSON.parse(context.fake.values.get(APP_STORAGE_KEY)!)
    expect(saved.version).toBe(8)
    expect(Object.keys(saved.state)).toHaveLength(10)
    expect(saved.state.importModel).toBeUndefined()
  })

  it('does not hydrate, recover or overwrite the app snapshot if the resource library fails', async () => {
    const { store, repository, fake } = setup()
    fake.values.set(APP_STORAGE_KEY, 'original snapshot')
    vi.mocked(repository.load).mockRejectedValueOnce(new Error('resource unavailable'))
    const write = vi.spyOn(fake.storage, 'setItem')
    await expect(initializeAppStore(store)).rejects.toThrow('resource unavailable')
    expect(store.persist.hasHydrated()).toBe(false)
    expect(write).not.toHaveBeenCalled()
    expect(fake.values.get(APP_STORAGE_KEY)).toBe('original snapshot')
  })

  it('retries resource loading without replacing a valid catalog with a corrupt package', async () => {
    const context = setup()
    context.records.push({ manifest: { id: 'mecha-01' }, assets: {} })
    await expect(context.library.library.load()).rejects.toThrow()
    expect(context.library.catalog.list()).toHaveLength(1)
    const model = createUserModelPackage(draftModel(), 'user-restored')
    context.records.splice(0, 1, { manifest: model.manifest, assets: Object.fromEntries(Object.keys(model.images).map((name) => [name, 'local:image'])) })
    await context.library.library.load()
    expect(context.library.catalog.find('user-restored')).not.toBeNull()
  })
})
