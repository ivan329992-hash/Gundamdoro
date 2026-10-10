import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDurationMs } from '../../lib/timer'
import { browserRuntime } from './browser'

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('browser runtime configuration', () => {
  it('uses normal minutes when fast mode is absent', () => {
    vi.stubGlobal('window', { location: { search: '' } })
    expect(browserRuntime.millisecondsPerMinute()).toBe(60_000)
    expect(getDurationMs(25)).toBe(1_500_000)
  })

  it('keeps the development fast flag and the old timer utility behavior', () => {
    vi.stubEnv('DEV', true)
    vi.stubGlobal('window', { location: { search: '?fast=1' } })
    expect(browserRuntime.millisecondsPerMinute()).toBe(1000)
    expect(getDurationMs(25)).toBe(25_000)
  })

  it('ignores the fast URL in production', () => {
    vi.stubEnv('DEV', false)
    vi.stubGlobal('window', { location: { search: '?fast=1' } })
    expect(getDurationMs(25)).toBe(1_500_000)
  })
})
