import { invoke, isTauri } from '@tauri-apps/api/core'
import { isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification'

let audio: AudioContext | null = null

export async function prepareSound(): Promise<void> {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') await audio.resume()
  } catch {
    /* 系统禁用音频时仍可正常计时。 */
  }
}

export function playCompletionSound(): void {
  if (!audio || audio.state !== 'running') return
  const oscillator = audio.createOscillator()
  const gain = audio.createGain()
  oscillator.connect(gain)
  gain.connect(audio.destination)
  oscillator.frequency.setValueAtTime(660, audio.currentTime)
  oscillator.frequency.setValueAtTime(880, audio.currentTime + 0.16)
  gain.gain.setValueAtTime(0.08, audio.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.5)
  oscillator.start()
  oscillator.stop(audio.currentTime + 0.5)
  oscillator.onended = () => {
    oscillator.disconnect()
    gain.disconnect()
  }
}

export async function requestReminders(): Promise<boolean> {
  if (isTauri()) return (await isPermissionGranted()) || (await requestPermission()) === 'granted'
  if (!('Notification' in window)) return false
  if (Notification.permission !== 'default') return Notification.permission === 'granted'
  return (await Notification.requestPermission()) === 'granted'
}

export async function showCompletionNotice(title: string, body: string): Promise<void> {
  if (isTauri()) {
    if (!(await isPermissionGranted())) throw new Error('Notification permission is not granted')
    // 插件 2.5 的 sendNotification 不返回 Promise，直接等待同一命令以捕获原生错误。
    await invoke<void>('plugin:notification|notify', { options: { title, body } })
    return
  }
  if (!('Notification' in window)) throw new Error('Notifications are unavailable')
  if (Notification.permission !== 'granted')
    throw new Error('Notification permission is not granted')
  const notice = new Notification(title, { body, tag: 'gundamdoro-completion', silent: true })
  notice.onclick = () => {
    window.focus()
    notice.close()
  }
}
