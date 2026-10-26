/** 【Hook】PART_REWARD/ASSEMBLY 到点后调 finishPartReveal / finishAssemblyAnimation。 */
import { useReducedMotion } from 'framer-motion'
import { useEffect } from 'react'
import { appScheduler } from '../app/dependencies'
import { schedulePhaseCompletion } from '../application/phaseTransitions'
import { useAppStore } from '../store/useAppStore'

export function usePhaseTransitions(): void {
  const phase = useAppStore((state) => state.phase)
  const currentStage = useAppStore((state) => state.assembly.currentStage)
  const finishPartReveal = useAppStore((state) => state.finishPartReveal)
  const finishAssemblyAnimation = useAppStore((state) => state.finishAssemblyAnimation)
  const reducedMotion = useReducedMotion()
  const reducedAssembly = phase === 'ASSEMBLY' && Boolean(reducedMotion)

  useEffect(
    () =>
      schedulePhaseCompletion(
        phase,
        reducedAssembly,
        { finishPartReveal, finishAssemblyAnimation },
        appScheduler,
      ),
    [phase, currentStage, reducedAssembly, finishPartReveal, finishAssemblyAnimation],
  )
}
