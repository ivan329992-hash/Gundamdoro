import layouts from './assembly-layouts.json'
import type { PartSlot } from '../../domain/types'

export type Point = [number, number]
export interface PartLayout {
  image: Point
  bounds: [number, number, number, number]
  mount?: Point
  height?: number
  neck?: Point
  waist?: Point
  left?: Point
  right?: Point
}

export function getCompositionLayout(modelId: string, slot: PartSlot): PartLayout | null {
  return (layouts as unknown as Record<string, Record<PartSlot, PartLayout>>)[modelId]?.[slot] ?? null
}
