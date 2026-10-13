import { isTauri } from '@tauri-apps/api/core'
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification'

let audio: AudioContext | null = null

export async function prepareSound(): Promise<void> {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') await audio.resume()
  } catch { /* 系统禁用音频时仍可正常计时。 */ }
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
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
}

export async function requestReminders(): Promise<boolean> {
  if (isTauri()) return await isPermissionGranted() || await requestPermission() === 'granted'
  return 'Notification' in window && await Notification.requestPermission() === 'granted'
}

export async function showCompletionNotice(title: string, body: string): Promise<void> {
  if (isTauri()) {
    if (await isPermissionGranted()) sendNotification({ title, body })
  } else if ('Notification' in window && Notification.permission === 'granted') {
    const notice = new Notification(title, { body, tag: 'gundamdoro-completion', silent: true })
    notice.onclick = () => { window.focus(); notice.close() }
  }
}
