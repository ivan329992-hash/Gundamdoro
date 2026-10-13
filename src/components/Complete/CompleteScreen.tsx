/** 【屏】整机完成：统计、入库确认、BUILD AGAIN / 机库 / 换机型入口。 */
import { getMechaManifest, getFinalAsset } from '../../mecha/loader'
import { useAppStore } from '../../store/useAppStore'
import { AssetImage } from '../Mecha/AssetImage'
import { CUSTOM_ASSEMBLY_ENABLED } from '../../app/features'
import { groupHangar } from '../../domain/hangar'

interface CompleteScreenProps {
  onOpenSettings: () => void
  onOpenHangar: () => void
  onOpenModels: () => void
  onOpenParts: () => void
}

export function CompleteScreen({ onOpenSettings, onOpenHangar, onOpenModels, onOpenParts }: CompleteScreenProps) {
  const assembly = useAppStore((state) => state.assembly)
  const totalFocusedMinutes = useAppStore((state) => state.totalFocusedMinutes)
  const resetMecha = useAppStore((state) => state.resetMecha)
  const hangarCount = useAppStore((state) => groupHangar(state.hangar).length)
  const manifest = getMechaManifest(assembly.mechaId)
  const fullAsset = getFinalAsset(assembly.mechaId)

  return (
    <main className="app-shell complete-shell">
      <section className="complete-card" aria-labelledby="complete-title">
        <p className="eyebrow">{manifest.name} / FINAL STATUS</p>
        <div className="complete-canvas">
          <AssetImage src={fullAsset} alt={`${manifest.name} complete`} className="mecha-image" />
        </div>
        <h1 id="complete-title">MECHA COMPLETE</h1>
        <p className="complete-stats">{assembly.completedFocusSessions} FOCUS SESSIONS · {Math.round(totalFocusedMinutes)} MINUTES</p>
        <p className="saved-to-hangar" role="status">已保存到仓库</p>
        <button type="button" onClick={resetMecha}>BUILD AGAIN</button>
        <div className="ready-navigation">
          <button type="button" className="secondary-button" onClick={onOpenModels}>选择机型</button>
          <button type="button" className="secondary-button" onClick={onOpenSettings}>SETTINGS</button>
          <button type="button" className="secondary-button" onClick={onOpenHangar}>仓库（{hangarCount}）</button>
        </div>
        <button type="button" className="secondary-button" onClick={onOpenParts}>{CUSTOM_ASSEMBLY_ENABLED ? '配件仓库与拼装' : '配件仓库'}</button>
      </section>
    </main>
  )
}
