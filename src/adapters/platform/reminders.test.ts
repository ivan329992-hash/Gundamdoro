import { afterEach, describe, expect, it, vi } from 'vitest'

const native = vi.hoisted(() => ({
  desktop: false,
  isPermissionGranted: vi.fn(),
  requestPermission: vi.fn(),
  invoke: vi.fn(),
}))
vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => native.desktop, invoke: native.invoke }))
vi.mock('@tauri-apps/plugin-notification', () => native)
import { requestReminders, showCompletionNotice } from './reminders'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  native.desktop = false
})

describe('optional completion notifications', () => {
  it('uses existing browser permission without prompting and sends a silent notice', async () => {
    const construct = vi.fn()
    const request = vi.fn(async () => 'granted')
    class Notice {
      static permission = 'granted'
      static requestPermission = request
      constructor(title: string, options: unknown) {
        construct(title, options)
      }
    }
    vi.stubGlobal('window', { Notification: Notice })
    vi.stubGlobal('Notification', Notice)
    expect(await requestReminders()).toBe(true)
    await showCompletionNotice('Done', 'Part earned')
    expect(request).not.toHaveBeenCalled()
    expect(construct).toHaveBeenCalledWith('Done', expect.objectContaining({ silent: true }))
  })
  it('reports unavailable or denied notifications without attempting to send', async () => {
    const construct = vi.fn()
    class Notice {
      static permission = 'denied'
      static requestPermission = async () => 'denied'
      constructor() {
        construct()
      }
    }
    vi.stubGlobal('window', { Notification: Notice })
    vi.stubGlobal('Notification', Notice)
    expect(await requestReminders()).toBe(false)
    await expect(showCompletionNotice('Done', 'Body')).rejects.toThrow('permission')
    expect(construct).not.toHaveBeenCalled()
    vi.stubGlobal('window', {})
    expect(await requestReminders()).toBe(false)
    await expect(showCompletionNotice('Done', 'Body')).rejects.toThrow('unavailable')
  })
  it('uses desktop permission checks and native notifications', async () => {
    native.desktop = true
    native.isPermissionGranted.mockResolvedValue(false)
    native.requestPermission.mockResolvedValue('granted')
    expect(await requestReminders()).toBe(true)
    native.isPermissionGranted.mockResolvedValue(true)
    await showCompletionNotice('Done', 'Body')
    expect(native.invoke).toHaveBeenCalledWith('plugin:notification|notify', {
      options: { title: 'Done', body: 'Body' },
    })
  })
  it('waits for the native send result and exposes asynchronous failures', async () => {
    native.desktop = true
    native.isPermissionGranted.mockResolvedValue(true)
    let rejectSend!: (error: Error) => void
    native.invoke.mockReturnValueOnce(
      new Promise<void>((_resolve, reject) => {
        rejectSend = reject
      }),
    )
    const send = showCompletionNotice('Done', 'Body')
    const settled = vi.fn()
    const outcome = send.then(settled, (error: Error) => error.message)
    await Promise.resolve()
    await Promise.resolve()
    expect(settled).not.toHaveBeenCalled()
    rejectSend(new Error('Native send failed'))
    expect(await outcome).toBe('Native send failed')
    expect(settled).not.toHaveBeenCalled()
  })
  it('does not send or request permission when desktop permission was revoked', async () => {
    native.desktop = true
    native.isPermissionGranted.mockResolvedValue(false)
    await expect(showCompletionNotice('Done', 'Body')).rejects.toThrow('permission')
    expect(native.invoke).not.toHaveBeenCalled()
    expect(native.requestPermission).not.toHaveBeenCalled()
  })
  it('requests browser permission only while the permission is undecided', async () => {
    const request = vi.fn(async () => 'denied')
    const notice = { permission: 'default', requestPermission: request }
    vi.stubGlobal('window', { Notification: notice })
    vi.stubGlobal('Notification', notice)
    expect(await requestReminders()).toBe(false)
    expect(request).toHaveBeenCalledOnce()
    notice.permission = 'denied'
    expect(await requestReminders()).toBe(false)
    expect(request).toHaveBeenCalledOnce()
  })
  it('propagates notification constructor failure without requesting permission', async () => {
    class Notice {
      static permission = 'granted'
      static requestPermission = vi.fn()
      constructor() {
        throw new Error('Notification service unavailable')
      }
    }
    vi.stubGlobal('window', { Notification: Notice })
    vi.stubGlobal('Notification', Notice)
    await expect(showCompletionNotice('Done', 'Body')).rejects.toThrow('service unavailable')
    expect(Notice.requestPermission).not.toHaveBeenCalled()
  })
})
