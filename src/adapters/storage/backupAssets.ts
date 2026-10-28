import type { AssetResolver, BackupPort } from '../../application/ports'
import { MODEL_IMPORT_LIMITS, validateUserManifest } from '../../domain/userModels'
import { decodeBackupFile, encodeBackupFile } from './backupFile'

async function readLocalImage(url: string): Promise<Uint8Array> {
  const response = await fetch(url)
  if (!response.ok || !response.body) throw new Error('无法读取本机机型素材。')
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      length += value.length
      if (length > MODEL_IMPORT_LIMITS.imageBytes) throw new Error('本机素材超过 8 MiB，无法备份。')
      chunks.push(value)
    }
  } finally {
    await reader.cancel().catch(() => {})
  }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  return bytes
}

export function createBackupPort(assets: AssetResolver): BackupPort {
  return {
    encode: encodeBackupFile,
    decode: decodeBackupFile,
    async readModel(value) {
      const manifest = validateUserManifest(value)
      const images: Record<string, Uint8Array> = {}
      let total = 0
      for (const name of [manifest.finalAsset, ...manifest.stages.map((part) => part.asset)]) {
        const url = assets.resolve(manifest.id, name)
        if (!url) throw new Error(`机型“${manifest.name}”的素材缺失，无法备份。`)
        images[name] = await readLocalImage(url)
        total += images[name].length
        if (total > MODEL_IMPORT_LIMITS.totalBytes)
          throw new Error('本机单套机型超过 64 MiB，无法备份。')
      }
      return { manifest, images }
    },
  }
}
