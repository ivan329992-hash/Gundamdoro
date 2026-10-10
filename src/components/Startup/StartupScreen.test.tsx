import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { StartupScreen } from './StartupScreen'

describe('startup screen', () => {
  it('shows a loading status without exposing game controls or retries', () => {
    const html = renderToStaticMarkup(<StartupScreen loading onRetry={() => {}} />)
    expect(html).toContain('role="status"')
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('正在读取存档')
    expect(html).not.toContain('<button')
    expect(html).not.toContain('START FOCUS')
  })

  it('offers retry and warns against clearing data after a startup error', () => {
    const html = renderToStaticMarkup(<StartupScreen loading={false} onRetry={() => {}} />)
    expect(html).toContain('role="alert"')
    expect(html).toContain('aria-busy="false"')
    expect(html).toContain('重新读取存档')
    expect(html).toContain('不要清除应用数据')
    expect(html).not.toContain('START FOCUS')
  })
})
