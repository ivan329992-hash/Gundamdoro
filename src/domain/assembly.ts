import type { MechaCatalog } from './catalog'
import { getPartDefinitions, getCompositionSlots } from './inventory'
import type { DraftComposition, PartDefinition, PartSlot } from './types'

export interface AssemblyPolicy {
  profile: string
  modelIds: readonly string[]
  slots?: readonly PartSlot[]
  optionalSlots?: readonly PartSlot[]
  partIds?: readonly string[]
}

export function supportsAssemblyPart(part: PartDefinition, policy?: AssemblyPolicy): boolean {
  return (
    Boolean(part.slot) &&
    (!policy ||
      (policy.modelIds.includes(part.mechaId) &&
        (!policy.slots ||
          [...policy.slots, ...(policy.optionalSlots ?? [])].includes(part.slot!)) &&
        (!policy.partIds || policy.partIds.includes(part.id))))
  )
}

export function supportsAssembly(
  parts: DraftComposition,
  catalog: MechaCatalog,
  policy?: AssemblyPolicy,
): boolean {
  const definitions = getPartDefinitions(catalog, true)
  const required = policy?.slots ?? getCompositionSlots(parts)
  const selected = Object.keys(parts) as PartSlot[]
  return [...required, ...selected].every((slot) =>
    definitions.some(
      (part) => part.id === parts[slot] && part.slot === slot && supportsAssemblyPart(part, policy),
    ),
  )
}

export type Point = readonly [number, number]
export type Matrix = readonly [number, number, number, number, number, number]

export function transformPoint([a, b, c, d, x, y]: Matrix, point: Point): Point {
  return [a * point[0] + c * point[1] + x, b * point[0] + d * point[1] + y]
}

export function fitSegment(
  source: readonly [Point, Point],
  target: readonly [Point, Point],
): Matrix {
  const [sx, sy] = [source[1][0] - source[0][0], source[1][1] - source[0][1]]
  const [tx, ty] = [target[1][0] - target[0][0], target[1][1] - target[0][1]]
  const lengthSquared = sx * sx + sy * sy
  if (
    ![...source.flat(), ...target.flat()].every(Number.isFinite) ||
    lengthSquared < 1 ||
    tx * tx + ty * ty < 1
  ) {
    throw new Error('Invalid assembly calibration segment')
  }
  const a = (sx * tx + sy * ty) / lengthSquared
  const b = (sx * ty - sy * tx) / lengthSquared
  return [
    a,
    b,
    -b,
    a,
    target[0][0] - a * source[0][0] + b * source[0][1],
    target[0][1] - b * source[0][0] - a * source[0][1],
  ]
}
