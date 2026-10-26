import { describe, expect, it } from 'vitest'
import {
  findMechaManifest,
  getBreakAsset,
  getFinalAsset,
  getMechaManifest,
  getMechaManifests,
  getNextStageDefinition,
  getStageAsset,
} from './loader'

describe('collectible mecha assets', () => {
  it('loads seven part definitions with masked lower-body sources and a distinct final image', () => {
    const manifest = getMechaManifest()
    const parts = manifest.stages.map((part) => getStageAsset(part.stage))
    expect(manifest.totalStages).toBe(7)
    expect(parts.every(Boolean)).toBe(true)
    expect(new Set(parts).size).toBe(5)
    expect(getFinalAsset()).toBeTruthy()
    expect(parts).not.toContain(getFinalAsset())
    expect(getFinalAsset()).toContain('stage-06')
  })

  it('collects hips and each leg independently and finishes at the seventh part', () => {
    expect(getNextStageDefinition(4)?.name).toBe('HIP UNIT')
    expect(getNextStageDefinition(5)?.name).toBe('LEFT LEG')
    expect(getNextStageDefinition(6)?.name).toBe('RIGHT LEG')
    expect(getNextStageDefinition(7)).toBeNull()
    expect(getStageAsset(8)).toBeNull()
  })

  it('does not select a part asset for invalid counts', () => {
    expect(getStageAsset(0)).toBeNull()
    expect(getStageAsset(-1)).toBeNull()
    expect(getStageAsset(1.5)).toBeNull()
  })

  it('resolves hangar previews by model id instead of using the current model for every record', () => {
    expect(findMechaManifest('mecha-01')?.name).toBe('MECHA-01')
    expect(getFinalAsset('mecha-01')).toBe(getFinalAsset())
    expect(findMechaManifest('unregistered-model')).toBeNull()
    expect(getFinalAsset('unregistered-model')).toBeNull()
  })

  it('discovers original and user-supplied fan-art models without sharing part or final images', () => {
    const models = getMechaManifests()
    expect(models.map((model) => model.id)).toEqual([
      'mecha-01',
      'mecha-02',
      'mecha-03',
      'mecha-04',
      'mecha-05',
      'mecha-06',
      'wing-zero-ew',
    ])
    expect(models.slice(2, 6).map((model) => model.description)).toEqual([
      '重装突击型',
      '羽翼巡航型',
      '骨架近战型',
      '高速突击型',
    ])
    const images = models.flatMap((model) => [
      getFinalAsset(model.id),
      ...model.stages.map((part) => getStageAsset(part.stage, model.id)),
    ])
    expect(images.every(Boolean)).toBe(true)
    const sourcesByModel = models.map(
      (model) =>
        new Set([
          getFinalAsset(model.id),
          ...model.stages.map((part) => getStageAsset(part.stage, model.id)),
        ]),
    )
    for (let index = 0; index < sourcesByModel.length; index++)
      for (const image of sourcesByModel[index]) {
        expect(
          sourcesByModel.every((other, otherIndex) => otherIndex === index || !other.has(image)),
        ).toBe(true)
      }
    for (const model of models) {
      expect(model.totalStages).toBe(model.stages.length)
      expect(getNextStageDefinition(model.totalStages, model.id)).toBeNull()
      expect(getBreakAsset(model.id)).toBe(getBreakAsset('mecha-01'))
    }
    expect(getNextStageDefinition(4, 'mecha-02')?.name).toBe('HIP UNIT')
    expect(getNextStageDefinition(7, 'mecha-02')).toBeNull()
    expect(getBreakAsset('mecha-02')).toBe(getBreakAsset('mecha-01'))
    expect(getStageAsset(1, 'unregistered-model')).toBeNull()
  })

  it('uses the cleaned fan-art head and collects wings as an eighth independent part', () => {
    const model = getMechaManifest('wing-zero-ew')
    expect(model.name).toBe('飞翼零式 EW')
    expect(model.stages[0].name).toBe('TORSO')
    expect(model.totalStages).toBe(8)
    expect(getStageAsset(2, model.id)).toContain('head-clean-v3.png')
    expect(getFinalAsset(model.id)).toContain('assembled-decals-v2.png')
    expect(getNextStageDefinition(7, model.id)?.name).toBe('WINGS')
    expect(getStageAsset(8, model.id)).toContain('wings.png')
    expect(getNextStageDefinition(8, model.id)).toBeNull()
  })
})
