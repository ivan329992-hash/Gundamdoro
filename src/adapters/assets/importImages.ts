import { imageExtension, MODEL_IMPORT_LIMITS, type ModelImage } from '../../domain/userModels'

export async function readImportImage(file: File): Promise<ModelImage> {
  if (!file.size || file.size > MODEL_IMPORT_LIMITS.imageBytes) throw new Error('请选择不超过 8 MiB 的图片。')
  const bytes = new Uint8Array(await file.arrayBuffer())
  imageExtension(bytes)
  let image: ImageBitmap
  try { image = await createImageBitmap(file) } catch { throw new Error('图片无法解码，请更换文件。') }
  try {
    if (image.width * image.height > MODEL_IMPORT_LIMITS.pixels) throw new Error('图片不能超过 1600 万像素。')
    return { bytes, width: image.width, height: image.height }
  } finally { image.close() }
}
