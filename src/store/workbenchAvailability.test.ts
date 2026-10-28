import { describe, expect, it } from 'vitest'
import { createAppStore, initializeAppStore } from './createAppStore'
import { createBackupFake } from '../test/backup'
import { APP_STORAGE_KEY } from '../application/snapshot'

describe('paused workbench', () => {
  it('blocks workbench actions while keeping progress, draft and backup compatibility', async () => {
    const fake = createBackupFake()
    const enabled = createAppStore(fake.dependencies)
    await initializeAppStore(enabled)
    enabled.getState().setWorkbenchName('保留的草稿')
    const saved = fake.values.get(APP_STORAGE_KEY)
    const store = createAppStore({ ...fake.dependencies, workbenchEnabled: false })
    await initializeAppStore(store)
    const before = store.getState().workbench
    store.getState().prepareWorkbench()
    store.getState().setWorkbenchName('不应改名')
    store.getState().selectWorkbenchPart('head', 'mecha-01:head')
    store.getState().clearWorkbenchPart('wings')
    store.getState().randomizeWorkbench()
    store.getState().saveCustomBuild()
    expect(store.getState().workbench).toBe(before)
    expect(fake.values.get(APP_STORAGE_KEY)).toBe(saved)
    const backup = await store.getState().exportBackup()
    await store.getState().inspectBackup(backup)
    await store.getState().restoreBackup()
    expect(store.getState().workbench.name).toBe('保留的草稿')
    store.getState().startFocus()
    expect(store.getState().phase).toBe('FOCUS')
  })
})
