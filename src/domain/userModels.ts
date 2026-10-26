import { createMechaCatalog } from './catalog'
import type { MechaManifest } from './types'

export const MODEL_IMPORT_LIMITS = {
  parts: 32,
  imageBytes: 8 * 1024 * 1024,
  totalBytes: 64 * 1024 * 1024,
  pixels: 16_000_000,
}
export interface ModelImage {
  bytes: Uint8Array
  width: number
  height: number
}
export interface UserModelDraft {
  name: string
  description: string
  finalImage: ModelImage
  parts: { name: string; image: ModelImage }[]
}
export interface UserModelPackage {
  manifest: MechaManifest
  images: Record<string, Uint8Array>
}

export function imageExtension(bytes: Uint8Array): 'png' | 'jpg' | 'webp' {
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, i) => bytes[i] === value)) return 'png'
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'jpg'
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  )
    return 'webp'
  throw new Error('仅支持有效的 PNG、JPEG 或 WebP 图片，不支持 SVG/GIF。')
}

export function isUserModelId(id: string): boolean {
  return /^user-[a-z0-9][a-z0-9-]{0,79}$/.test(id)
}
export function createUserModelPackage(draft: UserModelDraft, id: string): UserModelPackage {
  if (!isUserModelId(id)) throw new Error('机型标识无效。')
  const name = draft.name.trim()
  const description = draft.description.trim()
  if (!name || Array.from(name).length > 40) throw new Error('机型名称需要 1–40 个字符。')
  if (Array.from(description).length > 200) throw new Error('机型简介不能超过 200 个字符。')
  if (!draft.parts.length || draft.parts.length > MODEL_IMPORT_LIMITS.parts)
    throw new Error('请添加 1–32 个独立配件。')
  const images: Record<string, Uint8Array> = {}
  let total = 0
  const add = (key: string, image: ModelImage) => {
    if (!image.bytes.length || image.bytes.length > MODEL_IMPORT_LIMITS.imageBytes)
      throw new Error('单张图片不能超过 8 MiB。')
    if (
      !Number.isInteger(image.width) ||
      !Number.isInteger(image.height) ||
      image.width < 1 ||
      image.height < 1 ||
      image.width * image.height > MODEL_IMPORT_LIMITS.pixels
    )
      throw new Error('图片尺寸无效或超过 1600 万像素。')
    total += image.bytes.length
    if (total > MODEL_IMPORT_LIMITS.totalBytes) throw new Error('整套素材不能超过 64 MiB。')
    const asset = `${key}.${imageExtension(image.bytes)}`
    images[asset] = image.bytes
    return asset
  }
  const finalAsset = add('final', draft.finalImage)
  const stages = draft.parts.map((part, index) => {
    const partName = part.name.trim()
    if (!partName || Array.from(partName).length > 40)
      throw new Error(`第 ${index + 1} 个配件需要 1–40 字的名称。`)
    return {
      stage: index + 1,
      name: partName,
      partId: `part-${index + 1}`,
      asset: add(`part-${index + 1}`, part.image),
    }
  })
  return {
    manifest: { id, name, description, totalStages: stages.length, finalAsset, stages },
    images,
  }
}

export function validateUserManifest(value: unknown): MechaManifest {
  const id = (value as Partial<MechaManifest> | null)?.id
  if (typeof id !== 'string' || !isUserModelId(id)) throw new Error('用户机型标识损坏。')
  const model = createMechaCatalog([value], id).defaultMecha
  if (
    !model.name.trim() ||
    Array.from(model.name).length > 40 ||
    Array.from(model.description ?? '').length > 200 ||
    model.stages.length > MODEL_IMPORT_LIMITS.parts ||
    model.legacyParts ||
    !/^final\.(png|jpg|webp)$/.test(model.finalAsset) ||
    model.stages.some(
      (part) =>
        part.slot ||
        part.partId !== `part-${part.stage}` ||
        !part.name.trim() ||
        Array.from(part.name).length > 40 ||
        !new RegExp(`^part-${part.stage}\\.(png|jpg|webp)$`).test(part.asset),
    )
  ) {
    throw new Error('用户机型清单无效，请保留原始素材并检查本地资源。')
  }
  return model
}
