import { useEffect, useState } from 'react'
import { imageExtension, type ModelImage } from '../../domain/userModels'
import { AssetImage } from './AssetImage'

export interface ImportImage extends ModelImage {
  sourceName: string
}
export interface ImportPart {
  key: string
  name: string
  image: ImportImage | null
}

interface ImageFieldProps {
  id: string
  label: string
  previewLabel: string
  image: ImportImage | null
  onSelect: (file: File | undefined) => void
}

/** 预览地址仅在表单存活期间存在，不把图片内容写入进度存档。 */
export function ImportImageField({ id, label, previewLabel, image, onSelect }: ImageFieldProps) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!image) {
      setUrl(null)
      return
    }
    const ext = imageExtension(image.bytes)
    const type = `image/${ext === 'jpg' ? 'jpeg' : ext}`
    const next = URL.createObjectURL(new Blob([image.bytes.slice().buffer], { type }))
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [image])

  return (
    <>
      <div className="import-image-preview">
        {url ? (
          <AssetImage key={url} src={url} alt={previewLabel} className="part-image" />
        ) : (
          <span>{previewLabel}</span>
        )}
      </div>
      <label htmlFor={id}>
        {label}
        <input
          id={id}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            onSelect(file)
          }}
        />
      </label>
      {image && (
        <p className="model-note">
          已选择：{image.sourceName} · {image.width} × {image.height}
        </p>
      )}
    </>
  )
}

interface PartFieldProps {
  part: ImportPart
  index: number
  count: number
  onName: (name: string) => void
  onImage: (file: File | undefined) => void
  onMove: (offset: number) => void
  onRemove: () => void
}

export function ImportPartField({
  part,
  index,
  count,
  onName,
  onImage,
  onMove,
  onRemove,
}: PartFieldProps) {
  const number = index + 1
  return (
    <li className="import-part">
      <h2>配件 {number}</h2>
      <label htmlFor={`name-${part.key}`}>
        配件 {number} 名称
        <input
          id={`name-${part.key}`}
          value={part.name}
          required
          maxLength={80}
          onChange={(event) => onName(event.target.value)}
        />
      </label>
      <ImportImageField
        id={`image-${part.key}`}
        label={`配件 ${number} 图片`}
        previewLabel={`配件 ${number} 预览`}
        image={part.image}
        onSelect={onImage}
      />
      <div className="import-part-actions">
        <button
          type="button"
          className="secondary-button"
          disabled={index === 0}
          aria-label={`上移配件 ${number}`}
          onClick={() => onMove(-1)}
        >
          上移
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={index === count - 1}
          aria-label={`下移配件 ${number}`}
          onClick={() => onMove(1)}
        >
          下移
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={count === 1}
          aria-label={`移除配件 ${number}`}
          onClick={onRemove}
        >
          移除
        </button>
      </div>
    </li>
  )
}
