import type { AppDependencies } from './ports'
import { getPartId, getStagePartKey } from '../domain/inventory'
import { isRecord } from '../domain/validation'

export function migrateSplitParts(
  value: unknown,
  { catalog, runtime }: AppDependencies,
  archivedModels: ReadonlySet<string>,
  version: number,
): unknown {
  if (!isRecord(value)) return value
  const source = { ...value }
  const unlocked = new Set(Array.isArray(source.unlockedParts) ? source.unlockedParts : [])
  const active = isRecord(source.assembly) ? source.assembly : {}
  const activeModel = typeof active.mechaId === 'string' ? active.mechaId : catalog.defaultMecha.id
  const originalStage =
    typeof active.currentStage === 'number' && Number.isInteger(active.currentStage)
      ? active.currentStage
      : 0
  const draft = isRecord(source.workbench) ? source.workbench : null
  const draftParts = draft && isRecord(draft.parts) ? { ...draft.parts } : null
  let draftChanged = false

  for (const model of catalog.list()) {
    const mappings =
      model.legacyParts?.filter((part) => version < (part.splitBeforeVersion ?? 6)) ?? []
    let progressDelta = 0
    for (const legacy of mappings) {
      const oldId = getPartId(model.id, getStagePartKey(legacy))
      const earnedInBuild = model.id === activeModel && originalStage >= legacy.stage
      const earnedInArchive = archivedModels.has(model.id)
      if (earnedInBuild || earnedInArchive) unlocked.add(oldId)
      if (unlocked.has(oldId))
        for (const key of legacy.splitInto) unlocked.add(getPartId(model.id, key))
      if (earnedInBuild) {
        progressDelta += legacy.splitInto.length - 1
        if (
          originalStage === legacy.stage &&
          ['PART_REWARD', 'BREAK'].includes(String(source.phase))
        )
          source.phase = 'READY'
      }
      if (legacy.slot && draftParts?.[legacy.slot] === oldId) {
        delete draftParts[legacy.slot]
        for (const key of legacy.splitInto) draftParts[key] ??= getPartId(model.id, key)
        draftChanged = true
      }
    }
    if (model.id === activeModel && mappings.length) {
      const currentStage = Math.min(model.totalStages, Math.max(0, originalStage + progressDelta))
      source.assembly = { ...active, currentStage }
      if (
        currentStage === model.totalStages &&
        ['FOCUS', 'BREAK', 'PART_REWARD'].includes(String(source.phase))
      )
        source.phase = 'READY'
    }
  }
  source.unlockedParts = [...unlocked]
  if (draftChanged && draft && draftParts)
    source.workbench = { ...draft, id: runtime.newId(), parts: draftParts }
  return source
}
