import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { appDependencies } from '../app/dependencies'
import { completionNotice, projectTimer } from '../application/timerExperience'
import { connectMainTimer, isDesktop } from '../adapters/platform/miniWindow'
import { playCompletionSound, showCompletionNotice } from '../adapters/platform/reminders'

const NOTIFICATION_ERROR = '系统通知发送失败，请检查通知权限。'

/** 订阅完成提醒并连接桌面迷你窗口；计时和进度变更仍通过 store actions 执行。 */
export function useTimerExperience(): string | null {
  const [error, setError] = useState<string | null>(null)
  useEffect(
    () =>
      useAppStore.subscribe((next, previous) => {
        const notice = completionNotice(
          previous,
          next,
          appDependencies.catalog,
          appDependencies.runtime.now(),
        )
        if (!notice) return
        if (next.settings.soundEnabled !== false) {
          try {
            playCompletionSound()
          } catch {
            setError('提示音不可用，计时和配件进度不受影响。')
          }
        }
        if (next.settings.notificationsEnabled)
          void showCompletionNotice(notice.title, notice.body).then(
            () => setError((current) => (current === NOTIFICATION_ERROR ? null : current)),
            () => setError(NOTIFICATION_ERROR),
          )
      }),
    [],
  )
  useEffect(() => {
    if (!isDesktop()) return
    let disposed = false
    let stop: (() => void) | undefined
    void connectMainTimer(
      () => projectTimer(useAppStore.getState(), appDependencies.catalog),
      () => useAppStore.getState().settings.miniTimerEnabled !== false,
      () => useAppStore.getState().syncTimer(),
      () => {
        const state = useAppStore.getState()
        if (state.timer.status === 'paused') state.resumeTimer()
        else state.pauseTimer()
      },
    )
      .then((cleanup) => {
        if (disposed) cleanup()
        else stop = cleanup
      })
      .catch(() => setError('迷你计时器连接失败，主窗口计时仍正常。'))
    return () => {
      disposed = true
      stop?.()
    }
  }, [])
  return error
}
