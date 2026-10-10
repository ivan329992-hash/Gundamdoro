import type { MechaCatalog } from './catalog'
import type { AppPhase, Composition, DraftComposition, PartDefinition, PartSlot, WorkbenchDraft } from './types'

export const PART_SLOTS: readonly PartSlot[] = ['torso', 'head', 'left-arm', 'right-arm', 'legs']
export const PART_SLOT_LABELS: Record<PartSlot, string> = {
  torso: '躯干', head: '头部', 'left-arm': '左臂', 'right-arm': '右臂', legs: '腿部',
}

export function isPartSlot(value: unknown): value is PartSlot {
  return typeof value === 'string' && PART_SLOTS.includes(value as PartSlot)
}

export function getPartId(mechaId: string, slot: PartSlot): string {
  return `${mechaId}:${slot}`
}

export function getPartIdSlot(value: unknown): PartSlot | null {
  if (typeof value !== 'string' || value.length > 300) return null
  const separator = value.lastIndexOf(':')
  if (separator < 1 || !value.slice(0, separator).trim()) return null
  const slot = value.slice(separator + 1)
  return isPartSlot(slot) ? slot : null
}

export function getPartDefinitions(catalog: MechaCatalog): PartDefinition[] {
  return catalog.list().flatMap((model) => model.stages.flatMap((part) => {
    const slot = part.slot ?? PART_SLOTS[part.stage - 1]
    return slot ? [{ id: getPartId(model.id, slot), mechaId: model.id, mechaName: model.name,
      stage: part.stage, slot, name: part.name, asset: part.asset }] : []
  }))
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
