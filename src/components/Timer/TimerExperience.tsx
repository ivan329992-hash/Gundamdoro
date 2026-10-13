import { useEffect, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { appDependencies } from '../../app/dependencies'
import { completionNotice, projectTimer } from '../../application/timerExperience'
import { connectMainTimer, isDesktop, minimizeMain } from '../../adapters/platform/miniWindow'
import { playCompletionSound, prepareSound, showCompletionNotice } from '../../adapters/platform/reminders'
import { MiniTimer } from './MiniTimer'

export function useTimerExperience(): string | null {
  const [error, setError] = useState<string | null>(null)
  useEffect(() => useAppStore.subscribe((next, previous) => {
    const notice = completionNotice(previous, next, appDependencies.catalog, appDependencies.runtime.now())
    if (!notice) return
    if (next.settings.soundEnabled !== false) {
      try { playCompletionSound() } catch { setError('提示音不可用，计时和配件进度不受影响。') }
    }
    if (next.settings.notificationsEnabled) void showCompletionNotice(notice.title, notice.body)
      .catch(() => setError('系统通知发送失败，请检查通知权限。'))
  }), [])
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
        if (state.timer.status === 'paused') state.resumeTimer(); else state.pauseTimer()
      },
    ).then((cleanup) => { if (disposed) cleanup(); else stop = cleanup })
      .catch(() => setError('迷你计时器连接失败，主窗口计时仍正常。'))
    return () => { disposed = true; stop?.() }
  }, [])
  return error
}

export function TimerExperienceTools({ error }: { error: string | null }) {
  const [preview, setPreview] = useState(false)
  const [windowError, setWindowError] = useState(false)
  const state = useAppStore()
  return <>
    <div className="experience-toolbar">
      <button type="button" className="secondary-button" onClick={() => {
        void prepareSound()
        if (isDesktop()) void minimizeMain().catch(() => setWindowError(true))
        else setPreview((value) => !value)
      }}>{isDesktop() ? '最小化' : '迷你计时预览'}</button>
    </div>
    {preview && <div className="mini-preview"><MiniTimer state={projectTimer(state, appDependencies.catalog)} onClose={() => setPreview(false)} onRestore={() => setPreview(false)}
      onPause={() => state.timer.status === 'paused' ? state.resumeTimer() : state.pauseTimer()} /><p>网页预览 · 跨应用悬浮请使用桌面版</p></div>}
    {(error || windowError) && <p className="experience-error" role="status">{error ?? '最小化失败，请使用标题栏按钮。'}</p>}
  </>
}
