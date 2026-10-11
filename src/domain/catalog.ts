/** 【领域·图鉴】校验 manifest JSON，建成可查找的机甲目录（与 PNG 路径无关）。 */
import type { MechaManifest, MechaStage } from './types'
import { getStagePartKey, getStagePartSlot, isPartKey, isPartSlot } from './inventory'

export interface MechaCatalog {
  defaultMecha: MechaManifest
  find(mechaId: string): MechaManifest | null
  list(): MechaManifest[]
}

function isMechaStage(value: unknown): value is MechaStage {
  if (typeof value !== 'object' || value === null) return false
  const stage = value as Partial<MechaStage>
  return Number.isInteger(stage.stage)
    && typeof stage.name === 'string' && stage.name.length > 0
    && typeof stage.asset === 'string' && stage.asset.length > 0
    && (stage.slot === undefined || isPartSlot(stage.slot))
    && (stage.partId === undefined || isPartKey(stage.partId))
}

function loadManifest(value: unknown): MechaManifest {
  if (typeof value !== 'object' || value === null) throw new Error('Invalid mecha manifest')
  const manifest = value as Partial<MechaManifest>
  if (typeof manifest.id !== 'string'
    || typeof manifest.name !== 'string'
    || typeof manifest.finalAsset !== 'string'
    || !Array.isArray(manifest.stages)) throw new Error('Invalid mecha manifest')

  const totalStages = manifest.stages.length
  const stages = manifest.stages.filter(isMechaStage)
  if (totalStages < 1 || stages.length !== totalStages
    || new Set(stages.map((stage) => stage.stage)).size !== totalStages
    || stages.some((stage) => stage.stage < 1 || stage.stage > totalStages)) {
    throw new Error('Mecha manifest stages do not match totalStages')
  }
  const slots = stages.map(getStagePartSlot).filter((slot) => slot !== undefined)
  if (new Set(slots).size !== slots.length) {
    throw new Error('Mecha part slots must be unique')
  }
  if (new Set(stages.map(getStagePartKey)).size !== totalStages) throw new Error('Mecha part IDs must be unique')
  return {
    id: manifest.id, name: manifest.name, totalStages, stages: stages.sort((a, b) => a.stage - b.stage), finalAsset: manifest.finalAsset,
    ...(typeof manifest.description === 'string' && manifest.description.trim() ? { description: manifest.description } : {}),
  }
}

export function createMechaCatalog(sources: unknown[], defaultId: string): MechaCatalog {
  const registry = new Map<string, MechaManifest>()
  for (const source of sources) {
    const manifest = loadManifest(source)
    if (registry.has(manifest.id)) throw new Error(`Duplicate mecha id: ${manifest.id}`)
    registry.set(manifest.id, manifest)
  }
  const defaultMecha = registry.get(defaultId)
  if (!defaultMecha) throw new Error('Default mecha manifest is missing')
  return { defaultMecha, find: (mechaId) => registry.get(mechaId) ?? null, list: () => [...registry.values()] }
}
