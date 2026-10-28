import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { decodeBackupFile, encodeBackupFile } from './backupFile'
import { collectLocalBackup } from '../../application/backup'
import { createBackupFake } from '../../test/backup'
import { createDefaultData } from '../../application/state'
import { createUserModelPackage } from '../../domain/userModels'
import { draftModel } from '../../test/userModels'
import { BACKUP_LIMITS } from '../../domain/backup'

beforeEach(() =>
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({ width: 32, height: 32, close: vi.fn() })),
  ),
)
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function sample() {
  const fake = createBackupFake()
  const model = createUserModelPackage(draftModel(), 'user-backup')
  fake.models.set(model.manifest.id, model)
  return collectLocalBackup(createDefaultData(fake.dependencies), fake.dependencies)
}

async function rewriteHeader(bytes: Uint8Array, change: (header: Record<string, unknown>) => void) {
  const size = new DataView(bytes.buffer).getUint32(8)
  const header = JSON.parse(new TextDecoder().decode(bytes.subarray(44, 44 + size)))
  change(header)
  const metadata = new TextEncoder().encode(JSON.stringify(header))
  const result = new Uint8Array(44 + metadata.length + bytes.length - 44 - size)
  result.set(bytes.subarray(0, 8))
  new DataView(result.buffer).setUint32(8, metadata.length)
  result.set(metadata, 44)
  result.set(bytes.subarray(44 + size), 44 + metadata.length)
  result.set(new Uint8Array(await crypto.subtle.digest('SHA-256', result.subarray(44))), 12)
  return result
}

describe('bounded portable backup file container', () => {
  it('round-trips progress, model metadata and original image bytes without URLs or base64', async () => {
    const backup = await sample()
    const file = await encodeBackupFile(backup)
    expect(new TextDecoder().decode(file.subarray(0, 8))).toBe('GDMBKP01')
    expect(await decodeBackupFile(file)).toEqual(backup)
    expect(vi.mocked(createImageBitmap)).toHaveBeenCalledTimes(8)
  })

  it('rejects empty, foreign, truncated or corrupted files before restoring anything', async () => {
    const file = await encodeBackupFile(await sample())
    const damaged = file.slice()
    damaged[damaged.length - 1] ^= 1
    for (const invalid of [
      new Uint8Array(),
      new TextEncoder().encode('not a backup'),
      file.subarray(0, 20),
      file.subarray(0, file.length - 1),
      damaged,
    ])
      await expect(decodeBackupFile(invalid)).rejects.toThrow()
    await expect(decodeBackupFile(damaged)).rejects.toThrow('完整性校验')
  })

  it('rejects unknown container versions and excessive metadata lengths', async () => {
    const file = await encodeBackupFile(await sample())
    await expect(
      decodeBackupFile(
        await rewriteHeader(file, (header) => {
          header.version = 2
        }),
      ),
    ).rejects.toThrow('版本')
    const bad = file.slice()
    new DataView(bad.buffer).setUint32(8, BACKUP_LIMITS.headerBytes + 1)
    await expect(decodeBackupFile(bad)).rejects.toThrow('长度')
  })

  it('rejects duplicate model IDs, missing images, extra payload and path-like filenames even with a valid checksum', async () => {
    const file = await encodeBackupFile(await sample())
    const transforms = [
      (header: Record<string, unknown>) => {
        const models = header.models as unknown[]
        models.push(models[0])
      },
      (header: Record<string, unknown>) => {
        const models = header.models as { images: { name: string; length: number }[] }[]
        models[0].images[0].name = '../outside.png'
      },
      (header: Record<string, unknown>) => {
        const models = header.models as { images: { name: string; length: number }[] }[]
        models[0].images[1].name = models[0].images[0].name
      },
      (header: Record<string, unknown>) => {
        const models = header.models as { images: { name: string; length: number }[] }[]
        models[0].images[0].length = -1
      },
      (header: Record<string, unknown>) => {
        header.models = []
      },
    ]
    for (const change of transforms)
      await expect(decodeBackupFile(await rewriteHeader(file, change))).rejects.toThrow()
  })

  it('applies existing raster decoding and pixel limits on import and refuses unavailable cryptography', async () => {
    const file = await encodeBackupFile(await sample())
    vi.mocked(createImageBitmap).mockResolvedValue({
      width: 5000,
      height: 5000,
      close: vi.fn(),
    } as unknown as ImageBitmap)
    await expect(decodeBackupFile(file)).rejects.toThrow('1600 万像素')
    vi.stubGlobal('crypto', {})
    await expect(decodeBackupFile(file)).rejects.toThrow('完整性校验')
  })
})
