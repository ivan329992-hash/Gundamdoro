import { afterEach, describe, expect, it, vi } from 'vitest'

const native = vi.hoisted(() => ({ desktop: false, granted: true, isPermissionGranted: vi.fn(), requestPermission: vi.fn(), sendNotification: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => native.desktop }))
vi.mock('@tauri-apps/plugin-notification', () => native)
import { requestReminders, showCompletionNotice } from './reminders'

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); native.desktop = false })

describe('optional completion notifications', () => {
  it('requests browser permission explicitly and never re-prompts on completion', async () => {
    const construct = vi.fn()
    const request = vi.fn(async () => 'granted')
    class Notice {
      static permission = 'granted'
      static requestPermission = request
      constructor(title: string, options: unknown) { construct(title, options) }
    }
    vi.stubGlobal('window', { Notification: Notice })
    vi.stubGlobal('Notification', Notice)
    expect(await requestReminders()).toBe(true)
    await showCompletionNotice('Done', 'Part earned')
    expect(request).toHaveBeenCalledOnce()
    expect(construct).toHaveBeenCalledWith('Done', expect.objectContaining({ silent: true }))
  })
  it('does not send a denied notification or require browser notification support', async () => {
    const construct = vi.fn()
    class Notice { static permission = 'denied'; static requestPermission = async () => 'denied'; constructor() { construct() } }
    vi.stubGlobal('window', { Notification: Notice })
    vi.stubGlobal('Notification', Notice)
    expect(await requestReminders()).toBe(false)
    await showCompletionNotice('Done', 'Body')
    expect(construct).not.toHaveBeenCalled()
    vi.stubGlobal('window', {})
    expect(await requestReminders()).toBe(false)
  })
  it('uses desktop permission checks and native notifications', async () => {
    native.desktop = true
    native.isPermissionGranted.mockResolvedValue(false)
    native.requestPermission.mockResolvedValue('granted')
    expect(await requestReminders()).toBe(true)
    native.isPermissionGranted.mockResolvedValue(true)
    await showCompletionNotice('Done', 'Body')
    expect(native.sendNotification).toHaveBeenCalledWith({ title: 'Done', body: 'Body' })
  })
})
