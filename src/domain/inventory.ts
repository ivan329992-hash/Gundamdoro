import type { MechaCatalog } from './catalog'
import type { AppPhase, Composition, DraftComposition, MechaStage, PartDefinition, PartSlot, WorkbenchDraft } from './types'

export const PART_SLOTS: readonly PartSlot[] = ['torso', 'head', 'left-arm', 'right-arm', 'legs']
export const PART_SLOT_LABELS: Record<PartSlot, string> = {
  torso: '躯干', head: '头部', 'left-arm': '左臂', 'right-arm': '右臂', legs: '腿部',
}

export function isPartSlot(value: unknown): value is PartSlot {
  return typeof value === 'string' && PART_SLOTS.includes(value as PartSlot)
}

export function isPartKey(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z][a-z0-9-]{0,79}$/.test(value)
}

export function getStagePartKey(part: MechaStage): string {
  return part.partId ?? part.slot ?? PART_SLOTS[part.stage - 1] ?? `part-${part.stage}`
}

export function getStagePartSlot(part: MechaStage): PartSlot | undefined {
  if (part.slot) return part.slot
  if (part.partId) return isPartSlot(part.partId) ? part.partId : undefined
  return PART_SLOTS[part.stage - 1]
}

export function getPartId(mechaId: string, key: string): string {
  return `${mechaId}:${key}`
}

export function getPartIdKey(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 300) return null
  const separator = value.lastIndexOf(':')
  if (separator < 1 || !value.slice(0, separator).trim()) return null
  const key = value.slice(separator + 1)
  return isPartKey(key) ? key : null
}

export function getPartIdSlot(value: unknown): PartSlot | null {
  const key = getPartIdKey(value)
  return isPartSlot(key) ? key : null
}

export function getPartDefinitions(catalog: MechaCatalog): PartDefinition[] {
  return catalog.list().flatMap((model) => model.stages.map((part) => ({
    id: getPartId(model.id, getStagePartKey(part)), mechaId: model.id, mechaName: model.name,
    stage: part.stage, slot: getStagePartSlot(part), name: part.name, asset: part.asset,
  })))
}

export function unlockPart(parts: readonly string[], partId: string): string[] {
  return parts.includes(partId) ? [...parts] : [...parts, partId]
}

export function createWorkbench(): WorkbenchDraft {
  return { id: null, name: '自定义机体', parts: {} }
}

export function canUseWorkbench(phase: AppPhase): boolean {
  return phase === 'READY' || phase === 'COMPLETE'
}

export function isCompositionComplete(parts: DraftComposition, unlocked: readonly string[], catalog: MechaCatalog): parts is Composition {
  const definitions = getPartDefinitions(catalog)
  return PART_SLOTS.every((slot) => unlocked.includes(parts[slot] ?? '')
    && definitions.some((part) => part.id === parts[slot] && part.slot === slot))
}

export function equalComposition(a: DraftComposition, b: DraftComposition): boolean {
  return PART_SLOTS.every((slot) => a[slot] === b[slot])
}
