import { appAssets } from '../../app/dependencies'
import {
  getRegisteredStagePresentation,
  getStagePresentation,
} from '../../adapters/assets/stagePresentation'
import { getStageAsset, getStageDefinition } from '../../mecha/loader'
import { AssetImage } from './AssetImage'
import { RegisteredPartImage } from './RegisteredMecha'

export function StageImage({
  mechaId,
  stage,
  className,
}: {
  mechaId: string
  stage: number
  className?: string
}) {
  const registered = getRegisteredStagePresentation(mechaId, stage)
  if (registered)
    return (
      <RegisteredPartImage
        key={`${mechaId}:${stage}`}
        modelId={mechaId}
        slot={registered.slot}
        profile={registered.profile}
        className={className}
        label={getStageDefinition(stage, mechaId)?.name}
      />
    )
  const images = getStagePresentation(mechaId, stage)
  if (!images?.length)
    return (
      <AssetImage
        src={getStageAsset(stage, mechaId)}
        alt={getStageDefinition(stage, mechaId)?.name ?? 'PART'}
        className={className}
      />
    )
  return (
    <div className="stage-image-group">
      {images.map((image) => (
        <AssetImage
          key={image.asset}
          src={appAssets.resolve(mechaId, image.asset)}
          alt={image.label}
          className={className}
          viewport={image}
        />
      ))}
    </div>
  )
}
