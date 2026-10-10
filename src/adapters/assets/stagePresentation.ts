export interface ImageViewport {
  image: [number, number]
  bounds: [number, number, number, number]
}

interface StageImageDefinition extends ImageViewport {
  asset: string
  label: string
}

const sources = import.meta.glob('../../mecha/*/presentation.json', { eager: true, import: 'default' }) as Record<string, Record<string, StageImageDefinition[]>>

export function getStagePresentation(mechaId: string, stage: number): StageImageDefinition[] | null {
  return sources[`../../mecha/${mechaId}/presentation.json`]?.[String(stage)] ?? null
}
