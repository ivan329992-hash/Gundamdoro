import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDurationMs } from '../../domain/timer'
import { browserRuntime, watchTimerWake } from './browser'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('timer wake synchronization', () => {
  function createPage() {
    const pageWindow = new EventTarget()
    const pageDocument = Object.assign(new EventTarget(), { visibilityState: 'hidden' })
    vi.stubGlobal('window', pageWindow)
    vi.stubGlobal('document', pageDocument)
    return { pageWindow, pageDocument }
  }

  it('syncs on focus, page restore and becoming visible, but not on hiding', () => {
    const { pageWindow, pageDocument } = createPage()
    const sync = vi.fn()
    const stop = watchTimerWake(sync)
    pageDocument.dispatchEvent(new Event('visibilitychange'))
    expect(sync).not.toHaveBeenCalled()
    pageDocument.visibilityState = 'visible'
    pageDocument.dispatchEvent(new Event('visibilitychange'))
    pageWindow.dispatchEvent(new Event('focus'))
    pageWindow.dispatchEvent(new Event('pageshow'))
    expect(sync).toHaveBeenCalledTimes(3)
    stop()
  })

  it('removes every listener on cleanup and does not retain a replaced subscription', () => {
    const { pageWindow, pageDocument } = createPage()
    const staleSync = vi.fn()
    const stop = watchTimerWake(staleSync)
    stop()
    const sync = vi.fn()
    const stopNext = watchTimerWake(sync)
    pageDocument.visibilityState = 'visible'
    pageDocument.dispatchEvent(new Event('visibilitychange'))
    pageWindow.dispatchEvent(new Event('focus'))
    pageWindow.dispatchEvent(new Event('pageshow'))
    expect(staleSync).not.toHaveBeenCalled()
    expect(sync).toHaveBeenCalledTimes(3)
    stopNext()
  })
})

describe('browser runtime configuration', () => {
  it('uses normal minutes when fast mode is absent', () => {
    vi.stubGlobal('window', { location: { search: '' } })
    expect(browserRuntime.millisecondsPerMinute()).toBe(60_000)
    expect(getDurationMs(25, browserRuntime.millisecondsPerMinute())).toBe(1_500_000)
  })

  it('uses the development fast flag for explicit timer duration conversion', () => {
    vi.stubEnv('DEV', true)
    vi.stubGlobal('window', { location: { search: '?fast=1' } })
    expect(browserRuntime.millisecondsPerMinute()).toBe(1000)
    expect(getDurationMs(25, browserRuntime.millisecondsPerMinute())).toBe(25_000)
  })

  it('ignores the fast URL in production', () => {
    vi.stubEnv('DEV', false)
    vi.stubGlobal('window', { location: { search: '?fast=1' } })
    expect(getDurationMs(25, browserRuntime.millisecondsPerMinute())).toBe(1_500_000)
  })
})
