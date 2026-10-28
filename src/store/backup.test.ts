import { describe, expect, it, vi } from 'vitest'
import { createBackupFake } from '../test/backup'
import { createAppStore, initializeAppStore } from './createAppStore'
import { APP_STORAGE_KEY } from '../application/snapshot'
import { createUserModelPackage } from '../domain/userModels'
import { draftModel } from '../test/userModels'

describe('backup store actions and transactional progress replacement', () => {
  it('round-trips progress without persisting backup runtime state and preserves it after restart', async () => {
    const fake = createBackupFake()
    const store = createAppStore(fake.dependencies)
    await initializeAppStore(store)
    store.getState().updateSettings({ focusMinutes: 13 })
    const archive = await store.getState().exportBackup()
    store.getState().updateSettings({ focusMinutes: 45 })
    await store.getState().inspectBackup(archive)
    expect(store.getState().settings.focusMinutes).toBe(45)
    await store.getState().restoreBackup()
    expect(store.getState().settings.focusMinutes).toBe(13)
    const saved = JSON.parse(fake.values.get(APP_STORAGE_KEY)!).state
    expect(saved.backupOperation).toBeUndefined()
    expect(saved.backupPlan).toBeUndefined()
    expect(Object.keys(saved)).toHaveLength(10)
    const restarted = createAppStore(fake.dependencies)
    await initializeAppStore(restarted)
    expect(restarted.getState().settings.focusMinutes).toBe(13)
    expect(restarted.getState().backupPlan).toBeNull()
  })

  it('does not replace live or durable progress when restoring fails and allows retry', async () => {
    const fake = createBackupFake()
    const store = createAppStore(fake.dependencies)
    await initializeAppStore(store)
    const archive = await store.getState().exportBackup()
    store.getState().updateSettings({ focusMinutes: 45 })
    await store.getState().inspectBackup(archive)
    const before = fake.values.get(APP_STORAGE_KEY)
    vi.spyOn(fake.storage, 'setItem').mockImplementationOnce(() => {
      throw new Error('quota')
    })
    await expect(store.getState().restoreBackup()).rejects.toThrow('未替换')
    expect(store.getState().settings.focusMinutes).toBe(45)
    expect(fake.values.get(APP_STORAGE_KEY)).toBe(before)
    expect(store.getState().backupPlan).not.toBeNull()
    await store.getState().restoreBackup()
    expect(store.getState().settings.focusMinutes).toBe(25)
  })

  it('does not allow stale confirmation or active-timer restore/export', async () => {
    const fake = createBackupFake()
    const store = createAppStore(fake.dependencies)
    await initializeAppStore(store)
    const archive = await store.getState().exportBackup()
    await store.getState().inspectBackup(archive)
    store.getState().updateSettings({ focusMinutes: 45 })
    await expect(store.getState().restoreBackup()).rejects.toThrow('已经变化')
    store.getState().startFocus()
    await expect(store.getState().exportBackup()).rejects.toThrow('待机')
    await expect(store.getState().inspectBackup(archive)).rejects.toThrow('待机')
  })

  it('waits for pending writes, locks business actions and prevents heartbeats from writing old data back', async () => {
    const fake = createBackupFake()
    const store = createAppStore(fake.dependencies)
    await initializeAppStore(store)
    const archive = await store.getState().exportBackup()
    store.getState().updateSettings({ focusMinutes: 45 })
    await store.getState().inspectBackup(archive)
    let finishWrite!: () => void
    const original = fake.storage.setItem
    vi.spyOn(fake.storage, 'setItem').mockImplementationOnce(
      (key, value) =>
        new Promise<void>((resolve) => {
          finishWrite = () => {
            original(key, value)
            resolve()
          }
        }),
    )
    const restore = store.getState().restoreBackup()
    await Promise.resolve()
    await Promise.resolve()
    expect(store.getState().backupOperation).toBe('restoring')
    store.getState().syncTimer()
    store.getState().retryPersistence()
    store.getState().updateSettings({ focusMinutes: 99 })
    store.getState().clearBackupPreview()
    expect(store.getState().settings.focusMinutes).toBe(45)
    expect(store.getState().backupPlan).not.toBeNull()
    await expect(store.getState().restoreBackup()).rejects.toThrow('正在进行')
    finishWrite()
    await restore
    expect(store.getState().settings.focusMinutes).toBe(25)
    expect(JSON.parse(fake.values.get(APP_STORAGE_KEY)!).state.settings.focusMinutes).toBe(25)
  })

  it('retains valid progress if a later model copy fails and reuses prior successful copies on retry', async () => {
    const source = createBackupFake()
    for (const id of ['user-one', 'user-two'])
      source.models.set(id, createUserModelPackage(draftModel(), id))
    const sourceStore = createAppStore(source.dependencies)
    await initializeAppStore(sourceStore)
    const archive = await sourceStore.getState().exportBackup()
    const target = createBackupFake()
    const store = createAppStore(target.dependencies)
    await initializeAppStore(store)
    store.getState().updateSettings({ focusMinutes: 45 })
    await store.getState().inspectBackup(archive)
    const before = target.values.get(APP_STORAGE_KEY)
    const save = target.dependencies.models!.save
    vi.spyOn(target.dependencies.models!, 'save').mockImplementation(async (model) => {
      if (model.manifest.id === 'user-two') throw new Error('disk full')
      return save(model)
    })
    await expect(store.getState().restoreBackup()).rejects.toThrow('未替换')
    expect(target.models.size).toBe(1)
    expect(target.values.get(APP_STORAGE_KEY)).toBe(before)
    vi.mocked(target.dependencies.models!.save).mockImplementation(save)
    await store.getState().restoreBackup()
    expect(target.models.size).toBe(2)
    expect(store.getState().settings.focusMinutes).toBe(25)
  })

  it('flushes an earlier asynchronous snapshot before committing the replacement', async () => {
    const fake = createBackupFake()
    const store = createAppStore(fake.dependencies)
    await initializeAppStore(store)
    const archive = await store.getState().exportBackup()
    const writes: (() => void)[] = []
    const original = fake.storage.setItem
    vi.spyOn(fake.storage, 'setItem').mockImplementation(
      (key, value) =>
        new Promise<void>((resolve) => {
          writes.push(() => {
            original(key, value)
            resolve()
          })
        }),
    )
    store.getState().updateSettings({ focusMinutes: 45 })
    await store.getState().inspectBackup(archive)
    const restoring = store.getState().restoreBackup()
    expect(writes).toHaveLength(1)
    writes[0]()
    await vi.waitFor(() => expect(writes).toHaveLength(2))
    expect(JSON.parse(fake.values.get(APP_STORAGE_KEY)!).state.settings.focusMinutes).toBe(45)
    writes[1]()
    await restoring
    store.getState().syncTimer()
    expect(writes).toHaveLength(2)
    expect(JSON.parse(fake.values.get(APP_STORAGE_KEY)!).state.settings.focusMinutes).toBe(25)
  })
})
