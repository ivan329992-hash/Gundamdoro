import { describe, expect, it } from 'vitest'
import { findMechaManifest, getBreakAsset, getFinalAsset, getMechaManifest, getMechaManifests, getNextStageDefinition, getStageAsset } from './loader'

describe('collectible mecha assets', () => {
  it('loads five separate part images and a distinct final mecha image', () => {
    const manifest = getMechaManifest()
    const parts = manifest.stages.map((part) => getStageAsset(part.stage))
    expect(manifest.totalStages).toBe(5)
    expect(parts.every(Boolean)).toBe(true)
    expect(new Set(parts).size).toBe(5)
    expect(getFinalAsset()).toBeTruthy()
    expect(parts).not.toContain(getFinalAsset())
    expect(getFinalAsset()).toContain('stage-06')
  })

  it('finishes the collection at the leg unit with no sixth focus part', () => {
    expect(getNextStageDefinition(4)?.name).toBe('LEG UNIT')
    expect(getNextStageDefinition(5)).toBeNull()
    expect(getStageAsset(6)).toBeNull()
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
    expect(models.map((model) => model.id)).toEqual(['mecha-01', 'mecha-02', 'mecha-03', 'mecha-04', 'mecha-05', 'mecha-06', 'wing-zero-ew'])
    expect(models.slice(2, 6).map((model) => model.description)).toEqual(['重装突击型', '羽翼巡航型', '骨架近战型', '高速突击型'])
    const images = models.flatMap((model) => [
      getFinalAsset(model.id),
      ...model.stages.map((part) => getStageAsset(part.stage, model.id)),
    ])
    expect(images.every(Boolean)).toBe(true)
    expect(new Set(images).size).toBe(models.length * 6)
    for (const model of models) {
      expect(model.totalStages).toBe(5)
      expect(getNextStageDefinition(4, model.id)?.name).toBe('LEG UNIT')
      expect(getNextStageDefinition(5, model.id)).toBeNull()
      expect(getBreakAsset(model.id)).toBe(getBreakAsset('mecha-01'))
    }
    expect(getNextStageDefinition(4, 'mecha-02')?.name).toBe('LEG UNIT')
    expect(getNextStageDefinition(5, 'mecha-02')).toBeNull()
    expect(getBreakAsset('mecha-02')).toBe(getBreakAsset('mecha-01'))
    expect(getStageAsset(1, 'unregistered-model')).toBeNull()
  })

  it('uses the corrected fan-art head and retains five focus rewards', () => {
    const model = getMechaManifest('wing-zero-ew')
    expect(model.name).toBe('飞翼零式 EW')
    expect(model.stages[0].name).toBe('TORSO + WINGS')
    expect(getStageAsset(2, model.id)).toContain('head-corrected.png')
    expect(getFinalAsset(model.id)).toContain('assembled.png')
    expect(getNextStageDefinition(5, model.id)).toBeNull()
  })
})
