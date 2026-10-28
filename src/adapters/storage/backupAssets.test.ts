import { afterEach, describe, expect, it, vi } from 'vitest'
import { createBackupPort } from './backupAssets'
import { createUserModelPackage, MODEL_IMPORT_LIMITS } from '../../domain/userModels'
import { draftModel } from '../../test/userModels'

afterEach(() => vi.unstubAllGlobals())

describe('local model assets for backup', () => {
  it('reads only registered fixed asset names and preserves original bytes', async () => {
    const model = createUserModelPackage(draftModel(), 'user-assets')
    const fetch = vi.fn(async () => new Response(model.images['final.png'].slice().buffer))
    vi.stubGlobal('fetch', fetch)
    const resolve = vi.fn((_id: string, name: string) => 'blob:local/' + name)
    const saved = await createBackupPort({ resolve }).readModel(model.manifest)
    expect(saved).toEqual(model)
    expect(fetch).toHaveBeenCalledTimes(4)
    expect(resolve.mock.calls.map(([, name]) => name)).toEqual([
      'final.png',
      'part-1.png',
      'part-2.png',
      'part-3.png',
    ])
  })

  it('reports missing local resources and bounds each streamed image before accumulation', async () => {
    const model = createUserModelPackage(draftModel(), 'user-assets')
    await expect(
      createBackupPort({ resolve: () => null }).readModel(model.manifest),
    ).rejects.toThrow('缺失')
    const cancel = vi.fn()
    vi.stubGlobal(
      'fetch',
      async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new Uint8Array(MODEL_IMPORT_LIMITS.imageBytes + 1))
            },
            cancel,
          }),
        ),
    )
    await expect(
      createBackupPort({ resolve: () => 'blob:local' }).readModel(model.manifest),
    ).rejects.toThrow('8 MiB')
    expect(cancel).toHaveBeenCalledOnce()
  })
})
