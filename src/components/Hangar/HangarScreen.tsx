/** 【视图·非相位】只读机库列表；开关不改 phase，仅本地 UI 状态。 */
import { useEffect, useRef, useState } from 'react'
import { groupHangar } from '../../domain/hangar'
import { MechaDetail } from './MechaDetail'
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
  const entries = groupHangar(hangar)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const selected = entries.find((group) => group.key === selectedKey)
  const restoreCard = useRef<string | null>(null)
  const cards = useRef(new Map<string, HTMLButtonElement>())
  const returnToList = () => { restoreCard.current = selectedKey; setSelectedKey(null) }
  const parts = getPartDefinitions(appDependencies.catalog)

  useEffect(() => {
    const card = restoreCard.current ? cards.current.get(restoreCard.current) : null
    const focusTarget = card ?? backButton.current
    focusTarget?.focus()
    restoreCard.current = null
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (selectedKey) { restoreCard.current = selectedKey; setSelectedKey(null) }
        else onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, selectedKey])

  return (
    <main className="hangar-screen">
      <section className="hangar-content" aria-labelledby="hangar-title">
        <header className="hangar-heading">
          <div>
            <p className="phase-label">GUNDAMDORO / HANGAR</p>
            <h1 id="hangar-title">{selected ? '机体详情' : '机体仓库'}</h1>
            <p className="hangar-count">已收藏 {entries.length} 款机体 · 累计完成 {hangar.length} 次</p>
          </div>
          <button ref={backButton} type="button" className="secondary-button hangar-back" onClick={selected ? returnToList : onClose}>{selected ? '返回仓库' : '返回'}</button>
        </header>
        {selected ? <MechaDetail group={selected} /> : entries.length === 0 ? (
          <div className="hangar-empty">
            <strong>仓库还没有成品</strong>
            <p>完成配件收集并点击拼装，机体会自动保存到这里。</p>
            <button type="button" onClick={onClose}>返回制作</button>
          </div>
        ) : (
          <ul className="hangar-grid" aria-label="已完成机体">
            {entries.map((group) => {
              const entry = group.latest
              const asset = getFinalAsset(entry.mechaId)
              return (
                <li key={group.key} className="hangar-card" onClick={(event) => {
                  if ((event.target as HTMLElement).closest('button')) return
                  setSelectedKey(group.key)
                  window.scrollTo(0, 0)
                }}>
                  <div className="hangar-preview">
                    {entry.kind === 'custom' && entry.composition ? <CompositeMecha parts={entry.composition} label={`${entry.mechaName} 自定义成品`} />
                      : asset ? <AssetImage src={asset} alt={`${entry.mechaName} 成品`} className="mecha-image" /> : <span className="hangar-unavailable">机型资源暂不可用</span>}
                  </div>
                  <h2>{entry.mechaName}</h2>
                  <p className="hangar-owned">已完成 × {group.count}</p>
                  <p className="hangar-model-id">{entry.kind === 'custom' ? '自定义拼装 · 配件可重复使用' : entry.mechaId}</p>
                  <p className="hangar-date">
                    {entry.completedAt === null ? '历史成品 · 完成时间未记录' : <time dateTime={new Date(entry.completedAt).toISOString()}>{completedDate.format(entry.completedAt)}</time>}
                  </p>
                  {entry.kind === 'custom' && entry.composition ? <dl className="hangar-stats">
                    {PART_SLOTS.map((slot) => <div key={slot}><dt>{PART_SLOT_LABELS[slot]}</dt><dd>{parts.find((part) => part.id === entry.composition?.[slot])?.mechaName ?? '配件资源暂不可用'}</dd></div>)}
                  </dl> : <dl className="hangar-stats">
                    <div><dt>累计专注次数</dt><dd>{group.sessions} 次</dd></div>
                    <div><dt>累计专注时长</dt><dd>{focusedMinutes.format(group.minutes)} 分钟</dd></div>
                  </dl>}
                  <button type="button" className="hangar-detail-button" aria-label={`查看 ${entry.mechaName} 详情`}
                    ref={(element) => { if (element) cards.current.set(group.key, element); else cards.current.delete(group.key) }}
                    onClick={() => { setSelectedKey(group.key); window.scrollTo(0, 0) }}>查看机体档案 <span aria-hidden="true">↗</span></button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </main>
  )
}
