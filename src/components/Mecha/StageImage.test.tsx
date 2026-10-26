import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { getStagePresentation } from '../../adapters/assets/stagePresentation'
import { StageImage } from './StageImage'
import { InventoryScreen } from '../Inventory/InventoryScreen'

describe('stage image presentation', () => {
  it('retains existing image markup for original models', () => {
    const html = renderToStaticMarkup(
      <StageImage mechaId="mecha-01" stage={2} className="part-image" />,
    )
    expect(html).toContain('alt="HEAD"')
    expect(html).toContain('<img')
    expect(html).not.toContain('<svg')
  })

  it('shows the torso alone during its own focus', () => {
    const html = renderToStaticMarkup(
      <StageImage mechaId="wing-zero-ew" stage={1} className="focus-part-image" />,
    )
    expect(html).toContain('torso.png')
    expect(html).not.toContain('wings.png')
    expect(html.match(/<image /g)).toHaveLength(1)
    expect(html).not.toContain('/final/')
  })

  it('shows only wings during the independent eighth focus', () => {
    const html = renderToStaticMarkup(
      <StageImage mechaId="wing-zero-ew" stage={8} className="focus-part-image" />,
    )
    expect(html).toContain('wings.png')
    expect(html).not.toContain('torso.png')
    expect(html.match(/<image /g)).toHaveLength(1)
  })

  it('enlarges the corrected head with a bounded source viewport', () => {
    const html = renderToStaticMarkup(<StageImage mechaId="wing-zero-ew" stage={2} />)
    expect(html).toContain('head-clean-v3.png')
    expect(html).not.toContain('head-blue-v2.png')
    expect(html).not.toContain('head-corrected.png')
    expect(html).toContain('viewBox="20 275 1046 840"')
    expect(html).toContain('aria-label="飞翼零式清理版头部"')
    expect(getStagePresentation('missing-model', 1)).toBeNull()
  })

  it('exposes the compatible assembly entry while retaining the inventory', () => {
    const html = renderToStaticMarkup(
      <InventoryScreen onClose={() => {}} onOpenHangar={() => {}} />,
    )
    expect(html).toContain('配件仓库')
    expect(html).toContain('自定义拼装')
    expect(html).not.toContain('随机搭配')
  })
})
