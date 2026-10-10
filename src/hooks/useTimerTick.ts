/** 【Hook】FOCUS/BREAK 运行时每 250ms syncTimer；到期由 useCases 完成，UI 不改 phase。 */
import { useEffect } from 'react'
import { appScheduler } from '../app/dependencies'
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
    return appScheduler.every(intervalMs, () => syncTimer())
  }, [intervalMs, phase, status, syncTimer])
}
