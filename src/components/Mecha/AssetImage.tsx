/** 【组件】统一图片加载失败 → MECHA ASSET ERROR + Retry（不改业务进度）。 */
import { useId, useState } from 'react'
import type { ImageViewport } from '../../adapters/assets/stagePresentation'

interface AssetImageProps {
  src: string | null
  alt: string
  className?: string
  viewport?: ImageViewport
}

export function AssetImage({ src, alt, className, viewport }: AssetImageProps) {
  const clipId = useId()
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(0)

  if (!src || failed) {
    return (
      <div className="asset-error" role="alert">
        <span>MECHA ASSET ERROR</span>
        <button
          type="button"
          disabled={!src}
          onClick={() => {
            setFailed(false)
            setRetry((value) => value + 1)
          }}
        >
          RETRY
        </button>
      </div>
    )
  }

  if (viewport)
    return (
      <svg
        key={retry}
        className={className}
        viewBox={viewport.bounds.join(' ')}
        role="img"
        aria-label={alt}
        overflow="hidden"
      >
        <defs>
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
            <rect
              x={viewport.bounds[0]}
              y={viewport.bounds[1]}
              width={viewport.bounds[2]}
              height={viewport.bounds[3]}
            />
          </clipPath>
        </defs>
        {/* viewBox 的留白区仍可能显示邻图，必须按源图坐标明确裁切。 */}
        <g clipPath={`url(#${clipId})`}>
          <image
            href={src}
            width={viewport.image[0]}
            height={viewport.image[1]}
            onError={() => setFailed(true)}
          />
        </g>
      </svg>
    )
  return (
    <img key={retry} className={className} src={src} alt={alt} onError={() => setFailed(true)} />
  )
}
