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
        <span>已收集配件</span>
        <strong>
          {safeStage} / {manifest.totalStages}
        </strong>
      </div>
      <div className="progress-track" aria-hidden="true">
        <div
          className="progress-fill"
          style={{ width: `${(safeStage / manifest.totalStages) * 100}%` }}
        />
      </div>
      <div className="next-part">
        <span>下一配件</span>
        <strong>{nextStage?.name ?? '已集齐，可开始拼装'}</strong>
      </div>
    </div>
  )
}
