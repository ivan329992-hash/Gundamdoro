import { convertFileSrc, invoke, isTauri } from '@tauri-apps/api/core'
import { imageExtension, isUserModelId, MODEL_IMPORT_LIMITS, validateUserManifest, type UserModelPackage } from '../../domain/userModels'
import type { StoredUserModel, UserModelRepository } from '../catalog/userModelLibrary'

const DIRECTORY = 'gundamdoro-user-models'
const mediaType = (name: string) => name.endsWith('.jpg') ? 'image/jpeg' : name.endsWith('.webp') ? 'image/webp' : 'image/png'
const missing = (error: unknown) => error instanceof DOMException && error.name === 'NotFoundError'

async function browserRoot(create: boolean): Promise<FileSystemDirectoryHandle | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) {
    if (create) throw new Error('此浏览器不支持本地文件存储，请使用新版 Chrome/Edge 或 Windows 桌面版。')
    return null
  }
  const root = await navigator.storage.getDirectory()
  try { return await root.getDirectoryHandle(DIRECTORY, { create }) } catch (error) { if (!create && missing(error)) return null; throw error }
}

async function writeFile(directory: FileSystemDirectoryHandle, name: string, data: Blob | string) {
  const handle = await directory.getFileHandle(name, { create: true })
  const writer = await handle.createWritable()
  try { await writer.write(data); await writer.close() } catch (error) { await writer.abort().catch(() => {}); throw error }
}

function parseManifest(text: string) {
  const record = JSON.parse(text) as { version?: number; manifest?: unknown }
  if (record.version !== 1) throw new Error('用户机型库版本不受支持，请更新程序。')
  return validateUserManifest(record.manifest)
}

const browserRepository: UserModelRepository = {
  async load() {
    const root = await browserRoot(false)
    if (!root) return []
    const records: StoredUserModel[] = []
    const urls: string[] = []
    try {
      for await (const [id, entry] of root.entries()) {
        if (entry.kind !== 'directory' || !isUserModelId(id)) continue
        const directory = await root.getDirectoryHandle(id)
        let metadata: File
        try { metadata = await (await directory.getFileHandle('manifest.json')).getFile() } catch (error) { if (missing(error)) continue; throw error }
        if (!metadata.size) continue
        if (metadata.size > 64 * 1024) throw new Error('用户机型清单过大。')
        const manifest = parseManifest(await metadata.text())
        if (manifest.id !== id) throw new Error('用户机型目录与标识不一致。')
        const assets: Record<string, string> = {}
        let total = 0
        for (const name of [manifest.finalAsset, ...manifest.stages.map((part) => part.asset)]) {
          const file = await (await directory.getFileHandle(name)).getFile()
          total += file.size
          if (!file.size || file.size > MODEL_IMPORT_LIMITS.imageBytes || total > MODEL_IMPORT_LIMITS.totalBytes
            || imageExtension(new Uint8Array(await file.slice(0, 12).arrayBuffer())) !== name.split('.').pop()) throw new Error('用户机型图片损坏或超过容量限制。')
          const url = URL.createObjectURL(file.slice(0, file.size, mediaType(name)))
          urls.push(url)
          assets[name] = url
        }
        records.push({ manifest, assets })
      }
      return records
    } catch (error) { urls.forEach((url) => URL.revokeObjectURL(url)); throw error }
  },
  async save(model) {
    const manifest = validateUserManifest(model.manifest)
    const root = (await browserRoot(true))!
    let exists = false
    try { await root.getDirectoryHandle(manifest.id); exists = true } catch (error) { if (!missing(error)) throw error }
    if (exists) throw new Error('机型目录已存在，不能覆盖。')
    const directory = await root.getDirectoryHandle(manifest.id, { create: true })
    const assets: Record<string, string> = {}
    try {
      for (const name of [manifest.finalAsset, ...manifest.stages.map((part) => part.asset)]) {
        const bytes = model.images[name]
        if (!bytes) throw new Error('待导入素材缺失。')
        const blob = new Blob([bytes.slice().buffer], { type: mediaType(name) })
        await writeFile(directory, name, blob)
        assets[name] = URL.createObjectURL(blob)
      }
      // 清单最后写入；没有清单的未完成目录不会进入机型库。
      await writeFile(directory, 'manifest.json', JSON.stringify({ version: 1, manifest }))
      return { manifest, assets }
    } catch (error) { Object.values(assets).forEach((url) => URL.revokeObjectURL(url)); throw error }
  },
}

interface NativeRecord { manifest: unknown; assets: Record<string, string> }
function nativeRecord(record: NativeRecord): StoredUserModel {
  return { manifest: record.manifest, assets: Object.fromEntries(Object.entries(record.assets).map(([name, path]) => [name, convertFileSrc(path)])) }
}
const nativeRepository: UserModelRepository = {
  load: async () => (await invoke<NativeRecord[]>('load_user_models')).map(nativeRecord),
  save: async (model: UserModelPackage) => nativeRecord(await invoke<NativeRecord>('save_user_model', {
    manifest: model.manifest,
    images: Object.entries(model.images).map(([name, bytes]) => ({ name, bytes: Array.from(bytes) })),
  })),
}

export const userModelFiles: UserModelRepository = {
  load: () => (isTauri() ? nativeRepository : browserRepository).load(),
  save: (model) => (isTauri() ? nativeRepository : browserRepository).save(model),
}
