import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ModelImportScreen } from './ModelImportScreen'

describe('model import form', () => {
  it('offers the split-asset import flow and clearly limits mixing, modifications and ownership', () => {
    const html = renderToStaticMarkup(
      <ModelImportScreen onClose={() => {}} onImported={() => {}} />,
    )
    for (const text of [
      '添加我的机型',
      '整机图片',
      '配件 1 名称',
      '配件 1 图片',
      '添加配件',
      '保存机型',
      '取消导入',
      '用于本机收集与整机展示',
      '暂不支持修改或删除',
      '不会直接发放配件或成品',
    ])
      expect(html).toContain(text)
    expect(html).toContain('accept="image/png,image/jpeg,image/webp"')
    expect(html).toContain('type="submit" disabled=""')
  })
})
