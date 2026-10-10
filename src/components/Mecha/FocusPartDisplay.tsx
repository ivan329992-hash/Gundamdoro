/** 【组件】FOCUS：大图预览“本轮将收集”的零件（currentStage+1，尚未入账）。 */
import { getMechaManifest, getNextStageDefinition } from '../../mecha/loader'
import { StageImage } from './StageImage'

interface FocusPartDisplayProps {
  currentStage: number
  mechaId?: string
}

export function FocusPartDisplay({ currentStage, mechaId }: FocusPartDisplayProps) {
  const manifest = getMechaManifest(mechaId)
  const part = getNextStageDefinition(currentStage, manifest.id)

  return (
    <div className="focus-part-display" aria-label={`${manifest.name} focus part preview`}>
      <div className="focus-part-canvas">
        {part ? (
          <StageImage key={`${manifest.id}:${part.stage}`} mechaId={manifest.id} stage={part.stage} className="focus-part-image" />
        ) : (
          <div className="focus-part-placeholder">
            <span>COLLECTION BAY</span>
            <strong>ALL PARTS COLLECTED</strong>
          </div>
        )}
      </div>
      <div className="focus-part-caption">
        <span>FOCUS TARGET</span>
        <strong>{part?.name ?? 'READY TO ASSEMBLE'}</strong>
      </div>
    </div>
  )
}
