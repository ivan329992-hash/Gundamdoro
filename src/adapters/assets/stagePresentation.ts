import type { PartSlot } from '../../domain/types'

export interface ImageViewport {
  image: [number, number]
  bounds: [number, number, number, number]
}

interface StageImageDefinition extends ImageViewport {
  asset: string
  label: string
}

interface StagePresentation {
  [stage: string]: unknown
  registeredStages?: Record<string, { profile: string; slot: PartSlot }>
}

const sources = import.meta.glob('../../mecha/*/presentation.json', {
  eager: true,
  import: 'default',
}) as Record<string, StagePresentation>

export function getStagePresentation(
  mechaId: string,
  stage: number,
): StageImageDefinition[] | null {
  return (
    (sources[`../../mecha/${mechaId}/presentation.json`]?.[
      String(stage)
    ] as StageImageDefinition[]) ?? null
  )
}

export function getRegisteredStagePresentation(mechaId: string, stage: number) {
  return (
    sources[`../../mecha/${mechaId}/presentation.json`]?.registeredStages?.[String(stage)] ?? null
  )
}
