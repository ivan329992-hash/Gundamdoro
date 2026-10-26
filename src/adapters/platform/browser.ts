/** 【适配器·平台】浏览器时钟/UUID/fast模式、setTimeout/setInterval。 */
import type { RuntimePort, SchedulerPort } from '../../application/ports'

export const browserRuntime: RuntimePort = {
  now: () => Date.now(),
  newId: () => crypto.randomUUID(),
  random: () => Math.random(),
  millisecondsPerMinute: () =>
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('fast')
      ? 1000
      : 60_000,
}

export const browserScheduler: SchedulerPort = {
  after(milliseconds, callback) {
    const id = window.setTimeout(callback, milliseconds)
    return () => window.clearTimeout(id)
  },
  every(milliseconds, callback) {
    const id = window.setInterval(callback, milliseconds)
    return () => window.clearInterval(id)
  },
}

/** 页面恢复或重新可见时立即校时，不等待可能被后台节流的定时器。 */
export function watchTimerWake(sync: () => void): () => void {
  const onVisible = () => {
    if (document.visibilityState === 'visible') sync()
  }
  window.addEventListener('focus', sync)
  window.addEventListener('pageshow', sync)
  document.addEventListener('visibilitychange', onVisible)
  return () => {
    window.removeEventListener('focus', sync)
    window.removeEventListener('pageshow', sync)
    document.removeEventListener('visibilitychange', onVisible)
  }
}
