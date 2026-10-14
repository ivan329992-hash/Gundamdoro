import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { appDependencies } from '../../app/dependencies'
import { getCompositionLayout } from '../../adapters/assets/compositionLayout'
import { getPartDefinitions, PART_SLOTS } from '../../domain/inventory'
import type { LegacyPartSlot } from '../../domain/types'
import { getStageAsset } from '../../mecha/loader'
import { CompositeMecha } from './CompositeMecha'

describe('component composition renderer', () => {
  it('draws equipped wings behind all seven body layers, using their independent asset', () => {
    const slots = ['torso', 'head', 'left-arm', 'right-arm', 'hips', 'left-leg', 'right-leg']
    const body = Object.fromEntries(slots.map((slot) => [slot, `mecha-01:${slot}`]))
    const html = renderToStaticMarkup(<CompositeMecha parts={{ ...body, wings: 'wing-zero-ew:wings' }} profile="standard-front-v4" />)
    expect(html.match(/<image /g)).toHaveLength(8)
    expect(html).toContain('wings.png')
    expect(html.indexOf('data-part-slot="wings"')).toBeLessThan(html.indexOf('data-part-slot="right-leg"'))
    expect(html).not.toContain('/final/')
    expect(renderToStaticMarkup(<CompositeMecha parts={body} profile="standard-front-v4" />).match(/<image /g)).toHaveLength(7)
    expect(renderToStaticMarkup(<CompositeMecha parts={body} profile="standard-front-v3" />)).not.toContain('wings.png')
  })
  it('renders new recipes as five masked assembly layers and keeps legacy recipes on their original renderer', () => {
    const parts = { torso: 'mecha-01:torso', head: 'mecha-02:head', 'left-arm': 'mecha-01:left-arm', 'right-arm': 'mecha-02:right-arm', legs: 'mecha-02:legs' }
    const registered = renderToStaticMarkup(<CompositeMecha parts={parts} profile="standard-front-v1" />)
    expect(registered).toContain('data-assembly-profile="standard-front-v1"')
    expect(registered.match(/<clipPath /g)).toHaveLength(5)
    expect(registered.match(/<image /g)).toHaveLength(5)
    expect(registered).toContain('/assembly/')
    expect(registered).not.toContain('/final/')
    expect(registered).not.toContain('/stages/')
    for (const id of Object.values(parts)) expect(registered).toContain(`data-part-id="${id}"`)
    expect(renderToStaticMarkup(<CompositeMecha parts={parts} />)).not.toContain('data-assembly-profile=')
    expect(renderToStaticMarkup(<CompositeMecha parts={parts} profile="future-frame-v9" />)).toContain('该装配版本暂不可用')
    expect(renderToStaticMarkup(<CompositeMecha parts={{ head: 'mecha-03:head' }} profile="standard-front-v1" />)).toContain('尚未校准或资源暂不可用')
  })
  it('renders the selected component images rather than substituting a full-model image', () => {
    const parts = { torso: 'mecha-04:torso', head: 'mecha-06:head', 'left-arm': 'mecha-05:left-arm', 'right-arm': 'mecha-05:right-arm', legs: 'mecha-06:legs' }
    const html = renderToStaticMarkup(<CompositeMecha parts={parts} />)
    for (const id of Object.values(parts)) expect(html).toContain(`data-part-id="${id}"`)
    expect(html).toContain(getStageAsset(1, 'mecha-04')!)
    expect(html).toContain(getStageAsset(2, 'mecha-06')!)
    expect(html).not.toContain('/final/')
    expect(html).not.toContain('stage-06.png')
  })

  it('keeps unavailable part references visible as an explicit resource state', () => {
    const html = renderToStaticMarkup(<CompositeMecha parts={{ head: 'missing-model:head' }} />)
    expect(html).toContain('部分配件资源暂不可用，配方已保留')
    expect(html).toContain('role="status"')
  })

  it('has finite, in-canvas source regions and valid mounting data for calibrated original components', () => {
    const calibrated = getPartDefinitions(appDependencies.catalog, true).filter((part) => part.mechaId.startsWith('mecha-') && part.slot && PART_SLOTS.includes(part.slot as LegacyPartSlot))
    expect(calibrated).toHaveLength(30)
    for (const part of calibrated) {
      if (!part.slot) throw new Error('Original component requires a calibrated slot')
      const layout = getCompositionLayout(part.mechaId, part.slot)!
      expect(layout).toBeTruthy()
      const [x, y, width, height] = layout.bounds
      expect([x, y, width, height, ...layout.image].every(Number.isFinite)).toBe(true)
      expect(x).toBeGreaterThanOrEqual(0)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(width).toBeGreaterThan(0)
      expect(height).toBeGreaterThan(0)
      expect(x + width).toBeLessThanOrEqual(layout.image[0])
      expect(y + height).toBeLessThanOrEqual(layout.image[1])
      if (part.slot === 'torso') {
        expect(layout.waist![1]).toBeGreaterThan(layout.neck![1])
      } else {
        expect(layout.height).toBeGreaterThan(0)
        expect(layout.mount!.every((value) => value >= 0 && value <= 1)).toBe(true)
      }
    }
  })
})
