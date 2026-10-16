import { useEffect, useRef, useState } from 'react'
import { readImportImage } from '../../adapters/assets/importImages'
import { appDependencies } from '../../app/dependencies'
import { MODEL_IMPORT_LIMITS, imageExtension, type ModelImage } from '../../domain/userModels'
import { useAppStore } from '../../store/useAppStore'
import { AssetImage } from './AssetImage'

interface ImportImage extends ModelImage { sourceName: string }
interface ImportPart { key: string; name: string; image: ImportImage | null }
const newPart = (): ImportPart => ({ key: appDependencies.runtime.newId(), name: '', image: null })

function ImagePreview({ image, label }: { image: ModelImage | null; label: string }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!image) { setUrl(null); return }
    const ext = imageExtension(image.bytes)
    const next = URL.createObjectURL(new Blob([image.bytes.slice().buffer], { type: `image/${ext === 'jpg' ? 'jpeg' : ext}` }))
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [image])
  return <div className="import-image-preview">{url ? <AssetImage key={url} src={url} alt={label} className="part-image" /> : <span>{label}</span>}</div>
}

export function ModelImportScreen({ onClose, onImported }: { onClose: () => void; onImported: (id: string) => void }) {
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
  const ready = Boolean(name.trim() && finalImage && parts.every((part) => part.name.trim() && part.image))
  const size = (finalImage?.bytes.length ?? 0) + parts.reduce((sum, part) => sum + (part.image?.bytes.length ?? 0), 0)

  useEffect(() => {
    alive.current = true
    first.current?.focus()
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !inFlight.current) onClose() }
    window.addEventListener('keydown', escape)
    return () => { alive.current = false; window.removeEventListener('keydown', escape) }
  }, [onClose])

  const readImage = async (file: File | undefined, key?: string) => {
    if (!file || inFlight.current) return
    inFlight.current = true
    setBusy('reading'); setError('')
    try {
      const image = { ...await readImportImage(file), sourceName: file.name }
      if (alive.current) {
        if (key) setParts((current) => current.map((part) => part.key === key ? { ...part, image } : part))
        else setFinalImage(image)
      }
    } catch (cause) { if (alive.current) setError(cause instanceof Error ? cause.message : '图片读取失败，请重新选择。') }
    finally { inFlight.current = false; if (alive.current) setBusy(null) }
  }

  const move = (index: number, offset: number) => setParts((current) => {
    const next = [...current]
    ;[next[index], next[index + offset]] = [next[index + offset], next[index]]
    return next
  })
  const save = async () => {
    if (inFlight.current || !ready || !finalImage) return
    inFlight.current = true
    setBusy('saving'); setError('')
    try {
      const id = await importModel({ name, description, finalImage, parts: parts.map((part) => ({ name: part.name, image: part.image! })) })
      if (alive.current) onImported(id)
    } catch (cause) { if (alive.current) setError(cause instanceof Error ? cause.message : `保存失败：${String(cause)}。请检查可用空间后重试。`) }
    finally { inFlight.current = false; if (alive.current) setBusy(null) }
  }

  return <main className="model-screen model-import-screen">
    <section className="model-content" aria-labelledby="import-title" aria-busy={Boolean(busy)}>
      <header className="model-heading"><div><p className="phase-label">GUNDAMDORO / MODEL IMPORT</p><h1 id="import-title">添加我的机型</h1></div>
        <button type="button" className="secondary-button model-back" disabled={Boolean(busy)} onClick={onClose}>取消导入</button></header>
      <p className="model-note">上传整机图与已分好的独立配件。每个配件对应一次专注；导入不会直接发放配件或成品。</p>
      <p className="model-note">当前仅支持收集与整机展示，暂不参与混搭。整机分件和挂点校准将在后续提供。保存后暂不支持修改或删除机型。</p>
      <form onSubmit={(event) => { event.preventDefault(); void save() }}>
        <fieldset className="import-fields" disabled={Boolean(busy)}>
          <legend>01 / 机型信息与整机图</legend>
          <label htmlFor="import-name">机型名称<input ref={first} id="import-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required /></label>
          <label htmlFor="import-description">机型简介（可选）<textarea id="import-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={400} rows={3} /></label>
          <ImagePreview image={finalImage} label="整机图预览" />
          <label htmlFor="import-final">整机图片<input id="import-final" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; void readImage(file) }} /></label>
          {finalImage && <p className="model-note">已选择：{finalImage.sourceName} · {finalImage.width} × {finalImage.height}</p>}
          <p className="model-note">支持 PNG/JPEG/WebP；独立配件推荐透明背景。单图不超过 8 MiB、1600 万像素，整套不超过 64 MiB。</p>
        </fieldset>
        <fieldset className="import-fields" disabled={Boolean(busy)}>
          <legend>02 / 配件与收集顺序</legend>
          <p className="model-note">可添加 1–32 个配件。顺序即专注收集顺序，整机图不额外占用一次专注。</p>
          <ol className="import-parts">
            {parts.map((part, index) => <li key={part.key} className="import-part">
              <h2>配件 {index + 1}</h2>
              <ImagePreview image={part.image} label={`配件 ${index + 1} 预览`} />
              <label htmlFor={`name-${part.key}`}>配件 {index + 1} 名称<input id={`name-${part.key}`} value={part.name} required maxLength={80} onChange={(event) => setParts((current) => current.map((item) => item.key === part.key ? { ...item, name: event.target.value } : item))} /></label>
              <label htmlFor={`image-${part.key}`}>配件 {index + 1} 图片<input id={`image-${part.key}`} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; void readImage(file, part.key) }} /></label>
              {part.image && <p className="model-note">已选择：{part.image.sourceName} · {part.image.width} × {part.image.height}</p>}
              <div className="import-part-actions"><button type="button" className="secondary-button" disabled={index === 0} aria-label={`上移配件 ${index + 1}`} onClick={() => move(index, -1)}>上移</button>
                <button type="button" className="secondary-button" disabled={index === parts.length - 1} aria-label={`下移配件 ${index + 1}`} onClick={() => move(index, 1)}>下移</button>
                <button type="button" className="secondary-button" disabled={parts.length === 1} aria-label={`移除配件 ${index + 1}`} onClick={() => setParts((current) => current.filter((item) => item.key !== part.key))}>移除</button></div>
            </li>)}
          </ol>
          <button type="button" className="secondary-button" disabled={parts.length >= MODEL_IMPORT_LIMITS.parts} onClick={() => setParts((current) => [...current, newPart()])}>添加配件</button>
        </fieldset>
        <aside className="import-save-bar" aria-label="导入确认">
          <p role="status">{busy === 'reading' ? '正在检查图片…' : busy === 'saving' ? '正在保存素材，请勿关闭应用…' : `${parts.length} 个配件 · ${parts.length} 次专注 · ${(size / 1024 / 1024).toFixed(1)} MiB`}</p>
          {error && <p className="import-error" role="alert">{error}</p>}
          {!ready && <p className="model-note">请填写机型与配件名称，并为整机和每个配件选择图片。</p>}
          <button type="submit" disabled={!ready || Boolean(busy) || size > MODEL_IMPORT_LIMITS.totalBytes}>保存机型</button>
          {size > MODEL_IMPORT_LIMITS.totalBytes && <p className="import-error" role="alert">素材总量超过 64 MiB，请更换较小图片。</p>}
        </aside>
      </form>
    </section>
  </main>
}
