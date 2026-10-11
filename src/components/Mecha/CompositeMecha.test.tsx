import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { appDependencies } from '../../app/dependencies'
import { getCompositionLayout } from '../../adapters/assets/compositionLayout'
import { getPartDefinitions } from '../../domain/inventory'
import { getStageAsset } from '../../mecha/loader'
import { CompositeMecha } from './CompositeMecha'

describe('component composition renderer', () => {
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
    const calibrated = getPartDefinitions(appDependencies.catalog).filter((part) => part.mechaId.startsWith('mecha-'))
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
