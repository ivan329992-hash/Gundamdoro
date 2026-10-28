/** 【Store·工厂】Zustand + persist：把 useCases 挂成 actions；initialize 负责水合后再 recover。 */
import { create, type StateCreator } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { AppDependencies } from '../application/ports'
import { APP_STORAGE_KEY, APP_STORAGE_VERSION, createSnapshotCodec } from '../application/snapshot'
import { createDefaultData } from '../application/state'
import { createAppUseCases } from '../application/useCases'
import type { AppData, AppState } from '../domain/types'
import { createWorkbenchUseCases } from '../application/workbench'
import { importUserModel } from '../application/importModel'
import type { UserModelLibrary } from '../application/ports'
import { trackPersistence } from './persistence'
import { collectLocalBackup, prepareBackupPlan, restoreBackupModels } from '../application/backup'
import { canUseBackup, canonicalBackupJson } from '../domain/backup'

const libraries = new WeakMap<object, UserModelLibrary>()
const persistenceControllers = new WeakMap<object, ReturnType<typeof trackPersistence>>()

export function createAppStore(dependencies: AppDependencies) {
  const useCases = createAppUseCases(dependencies)
  const codec = createSnapshotCodec(dependencies)
  const workbench = createWorkbenchUseCases(dependencies)
  let updateStatus = (_status: AppState['persistenceStatus']) => {}
  let updateBackupRuntime = (
    _value: Partial<Pick<AppState, 'backupOperation' | 'backupPlan'>>,
  ) => {}
  let applyRestoredData = (_data: AppData) => {}
  const persistence = trackPersistence(
    createJSONStorage<AppData>(() => ({
      getItem: (key) => dependencies.storage().getItem(key),
      setItem: (key, value) => dependencies.storage().setItem(key, value),
      removeItem: (key) => dependencies.storage().removeItem(key),
    }))!,
    (status) => updateStatus(status),
  )
  const persistedState = persist<AppState, [], [], AppData>(
    (set, get) => {
      const change = (transition: (state: AppState) => AppData) => {
        if (get().backupOperation === 'idle') return set(transition)
      }
      const requireBackup = () => {
        if (get().backupOperation !== 'idle') throw new Error('数据操作正在进行，请稍候。')
        if (!canUseBackup(get().phase)) throw new Error('请在待机或制作完成后操作备份。')
        if (!dependencies.backup) throw new Error('当前环境不支持本地备份。')
        return dependencies.backup
      }
      return {
        ...createDefaultData(dependencies),
        persistenceStatus: 'saved',
        backupOperation: 'idle',
        backupPlan: null,
        exportBackup: async () => {
          const files = requireBackup()
          updateBackupRuntime({ backupOperation: 'exporting' })
          try {
            return await files.encode(await collectLocalBackup(get(), dependencies))
          } finally {
            updateBackupRuntime({ backupOperation: 'idle' })
          }
        },
        inspectBackup: async (bytes) => {
          const files = requireBackup()
          updateBackupRuntime({ backupOperation: 'checking', backupPlan: null })
          try {
            const plan = await prepareBackupPlan(await files.decode(bytes), get(), dependencies)
            updateBackupRuntime({ backupPlan: plan })
          } finally {
            updateBackupRuntime({ backupOperation: 'idle' })
          }
        },
        restoreBackup: async () => {
          requireBackup()
          const plan = get().backupPlan
          if (!plan) throw new Error('请先选择并校验备份。')
          if (canonicalBackupJson(codec.encode(get())) !== plan.baseline) {
            updateBackupRuntime({ backupPlan: null })
            throw new Error('当前进度已经变化，请重新选择备份确认。')
          }
          updateBackupRuntime({ backupOperation: 'restoring' })
          try {
            await restoreBackupModels(plan.backup, dependencies)
            await persistence.replace(APP_STORAGE_KEY, {
              state: plan.data,
              version: APP_STORAGE_VERSION,
            })
            applyRestoredData(plan.data)
            updateBackupRuntime({ backupPlan: null })
          } catch (cause) {
            throw new Error(
              `恢复未完成，当前进度未替换。${cause instanceof Error ? cause.message : String(cause)} 已补充的机型素材会保留，可重试。`,
            )
          } finally {
            updateBackupRuntime({ backupOperation: 'idle' })
          }
        },
        clearBackupPreview: () => {
          if (get().backupOperation === 'idle') updateBackupRuntime({ backupPlan: null })
        },
        retryPersistence: () => change((state) => state),
        importModel: (draft) => {
          if (get().backupOperation !== 'idle')
            return Promise.reject(new Error('数据操作正在进行，请稍候。'))
          return importUserModel(draft, get().phase, dependencies)
        },
        selectMecha: (mechaId) => change((state) => useCases.selectMecha(state, mechaId)),
        startFocus: (now) => change((state) => useCases.startFocus(state, now)),
        pauseTimer: (now) => change((state) => useCases.pauseTimer(state, now)),
        resumeTimer: (now) => change((state) => useCases.resumeTimer(state, now)),
        cancelTimer: () => change((state) => useCases.cancelTimer(state)),
        abandonBuild: () => change((state) => useCases.abandonBuild(state)),
        completeFocus: (id, now) => change((state) => useCases.completeFocus(state, id, now)),
        completeBreak: (now) => change((state) => useCases.completeBreak(state, now)),
        endBreak: () => change((state) => useCases.endBreak(state)),
        finishPartReveal: (now) => change((state) => useCases.finishPartReveal(state, now)),
        startAssembly: () => change((state) => useCases.startAssembly(state)),
        finishAssemblyAnimation: (now) =>
          change((state) => useCases.finishAssemblyAnimation(state, now)),
        resetMecha: () => change((state) => useCases.resetMecha(state)),
        updateSettings: (settings) => change((state) => useCases.updateSettings(state, settings)),
        recoverState: (now) => change((state) => useCases.recoverState(state, now)),
        syncTimer: (now) => change((state) => useCases.syncTimer(state, now)),
        prepareWorkbench: () => change((state) => workbench.prepareWorkbench(state)),
        selectWorkbenchPart: (slot, partId) =>
          change((state) => workbench.selectWorkbenchPart(state, slot, partId)),
        clearWorkbenchPart: (slot) => change((state) => workbench.clearWorkbenchPart(state, slot)),
        setWorkbenchName: (name) => change((state) => workbench.setWorkbenchName(state, name)),
        randomizeWorkbench: () => change((state) => workbench.randomizeWorkbench(state)),
        saveCustomBuild: () => change((state) => workbench.saveCustomBuild(state)),
      }
    },
    {
      name: APP_STORAGE_KEY,
      version: APP_STORAGE_VERSION,
      storage: persistence.storage,
      migrate: codec.migrate,
      partialize: codec.encode,
      merge: (saved, current) => ({ ...current, ...codec.decode(saved) }),
      skipHydration: true,
    },
  )
  const initializeState: StateCreator<AppState, [], [['zustand/persist', AppData]]> = (
    set,
    get,
    api,
  ) => {
    // 绕过 persist 更新运行期状态，避免状态提示再次触发保存。
    updateStatus = (status) => {
      if (get().persistenceStatus !== status) set({ persistenceStatus: status })
    }
    updateBackupRuntime = (value) => set(value)
    applyRestoredData = (data) => set(data)
    return persistedState(set, get, api)
  }
  const store = create<AppState>()(initializeState)
  persistenceControllers.set(store, persistence)
  if (dependencies.models) libraries.set(store, dependencies.models)
  return store
}

export async function initializeAppStore(store: ReturnType<typeof createAppStore>): Promise<void> {
  const persistence = persistenceControllers.get(store)
  persistence?.setStrict(true)
  try {
    await libraries.get(store)?.load()
    if (!store.persist) throw new Error('Local storage is unavailable')
    if (!store.persist.hasHydrated()) await store.persist.rehydrate()
    if (!store.persist.hasHydrated()) throw new Error('Could not load the saved app state')
    await store.getState().recoverState()
  } finally {
    persistence?.setStrict(false)
  }
}
