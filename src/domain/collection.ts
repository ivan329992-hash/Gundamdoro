/** 【领域·收集】零件收集规则：能否换机型、是否集齐、收集下一件。不负责切相位。 */
import type { AppData, AssemblyState, MechaManifest } from './types'

export function canSelectMecha(state: Pick<AppData, 'phase' | 'assembly'>): boolean {
  return (
    state.phase === 'COMPLETE' || (state.phase === 'READY' && state.assembly.currentStage === 0)
  )
}

export function createCollection(mecha: MechaManifest): AssemblyState {
  return {
    mechaId: mecha.id,
    currentStage: 0,
    totalStages: mecha.totalStages,
    completedFocusSessions: 0,
  }
}

export function isCollectionComplete(assembly: AssemblyState): boolean {
  return assembly.currentStage >= assembly.totalStages
}

export function collectNextPart(assembly: AssemblyState): AssemblyState {
  return {
    ...assembly,
    currentStage: Math.min(assembly.totalStages, assembly.currentStage + 1),
    completedFocusSessions: assembly.completedFocusSessions + 1,
  }
}
