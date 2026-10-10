/** 【屏】FOCUS 完成后展示新零件；到点由 usePhaseTransitions 调 finishPartReveal。 */
import { getMechaManifest, getStageDefinition } from '../../mecha/loader'
import { useAppStore } from '../../store/useAppStore'
import { MechaDisplay } from './MechaDisplay'

export function PartRewardScreen() {
  const currentStage = useAppStore((state) => state.assembly.currentStage)
  const mechaId = useAppStore((state) => state.assembly.mechaId)
  const manifest = getMechaManifest(mechaId)
  const part = getStageDefinition(currentStage, mechaId)

  return (
    <main className="app-shell reward-shell">
      <section className="hero-card reward-card" aria-labelledby="reward-title">
        <p className="phase-label">{manifest.name} / {currentStage} OF {manifest.totalStages}</p>
        <h1 id="reward-title">PART SECURED</h1>
        <p className="reward-part">{part?.name}</p>
        <MechaDisplay mechaId={mechaId} currentStage={currentStage} highlightStage={currentStage} />
        <p className="bootstrap-note">{currentStage === manifest.totalStages ? 'All parts collected. Assemble whenever you are ready.' : 'Your new part is ready in the collection bay.'}</p>
      </section>
    </main>
  )
}
