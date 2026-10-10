import { canUseWorkbench, equalComposition, getPartDefinitions, isCompositionComplete, PART_SLOTS } from '../domain/inventory'
import { addCompletedBuild } from '../domain/hangar'
import type { AppData, DraftComposition, PartSlot } from '../domain/types'
import type { AppDependencies } from './ports'

export function createWorkbenchUseCases({ catalog, runtime }: AppDependencies) {
  const choices = (state: AppData, slot: PartSlot) => getPartDefinitions(catalog)
    .filter((part) => part.slot === slot && state.unlockedParts.includes(part.id))

  function withParts(state: AppData, parts: DraftComposition): AppData {
    if (equalComposition(state.workbench.parts, parts) && (state.workbench.id || !Object.keys(parts).length)) return state
    return { ...state, workbench: { ...state.workbench, id: runtime.newId(), parts } }
  }

  function prepareWorkbench(state: AppData): AppData {
    if (!canUseWorkbench(state.phase)) return state
    const parts = { ...state.workbench.parts }
    for (const slot of PART_SLOTS) {
      if (!parts[slot]) {
        const first = choices(state, slot)[0]
        if (first) parts[slot] = first.id
      }
    }
    return withParts(state, parts)
  }

  function selectWorkbenchPart(state: AppData, slot: PartSlot, partId: string): AppData {
    if (!canUseWorkbench(state.phase) || !choices(state, slot).some((part) => part.id === partId)) return state
    return withParts(state, { ...state.workbench.parts, [slot]: partId })
  }

  function setWorkbenchName(state: AppData, value: string): AppData {
    if (!canUseWorkbench(state.phase)) return state
    const name = Array.from(value).slice(0, 40).join('')
    if (state.workbench.name === name) return state
    return { ...state, workbench: { ...state.workbench, id: runtime.newId(), name } }
  }

  function randomizeWorkbench(state: AppData): AppData {
    if (!canUseWorkbench(state.phase)) return state
    const parts: DraftComposition = {}
    for (const slot of PART_SLOTS) {
      const available = choices(state, slot)
      if (!available.length) continue
      const sample = runtime.random()
      const index = Number.isFinite(sample) ? Math.min(available.length - 1, Math.max(0, Math.floor(sample * available.length))) : 0
      parts[slot] = available[index].id
    }
    return withParts(state, parts)
  }

  function saveCustomBuild(state: AppData): AppData {
    const draft = state.workbench
    if (!canUseWorkbench(state.phase) || !draft.id || !draft.name.trim()
      || !isCompositionComplete(draft.parts, state.unlockedParts, catalog)
      || state.hangar.some((entry) => entry.id === draft.id)) return state
    return { ...state, hangar: addCompletedBuild(state.hangar, {
      id: draft.id, kind: 'custom', mechaId: 'custom', mechaName: draft.name.trim(),
      completedAt: runtime.now(), completedFocusSessions: 0, totalFocusedMinutes: 0,
      composition: { ...draft.parts },
    }) }
  }

  return { prepareWorkbench, selectWorkbenchPart, setWorkbenchName, randomizeWorkbench, saveCustomBuild }
}
