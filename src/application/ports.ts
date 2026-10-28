/** 【应用·端口】业务需要的外部能力接口（时钟/ID/存储/调度/资源）。具体实现在 adapters。 */
import type { MechaCatalog } from '../domain/catalog'
import type { AssemblyPolicy } from '../domain/assembly'
import type { UserModelPackage } from '../domain/userModels'
import type { MechaManifest } from '../domain/types'
import type { LocalBackup } from '../domain/backup'

export interface RuntimePort {
  now(): number
  newId(): string
  millisecondsPerMinute(): number
  random(): number
}

export interface KeyValueStorage {
  getItem(key: string): string | null | Promise<string | null>
  setItem(key: string, value: string): void | Promise<void>
  removeItem(key: string): void | Promise<void>
}

export interface SchedulerPort {
  after(milliseconds: number, callback: () => void): () => void
  every(milliseconds: number, callback: () => void): () => void
}

export interface AssetResolver {
  resolve(mechaId: string, relativePath: string): string | null
}

export interface UserModelLibrary {
  load(): Promise<void>
  save(model: UserModelPackage): Promise<void>
}

export interface AppDependencies {
  catalog: MechaCatalog
  runtime: RuntimePort
  storage: () => KeyValueStorage
  assembly?: AssemblyPolicy
  models?: UserModelLibrary
  backup?: BackupPort
  workbenchEnabled?: boolean
}

export interface BackupPort {
  readModel(model: MechaManifest): Promise<UserModelPackage>
  encode(backup: LocalBackup): Promise<Uint8Array>
  decode(bytes: Uint8Array): Promise<LocalBackup>
}
