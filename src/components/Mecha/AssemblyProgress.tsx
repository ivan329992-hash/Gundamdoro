/** 【组件】进度 X/N + NEXT PART 文案。 */
import { getMechaManifest, getNextStageDefinition } from '../../mecha/loader'

interface AssemblyProgressProps {
  currentStage: number
  mechaId?: string
}

export function AssemblyProgress({ currentStage, mechaId }: AssemblyProgressProps) {
  const manifest = getMechaManifest(mechaId)
  const nextStage = getNextStageDefinition(currentStage, manifest.id)
  const safeStage = Math.min(manifest.totalStages, Math.max(0, currentStage))

  return (
    <div className="assembly-progress">
      <div className="progress-heading">
        <span>PARTS COLLECTED</span>
        <strong>{safeStage} / {manifest.totalStages}</strong>
      </div>
      <div className="progress-track" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${(safeStage / manifest.totalStages) * 100}%` }} />
      </div>
      <div className="next-part">
        <span>NEXT PART</span>
        <strong>{nextStage?.name ?? 'READY TO ASSEMBLE'}</strong>
      </div>
    </div>
  )
}
