import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TimerProjection } from '../../application/timerExperience'

const mocks = vi.hoisted(() => ({
  listeners: new Map<string, (event: { payload: unknown }) => void>(),
  emitTo: vi.fn().mockResolvedValue(undefined),
  show: vi.fn().mockResolvedValue(undefined), hide: vi.fn().mockResolvedValue(undefined),
  minimized: false,
}))
vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => true }))
vi.mock('@tauri-apps/api/event', () => ({
  emitTo: mocks.emitTo,
  listen: vi.fn(async (name, callback) => { mocks.listeners.set(name, callback); return () => mocks.listeners.delete(name) }),
}))
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({ isMinimized: async () => mocks.minimized, onResized: async () => () => {} }),
  Window: { getByLabel: async () => ({ show: mocks.show, hide: mocks.hide }) },
}))
import { connectMainTimer, receiveTimer, requestPause } from './miniWindow'

const projection: TimerProjection = { phase: 'FOCUS', modelName: 'TEST', targetName: 'HEAD', timer: { status: 'running', durationMs: 1000, remainingMs: 1000, startedAt: 0, endAt: 1000, sessionId: 'focus' } }
beforeEach(() => vi.stubGlobal('window', { setInterval: (...args: Parameters<typeof setInterval>) => setInterval(...args), clearInterval: (id: ReturnType<typeof setInterval>) => clearInterval(id) }))
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks(); mocks.listeners.clear(); mocks.minimized = false })

describe('single-owner mini window bridge', () => {
  it('shows on minimize, routes controls to owner and cleans up heartbeat/listeners', async () => {
    vi.useFakeTimers()
    const sync = vi.fn()
    const toggle = vi.fn()
    const stop = await connectMainTimer(() => projection, () => true, sync, toggle)
    mocks.minimized = true
    await vi.advanceTimersByTimeAsync(1000)
    expect(mocks.show).toHaveBeenCalledOnce()
    expect(mocks.emitTo).toHaveBeenCalledWith('mini', 'gundamdoro:timer-state', projection)
    mocks.listeners.get('gundamdoro:timer-control')!({ payload: 'toggle-pause' })
    expect(toggle).toHaveBeenCalledOnce()
    mocks.minimized = false
    await vi.advanceTimersByTimeAsync(1000)
    expect(mocks.hide).toHaveBeenCalledOnce()
    stop()
    expect(mocks.listeners.size).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })
  it('does not show the disabled mini timer', async () => {
    vi.useFakeTimers()
    mocks.minimized = true
    const stop = await connectMainTimer(() => projection, () => false, vi.fn(), vi.fn())
    expect(mocks.show).not.toHaveBeenCalled()
    stop()
  })
  it('mini receives projection only and sends pause requests instead of updating a store', async () => {
    const update = vi.fn()
    const stop = await receiveTimer(update)
    expect(mocks.emitTo).toHaveBeenCalledWith('main', 'gundamdoro:timer-request')
    mocks.listeners.get('gundamdoro:timer-state')!({ payload: projection })
    expect(update).toHaveBeenCalledWith(projection)
    await requestPause()
    expect(mocks.emitTo).toHaveBeenCalledWith('main', 'gundamdoro:timer-control', 'toggle-pause')
    stop()
    expect(mocks.listeners.size).toBe(0)
  })
})
