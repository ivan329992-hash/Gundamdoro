/** 【屏】整机完成：统计、入库确认、BUILD AGAIN / 机库 / 换机型入口。 */
import { getMechaManifest, getFinalAsset } from '../../mecha/loader'
import { useAppStore } from '../../store/useAppStore'
import { AssetImage } from '../Mecha/AssetImage'
import { groupHangar } from '../../domain/hangar'

interface CompleteScreenProps {
  onOpenSettings: () => void
  onOpenHangar: () => void
  onOpenModels: () => void
  onOpenParts: () => void
}

export function CompleteScreen({
  onOpenSettings,
  onOpenHangar,
  onOpenModels,
  onOpenParts,
}: CompleteScreenProps) {
  const assembly = useAppStore((state) => state.assembly)
  const totalFocusedMinutes = useAppStore((state) => state.totalFocusedMinutes)
  const resetMecha = useAppStore((state) => state.resetMecha)
  const persistenceStatus = useAppStore((state) => state.persistenceStatus)
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
        <h1 id="complete-title">机体组装完成</h1>
        <p className="complete-stats">
          完成 {assembly.completedFocusSessions} 次专注 · 累计 {Math.round(totalFocusedMinutes)}{' '}
          分钟
        </p>
        <p className="saved-to-hangar" role="status">
          {persistenceStatus === 'saved'
            ? '已保存到仓库'
            : persistenceStatus === 'saving'
              ? '正在保存到本机…'
              : '机体已完成，尚未保存到本机，请重试保存。'}
        </p>
        <button type="button" onClick={resetMecha}>
          再次制作
        </button>
        <div className="ready-navigation">
          <button type="button" className="secondary-button" onClick={onOpenModels}>
            选择机型
          </button>
          <button type="button" className="secondary-button" onClick={onOpenSettings}>
            设置
          </button>
          <button type="button" className="secondary-button" onClick={onOpenHangar}>
            仓库（{hangarCount}）
          </button>
        </div>
        <button type="button" className="secondary-button" onClick={onOpenParts}>
          配件仓库与拼装
        </button>
      </section>
    </main>
  )
}
