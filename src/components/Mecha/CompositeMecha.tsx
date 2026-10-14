import { useId, useState } from 'react'
import { getCompositionLayout, type PartLayout, type Point } from '../../adapters/assets/compositionLayout'
import { getPartDefinitions, PART_SLOTS, PART_SLOT_LABELS } from '../../domain/inventory'
import type { DraftComposition, LegacyPartSlot } from '../../domain/types'
import { appAssets, appDependencies } from '../../app/dependencies'
import { RegisteredMecha } from './RegisteredMecha'
import { registeredAssemblyProfiles } from '../../adapters/assets/registeredAssembly'

interface Placement { slot: LegacyPartSlot; src: string; layout: PartLayout; x: number; y: number; scale: number }
const point = (layout: PartLayout, relative: Point): Point => [layout.bounds[0] + relative[0] * layout.bounds[2], layout.bounds[1] + relative[1] * layout.bounds[3]]

export function CompositeMecha({ parts, label = '自定义机体预览', profile }: { parts: DraftComposition; label?: string; profile?: string }) {
  if (profile && registeredAssemblyProfiles[profile]) return <RegisteredMecha parts={parts} label={label} config={registeredAssemblyProfiles[profile]} />
  if (profile) return <p className="composition-error" role="status">该装配版本暂不可用，配方和制作记录已保留。</p>
  return <LegacyCompositeMecha parts={parts} label={label} />
}

function LegacyCompositeMecha({ parts, label }: { parts: DraftComposition; label: string }) {
  const clipId = useId().replace(/:/g, '')
  const [failed, setFailed] = useState<string[]>([])
  const [retry, setRetry] = useState(0)
  const definitions = getPartDefinitions(appDependencies.catalog, true)
  const torso = definitions.find((part) => part.id === parts.torso)
  const torsoLayout = torso && getCompositionLayout(torso.mechaId, 'torso')
  const targets: Record<LegacyPartSlot, Point> = { torso: [700, 530], head: [700, 350], 'left-arm': [870, 460], 'right-arm': [530, 460], legs: [700, 700] }
  let torsoScale = 1
  let torsoOrigin: Point = [0, 0]
  if (torsoLayout?.waist && torsoLayout.neck && torsoLayout.left && torsoLayout.right) {
    const waist = point(torsoLayout, torsoLayout.waist)
    const neck = point(torsoLayout, torsoLayout.neck)
    torsoScale = 350 / Math.max(1, waist[1] - neck[1])
    torsoOrigin = [700 - waist[0] * torsoScale, 700 - waist[1] * torsoScale]
    for (const [slot, anchor] of [['head', torsoLayout.neck], ['left-arm', torsoLayout.left], ['right-arm', torsoLayout.right]] as const) {
      const source = point(torsoLayout, anchor)
      targets[slot] = [torsoOrigin[0] + source[0] * torsoScale, torsoOrigin[1] + source[1] * torsoScale]
    }
  }
  const placements: Placement[] = []
  for (const slot of PART_SLOTS) {
    const part = definitions.find((part) => part.id === parts[slot] && part.slot === slot)
    const layout = part && getCompositionLayout(part.mechaId, slot)
    const src = part && appAssets.resolve(part.mechaId, part.asset)
    if (!part || !layout || !src) continue
    if (slot === 'torso') placements.push({ slot, src, layout, x: torsoOrigin[0], y: torsoOrigin[1], scale: torsoScale })
    else {
      const anchor = point(layout, layout.mount ?? [.5, .5])
      const scale = (layout.height ?? 500) / layout.bounds[3]
      placements.push({ slot, src, layout, scale, x: targets[slot][0] - anchor[0] * scale, y: targets[slot][1] - anchor[1] * scale })
    }
  }
  const missing = PART_SLOTS.filter((slot) => parts[slot] && !placements.some((part) => part.slot === slot))
  const errors = failed.filter((src) => placements.some((part) => part.src === src))
  const extents = placements.map((p) => [p.x + p.layout.bounds[0] * p.scale, p.y + p.layout.bounds[1] * p.scale, p.layout.bounds[2] * p.scale, p.layout.bounds[3] * p.scale])
  const minX = Math.min(260, ...extents.map((r) => r[0])) - 60
  const minY = Math.min(170, ...extents.map((r) => r[1])) - 60
  const maxX = Math.max(1140, ...extents.map((r) => r[0] + r[2])) + 60
  const maxY = Math.max(1390, ...extents.map((r) => r[1] + r[3])) + 60
  const body = placements.find((p) => p.slot === 'torso')
  const renderPart = (p: Placement, suffix = '') => <svg key={`${p.slot}:${p.src}:${suffix}`} data-part-slot={p.slot} data-part-id={parts[p.slot]}
    x={p.x + p.layout.bounds[0] * p.scale} y={p.y + p.layout.bounds[1] * p.scale}
    width={p.layout.bounds[2] * p.scale} height={p.layout.bounds[3] * p.scale}
    viewBox={p.layout.bounds.join(' ')} overflow="hidden">
    <image href={p.src} width={p.layout.image[0]} height={p.layout.image[1]} onError={() => setFailed((previous) => previous.includes(p.src) ? previous : [...previous, p.src])} />
  </svg>
  return (
    <div className="composite-mecha">
      <svg key={retry} className="composite-svg" role="img" aria-label={label} viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}>
        <defs><clipPath id={clipId}><rect x={Math.min(targets['left-arm'][0], targets['right-arm'][0]) - 35} y={targets.head[1] - 30}
          width={Math.abs(targets['left-arm'][0] - targets['right-arm'][0]) + 70} height={730 - targets.head[1]} /></clipPath></defs>
        <g aria-hidden="true" fill="#1b252d" stroke="#536673" strokeWidth="8">
          {PART_SLOTS.filter((slot) => slot !== 'torso').map((slot) => <circle key={slot} cx={targets[slot][0]} cy={targets[slot][1]} r={slot === 'legs' ? 46 : 30} />)}
        </g>
        {body && renderPart(body, 'back')}
        {['legs', 'right-arm', 'left-arm'].map((slot) => placements.find((p) => p.slot === slot)).filter((p): p is Placement => Boolean(p)).map((p) => renderPart(p))}
        {body && <g clipPath={`url(#${clipId})`}>{renderPart(body, 'front')}</g>}
        {placements.filter((p) => p.slot === 'head').map((p) => renderPart(p))}
        {PART_SLOTS.filter((slot) => !parts[slot]).map((slot) => <text key={slot} x={targets[slot][0]} y={slot === 'legs' ? 1050 : targets[slot][1] - 50}
          textAnchor="middle" fill="#647987" fontSize="28">{PART_SLOT_LABELS[slot]}待选择</text>)}
      </svg>
      {Boolean(missing.length || errors.length) && <div className="composition-error" role="status">
        <span>部分配件资源暂不可用，配方已保留。</span>
        {errors.length > 0 && <button type="button" onClick={() => { setFailed([]); setRetry((value) => value + 1) }}>重试图片</button>}
      </div>}
    </div>
  )
}
