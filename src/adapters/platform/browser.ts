/** 【适配器·平台】浏览器时钟/UUID/fast模式、setTimeout/setInterval。 */
import type { RuntimePort, SchedulerPort } from '../../application/ports'

export const browserRuntime: RuntimePort = {
  now: () => Date.now(),
  newId: () => crypto.randomUUID(),
  random: () => Math.random(),
  millisecondsPerMinute: () => import.meta.env.DEV
    && typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).has('fast') ? 1000 : 60_000,
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
