import type { AppData, AppPhase } from './types'
import {
  imageExtension,
  MODEL_IMPORT_LIMITS,
  validateUserManifest,
  type UserModelPackage,
} from './userModels'

export const BACKUP_LIMITS = {
  fileBytes: 128 * 1024 * 1024,
  headerBytes: 4 * 1024 * 1024,
  models: 32,
}

export interface LocalBackup {
  createdAt: number
  progress: { version: number; state: unknown }
  models: UserModelPackage[]
}

export interface BackupSummary {
  createdAt: number
  modelName: string
  collected: number
  totalParts: number
  ownedParts: number
  builds: number
  userModels: number
}

export interface BackupPlan {
  backup: LocalBackup
  data: AppData
  summary: BackupSummary
  baseline: string
}

export type BackupOperation = 'idle' | 'exporting' | 'checking' | 'restoring'

export function canUseBackup(phase: AppPhase): boolean {
  return phase === 'READY' || phase === 'COMPLETE'
}

/** 只用于有限大小的 JSON 快照和机型元数据，不比较平台资源地址。 */
export function canonicalBackupJson(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return item
    return Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
  })
}

export function validateBackupModels(models: UserModelPackage[]): void {
  if (!Array.isArray(models) || models.length > BACKUP_LIMITS.models)
    throw new Error('备份最多包含 32 个用户机型。')
  const ids = new Set<string>()
  let bytes = 0
  for (const model of models) {
    const manifest = validateUserManifest(model?.manifest)
    if (ids.has(manifest.id)) throw new Error('备份包含重复的机型标识。')
    ids.add(manifest.id)
    const names = [manifest.finalAsset, ...manifest.stages.map((part) => part.asset)]
    if (!model.images || Object.keys(model.images).length !== names.length)
      throw new Error('备份的机型素材数量不一致。')
    let modelBytes = 0
    for (const name of names) {
      const image = model.images[name]
      if (
        !(image instanceof Uint8Array) ||
        !image.length ||
        image.length > MODEL_IMPORT_LIMITS.imageBytes
      )
        throw new Error('备份中的单张素材必须为有效且不超过 8 MiB 的图片。')
      if (!name.endsWith('.' + imageExtension(image))) throw new Error('备份图片格式与名称不一致。')
      modelBytes += image.length
    }
    if (modelBytes > MODEL_IMPORT_LIMITS.totalBytes)
      throw new Error('单套机型素材不能超过 64 MiB。')
    bytes += modelBytes
  }
  if (bytes > BACKUP_LIMITS.fileBytes) throw new Error('备份素材超过 128 MiB。')
}

export function sameBackupModel(first: UserModelPackage, second: UserModelPackage): boolean {
  const normalize = (model: UserModelPackage) => ({
    ...validateUserManifest(model.manifest),
    description: model.manifest.description ?? '',
  })
  if (canonicalBackupJson(normalize(first)) !== canonicalBackupJson(normalize(second))) return false
  return Object.keys(first.images).every((name) => {
    const left = first.images[name]
    const right = second.images[name]
    if (!right || left.length !== right.length) return false
    for (let index = 0; index < left.length; index++) if (left[index] !== right[index]) return false
    return true
  })
}
