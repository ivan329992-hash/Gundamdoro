import { BACKUP_LIMITS, validateBackupModels, type LocalBackup } from '../../domain/backup'
import { MODEL_IMPORT_LIMITS, validateUserManifest } from '../../domain/userModels'
import { isRecord } from '../../domain/validation'
import { readImportImage } from '../assets/importImages'

const MAGIC = new TextEncoder().encode('GDMBKP01')
const PREFIX = MAGIC.length + 4 + 32
const FORMAT = 'gundamdoro-local-backup'

async function digest(bytes: Uint8Array): Promise<Uint8Array> {
  if (!globalThis.crypto?.subtle)
    throw new Error('当前环境不支持备份完整性校验，请使用新版浏览器或桌面版。')
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes.slice().buffer))
}

async function validateImages(backup: LocalBackup): Promise<void> {
  validateBackupModels(backup.models)
  for (const model of backup.models)
    for (const [name, bytes] of Object.entries(model.images))
      await readImportImage(new File([bytes.slice().buffer], name))
}

/** 固定帧头 + 有界 JSON 元数据 + 原始图片，不执行 ZIP 解压或任意路径提取。 */
export async function encodeBackupFile(backup: LocalBackup): Promise<Uint8Array> {
  await validateImages(backup)
  const header = new TextEncoder().encode(
    JSON.stringify({
      format: FORMAT,
      version: 1,
      createdAt: backup.createdAt,
      progress: backup.progress,
      models: backup.models.map((model) => ({
        manifest: model.manifest,
        images: Object.entries(model.images).map(([name, bytes]) => ({
          name,
          length: bytes.length,
        })),
      })),
    }),
  )
  if (header.length > BACKUP_LIMITS.headerBytes) throw new Error('备份元数据超过 4 MiB。')
  const total =
    PREFIX +
    header.length +
    backup.models.reduce(
      (sum, model) =>
        sum + Object.values(model.images).reduce((size, image) => size + image.length, 0),
      0,
    )
  if (total > BACKUP_LIMITS.fileBytes) throw new Error('完整备份不能超过 128 MiB。')
  const bytes = new Uint8Array(total)
  bytes.set(MAGIC)
  new DataView(bytes.buffer).setUint32(MAGIC.length, header.length)
  bytes.set(header, PREFIX)
  let offset = PREFIX + header.length
  for (const model of backup.models)
    for (const image of Object.values(model.images)) {
      bytes.set(image, offset)
      offset += image.length
    }
  bytes.set(await digest(bytes.subarray(PREFIX)), MAGIC.length + 4)
  return bytes
}

export async function decodeBackupFile(bytes: Uint8Array): Promise<LocalBackup> {
  if (
    bytes.length < PREFIX ||
    bytes.length > BACKUP_LIMITS.fileBytes ||
    !MAGIC.every((value, index) => bytes[index] === value)
  )
    throw new Error('不是有效的 Gundamdoro 备份，或文件超过 128 MiB。')
  const headerLength = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(
    MAGIC.length,
  )
  if (
    !headerLength ||
    headerLength > BACKUP_LIMITS.headerBytes ||
    PREFIX + headerLength > bytes.length
  )
    throw new Error('备份元数据长度无效。')
  const checksum = await digest(bytes.subarray(PREFIX))
  if (!checksum.every((value, index) => value === bytes[MAGIC.length + 4 + index]))
    throw new Error('备份完整性校验失败，文件可能损坏，未执行恢复。')
  const header: unknown = JSON.parse(
    new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(PREFIX, PREFIX + headerLength)),
  )
  if (
    !isRecord(header) ||
    header.format !== FORMAT ||
    header.version !== 1 ||
    !Number.isSafeInteger(header.createdAt) ||
    (header.createdAt as number) < 0 ||
    !isRecord(header.progress) ||
    !Number.isInteger(header.progress.version) ||
    !Array.isArray(header.models) ||
    header.models.length > BACKUP_LIMITS.models
  )
    throw new Error('备份格式或版本不受支持。')
  const backup: LocalBackup = {
    createdAt: header.createdAt as number,
    progress: { version: header.progress.version as number, state: header.progress.state },
    models: [],
  }
  let offset = PREFIX + headerLength
  for (const row of header.models) {
    if (!isRecord(row) || !Array.isArray(row.images)) throw new Error('机型素材清单无效。')
    const manifest = validateUserManifest(row.manifest)
    const names = new Set([manifest.finalAsset, ...manifest.stages.map((part) => part.asset)])
    if (row.images.length !== names.size) throw new Error('机型素材数量不一致。')
    const images: Record<string, Uint8Array> = {}
    for (const image of row.images) {
      if (
        !isRecord(image) ||
        typeof image.name !== 'string' ||
        !names.delete(image.name) ||
        !Number.isSafeInteger(image.length) ||
        (image.length as number) < 1 ||
        (image.length as number) > MODEL_IMPORT_LIMITS.imageBytes ||
        offset + (image.length as number) > bytes.length
      )
        throw new Error('机型素材路径、长度或内容无效。')
      const length = image.length as number
      images[image.name] = bytes.slice(offset, offset + length)
      offset += length
    }
    backup.models.push({ manifest, images })
  }
  if (offset !== bytes.length) throw new Error('备份含有多余或截断的内容。')
  await validateImages(backup)
  return backup
}

export function downloadBackupFile(bytes: Uint8Array): void {
  const url = URL.createObjectURL(
    new Blob([bytes.slice().buffer], { type: 'application/octet-stream' }),
  )
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `gundamdoro-${new Date().toISOString().replace(/[:.]/g, '-')}.gundamdoro`
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
