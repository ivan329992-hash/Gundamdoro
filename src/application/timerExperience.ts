import { getRemainingMs, type TimerState } from '../domain/timer'
import type { AppData, AppPhase } from '../domain/types'
import type { MechaCatalog } from '../domain/catalog'

export interface TimerProjection {
  phase: AppPhase
  timer: TimerState
  modelName: string
  targetName: string
}

export function projectTimer(state: AppData, catalog: MechaCatalog): TimerProjection {
  const model = catalog.find(state.assembly.mechaId)
  const target =
    state.phase === 'PART_REWARD' ? state.assembly.currentStage : state.assembly.currentStage + 1
  return {
    phase: state.phase,
    timer: { ...state.timer },
    modelName: model?.name ?? state.assembly.mechaId,
    targetName: model?.stages.find((part) => part.stage === target)?.name ?? '配件已集齐',
  }
}

export function estimatedEndAt(timer: TimerState, now: number): number | null {
  if (timer.status === 'paused') return null
  return timer.status === 'running' ? timer.endAt : now + getRemainingMs(timer, now)
}

export function completionNotice(
  previous: AppData,
  next: AppData,
  catalog: MechaCatalog,
  now: number,
): { title: string; body: string } | null {
  if (
    previous.phase === 'FOCUS' &&
    next.phase === 'PART_REWARD' &&
    previous.timer.sessionId &&
    next.lastProcessedFocusSessionId === previous.timer.sessionId &&
    previous.lastProcessedFocusSessionId !== next.lastProcessedFocusSessionId
  ) {
    const projection = projectTimer(next, catalog)
    return {
      title: `${projection.modelName} · 专注完成`,
      body: `${projection.targetName} 已收集，辛苦了。`,
    }
  }
  if (
    previous.phase === 'BREAK' &&
    next.phase === 'READY' &&
    previous.timer.endAt !== null &&
    previous.timer.endAt <= now &&
    next.assembly.currentStage === previous.assembly.currentStage
  ) {
    return { title: '休息结束', body: '准备好后，再开始下一次专注。' }
  }
  return null
}
