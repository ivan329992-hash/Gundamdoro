import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TimerProjection } from '../../application/timerExperience'

const mocks = vi.hoisted(() => ({
  listeners: new Map<string, (event: { payload: unknown }) => void>(),
  emitTo: vi.fn().mockResolvedValue(undefined),
  show: vi.fn().mockResolvedValue(undefined),
  hide: vi.fn().mockResolvedValue(undefined),
  unminimize: vi.fn().mockResolvedValue(undefined),
  focus: vi.fn().mockResolvedValue(undefined),
  isMinimized: vi.fn(),
  missingMain: false,
  minimized: false,
}))
vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => true }))
vi.mock('@tauri-apps/api/event', () => ({
  emitTo: mocks.emitTo,
  listen: vi.fn(async (name, callback) => {
    mocks.listeners.set(name, callback)
    return () => mocks.listeners.delete(name)
  }),
}))
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({
    isMinimized: mocks.isMinimized,
    onResized: async () => () => {},
    hide: mocks.hide,
  }),
  Window: {
    getByLabel: async (label: string) =>
      label === 'main' && mocks.missingMain
        ? null
        : {
            show: mocks.show,
            hide: mocks.hide,
            unminimize: mocks.unminimize,
            setFocus: mocks.focus,
          },
  },
}))
import { connectMainTimer, receiveTimer, requestPause, restoreMain } from './miniWindow'

const projection: TimerProjection = {
  phase: 'FOCUS',
  modelName: 'TEST',
  targetName: 'HEAD',
  timer: {
    status: 'running',
    durationMs: 1000,
    remainingMs: 1000,
    startedAt: 0,
    endAt: 1000,
    sessionId: 'focus',
  },
}
beforeEach(() => {
  mocks.isMinimized.mockImplementation(async () => mocks.minimized)
  vi.stubGlobal('window', {
    setInterval: (...args: Parameters<typeof setInterval>) => setInterval(...args),
    clearInterval: (id: ReturnType<typeof setInterval>) => clearInterval(id),
  })
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  mocks.listeners.clear()
  mocks.minimized = false
  mocks.missingMain = false
})

describe('single-owner mini window bridge', () => {
  it('shows on minimize, routes controls to owner and cleans up heartbeat/listeners', async () => {
    vi.useFakeTimers()
    const sync = vi.fn()
    const toggle = vi.fn()
    const stop = await connectMainTimer(
      () => projection,
      () => true,
      sync,
      toggle,
    )
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
    const stop = await connectMainTimer(
      () => projection,
      () => false,
      vi.fn(),
      vi.fn(),
    )
    expect(mocks.show).not.toHaveBeenCalled()
    stop()
  })
  it('retries showing the mini timer after a transient window failure', async () => {
    vi.useFakeTimers()
    const stop = await connectMainTimer(
      () => projection,
      () => true,
      vi.fn(),
      vi.fn(),
    )
    mocks.minimized = true
    mocks.show.mockRejectedValueOnce(new Error('Window temporarily unavailable'))
    await vi.advanceTimersByTimeAsync(1000)
    await vi.advanceTimersByTimeAsync(1000)
    expect(mocks.show).toHaveBeenCalledTimes(2)
    stop()
  })
  it('retries hiding the mini timer after a transient window failure', async () => {
    vi.useFakeTimers()
    mocks.minimized = true
    const stop = await connectMainTimer(
      () => projection,
      () => true,
      vi.fn(),
      vi.fn(),
    )
    mocks.minimized = false
    mocks.hide.mockRejectedValueOnce(new Error('Window temporarily unavailable'))
    await vi.advanceTimersByTimeAsync(2000)
    expect(mocks.hide).toHaveBeenCalledTimes(2)
    stop()
  })
  it('does not show a mini window after cleanup while a query is pending', async () => {
    vi.useFakeTimers()
    const stop = await connectMainTimer(
      () => projection,
      () => true,
      vi.fn(),
      vi.fn(),
    )
    let finishQuery!: (minimized: boolean) => void
    mocks.isMinimized.mockReturnValueOnce(
      new Promise<boolean>((resolve) => {
        finishQuery = resolve
      }),
    )
    await vi.advanceTimersByTimeAsync(1000)
    stop()
    finishQuery(true)
    await vi.advanceTimersByTimeAsync(0)
    expect(mocks.show).not.toHaveBeenCalled()
    expect(mocks.listeners.size).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })
  it('keeps visibility operations ordered when the main window changes quickly', async () => {
    vi.useFakeTimers()
    const stop = await connectMainTimer(
      () => projection,
      () => true,
      vi.fn(),
      vi.fn(),
    )
    let finishShow!: () => void
    mocks.show.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishShow = resolve
        }),
    )
    mocks.minimized = true
    await vi.advanceTimersByTimeAsync(1000)
    mocks.minimized = false
    await vi.advanceTimersByTimeAsync(1000)
    expect(mocks.hide).not.toHaveBeenCalled()
    finishShow()
    await vi.advanceTimersByTimeAsync(1000)
    expect(mocks.hide).toHaveBeenCalledOnce()
    stop()
  })
  it('reports an unavailable main window instead of silently hiding the mini timer', async () => {
    mocks.missingMain = true
    await expect(restoreMain()).rejects.toThrow('Main window unavailable')
    expect(mocks.hide).not.toHaveBeenCalled()
  })
  it('does not hide the mini timer if restoring main fails', async () => {
    mocks.focus.mockRejectedValueOnce(new Error('Cannot focus main'))
    await expect(restoreMain()).rejects.toThrow('Cannot focus main')
    expect(mocks.unminimize).toHaveBeenCalledOnce()
    expect(mocks.show).toHaveBeenCalledOnce()
    expect(mocks.hide).not.toHaveBeenCalled()
  })
  it('restores the main window before hiding the mini timer', async () => {
    await restoreMain()
    expect(mocks.unminimize).toHaveBeenCalledOnce()
    expect(mocks.show).toHaveBeenCalledOnce()
    expect(mocks.focus).toHaveBeenCalledOnce()
    expect(mocks.hide).toHaveBeenCalledOnce()
    expect(mocks.unminimize.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.show.mock.invocationCallOrder[0],
    )
    expect(mocks.show.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.focus.mock.invocationCallOrder[0],
    )
    expect(mocks.focus.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.hide.mock.invocationCallOrder[0],
    )
  })
  it('reconciles preference changes while the main window is minimized', async () => {
    vi.useFakeTimers()
    mocks.minimized = true
    let enabled = true
    const stop = await connectMainTimer(
      () => projection,
      () => enabled,
      vi.fn(),
      vi.fn(),
    )
    enabled = false
    await vi.advanceTimersByTimeAsync(1000)
    expect(mocks.hide).toHaveBeenCalledOnce()
    enabled = true
    await vi.advanceTimersByTimeAsync(1000)
    expect(mocks.show).toHaveBeenCalledTimes(2)
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
