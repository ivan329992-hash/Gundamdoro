import { useEffect, useRef, useState } from 'react'
import { appDependencies } from '../../app/dependencies'
import { canUseWorkbench, getPartDefinitions, isCompositionComplete, PART_SLOTS, PART_SLOT_LABELS } from '../../domain/inventory'
import type { PartSlot } from '../../domain/types'
import { getMechaManifests } from '../../mecha/loader'
import { useAppStore } from '../../store/useAppStore'
import { StageImage } from '../Mecha/StageImage'
import { CompositeMecha } from '../Mecha/CompositeMecha'
import { CUSTOM_ASSEMBLY_ENABLED } from '../../app/features'
import { supportsAssembly, supportsAssemblyPart } from '../../domain/assembly'
import { RegisteredPartImage } from '../Mecha/RegisteredMecha'

interface InventoryScreenProps { onClose: () => void; onOpenHangar: () => void }

export function InventoryScreen({ onClose, onOpenHangar }: InventoryScreenProps) {
  const [tab, setTab] = useState<'inventory' | 'assembly'>('inventory')
  const [slot, setSlot] = useState<PartSlot>('torso')
  const [modelFilter, setModelFilter] = useState('all')
  const [showLocked, setShowLocked] = useState(false)
  const back = useRef<HTMLButtonElement>(null)
  const owned = useAppStore((state) => state.unlockedParts)
  const draft = useAppStore((state) => state.workbench)
  const hangar = useAppStore((state) => state.hangar)
  const phase = useAppStore((state) => state.phase)
  const selectPart = useAppStore((state) => state.selectWorkbenchPart)
  const clearPart = useAppStore((state) => state.clearWorkbenchPart)
  const setName = useAppStore((state) => state.setWorkbenchName)
  const randomize = useAppStore((state) => state.randomizeWorkbench)
  const save = useAppStore((state) => state.saveCustomBuild)
  const definitions = getPartDefinitions(appDependencies.catalog)
  const historicalDefinitions = getPartDefinitions(appDependencies.catalog, true)
  const requiredSlots = appDependencies.assembly?.slots ?? PART_SLOTS
  const optionalSlots = appDependencies.assembly?.optionalSlots ?? []
  const assemblySlots = [...requiredSlots, ...optionalSlots]
  const knownOwned = definitions.filter((part) => owned.includes(part.id))
  const compatibleOwned = knownOwned.filter((part) => supportsAssemblyPart(part, appDependencies.assembly))
  const unavailable = owned.filter((id) => !historicalDefinitions.some((part) => part.id === id))
  const options = definitions.filter((part) => (modelFilter === 'all' || part.mechaId === modelFilter)
    && (tab !== 'assembly' || part.slot === slot && supportsAssemblyPart(part, appDependencies.assembly)) && (showLocked || owned.includes(part.id)))
  const complete = isCompositionComplete(draft.parts, owned, appDependencies.catalog, [...requiredSlots, ...optionalSlots.filter((partSlot) => draft.parts[partSlot])]) && supportsAssembly(draft.parts, appDependencies.catalog, appDependencies.assembly)
  const saved = hangar.some((entry) => entry.id === draft.id)
  const canEdit = canUseWorkbench(phase)
  const missing = requiredSlots.filter((partSlot) => !draft.parts[partSlot])
  const unsupported = Object.keys(draft.parts).filter((key) => !definitions.some((part) => part.id === draft.parts[key as PartSlot] && supportsAssemblyPart(part, appDependencies.assembly))) as PartSlot[]
  const models = getMechaManifests().filter((model) => tab !== 'assembly' || appDependencies.assembly?.modelIds.includes(model.id))
  const saveStatus = saved ? '机体已入库，修改搭配或名称可保存新作品。'
    : missing.length ? `还需选择：${missing.map((partSlot) => PART_SLOT_LABELS[partSlot]).join('、')}`
      : !complete ? '部分配件未解锁或资源不可用，请重新选择。'
        : !draft.name.trim() ? '请先填写机体名称。'
          : !canEdit ? '当前阶段暂不能保存。' : '搭配已完整，可保存到成品仓库。'

  useEffect(() => {
    back.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <main className={`workshop-screen${tab === 'assembly' ? ' has-save-bar' : ''}`}>
      <section className="workshop-content" aria-labelledby="workshop-title">
        <header className="workshop-heading">
          <div><p className="phase-label">GUNDAMDORO / WORKSHOP</p><h1 id="workshop-title">{CUSTOM_ASSEMBLY_ENABLED ? '配件仓库与拼装台' : '配件仓库'}</h1></div>
          <button ref={back} type="button" className="secondary-button workshop-back" onClick={onClose}>返回</button>
        </header>
        <p className="workshop-note">已解锁 {knownOwned.length} / {definitions.length} 种配件 · 永久保留，可重复使用</p>
        <div className="workshop-tabs" role="tablist" aria-label="工作间">
          <button id="inventory-tab" type="button" role="tab" aria-selected={tab === 'inventory'} aria-controls="workshop-panel" onClick={() => setTab('inventory')}>配件仓库</button>
          {CUSTOM_ASSEMBLY_ENABLED && <button id="assembly-tab" type="button" role="tab" aria-selected={tab === 'assembly'} aria-controls="workshop-panel" onClick={() => { setTab('assembly'); setModelFilter('all') }}>自定义拼装</button>}
        </div>
        <div id="workshop-panel" className={tab === 'assembly' ? 'is-assembly' : ''} role="tabpanel" aria-labelledby={tab === 'inventory' ? 'inventory-tab' : 'assembly-tab'}>
          {tab === 'assembly' && (
            <>
            <div className="workbench-preview"><span className="assembly-badge">STANDARD FRAME / V4 · {7 + Number(Boolean(draft.parts.wings))} PARTS</span><CompositeMecha parts={draft.parts} profile={appDependencies.assembly?.profile} /></div>
            <section className="workbench" aria-label="自定义机体工作台">
              <label className="workbench-name">机体名称<input value={draft.name} onChange={(event) => setName(event.target.value)} maxLength={80} disabled={!canEdit} /></label>
              <p className="assembly-compatibility">七款机型的身体配件可分别搭配，已解锁的飞翼翅膀可装到任意机体。背包／翅膀槽位可留空。</p>
              {unsupported.length > 0 && <p className="assembly-unsupported" role="status">旧配方中的{unsupported.map((partSlot) => PART_SLOT_LABELS[partSlot]).join('、')}尚未校准，已保留选择。请手动替换为兼容配件后保存。</p>}
              <div className="slot-picker" aria-label="选择部位">
                {assemblySlots.map((partSlot) => <button key={partSlot} type="button" aria-pressed={partSlot === slot} onClick={() => setSlot(partSlot)}>
                  {PART_SLOT_LABELS[partSlot]}<small>{definitions.find((part) => part.id === draft.parts[partSlot])?.mechaName ?? (optionalSlots.includes(partSlot) ? '未装备 · 可选' : '待选择')}</small>
                </button>)}
              </div>
            </section>
            </>
          )}
          <div className="inventory-filters">
            <label>机型<select value={modelFilter} onChange={(event) => setModelFilter(event.target.value)}><option value="all">{tab === 'assembly' ? '全部兼容机型' : '全部机型'}</option>{models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</select></label>
            <label className="locked-toggle"><input type="checkbox" checked={showLocked} onChange={(event) => setShowLocked(event.target.checked)} />显示未解锁配件</label>
          </div>
          {tab === 'assembly' && optionalSlots.includes(slot) && <button type="button" className="secondary-button" aria-pressed={!draft.parts[slot]} disabled={!canEdit} onClick={() => clearPart(slot)}>不装备背包／翅膀</button>}
          {!options.length && <div className="inventory-empty" role="status">{tab === 'assembly' ? '尚未解锁此部位的配件。完成对应机型的专注收集后即可选用。' : owned.length ? '此筛选条件下还没有配件。' : '配件仓库还是空的。完成一次专注，就能解锁对应部件。'}</div>}
          <ul className="inventory-grid" aria-label={tab === 'assembly' ? `${PART_SLOT_LABELS[slot]}配件` : '配件列表'}>
            {options.map((part) => {
              const unlocked = owned.includes(part.id)
              const selected = part.slot ? draft.parts[part.slot] === part.id : false
              return <li key={part.id} className={`inventory-card${selected && tab === 'assembly' ? ' is-selected' : ''}${unlocked ? '' : ' is-locked'}`}>
                <div className="inventory-part-preview">{unlocked ? tab === 'assembly' && part.slot ? <RegisteredPartImage key={part.id} modelId={part.mechaId} slot={part.slot} /> : <StageImage mechaId={part.mechaId} stage={part.stage} className="part-image" /> : <span>未解锁</span>}</div>
                <strong>{part.slot ? PART_SLOT_LABELS[part.slot] : part.name}</strong><p>{part.mechaName}</p>
                {unlocked ? tab === 'assembly' ? <button type="button" className={selected ? 'secondary-button' : ''} disabled={selected || !canEdit} onClick={() => selectPart(slot, part.id)}>{selected ? '已选用' : '选用此配件'}</button> : <span className="part-owned">已解锁 · 可重复使用</span> : <span className="part-locked">完成该机型第 {part.stage} 次专注</span>}
              </li>
            })}
          </ul>
          {Boolean(unavailable.length) && <p className="workshop-note">另有 {unavailable.length} 种配件资源暂不可用，解锁记录已保留。</p>}
        </div>
        {tab === 'assembly' && <aside className="workbench-save-bar" aria-label="拼装保存">
          <div className="workbench-save-summary"><strong>{draft.name.trim() || '未命名机体'}</strong>
            {saved && <button type="button" className="secondary-button open-hangar-button" onClick={onOpenHangar}>查看成品仓库</button>}
          </div>
          <p id="workbench-save-status" className="workbench-status" role="status">{saveStatus}</p>
          <div className="workbench-actions">
            <button type="button" className="secondary-button" disabled={!compatibleOwned.length || !canEdit} onClick={randomize}>随机搭配</button>
            <button type="button" aria-describedby="workbench-save-status" disabled={!complete || !draft.name.trim() || saved || !canEdit} onClick={save}>{saved ? '已保存到仓库' : '保存到成品仓库'}</button>
          </div>
        </aside>}
      </section>
    </main>
  )
}
