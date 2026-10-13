import { isTauri } from '@tauri-apps/api/core'
import { emitTo, listen } from '@tauri-apps/api/event'
import { getCurrentWindow, Window } from '@tauri-apps/api/window'
import type { TimerProjection } from '../../application/timerExperience'

export const isDesktop = isTauri
export const isMiniWindow = () => new URLSearchParams(window.location.search).has('mini')
const STATE = 'gundamdoro:timer-state'
const REQUEST = 'gundamdoro:timer-request'
const CONTROL = 'gundamdoro:timer-control'

export async function minimizeMain(): Promise<void> {
  await getCurrentWindow().minimize()
}

export async function restoreMain(): Promise<void> {
  const main = await Window.getByLabel('main')
  await main?.unminimize()
  await main?.show()
  await main?.setFocus()
  await getCurrentWindow().hide()
}

export async function dragMini(): Promise<void> { await getCurrentWindow().startDragging() }
export async function hideMini(): Promise<void> { await getCurrentWindow().hide() }

export async function connectMainTimer(read: () => TimerProjection, enabled: () => boolean, sync: () => void, togglePause: () => void): Promise<() => void> {
  const main = getCurrentWindow()
  const mini = await Window.getByLabel('mini')
  if (!mini) throw new Error('Mini timer window unavailable')
  const publish = () => emitTo('mini', STATE, read()).catch(() => {})
  const listeners: (() => void)[] = []
  let disposed = false
  let wasMinimized = false
  let lastEnabled = enabled()
  try {
    listeners.push(await listen(REQUEST, () => { sync(); void publish() }))
    listeners.push(await listen<string>(CONTROL, ({ payload }) => { if (payload === 'toggle-pause') togglePause() }))
    const check = async () => {
      if (disposed) return
      const minimized = await main.isMinimized()
      const allow = enabled()
      if (minimized !== wasMinimized || allow !== lastEnabled) {
        wasMinimized = minimized
        lastEnabled = allow
        if (minimized && allow) { await publish(); await mini.show() }
        else await mini.hide()
      }
    }
    listeners.push(await main.onResized(() => { void check().catch(() => {}) }))
    const heartbeat = window.setInterval(() => { sync(); void publish(); void check().catch(() => {}) }, 1000)
    listeners.push(() => window.clearInterval(heartbeat))
    await check()
    await publish()
    return () => { disposed = true; listeners.forEach((stop) => stop()) }
  } catch (error) {
    disposed = true
    listeners.forEach((stop) => stop())
    throw error
  }
}

export async function receiveTimer(update: (state: TimerProjection) => void): Promise<() => void> {
  const unlisten = await listen<TimerProjection>(STATE, ({ payload }) => update(payload))
  try { await emitTo('main', REQUEST) } catch (error) { unlisten(); throw error }
  const heartbeat = window.setInterval(() => { void emitTo('main', REQUEST).catch(() => {}) }, 1000)
  return () => { window.clearInterval(heartbeat); unlisten() }
}

export async function requestPause(): Promise<void> { await emitTo('main', CONTROL, 'toggle-pause') }
