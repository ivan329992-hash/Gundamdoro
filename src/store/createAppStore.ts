/** 【Store·工厂】Zustand + persist：把 useCases 挂成 actions；initialize 负责水合后再 recover。 */
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { AppDependencies } from '../application/ports'
import { APP_STORAGE_KEY, APP_STORAGE_VERSION, createSnapshotCodec } from '../application/snapshot'
import { createDefaultData } from '../application/state'
import { createAppUseCases } from '../application/useCases'
import type { AppData, AppState } from '../domain/types'
import { createWorkbenchUseCases } from '../application/workbench'

export function createAppStore(dependencies: AppDependencies) {
  const useCases = createAppUseCases(dependencies)
  const codec = createSnapshotCodec(dependencies)
  const workbench = createWorkbenchUseCases(dependencies)
  return create<AppState>()(persist<AppState, [], [], AppData>(
    (set) => ({
      ...createDefaultData(dependencies),
      selectMecha: (mechaId) => set((state) => useCases.selectMecha(state, mechaId)),
      startFocus: (now) => set((state) => useCases.startFocus(state, now)),
      pauseTimer: (now) => set((state) => useCases.pauseTimer(state, now)),
      resumeTimer: (now) => set((state) => useCases.resumeTimer(state, now)),
      cancelTimer: () => set((state) => useCases.cancelTimer(state)),
      abandonBuild: () => set((state) => useCases.abandonBuild(state)),
      completeFocus: (id, now) => set((state) => useCases.completeFocus(state, id, now)),
      startBreak: (now) => set((state) => useCases.startBreak(state, now)),
      completeBreak: (now) => set((state) => useCases.completeBreak(state, now)),
      endBreak: () => set((state) => useCases.endBreak(state)),
      finishPartReveal: (now) => set((state) => useCases.finishPartReveal(state, now)),
      startAssembly: () => set((state) => useCases.startAssembly(state)),
      finishAssemblyAnimation: (now) => set((state) => useCases.finishAssemblyAnimation(state, now)),
      resetMecha: () => set((state) => useCases.resetMecha(state)),
      updateSettings: (settings) => set((state) => useCases.updateSettings(state, settings)),
      recoverState: (now) => set((state) => useCases.recoverState(state, now)),
      syncTimer: (now) => set((state) => useCases.syncTimer(state, now)),
      prepareWorkbench: () => set((state) => workbench.prepareWorkbench(state)),
      selectWorkbenchPart: (slot, partId) => set((state) => workbench.selectWorkbenchPart(state, slot, partId)),
      clearWorkbenchPart: (slot) => set((state) => workbench.clearWorkbenchPart(state, slot)),
      setWorkbenchName: (name) => set((state) => workbench.setWorkbenchName(state, name)),
      randomizeWorkbench: () => set((state) => workbench.randomizeWorkbench(state)),
      saveCustomBuild: () => set((state) => workbench.saveCustomBuild(state)),
    }),
    {
      name: APP_STORAGE_KEY,
      version: APP_STORAGE_VERSION,
      storage: createJSONStorage(() => ({
        getItem: (key) => dependencies.storage().getItem(key),
        setItem: (key, value) => dependencies.storage().setItem(key, value),
        removeItem: (key) => dependencies.storage().removeItem(key),
      })),
      migrate: codec.migrate,
      partialize: codec.encode,
      merge: (saved, current) => ({ ...current, ...codec.decode(saved) }),
      skipHydration: true,
    },
  ))
}

export async function initializeAppStore(store: ReturnType<typeof createAppStore>): Promise<void> {
  if (!store.persist) throw new Error('Local storage is unavailable')
  if (!store.persist.hasHydrated()) await store.persist.rehydrate()
  if (!store.persist.hasHydrated()) throw new Error('Could not load the saved app state')
  await store.getState().recoverState()
}
