/** 【组件】统一图片加载失败 → MECHA ASSET ERROR + Retry（不改业务进度）。 */
import { useState } from 'react'
import type { ImageViewport } from '../../adapters/assets/stagePresentation'

interface AssetImageProps {
  src: string | null
  alt: string
  className?: string
  viewport?: ImageViewport
}

export function AssetImage({ src, alt, className, viewport }: AssetImageProps) {
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(0)

  if (!src || failed) {
    return (
      <div className="asset-error" role="alert">
        <span>MECHA ASSET ERROR</span>
        <button type="button" disabled={!src} onClick={() => { setFailed(false); setRetry((value) => value + 1) }}>RETRY</button>
      </div>
    )
  }

  if (viewport) return <svg key={retry} className={className} viewBox={viewport.bounds.join(' ')} role="img" aria-label={alt} overflow="hidden">
    <image href={src} width={viewport.image[0]} height={viewport.image[1]} onError={() => setFailed(true)} />
  </svg>
  return <img key={retry} className={className} src={src} alt={alt} onError={() => setFailed(true)} />
}
