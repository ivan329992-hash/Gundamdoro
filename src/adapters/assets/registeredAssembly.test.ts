import { describe, expect, it } from 'vitest'
import { registeredAssembly, registeredAssemblyPolicy, registeredAssemblyProfiles, registeredPlacements, registeredPartSource } from './registeredAssembly'
import { appDependencies, appAssets } from '../../app/dependencies'
import { supportsAssembly, transformPoint } from '../../domain/assembly'
import { PART_SLOTS } from '../../domain/inventory'
import type { Composition } from '../../domain/types'

const recipes = Array.from({ length: 128 }, (_, mask) => Object.fromEntries(registeredAssembly.slots.map((slot, bit) => [slot, `${registeredAssemblyPolicy.modelIds[(mask >> bit) & 1]}:${slot}`])) as Composition)

describe('registered assembly pilot', () => {
  it('mounts the optional original wing asset to every torso without changing historical profiles', () => {
    for (const id of registeredAssemblyPolicy.modelIds) {
      const parts = Object.fromEntries(registeredAssembly.slots.map((slot) => [slot, `${id}:${slot}`]))
      const placements = registeredPlacements({ ...parts, wings: 'wing-zero-ew:wings' }, appDependencies.catalog)
      expect(placements).toHaveLength(8)
      const wing = placements.find((part) => part.slot === 'wings')!
      const torso = placements.find((part) => part.slot === 'torso')!
      const mount = transformPoint(wing.transform, wing.part.segment[0])
      const target = transformPoint(torso.transform, torso.model.joints.wings!)
      expect(mount[0]).toBeCloseTo(target[0], 7)
      expect(mount[1]).toBeCloseTo(target[1], 7)
      expect(wing.transform[0]).toBe(wing.transform[3])
      expect(wing.transform[1]).toBe(-wing.transform[2])
      const source = registeredPartSource(wing.model, wing.part)
      expect(source.asset).toBe('parts/wings.png')
      expect(source.image).toEqual([1086, 1448])
      expect(appAssets.resolve(wing.modelId, source.asset)).toBeTruthy()
    }
    expect(registeredAssembly.layers[0]).toBe('wings')
    for (const profile of ['standard-front-v1', 'standard-front-v2', 'standard-front-v3']) {
      expect(registeredAssemblyProfiles[profile].optionalSlots).toBeUndefined()
      expect(registeredAssemblyProfiles[profile].models['wing-zero-ew']?.parts.wings).toBeUndefined()
    }
  })
  it('bundles all seven registered masters without replacing original focus/final assets', () => {
    expect(registeredAssemblyPolicy.modelIds).toEqual(['mecha-01', 'mecha-02', 'mecha-03', 'mecha-04', 'mecha-05', 'mecha-06', 'wing-zero-ew'])
    for (const id of registeredAssemblyPolicy.modelIds) {
      const model = registeredAssembly.models[id]
      expect(appAssets.resolve(id, model.asset)).toBeTruthy()
      expect(model.asset.startsWith('assembly/')).toBe(true)
      expect(model.image).toEqual(id === 'mecha-06' ? [1087, 1447] : [1086, 1448])
      for (const slot of registeredAssembly.slots) {
        const part = model.parts[slot]!
        expect(part.mask.length).toBeGreaterThanOrEqual(3)
        for (const point of [...part.mask, ...part.segment]) {
          expect(point.every(Number.isFinite)).toBe(true)
          expect(point[0]).toBeGreaterThanOrEqual(0)
          expect(point[1]).toBeGreaterThanOrEqual(0)
          expect(point[0]).toBeLessThanOrEqual(model.image[0])
          expect(point[1]).toBeLessThanOrEqual(model.image[1])
        }
      }
    }
  })

  it.each(recipes.map((parts, index) => ({ parts, index })))('places all seven modules in combination $index without anisotropic distortion', ({ parts }) => {
    expect(supportsAssembly(parts, appDependencies.catalog, registeredAssemblyPolicy)).toBe(true)
    const placements = registeredPlacements(parts, appDependencies.catalog)
    expect(placements).toHaveLength(7)
    for (const placement of placements) {
      expect(placement.transform.every(Number.isFinite)).toBe(true)
      expect(placement.transform[0]).toBe(placement.transform[3])
      expect(placement.transform[1]).toBe(-placement.transform[2])
      const first = transformPoint(placement.transform, placement.part.segment[0])
      const parent = placements.find((part) => part.slot === (registeredAssembly.parents?.[placement.slot] ?? 'torso'))!
      const target = placement.slot === 'torso' ? registeredAssembly.bodySegment[0]
        : transformPoint(parent.transform, parent.model.joints[placement.slot]!)
      expect(first[0]).toBeCloseTo(target[0], 7)
      expect(first[1]).toBeCloseTo(target[1], 7)
      if (placement.slot !== 'torso') {
        const second = transformPoint(placement.transform, placement.part.segment[1])
        const vector = registeredAssembly.vectors[placement.slot]!
        expect(second[0] - first[0]).toBeCloseTo(vector[0], 7)
        expect(second[1] - first[1]).toBeCloseTo(vector[1], 7)
      }
    }
  })

  it('retains all 32 frozen five-part profile combinations for historical recipes', () => {
    const config = registeredAssemblyProfiles['standard-front-v1']
    for (let bits = 0; bits < 32; bits++) {
      const parts = Object.fromEntries(PART_SLOTS.map((slot, bit) => [slot, `mecha-0${1 + ((bits >> bit) & 1)}:${slot}`]))
      expect(registeredPlacements(parts, appDependencies.catalog, config)).toHaveLength(5)
    }
  })

  it('fits every ordered source-to-parent module pair across all seven models', () => {
    for (const parentId of registeredAssemblyPolicy.modelIds) for (const sourceId of registeredAssemblyPolicy.modelIds) {
      const parts = Object.fromEntries(registeredAssembly.slots.map((slot) => [slot, `${slot === 'torso' || slot === 'hips' ? parentId : sourceId}:${slot}`]))
      const placements = registeredPlacements(parts, appDependencies.catalog)
      expect(placements).toHaveLength(7)
      for (const placement of placements) {
        expect(placement.transform.every(Number.isFinite)).toBe(true)
        expect(placement.transform[0]).toBe(placement.transform[3])
        expect(placement.transform[1]).toBe(-placement.transform[2])
        const parent = placements.find((part) => part.slot === (registeredAssembly.parents?.[placement.slot] ?? 'torso'))!
        const target = placement.slot === 'torso' ? registeredAssembly.bodySegment[0] : transformPoint(parent.transform, parent.model.joints[placement.slot]!)
        const actual = transformPoint(placement.transform, placement.part.segment[0])
        expect(actual[0]).toBeCloseTo(target[0], 7)
        expect(actual[1]).toBeCloseTo(target[1], 7)
      }
    }
    const config = registeredAssemblyProfiles['standard-front-v2']
    expect(Object.keys(config.models)).toEqual(['mecha-01', 'mecha-02'])
    for (const parts of recipes) expect(registeredPlacements(parts, appDependencies.catalog, config)).toHaveLength(7)
  })

  it('keeps partial arms in their own template positions before a torso is owned', () => {
    const placements = registeredPlacements({ 'left-arm': 'mecha-02:left-arm', 'right-arm': 'mecha-01:right-arm' }, appDependencies.catalog)
    expect(placements).toHaveLength(2)
    for (const part of placements) expect(transformPoint(part.transform, part.part.segment[0])).toEqual(registeredAssembly.joints[part.slot as 'left-arm' | 'right-arm'])
    expect(registeredPlacements({ head: 'unknown:head' }, appDependencies.catalog)).toEqual([])
  })
})
