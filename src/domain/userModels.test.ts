import { describe, expect, it } from 'vitest'
import { getPartDefinitions } from './inventory'
import { createMechaCatalog } from './catalog'
import {
  createUserModelPackage,
  imageExtension,
  isUserModelId,
  MODEL_IMPORT_LIMITS,
  validateUserManifest,
} from './userModels'
import { draftModel } from '../test/userModels'

describe('user model import definitions', () => {
  it('derives focus counts and stable non-mixing keys from user order, not filenames', () => {
    const model = createUserModelPackage(draftModel(), 'user-test')
    expect(model.manifest).toMatchObject({
      name: '我的机型',
      description: '用户创作',
      totalStages: 3,
      finalAsset: 'final.png',
    })
    expect(model.manifest.stages.map((part) => [part.stage, part.name, part.partId])).toEqual([
      [1, '核心', 'part-1'],
      [2, '护盾', 'part-2'],
      [3, '武器', 'part-3'],
    ])
    expect(Object.keys(model.images)).toEqual([
      'final.png',
      'part-1.png',
      'part-2.png',
      'part-3.png',
    ])
    const catalog = createMechaCatalog([model.manifest], 'user-test')
    expect(getPartDefinitions(catalog).every((part) => part.slot === undefined)).toBe(true)
    expect(validateUserManifest(model.manifest)).toEqual(model.manifest)
  })

  it.each([1, 7, 8, 32])('supports %i independently named components', (count) => {
    const draft = draftModel()
    draft.parts = Array.from({ length: count }, (_, i) => ({
      ...draft.parts[0],
      name: `模块 ${i + 1}`,
    }))
    expect(createUserModelPackage(draft, 'user-test').manifest.totalStages).toBe(count)
  })

  it.each(['mecha-01', 'user-', 'user-../escape', 'user-USER', 'user-/tmp'])(
    'rejects unsafe or built-in ID %s',
    (id) => {
      expect(isUserModelId(id)).toBe(false)
      expect(() => createUserModelPackage(draftModel(), id)).toThrow()
    },
  )

  it.each(['', ' ', 'a'.repeat(41)])('rejects invalid model names', (name) => {
    expect(() => createUserModelPackage({ ...draftModel(), name }, 'user-test')).toThrow()
  })

  it('rejects missing/too many/unnamed components and long descriptions', () => {
    const draft = draftModel()
    expect(() => createUserModelPackage({ ...draft, parts: [] }, 'user-test')).toThrow()
    expect(() =>
      createUserModelPackage({ ...draft, parts: Array(33).fill(draft.parts[0]) }, 'user-test'),
    ).toThrow()
    expect(() =>
      createUserModelPackage({ ...draft, parts: [{ ...draft.parts[0], name: ' ' }] }, 'user-test'),
    ).toThrow()
    expect(() =>
      createUserModelPackage({ ...draft, description: '字'.repeat(201) }, 'user-test'),
    ).toThrow()
  })

  it('applies the same Unicode description limit when importing and reloading', () => {
    const draft = { ...draftModel(), description: '🤖'.repeat(200) }
    const model = createUserModelPackage(draft, 'user-test').manifest
    expect(validateUserManifest(model).description).toBe(draft.description)
    expect(() => validateUserManifest({ ...model, description: '字'.repeat(201) })).toThrow()
    expect(() => validateUserManifest({ ...model, description: '🤖'.repeat(201) })).toThrow()
  })

  it('recognizes actual raster signatures and rejects SVG/executable disguises', () => {
    expect(imageExtension(new Uint8Array([255, 216, 255]))).toBe('jpg')
    expect(imageExtension(new TextEncoder().encode('RIFF0000WEBP'))).toBe('webp')
    expect(() => imageExtension(new TextEncoder().encode('<svg/>'))).toThrow()
    expect(() => imageExtension(new Uint8Array([77, 90]))).toThrow()
  })

  it('enforces byte and decoded pixel limits', () => {
    const draft = draftModel()
    for (const image of [
      { ...draft.finalImage, bytes: new Uint8Array() },
      { ...draft.finalImage, bytes: new Uint8Array(MODEL_IMPORT_LIMITS.imageBytes + 1) },
      { ...draft.finalImage, width: 0 },
      { ...draft.finalImage, width: 10000, height: 10000 },
      { ...draft.finalImage, width: 1.5 },
    ]) {
      expect(() => createUserModelPackage({ ...draft, finalImage: image }, 'user-test')).toThrow()
    }
    const large = new Uint8Array(MODEL_IMPORT_LIMITS.imageBytes)
    large.set(draft.finalImage.bytes)
    expect(() =>
      createUserModelPackage(
        {
          ...draft,
          parts: Array(9).fill({ name: '模块', image: { ...draft.finalImage, bytes: large } }),
        },
        'user-test',
      ),
    ).toThrow('64 MiB')
  })

  it('rejects unsafe paths, malformed slots and incompatible future metadata', () => {
    const model = createUserModelPackage(draftModel(), 'user-test').manifest
    expect(() =>
      validateUserManifest({ ...model, finalAsset: 'https://remote/final.png' }),
    ).toThrow()
    expect(() =>
      validateUserManifest({ ...model, stages: [{ ...model.stages[0], slot: 'torso' }] }),
    ).toThrow()
    expect(() =>
      validateUserManifest({ ...model, stages: [{ ...model.stages[0], partId: 'head' }] }),
    ).toThrow()
    expect(() =>
      validateUserManifest({ ...model, stages: [{ ...model.stages[0], asset: '../part-1.png' }] }),
    ).toThrow()
  })
})
