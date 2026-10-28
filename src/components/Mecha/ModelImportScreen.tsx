import { useEffect, useRef, useState } from 'react'
import { readImportImage } from '../../adapters/assets/importImages'
import { appDependencies } from '../../app/dependencies'
import { MODEL_IMPORT_LIMITS } from '../../domain/userModels'
import { useAppStore } from '../../store/useAppStore'
import {
  ImportImageField,
  ImportPartField,
  type ImportImage,
  type ImportPart,
} from './ModelImportFields'
import { useBottomBarSpace } from '../../hooks/useBottomBarSpace'

const newPart = (): ImportPart => ({ key: appDependencies.runtime.newId(), name: '', image: null })

export function ModelImportScreen({
  onClose,
  onImported,
}: {
  onClose: () => void
  onImported: (id: string) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [finalImage, setFinalImage] = useState<ImportImage | null>(null)
  const [parts, setParts] = useState<ImportPart[]>(() => [newPart()])
  const [busy, setBusy] = useState<'reading' | 'saving' | null>(null)
  const [error, setError] = useState('')
  const inFlight = useRef(false)
  const alive = useRef(true)
  const first = useRef<HTMLInputElement>(null)
  const importModel = useAppStore((state) => state.importModel)
  const saveBar = useBottomBarSpace()
  const ready = Boolean(
    name.trim() && finalImage && parts.every((part) => part.name.trim() && part.image),
  )
  const size =
    (finalImage?.bytes.length ?? 0) +
    parts.reduce((sum, part) => sum + (part.image?.bytes.length ?? 0), 0)

  useEffect(() => {
    alive.current = true
    first.current?.focus()
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !inFlight.current) onClose()
    }
    window.addEventListener('keydown', escape)
    return () => {
      alive.current = false
      window.removeEventListener('keydown', escape)
    }
  }, [onClose])

  const readImage = async (file: File | undefined, key?: string) => {
    if (!file || inFlight.current) return
    inFlight.current = true
    setBusy('reading')
    setError('')
    try {
      const image = { ...(await readImportImage(file)), sourceName: file.name }
      if (alive.current) {
        if (key)
          setParts((current) =>
            current.map((part) => (part.key === key ? { ...part, image } : part)),
          )
        else setFinalImage(image)
      }
    } catch (cause) {
      if (alive.current)
        setError(cause instanceof Error ? cause.message : '图片读取失败，请重新选择。')
    } finally {
      inFlight.current = false
      if (alive.current) setBusy(null)
    }
  }

  const move = (index: number, offset: number) =>
    setParts((current) => {
      const next = [...current]
      ;[next[index], next[index + offset]] = [next[index + offset], next[index]]
      return next
    })
  const save = async () => {
    if (inFlight.current || !ready || !finalImage) return
    inFlight.current = true
    setBusy('saving')
    setError('')
    try {
      const id = await importModel({
        name,
        description,
        finalImage,
        parts: parts.map((part) => ({ name: part.name, image: part.image! })),
      })
      if (alive.current) onImported(id)
    } catch (cause) {
      if (alive.current)
        setError(
          cause instanceof Error
            ? cause.message
            : `保存失败：${String(cause)}。请检查可用空间后重试。`,
        )
    } finally {
      inFlight.current = false
      if (alive.current) setBusy(null)
    }
  }

  return (
    <main className="model-screen model-import-screen">
      <section className="model-content" aria-labelledby="import-title" aria-busy={Boolean(busy)}>
        <header className="model-heading">
          <div>
            <p className="phase-label">GUNDAMDORO / MODEL IMPORT</p>
            <h1 id="import-title">添加我的机型</h1>
          </div>
          <button
            type="button"
            className="secondary-button model-back"
            disabled={Boolean(busy)}
            onClick={onClose}
          >
            取消导入
          </button>
        </header>
        <p className="model-note">
          上传整机图与已分好的独立配件。每个配件对应一次专注；导入不会直接发放配件或成品。
        </p>
        <p className="model-note">
          上传的素材用于本机收集与整机展示。保存后暂不支持修改或删除机型。
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void save()
          }}
        >
          <fieldset className="import-fields" disabled={Boolean(busy)}>
            <legend>01 / 机型信息与整机图</legend>
            <label htmlFor="import-name">
              机型名称
              <input
                ref={first}
                id="import-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                required
              />
            </label>
            <label htmlFor="import-description">
              机型简介（可选）
              <textarea
                id="import-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={400}
                rows={3}
              />
            </label>
            <ImportImageField
              id="import-final"
              label="整机图片"
              previewLabel="整机图预览"
              image={finalImage}
              onSelect={(file) => {
                void readImage(file)
              }}
            />
            <p className="model-note">
              支持 PNG/JPEG/WebP；独立配件推荐透明背景。单图不超过 8 MiB、1600 万像素，整套不超过 64
              MiB。
            </p>
          </fieldset>
          <fieldset className="import-fields" disabled={Boolean(busy)}>
            <legend>02 / 配件与收集顺序</legend>
            <p className="model-note">
              可添加 1–32 个配件。顺序即专注收集顺序，整机图不额外占用一次专注。
            </p>
            <ol className="import-parts">
              {parts.map((part, index) => (
                <ImportPartField
                  key={part.key}
                  part={part}
                  index={index}
                  count={parts.length}
                  onName={(value) =>
                    setParts((current) =>
                      current.map((item) =>
                        item.key === part.key ? { ...item, name: value } : item,
                      ),
                    )
                  }
                  onImage={(file) => {
                    void readImage(file, part.key)
                  }}
                  onMove={(offset) => move(index, offset)}
                  onRemove={() =>
                    setParts((current) => current.filter((item) => item.key !== part.key))
                  }
                />
              ))}
            </ol>
            <button
              type="button"
              className="secondary-button"
              disabled={parts.length >= MODEL_IMPORT_LIMITS.parts}
              onClick={() => setParts((current) => [...current, newPart()])}
            >
              添加配件
            </button>
          </fieldset>
          <aside ref={saveBar} className="import-save-bar" aria-label="导入确认">
            <p role="status">
              {busy === 'reading'
                ? '正在检查图片…'
                : busy === 'saving'
                  ? '正在保存素材，请勿关闭应用…'
                  : `${parts.length} 个配件 · ${parts.length} 次专注 · ${(size / 1024 / 1024).toFixed(1)} MiB`}
            </p>
            {error && (
              <p className="import-error" role="alert">
                {error}
              </p>
            )}
            {!ready && (
              <p className="model-note">请填写机型与配件名称，并为整机和每个配件选择图片。</p>
            )}
            <button
              type="submit"
              disabled={!ready || Boolean(busy) || size > MODEL_IMPORT_LIMITS.totalBytes}
            >
              保存机型
            </button>
            {size > MODEL_IMPORT_LIMITS.totalBytes && (
              <p className="import-error" role="alert">
                素材总量超过 64 MiB，请更换较小图片。
              </p>
            )}
          </aside>
        </form>
      </section>
    </main>
  )
}
