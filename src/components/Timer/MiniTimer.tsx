import { useEffect, useState } from 'react'
import type { TimerProjection } from '../../application/timerExperience'
import { formatTime, getRemainingMs } from '../../domain/timer'
import { dragMini, hideMini, isDesktop, receiveTimer, requestPause, restoreMain } from '../../adapters/platform/miniWindow'

interface Props {
  state: TimerProjection
  onRestore: () => void
  onClose: () => void
  onPause: () => void
  onDrag?: () => void
}

const labels = { READY: '准备专注', FOCUS: '专注中', BREAK: '休息中', PART_REWARD: '配件已获得', ASSEMBLY: '正在拼装', COMPLETE: '机体已完成' }

export function MiniTimer({ state, onRestore, onClose, onPause, onDrag }: Props) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [])
  const active = state.phase === 'FOCUS' || state.phase === 'BREAK'
  return <section className="mini-timer" aria-label="迷你计时器">
    <header onPointerDown={(event) => { if (event.button === 0 && !(event.target as HTMLElement).closest('button')) onDrag?.() }}>
      <span>{state.modelName}</span><button type="button" onClick={onClose} aria-label="隐藏迷你计时器">×</button>
    </header>
    <p className="mini-status">{state.timer.status === 'paused' ? '已暂停' : labels[state.phase]}</p>
    <strong className="mini-time">{active ? formatTime(getRemainingMs(state.timer, now)) : state.phase === 'READY' ? 'READY' : 'DONE'}</strong>
    <p className="mini-target">{state.phase === 'BREAK' ? '下一部件' : '制作目标'} / {state.targetName}</p>
    <div className="mini-controls">
      {state.phase === 'FOCUS' && <button type="button" className="secondary-button" onClick={onPause}>{state.timer.status === 'paused' ? '继续专注' : '暂停专注'}</button>}
      <button type="button" onClick={onRestore}>返回主窗口</button>
    </div>
  </section>
}

export function MiniTimerWindow() {
  const [state, setState] = useState<TimerProjection | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    document.body.classList.add('mini-window-body')
    let disposed = false
    let stop: (() => void) | undefined
    if (isDesktop()) void receiveTimer(setState).then((cleanup) => {
      if (disposed) cleanup(); else stop = cleanup
    }).catch(() => setError(true))
    else setError(true)
    return () => { disposed = true; stop?.(); document.body.classList.remove('mini-window-body') }
  }, [])
  const safe = (action: () => Promise<void>) => () => { void action().catch(() => setError(true)) }
  if (!state) return <p className="mini-waiting">{error ? '无法连接主窗口，请从主程序打开迷你计时器。' : '正在连接计时器…'}</p>
  return <><MiniTimer state={state} onRestore={safe(restoreMain)} onClose={safe(hideMini)} onPause={safe(requestPause)} onDrag={safe(dragMini)} />{error && <p role="alert">窗口操作失败，请通过任务栏恢复主窗口。</p>}</>
}
