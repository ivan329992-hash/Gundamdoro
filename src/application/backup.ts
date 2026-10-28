import {
  BACKUP_LIMITS,
  canUseBackup,
  canonicalBackupJson,
  sameBackupModel,
  validateBackupModels,
  type BackupPlan,
  type LocalBackup,
} from '../domain/backup'
import { createMechaCatalog } from '../domain/catalog'
import { isUserModelId } from '../domain/userModels'
import { isRecord } from '../domain/validation'
import type { AppData } from '../domain/types'
import type { AppDependencies } from './ports'
import { APP_STORAGE_VERSION, createSnapshotCodec } from './snapshot'

function requireIdle(data: AppData): void {
  if (!canUseBackup(data.phase)) throw new Error('请在待机或制作完成后操作备份。')
}

export async function collectLocalBackup(
  data: AppData,
  dependencies: AppDependencies,
): Promise<LocalBackup> {
  requireIdle(data)
  if (!dependencies.backup) throw new Error('当前环境不支持本地备份。')
  const state: unknown = JSON.parse(JSON.stringify(createSnapshotCodec(dependencies).encode(data)))
  const models = []
  const createdAt = dependencies.runtime.now()
  const users = dependencies.catalog.list().filter((model) => isUserModelId(model.id))
  if (users.length > BACKUP_LIMITS.models) throw new Error('备份最多包含 32 个用户机型。')
  for (const model of users) {
    models.push(await dependencies.backup.readModel(model))
    validateBackupModels(models)
  }
  validateBackupModels(models)
  return { createdAt, progress: { version: APP_STORAGE_VERSION, state }, models }
}

export async function prepareBackupPlan(
  backup: LocalBackup,
  current: AppData,
  dependencies: AppDependencies,
): Promise<BackupPlan> {
  requireIdle(current)
  validateBackupModels(backup.models)
  if (!Number.isSafeInteger(backup.createdAt) || backup.createdAt < 0)
    throw new Error('备份时间无效。')
  if (backup.progress.version !== APP_STORAGE_VERSION)
    throw new Error('备份进度版本不受支持，请使用与备份兼容的程序版本。')
  const source = backup.progress.state
  if (
    !isRecord(source) ||
    !canUseBackup(source.phase as AppData['phase']) ||
    !isRecord(source.timer) ||
    source.timer.status !== 'idle'
  )
    throw new Error('备份必须是待机或制作完成时的完整进度。')
  if (
    source.phase === 'COMPLETE' &&
    (typeof source.currentBuildId !== 'string' || !source.currentBuildId)
  )
    throw new Error('完成状态的备份缺少制作标识。')
  const additions = []
  for (const model of backup.models) {
    if (dependencies.catalog.find(model.manifest.id)) {
      if (!dependencies.backup) throw new Error('无法校验本机已有机型。')
      const existing = await dependencies.backup.readModel(
        dependencies.catalog.find(model.manifest.id)!,
      )
      if (!sameBackupModel(existing, model))
        throw new Error(`机型“${model.manifest.name}”与本机同 ID 内容不同，不能覆盖。`)
    } else additions.push(model.manifest)
  }
  const catalog = createMechaCatalog(
    [...dependencies.catalog.list(), ...additions],
    dependencies.catalog.defaultMecha.id,
  )
  const codec = createSnapshotCodec({ ...dependencies, catalog })
  const data = codec.decode(source)
  // 空闲计时按当前运行环境重建；其他字段不允许通过容错归一化悄悄丢弃。
  if (
    canonicalBackupJson({ ...source, timer: data.timer }) !==
    canonicalBackupJson(codec.encode(data))
  )
    throw new Error('备份进度字段损坏或不完整，未执行恢复。')
  if (
    source.timer.endAt !== null ||
    source.timer.sessionId !== null ||
    source.timer.startedAt !== null
  )
    throw new Error('备份中存在未结束的计时。')
  if (
    typeof source.timer.durationMs !== 'number' ||
    !Number.isFinite(source.timer.durationMs) ||
    source.timer.durationMs <= 0 ||
    source.timer.remainingMs !== source.timer.durationMs ||
    canonicalBackupJson({
      ...source.timer,
      durationMs: data.timer.durationMs,
      remainingMs: data.timer.remainingMs,
    }) !== canonicalBackupJson(data.timer)
  )
    throw new Error('备份空闲计时字段无效。')
  return {
    backup,
    data,
    baseline: canonicalBackupJson(createSnapshotCodec(dependencies).encode(current)),
    summary: {
      createdAt: backup.createdAt,
      modelName: catalog.find(data.assembly.mechaId)!.name,
      collected: data.assembly.currentStage,
      totalParts: data.assembly.totalStages,
      ownedParts: data.unlockedParts.length,
      builds: data.hangar.length,
      userModels: backup.models.length,
    },
  }
}

/** 已有机型从不覆盖；中断后可重试，成功补充的素材按相同 ID 复用。 */
export async function restoreBackupModels(
  backup: LocalBackup,
  dependencies: AppDependencies,
): Promise<void> {
  for (const model of backup.models) {
    const existing = dependencies.catalog.find(model.manifest.id)
    if (existing) {
      if (
        !dependencies.backup ||
        !sameBackupModel(await dependencies.backup.readModel(existing), model)
      )
        throw new Error('本机机型内容发生变化，请重新选择备份。')
    } else {
      if (!dependencies.models) throw new Error('当前环境不支持恢复用户机型。')
      await dependencies.models.save(model)
    }
  }
}
