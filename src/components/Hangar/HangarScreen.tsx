/** 【视图·非相位】只读机库列表；开关不改 phase，仅本地 UI 状态。 */
import { useEffect, useRef } from 'react'
import { getFinalAsset } from '../../mecha/loader'
import { useAppStore } from '../../store/useAppStore'
import { AssetImage } from '../Mecha/AssetImage'
import { CompositeMecha } from '../Mecha/CompositeMecha'
import { getPartDefinitions, PART_SLOTS, PART_SLOT_LABELS } from '../../domain/inventory'
import { appDependencies } from '../../app/dependencies'

interface HangarScreenProps {
  onClose: () => void
}

const completedDate = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
})
const focusedMinutes = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 })

export function HangarScreen({ onClose }: HangarScreenProps) {
  const hangar = useAppStore((state) => state.hangar)
  const backButton = useRef<HTMLButtonElement>(null)
  const entries = [...hangar].sort((a, b) => (b.completedAt ?? -1) - (a.completedAt ?? -1))
  const parts = getPartDefinitions(appDependencies.catalog)

  useEffect(() => {
    backButton.current?.focus()
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <main className="hangar-screen">
      <section className="hangar-content" aria-labelledby="hangar-title">
        <header className="hangar-heading">
          <div>
            <p className="phase-label">GUNDAMDORO / HANGAR</p>
            <h1 id="hangar-title">机体仓库</h1>
            <p className="hangar-count">已收藏 {hangar.length} 台成品</p>
          </div>
          <button ref={backButton} type="button" className="secondary-button hangar-back" onClick={onClose}>返回</button>
        </header>
        {entries.length === 0 ? (
          <div className="hangar-empty">
            <strong>仓库还没有成品</strong>
            <p>完成配件收集并点击拼装，机体会自动保存到这里。</p>
            <button type="button" onClick={onClose}>返回制作</button>
          </div>
        ) : (
          <ul className="hangar-grid" aria-label="已完成机体">
            {entries.map((entry) => {
              const asset = getFinalAsset(entry.mechaId)
              return (
                <li key={entry.id} className="hangar-card">
                  <div className="hangar-preview">
                    {entry.kind === 'custom' && entry.composition ? <CompositeMecha parts={entry.composition} label={`${entry.mechaName} 自定义成品`} />
                      : asset ? <AssetImage src={asset} alt={`${entry.mechaName} 成品`} className="mecha-image" /> : <span className="hangar-unavailable">机型资源暂不可用</span>}
                  </div>
                  <h2>{entry.mechaName}</h2>
                  <p className="hangar-model-id">{entry.kind === 'custom' ? '自定义拼装 · 配件可重复使用' : entry.mechaId}</p>
                  <p className="hangar-date">
                    {entry.completedAt === null ? '历史成品 · 完成时间未记录' : <time dateTime={new Date(entry.completedAt).toISOString()}>{completedDate.format(entry.completedAt)}</time>}
                  </p>
                  {entry.kind === 'custom' && entry.composition ? <dl className="hangar-stats">
                    {PART_SLOTS.map((slot) => <div key={slot}><dt>{PART_SLOT_LABELS[slot]}</dt><dd>{parts.find((part) => part.id === entry.composition?.[slot])?.mechaName ?? '配件资源暂不可用'}</dd></div>)}
                  </dl> : <dl className="hangar-stats">
                    <div><dt>专注次数</dt><dd>{entry.completedFocusSessions} 次</dd></div>
                    <div><dt>专注时长</dt><dd>{focusedMinutes.format(entry.totalFocusedMinutes)} 分钟</dd></div>
                  </dl>}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </main>
  )
}
