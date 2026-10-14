import { useId, useState } from 'react'
import { appAssets, appDependencies } from '../../app/dependencies'
import { registeredAssembly, registeredAssemblyProfiles, registeredPlacements, registeredPartSource, polygonBounds, type RegisteredAssembly } from '../../adapters/assets/registeredAssembly'
import { ALL_PART_SLOTS } from '../../domain/inventory'
import type { DraftComposition, PartSlot } from '../../domain/types'

export function RegisteredMecha({ parts, label = '标准接口混搭预览', config = registeredAssembly }: {
  parts: DraftComposition; label?: string; config?: RegisteredAssembly
}) {
  const id = useId().replace(/[^a-z0-9]/gi, '')
  const [failed, setFailed] = useState<string[]>([])
  const [retry, setRetry] = useState(0)
  const placements = registeredPlacements(parts, appDependencies.catalog, config)
  const missing = ALL_PART_SLOTS.filter((slot) => parts[slot] && !placements.some((part) => part.slot === slot))
  const activeSources = placements.map((part) => appAssets.resolve(part.modelId, registeredPartSource(part.model, part.part).asset))
  const unavailable = activeSources.some((src) => !src || failed.includes(src)) || missing.length > 0
  return <div className="composite-mecha registered-mecha">
    <svg key={retry} className="composite-svg" role="img" aria-label={label} viewBox={config.frame.join(' ')} data-assembly-profile={config.profile}>
      <defs>{placements.map((part) => <clipPath key={part.slot} id={`${id}-${part.slot}`}><polygon points={part.part.mask.map((point) => point.join(',')).join(' ')} /></clipPath>)}</defs>
      {config.layers.map((slot) => {
        const part = placements.find((placement) => placement.slot === slot)
        if (!part) return null
        const source = registeredPartSource(part.model, part.part)
        const src = appAssets.resolve(part.modelId, source.asset)
        return src && <g key={slot} data-part-slot={slot} data-part-id={part.partId} transform={`matrix(${part.transform.join(' ')})`}>
          <image href={src} width={source.image[0]} height={source.image[1]} clipPath={`url(#${id}-${slot})`}
            onError={() => setFailed((previous) => previous.includes(src) ? previous : [...previous, src])} />
        </g>
      })}
    </svg>
    {unavailable && <div className="composition-error" role="status"><span>部分配件尚未校准或资源暂不可用，配方已保留。</span>
      {failed.some((src) => activeSources.includes(src)) && <button type="button" onClick={() => { setFailed([]); setRetry((value) => value + 1) }}>重试图片</button>}</div>}
    {!Object.keys(parts).length && <p className="assembly-placeholder">选择已解锁配件，开始你的第一台混搭机体</p>}
  </div>
}

export function RegisteredPartImage({ modelId, slot, profile = registeredAssembly.profile, className = 'part-image', label }: {
  modelId: string; slot: PartSlot; profile?: string; className?: string; label?: string
}) {
  const id = useId().replace(/[^a-z0-9]/gi, '')
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  const model = registeredAssemblyProfiles[profile]?.models[modelId]
  const part = model?.parts[slot]
  const source = model && part && registeredPartSource(model, part)
  const src = source && appAssets.resolve(modelId, source.asset)
  if (!part || !src || !source) return <span>装配素材暂不可用</span>
  if (failed) return <button type="button" className="secondary-button" onClick={() => { setFailed(false); setRetry((value) => value + 1) }}>重试配件图片</button>
  return <svg key={retry} className={className} role="img" aria-label={label ?? `${modelId} ${slot} 装配配件`} viewBox={polygonBounds(part.mask).join(' ')}>
    <defs><clipPath id={`${id}-part`}><polygon points={part.mask.map((point) => point.join(',')).join(' ')} /></clipPath></defs>
    <image href={src} width={source.image[0]} height={source.image[1]} clipPath={`url(#${id}-part)`} onError={() => setFailed(true)} />
  </svg>
}
