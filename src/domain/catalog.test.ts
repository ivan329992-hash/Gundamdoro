import { describe, expect, it } from 'vitest'
import { createMechaCatalog } from './catalog'
import { getPartDefinitions, getPartIdKey } from './inventory'

const stages = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    stage: index + 1,
    name: `PART ${index + 1}`,
    asset: `parts/${index + 1}.png`,
    partId: `module-${index + 1}`,
  }))
const model = (count: number) => ({
  id: 'variable',
  name: 'VARIABLE',
  finalAsset: 'final/assembled.png',
  stages: stages(count),
})

describe('manifest-sized collections', () => {
  it.each([1, 3, 6, 8])(
    'derives %i sessions from the collectible list, ignoring stale legacy totals',
    (count) => {
      const catalog = createMechaCatalog([{ ...model(count), totalStages: 5 }], 'variable')
      expect(catalog.defaultMecha.totalStages).toBe(count)
      expect(getPartDefinitions(catalog)).toHaveLength(count)
      expect(getPartDefinitions(catalog).every((part) => part.slot === undefined)).toBe(true)
    },
  )

  it('accepts a list without a separately configured focus count and sorts its stages', () => {
    const catalog = createMechaCatalog([{ ...model(3), stages: stages(3).reverse() }], 'variable')
    expect(catalog.defaultMecha.totalStages).toBe(3)
    expect(catalog.defaultMecha.stages.map((part) => part.stage)).toEqual([1, 2, 3])
    expect(getPartIdKey('variable:module-3')).toBe('module-3')
    expect(getPartIdKey('variable:../escape')).toBeNull()
  })

  it('rejects empty, gapped, duplicate and malformed component definitions', () => {
    for (const parts of [
      [],
      [stages(1)[0], stages(3)[2]],
      [stages(1)[0], stages(1)[0]],
      [stages(1)[0], { ...stages(2)[1], partId: 'module-1' }],
      [{ ...stages(1)[0], partId: '../escape' }],
      [{ ...stages(1)[0], slot: 'unregistered-slot' }],
      [
        { ...stages(1)[0], slot: 'head' },
        { ...stages(2)[1], slot: 'head' },
      ],
    ]) {
      expect(() => createMechaCatalog([{ ...model(1), stages: parts }], 'variable')).toThrow()
    }
  })
})
