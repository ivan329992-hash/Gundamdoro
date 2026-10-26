/** 【UI 读图助手】按 mechaId/阶段取 manifest 与 PNG URL；底层是 catalog + bundledAssets。 */
import { appAssets, appDependencies } from '../app/dependencies'
import type { MechaManifest, MechaStage } from '../domain/types'

const mechaManifest = appDependencies.catalog.defaultMecha

export function findMechaManifest(mechaId: string): MechaManifest | null {
  return appDependencies.catalog.find(mechaId)
}

export function getMechaManifests(): MechaManifest[] {
  return appDependencies.catalog.list()
}

export function getMechaManifest(mechaId = mechaManifest.id): MechaManifest {
  const manifest = findMechaManifest(mechaId)
  if (!manifest) throw new Error(`Unknown mecha: ${mechaId}`)
  return manifest
}

export function getStageDefinition(
  stageNumber: number,
  mechaId = mechaManifest.id,
): MechaStage | null {
  return findMechaManifest(mechaId)?.stages.find((stage) => stage.stage === stageNumber) ?? null
}

export function getNextStageDefinition(
  currentStage: number,
  mechaId = mechaManifest.id,
): MechaStage | null {
  return getStageDefinition(currentStage + 1, mechaId)
}

export function getStageAsset(stageNumber: number, mechaId = mechaManifest.id): string | null {
  const stage = getStageDefinition(stageNumber, mechaId)
  return stage ? appAssets.resolve(mechaId, stage.asset) : null
}

export function getFinalAsset(mechaId = mechaManifest.id): string | null {
  const manifest = findMechaManifest(mechaId)
  return manifest ? appAssets.resolve(manifest.id, manifest.finalAsset) : null
}

export function getBreakAsset(mechaId = mechaManifest.id): string | null {
  if (!findMechaManifest(mechaId)) return null
  return (
    appAssets.resolve(mechaId, 'break/break-01.png') ??
    appAssets.resolve(mechaManifest.id, 'break/break-01.png')
  )
}
