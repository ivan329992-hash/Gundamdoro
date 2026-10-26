import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CompositeMecha } from './CompositeMecha'

describe('component composition renderer', () => {
  it('draws equipped wings behind all seven body layers, using their independent asset', () => {
    const slots = ['torso', 'head', 'left-arm', 'right-arm', 'hips', 'left-leg', 'right-leg']
    const body = Object.fromEntries(slots.map((slot) => [slot, `mecha-01:${slot}`]))
    const html = renderToStaticMarkup(
      <CompositeMecha
        parts={{ ...body, wings: 'wing-zero-ew:wings' }}
        profile="standard-front-v4"
      />,
    )
    expect(html.match(/<image /g)).toHaveLength(8)
    expect(html).toContain('wings.png')
    expect(html.indexOf('data-part-slot="wings"')).toBeLessThan(
      html.indexOf('data-part-slot="right-leg"'),
    )
    expect(html).not.toContain('/final/')
    expect(
      renderToStaticMarkup(<CompositeMecha parts={body} profile="standard-front-v4" />).match(
        /<image /g,
      ),
    ).toHaveLength(7)
    expect(
      renderToStaticMarkup(<CompositeMecha parts={body} profile="standard-front-v3" />),
    ).not.toContain('wings.png')
  })
  it('renders historical registered recipes while disabled legacy layouts show unavailable feedback', () => {
    const parts = {
      torso: 'mecha-01:torso',
      head: 'mecha-02:head',
      'left-arm': 'mecha-01:left-arm',
      'right-arm': 'mecha-02:right-arm',
      legs: 'mecha-02:legs',
    }
    const registered = renderToStaticMarkup(
      <CompositeMecha parts={parts} profile="standard-front-v1" />,
    )
    expect(registered).toContain('data-assembly-profile="standard-front-v1"')
    expect(registered.match(/<clipPath /g)).toHaveLength(5)
    expect(registered.match(/<image /g)).toHaveLength(5)
    expect(registered).toContain('/assembly/')
    expect(registered).not.toContain('/final/')
    expect(registered).not.toContain('/stages/')
    for (const id of Object.values(parts)) expect(registered).toContain(`data-part-id="${id}"`)
    const legacy = renderToStaticMarkup(<CompositeMecha parts={parts} />)
    expect(legacy).toContain('旧版装配已停用，配方和制作记录已保留')
    expect(legacy).not.toContain('<image ')
    expect(
      renderToStaticMarkup(<CompositeMecha parts={parts} profile="future-frame-v9" />),
    ).toContain('该装配版本暂不可用')
    expect(
      renderToStaticMarkup(
        <CompositeMecha parts={{ head: 'mecha-03:head' }} profile="standard-front-v1" />,
      ),
    ).toContain('尚未校准或资源暂不可用')
  })
  it('renders the selected component images rather than substituting a full-model image', () => {
    const parts = {
      torso: 'mecha-04:torso',
      head: 'mecha-06:head',
      'left-arm': 'mecha-05:left-arm',
      'right-arm': 'mecha-05:right-arm',
      hips: 'mecha-06:hips',
      'left-leg': 'mecha-03:left-leg',
      'right-leg': 'mecha-02:right-leg',
    }
    const html = renderToStaticMarkup(<CompositeMecha parts={parts} profile="standard-front-v3" />)
    for (const id of Object.values(parts)) expect(html).toContain(`data-part-id="${id}"`)
    expect(html.match(/<image /g)).toHaveLength(7)
    expect(html).toContain('/assembly/')
    expect(html).not.toContain('/final/')
    expect(html).not.toContain('stage-06.png')
  })

  it('keeps unavailable part references visible as an explicit resource state', () => {
    const html = renderToStaticMarkup(
      <CompositeMecha parts={{ head: 'missing-model:head' }} profile="standard-front-v4" />,
    )
    expect(html).toContain('尚未校准或资源暂不可用')
    expect(html).toContain('role="status"')
  })

  it('does not change legacy recipes when their obsolete renderer is unavailable', () => {
    const parts = { torso: 'mecha-01:torso', head: 'mecha-02:head', legs: 'mecha-02:legs' }
    const before = { ...parts }
    const html = renderToStaticMarkup(<CompositeMecha parts={parts} />)
    expect(html).toContain('旧版装配已停用，配方和制作记录已保留')
    expect(html).not.toContain('<svg')
    expect(parts).toEqual(before)
  })
})
