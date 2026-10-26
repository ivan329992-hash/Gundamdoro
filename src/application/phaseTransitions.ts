/** 【应用·演出定时】PART_REWARD/ASSEMBLY 播完多久后自动调用 finish*（不改业务规则）。 */
import type { AppPhase } from '../domain/types'
import type { SchedulerPort } from './ports'

export const PRESENTATION_TIMINGS = {
  partReveal: 2800,
  assemblyReveal: 2200,
  assemblyComplete: 4800,
  reducedAssemblyReveal: 400,
  reducedAssemblyComplete: 1400,
}

interface CompletionActions {
  finishPartReveal(): void
  finishAssemblyAnimation(): void
}

export function schedulePhaseCompletion(
  phase: AppPhase,
  reducedMotion: boolean,
  actions: CompletionActions,
  scheduler: SchedulerPort,
): () => void {
  if (phase === 'PART_REWARD')
    return scheduler.after(PRESENTATION_TIMINGS.partReveal, () => actions.finishPartReveal())
  if (phase === 'ASSEMBLY') {
    const delay = reducedMotion
      ? PRESENTATION_TIMINGS.reducedAssemblyComplete
      : PRESENTATION_TIMINGS.assemblyComplete
    return scheduler.after(delay, () => actions.finishAssemblyAnimation())
  }
  return () => {}
}
