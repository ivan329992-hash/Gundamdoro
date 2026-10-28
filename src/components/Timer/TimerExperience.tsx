import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { appDependencies } from '../../app/dependencies'
import { projectTimer } from '../../application/timerExperience'
import { isDesktop, minimizeMain } from '../../adapters/platform/miniWindow'
import { prepareSound } from '../../adapters/platform/reminders'
import { MiniTimer } from './MiniTimer'

export function TimerExperienceTools({ error }: { error: string | null }) {
  const [preview, setPreview] = useState(false)
  const [windowError, setWindowError] = useState(false)
  const state = useAppStore()
  return (
    <>
      <div className="experience-toolbar">
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            void prepareSound()
            if (isDesktop()) void minimizeMain().catch(() => setWindowError(true))
            else setPreview((value) => !value)
          }}
        >
          {isDesktop() ? '最小化' : '迷你计时预览'}
        </button>
      </div>
      {preview && (
        <div className="mini-preview">
          <MiniTimer
            state={projectTimer(state, appDependencies.catalog)}
            onClose={() => setPreview(false)}
            onRestore={() => setPreview(false)}
            onPause={() =>
              state.timer.status === 'paused' ? state.resumeTimer() : state.pauseTimer()
            }
          />
          <p>网页预览 · 跨应用悬浮请使用桌面版</p>
        </div>
      )}
      {(error || windowError) && (
        <p className="experience-error" role="status">
          {error ?? '最小化失败，请使用标题栏按钮。'}
        </p>
      )}
    </>
  )
}
