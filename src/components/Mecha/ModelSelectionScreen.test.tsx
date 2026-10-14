import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BuiltMecha } from '../../domain/types'
import { ModelSelectionScreen } from './ModelSelectionScreen'

const state = vi.hoisted(() => ({ hangar: [] as BuiltMecha[] }))
vi.mock('../../store/useAppStore', () => ({ useAppStore: (select: (value: typeof state) => unknown) => select(state) }))
const render = () => renderToStaticMarkup(<ModelSelectionScreen currentMechaId="mecha-01" completed={false} onSelect={() => {}} onClose={() => {}} />)
const fixed: BuiltMecha = { id: 'fixed', mechaId: 'mecha-02', mechaName: 'MECHA-02', completedAt: 100, completedFocusSessions: 7, totalFocusedMinutes: 175 }

describe('model selection appearance rewards', () => {
  beforeEach(() => { state.hangar = [] })

  it('conceals all uncompleted models while retaining model selection and component counts', () => {
    const html = render()
    expect(html.match(/class="mecha-image model-silhouette"/g)).toHaveLength(7)
    expect(html.match(/class="model-mystery-mark"/g)).toHaveLength(7)
    expect(html).toContain('MECHA-01 当前机型')
    expect(html).toContain('制作 MECHA-02')
    expect(html).toContain('8 个部件 · 8 次专注')
  })

  it('reveals only completed fixed models, including duplicated historical builds with unknown dates', () => {
    state.hangar = [fixed, { ...fixed, id: 'old', completedAt: null }]
    const html = render()
    expect(html.match(/class="mecha-image model-silhouette"/g)).toHaveLength(6)
    expect(html).toContain('MECHA-02 完整外观')
    expect(html).toContain('MECHA-01 神秘轮廓，完成制作后揭晓')
  })

  it('does not reveal models through custom recipes or unavailable archived model IDs', () => {
    state.hangar = [{ ...fixed, kind: 'custom', composition: { torso: 'mecha-02:torso', head: 'mecha-02:head', 'left-arm': 'mecha-02:left-arm', 'right-arm': 'mecha-02:right-arm', hips: 'mecha-02:hips', 'left-leg': 'mecha-02:left-leg', 'right-leg': 'mecha-02:right-leg' } },
      { ...fixed, id: 'future', mechaId: 'unavailable-model' }]
    expect(render().match(/class="mecha-image model-silhouette"/g)).toHaveLength(7)
  })
})
