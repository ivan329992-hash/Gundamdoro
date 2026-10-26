import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FocusPartDisplay } from './FocusPartDisplay'
import { getStageAsset } from '../../mecha/loader'

describe('focus target preview', () => {
  it.each([
    [0, 'TORSO'],
    [1, 'HEAD'],
    [2, 'LEFT ARM'],
    [3, 'RIGHT ARM'],
    [4, 'HIP UNIT'],
    [5, 'LEFT LEG'],
    [6, 'RIGHT LEG'],
  ] as const)(
    'with %i collected parts previews %s for the current focus',
    (currentStage, target) => {
      const html = renderToStaticMarkup(<FocusPartDisplay currentStage={currentStage} />)
      expect(html).toContain(currentStage < 4 ? `alt="${target}"` : `aria-label="${target}"`)
      expect(html).toContain('FOCUS TARGET')
      expect(html).not.toContain('focus-part-placeholder')
    },
  )

  it('does not show the previously earned left arm during the fourth focus', () => {
    const html = renderToStaticMarkup(<FocusPartDisplay currentStage={3} />)
    expect(html).toContain('alt="RIGHT ARM"')
    expect(html).not.toContain('alt="LEFT ARM"')
  })

  it('does not wrap to another focus target after all seven parts', () => {
    const html = renderToStaticMarkup(<FocusPartDisplay currentStage={7} />)
    expect(html).toContain('ALL PARTS COLLECTED')
    expect(html).not.toContain('<img')
  })

  it.each([0, 1, 2, 3, 4, 5, 6])('uses the selected model for focus target %i', (currentStage) => {
    const html = renderToStaticMarkup(
      <FocusPartDisplay mechaId="mecha-02" currentStage={currentStage} />,
    )
    expect(html).toContain('MECHA-02 focus part preview')
    expect(html).toContain(getStageAsset(currentStage + 1, 'mecha-02')!)
    expect(html).not.toContain(getStageAsset(currentStage + 1, 'mecha-01')!)
  })
})
