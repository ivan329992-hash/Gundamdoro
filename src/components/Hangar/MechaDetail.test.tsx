import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { groupHangar } from '../../domain/hangar'
import { getMechaManifests } from '../../mecha/loader'
import { mechaProfiles } from '../../mecha/profiles'
import { MechaDetail } from './MechaDetail'

describe('mecha dossiers', () => {
  it('provides independent profiles for all seven registered models', () => {
    for (const model of getMechaManifests()) {
      const profile = mechaProfiles[model.id]
      expect(profile.story.length).toBeGreaterThan(40)
      expect(profile.features).toHaveLength(3)
      for (const value of Object.values(profile.ratings)) {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(100)
      }
      const group = groupHangar([
        {
          id: 'build',
          mechaId: model.id,
          mechaName: model.name,
          completedAt: null,
          completedFocusSessions: 5,
          totalFocusedMinutes: 125,
        },
      ])[0]
      const html = renderToStaticMarkup(<MechaDetail group={group} />)
      expect(html).toContain(profile.story)
      expect(html).toContain('背景档案')
      expect(html).toContain('无法确定实际首次完成日期')
      expect(html).toContain(`${model.totalStages} 个`)
    }
  })
  it('labels fan-art interpretation and handles unregistered models', () => {
    expect(mechaProfiles['wing-zero-ew'].origin).toContain('非官方')
    const group = groupHangar([
      {
        id: 'old',
        mechaId: 'missing',
        mechaName: 'UNKNOWN',
        completedAt: null,
        completedFocusSessions: 2,
        totalFocusedMinutes: 50,
      },
    ])[0]
    const html = renderToStaticMarkup(<MechaDetail group={group} />)
    expect(html).toContain('机型资源暂不可用')
    expect(html).toContain('尚无背景资料')
  })
})
