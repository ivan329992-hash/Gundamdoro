import data from './registered-assembly.json'
import modularData from './registered-assembly-v2.json'
import expandedData from './registered-assembly-v3.json'
import backpackData from './registered-backpack.json'
import type { AssemblyPolicy, Matrix, Point } from '../../domain/assembly'
import { fitSegment, transformPoint } from '../../domain/assembly'
import { getPartDefinitions, PART_SLOTS } from '../../domain/inventory'
import type { DraftComposition, PartSlot } from '../../domain/types'
import type { MechaCatalog } from '../../domain/catalog'

export interface RegisteredPart { segment: [Point, Point]; mask: Point[]; asset?: string; image?: Point }
export interface RegisteredModel {
  asset: string
  image: Point
  joints: Partial<Record<PartSlot, Point>>
  parts: Partial<Record<PartSlot, RegisteredPart>>
}
export interface RegisteredAssembly {
  profile: string
  frame: readonly [number, number, number, number]
  bodySegment: [Point, Point]
  slots: readonly PartSlot[]
  optionalSlots?: readonly PartSlot[]
  layers: readonly PartSlot[]
  parents?: Partial<Record<PartSlot, PartSlot>>
  joints: Partial<Record<PartSlot, Point>>
  vectors: Partial<Record<PartSlot, Point>>
  models: Record<string, RegisteredModel>
}
export interface RegisteredPlacement {
  slot: PartSlot
  partId: string
  modelId: string
  model: RegisteredModel
  part: RegisteredPart
  transform: Matrix
}

const bodyProfile = expandedData as unknown as RegisteredAssembly
const backpackParts = backpackData.parts as unknown as Record<string, RegisteredPart>
const backpackProfile: RegisteredAssembly = {
  ...bodyProfile, profile: backpackData.profile, optionalSlots: ['wings'], layers: ['wings', ...bodyProfile.layers],
  joints: { ...bodyProfile.joints, wings: backpackData.joint as unknown as Point },
  vectors: { ...bodyProfile.vectors, wings: backpackData.vector as unknown as Point },
  models: Object.fromEntries(Object.entries(bodyProfile.models).map(([id, model]) => [id, {
    ...model,
    joints: { ...model.joints, wings: transformPoint(fitSegment(bodyProfile.bodySegment, model.parts.torso!.segment), backpackData.joint as unknown as Point) },
    parts: { ...model.parts, ...(backpackParts[id] ? { wings: backpackParts[id] } : {}) },
  }])),
}

export const registeredAssemblyProfiles: Record<string, RegisteredAssembly> = {
  [data.profile]: { ...data, slots: PART_SLOTS, layers: ['legs', 'right-arm', 'left-arm', 'torso', 'head'] } as unknown as RegisteredAssembly,
  [modularData.profile]: modularData as unknown as RegisteredAssembly,
  [expandedData.profile]: expandedData as unknown as RegisteredAssembly,
  [backpackProfile.profile]: backpackProfile,
}
export const registeredAssembly = backpackProfile
export const registeredAssemblyPolicy: AssemblyPolicy = {
  profile: registeredAssembly.profile, modelIds: Object.keys(registeredAssembly.models), slots: registeredAssembly.slots,
  optionalSlots: registeredAssembly.optionalSlots,
  partIds: Object.entries(registeredAssembly.models).flatMap(([id, model]) => Object.keys(model.parts).map((slot) => `${id}:${slot}`)),
}

export function registeredPartSource(model: RegisteredModel, part: RegisteredPart) {
  return { asset: part.asset ?? model.asset, image: part.image ?? model.image }
}

export function registeredPlacements(parts: DraftComposition, catalog: MechaCatalog, config = registeredAssembly): RegisteredPlacement[] {
  const definitions = getPartDefinitions(catalog, true)
  const torso = definitions.find((part) => part.id === parts.torso && part.slot === 'torso')
  const torsoModel = torso && config.models[torso.mechaId]
  const bodyTransform = torsoModel?.parts.torso ? fitSegment(torsoModel.parts.torso.segment, config.bodySegment) : [1, 0, 0, 1, 0, 0] as const
  const placements: RegisteredPlacement[] = []
  for (const slot of [...config.slots, ...(config.optionalSlots ?? [])]) {
    const definition = definitions.find((part) => part.id === parts[slot] && part.slot === slot)
    const model = definition && config.models[definition.mechaId]
    if (!model || !definition) continue
    const part = model.parts[slot]
    if (!part) continue
    let transform: Matrix = bodyTransform
    if (slot !== 'torso') {
      const parent = placements.find((placement) => placement.slot === (config.parents?.[slot] ?? 'torso'))
      const parentJoint = parent?.model.joints[slot]
      const anchor = parent && parentJoint ? transformPoint(parent.transform, parentJoint) : config.joints[slot]
      const vector = config.vectors[slot]
      if (!anchor || !vector) continue
      transform = fitSegment(part.segment, [anchor, [anchor[0] + vector[0], anchor[1] + vector[1]]])
    }
    placements.push({ slot, partId: definition.id, modelId: definition.mechaId, model, part, transform })
  }
  return placements
}

export function polygonBounds(points: readonly Point[]): [number, number, number, number] {
  const minX = Math.min(...points.map((point) => point[0]))
  const minY = Math.min(...points.map((point) => point[1]))
  return [minX, minY, Math.max(...points.map((point) => point[0])) - minX, Math.max(...points.map((point) => point[1])) - minY]
}
