/** 【应用·入库】最终拼装完成后，把当前建造写入 hangar（幂等）。 */
import { addCompletedBuild } from '../domain/hangar'
import type { AppData } from '../domain/types'
import type { AppDependencies } from './ports'

export function archiveCompletedBuild(state: AppData, completedAt: number | null, dependencies: AppDependencies): AppData {
  const id = state.currentBuildId ?? dependencies.runtime.newId()
  if (state.hangar.some((entry) => entry.id === id)) return { ...state, currentBuildId: id }
  return {
    ...state,
    currentBuildId: id,
    hangar: addCompletedBuild(state.hangar, {
      id,
      mechaId: state.assembly.mechaId,
      mechaName: dependencies.catalog.find(state.assembly.mechaId)?.name ?? state.assembly.mechaId,
      completedAt,
      completedFocusSessions: state.assembly.completedFocusSessions,
      totalFocusedMinutes: state.totalFocusedMinutes,
    }),
  }
}
