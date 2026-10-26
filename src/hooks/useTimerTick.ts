/** 刷新运行中的计时，并在页面恢复时立即校时；阶段转换由 store 动作处理。 */
import { useEffect } from 'react'
import { appScheduler, appTimerWake } from '../app/dependencies'
import { useAppStore } from '../store/useAppStore'

export function useTimerTick(intervalMs = 250): void {
  const phase = useAppStore((state) => state.phase)
  const status = useAppStore((state) => state.timer.status)
  const syncTimer = useAppStore((state) => state.syncTimer)

  useEffect(() => {
    if (status !== 'running' || (phase !== 'FOCUS' && phase !== 'BREAK')) {
      return
    }

    syncTimer()
    const stopTick = appScheduler.every(intervalMs, () => syncTimer())
    const stopWake = appTimerWake(() => syncTimer())
    return () => {
      stopTick()
      stopWake()
    }
  }, [intervalMs, phase, status, syncTimer])
}
