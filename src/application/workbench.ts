import {
  canUseWorkbench,
  equalComposition,
  getPartDefinitions,
  getCompositionSlots,
  isCompositionComplete,
  normalizeWorkbenchName,
  PART_SLOTS,
} from '../domain/inventory'
import { addCompletedBuild } from '../domain/hangar'
import { supportsAssembly, supportsAssemblyPart } from '../domain/assembly'
import type { AppData, Composition, DraftComposition, PartSlot } from '../domain/types'
import type { AppDependencies } from './ports'

export function createWorkbenchUseCases({ catalog, runtime, assembly }: AppDependencies) {
  const choices = (state: AppData, slot: PartSlot) =>
    getPartDefinitions(catalog).filter(
      (part) =>
        part.slot === slot &&
        state.unlockedParts.includes(part.id) &&
        supportsAssemblyPart(part, assembly),
    )
  const slots = (parts: DraftComposition) => assembly?.slots ?? getCompositionSlots(parts)
  const selectedSlots = (parts: DraftComposition) => [
    ...slots(parts),
    ...(assembly?.optionalSlots ?? []).filter((slot) => parts[slot]),
  ]

  function withParts(state: AppData, parts: DraftComposition): AppData {
    if (
      equalComposition(state.workbench.parts, parts) &&
      (state.workbench.id || !Object.keys(parts).length)
    )
      return state
    return { ...state, workbench: { ...state.workbench, id: runtime.newId(), parts } }
  }

  function prepareWorkbench(state: AppData): AppData {
    if (!canUseWorkbench(state.phase)) return state
    const parts = { ...state.workbench.parts }
    for (const slot of slots(parts)) {
      if (!parts[slot]) {
        const first = choices(state, slot)[0]
        if (first) parts[slot] = first.id
      }
    }
    return withParts(state, parts)
  }

  function selectWorkbenchPart(state: AppData, slot: PartSlot, partId: string): AppData {
    if (!canUseWorkbench(state.phase) || !choices(state, slot).some((part) => part.id === partId))
      return state
    const parts = { ...state.workbench.parts, [slot]: partId }
    if (
      assembly?.slots &&
      !assembly.slots.includes('legs') &&
      ['hips', 'left-leg', 'right-leg'].includes(slot)
    )
      delete parts.legs
    return withParts(state, parts)
  }

  function setWorkbenchName(state: AppData, value: string): AppData {
    if (!canUseWorkbench(state.phase)) return state
    const name = normalizeWorkbenchName(value)
    if (state.workbench.name === name) return state
    return { ...state, workbench: { ...state.workbench, id: runtime.newId(), name } }
  }

  function clearWorkbenchPart(state: AppData, slot: PartSlot): AppData {
    if (
      !canUseWorkbench(state.phase) ||
      !assembly?.optionalSlots?.includes(slot) ||
      !state.workbench.parts[slot]
    )
      return state
    const parts = { ...state.workbench.parts }
    delete parts[slot]
    return withParts(state, parts)
  }

  function randomizeWorkbench(state: AppData): AppData {
    if (!canUseWorkbench(state.phase)) return state
    const parts: DraftComposition = {}
    for (const slot of assembly?.slots ?? PART_SLOTS) {
      const available = choices(state, slot)
      if (!available.length) continue
      const sample = runtime.random()
      const index = Number.isFinite(sample)
        ? Math.min(available.length - 1, Math.max(0, Math.floor(sample * available.length)))
        : 0
      parts[slot] = available[index].id
    }
    for (const slot of assembly?.optionalSlots ?? []) {
      const available = choices(state, slot)
      if (!available.length) continue
      const sample = runtime.random()
      const index = Number.isFinite(sample)
        ? Math.min(available.length, Math.max(0, Math.floor(sample * (available.length + 1))))
        : 0
      if (index > 0) parts[slot] = available[index - 1].id
    }
    return withParts(state, parts)
  }

  function saveCustomBuild(state: AppData): AppData {
    const draft = state.workbench
    if (
      !canUseWorkbench(state.phase) ||
      !draft.id ||
      !draft.name.trim() ||
      !isCompositionComplete(
        draft.parts,
        state.unlockedParts,
        catalog,
        selectedSlots(draft.parts),
      ) ||
      !supportsAssembly(draft.parts, catalog, assembly) ||
      state.hangar.some((entry) => entry.id === draft.id)
    )
      return state
    return {
      ...state,
      hangar: addCompletedBuild(state.hangar, {
        id: draft.id,
        kind: 'custom',
        mechaId: 'custom',
        mechaName: draft.name.trim(),
        completedAt: runtime.now(),
        completedFocusSessions: 0,
        totalFocusedMinutes: 0,
        composition: Object.fromEntries(
          selectedSlots(draft.parts).map((slot) => [slot, draft.parts[slot]]),
        ) as Composition,
        ...(assembly ? { assemblyProfile: assembly.profile } : {}),
      }),
    }
  }

  return {
    prepareWorkbench,
    selectWorkbenchPart,
    clearWorkbenchPart,
    setWorkbenchName,
    randomizeWorkbench,
    saveCustomBuild,
  }
}
