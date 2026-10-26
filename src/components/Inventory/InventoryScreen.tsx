import { useEffect, useRef, useState } from 'react'
import { appDependencies } from '../../app/dependencies'
import { supportsAssembly, supportsAssemblyPart } from '../../domain/assembly'
import {
  canUseWorkbench,
  getPartDefinitions,
  isCompositionComplete,
  PART_SLOTS,
  PART_SLOT_LABELS,
  WORKBENCH_NAME_LIMIT,
} from '../../domain/inventory'
import type { PartSlot } from '../../domain/types'
import { getMechaManifests } from '../../mecha/loader'
import { useAppStore } from '../../store/useAppStore'
import { InventoryPartCard } from './InventoryPartCard'
import { WorkbenchPreview } from './WorkbenchPreview'
import { WorkbenchSaveBar } from './WorkbenchSaveBar'

interface InventoryScreenProps {
  onClose: () => void
  onOpenHangar: () => void
}

/** 配件筛选与工作台导航；配件选择、命名及保存仍由 store 动作处理。 */
export function InventoryScreen({ onClose, onOpenHangar }: InventoryScreenProps) {
  const [tab, setTab] = useState<'inventory' | 'assembly'>('inventory')
  const [slot, setSlot] = useState<PartSlot>('torso')
  const [modelFilter, setModelFilter] = useState('all')
  const [showLocked, setShowLocked] = useState(false)
  const back = useRef<HTMLButtonElement>(null)
  const owned = useAppStore((state) => state.unlockedParts)
  const draft = useAppStore((state) => state.workbench)
  const phase = useAppStore((state) => state.phase)
  const selectPart = useAppStore((state) => state.selectWorkbenchPart)
  const clearPart = useAppStore((state) => state.clearWorkbenchPart)
  const setName = useAppStore((state) => state.setWorkbenchName)
  const isAssembly = tab === 'assembly'

  const { catalog, assembly } = appDependencies
  const definitions = getPartDefinitions(catalog)
  const historicalIds = new Set(getPartDefinitions(catalog, true).map((part) => part.id))
  const ownedIds = new Set(owned)
  const requiredSlots = assembly?.slots ?? PART_SLOTS
  const optionalSlots = assembly?.optionalSlots ?? []
  const assemblySlots = [...requiredSlots, ...optionalSlots]
  const selectedSlots = [
    ...requiredSlots,
    ...optionalSlots.filter((partSlot) => draft.parts[partSlot]),
  ]
  const knownOwned = definitions.filter((part) => ownedIds.has(part.id))
  const compatibleOwned = knownOwned.filter((part) => supportsAssemblyPart(part, assembly))
  const unavailableCount = owned.filter((id) => !historicalIds.has(id)).length
  const options = definitions.filter((part) => {
    if (modelFilter !== 'all' && part.mechaId !== modelFilter) return false
    if (isAssembly && (part.slot !== slot || !supportsAssemblyPart(part, assembly))) return false
    return showLocked || ownedIds.has(part.id)
  })
  const complete =
    isCompositionComplete(draft.parts, owned, catalog, selectedSlots) &&
    supportsAssembly(draft.parts, catalog, assembly)
  const canEdit = canUseWorkbench(phase)
  const missing = requiredSlots.filter((partSlot) => !draft.parts[partSlot])
  const unsupported = (Object.keys(draft.parts) as PartSlot[]).filter(
    (partSlot) =>
      !definitions.some(
        (part) => part.id === draft.parts[partSlot] && supportsAssemblyPart(part, assembly),
      ),
  )
  const models = getMechaManifests().filter(
    (model) => !isAssembly || assembly?.modelIds.includes(model.id),
  )
  const nameLength = Array.from(draft.name).length

  const changeTab = (next: typeof tab) => {
    setTab(next)
    if (next === 'assembly') setModelFilter('all')
  }

  useEffect(() => {
    back.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      const inDialog = event.target instanceof Element && event.target.closest('dialog')
      if (event.key === 'Escape' && !event.defaultPrevented && !inDialog) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  let emptyMessage = '配件仓库还是空的。完成一次专注，就能解锁对应部件。'
  if (owned.length) emptyMessage = '此筛选条件下还没有配件。'
  if (isAssembly) emptyMessage = '尚未解锁此部位的配件。完成对应机型的专注收集后即可选用。'

  return (
    <main className={'workshop-screen' + (isAssembly ? ' has-save-bar' : '')}>
      <section className="workshop-content" aria-labelledby="workshop-title">
        <header className="workshop-heading">
          <div>
            <p className="phase-label">GUNDAMDORO / WORKSHOP</p>
            <h1 id="workshop-title">配件仓库与拼装台</h1>
          </div>
          <button
            ref={back}
            type="button"
            className="secondary-button workshop-back"
            onClick={onClose}
          >
            返回
          </button>
        </header>
        <p className="workshop-note">
          已解锁 {knownOwned.length} / {definitions.length} 种配件 · 永久保留，可重复使用
        </p>
        <div
          className="workshop-tabs"
          role="tablist"
          aria-label="工作间"
          onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
            event.preventDefault()
            const next =
              event.key === 'Home'
                ? 'inventory'
                : event.key === 'End'
                  ? 'assembly'
                  : isAssembly
                    ? 'inventory'
                    : 'assembly'
            changeTab(next)
            document.getElementById(next + '-tab')?.focus()
          }}
        >
          <button
            id="inventory-tab"
            type="button"
            role="tab"
            tabIndex={isAssembly ? -1 : 0}
            aria-selected={!isAssembly}
            aria-controls="workshop-panel"
            onClick={() => changeTab('inventory')}
          >
            配件仓库
          </button>
          <button
            id="assembly-tab"
            type="button"
            role="tab"
            tabIndex={isAssembly ? 0 : -1}
            aria-selected={isAssembly}
            aria-controls="workshop-panel"
            onClick={() => changeTab('assembly')}
          >
            自定义拼装
          </button>
        </div>
        <div
          id="workshop-panel"
          className={isAssembly ? 'is-assembly' : ''}
          role="tabpanel"
          aria-labelledby={tab + '-tab'}
        >
          {isAssembly && <WorkbenchPreview parts={draft.parts} profile={assembly?.profile} />}
          <div className={isAssembly ? 'workbench-browser' : undefined}>
            {isAssembly && (
              <>
                <section className="workbench" aria-label="自定义机体工作台">
                  <label className="workbench-name">
                    <span>
                      机体名称{' '}
                      <small>
                        {nameLength} / {WORKBENCH_NAME_LIMIT}
                      </small>
                    </span>
                    <input
                      value={draft.name}
                      onChange={(event) => setName(event.target.value)}
                      aria-describedby="workbench-name-hint"
                      disabled={!canEdit}
                    />
                  </label>
                  <p id="workbench-name-hint" className="field-hint">
                    最多 {WORKBENCH_NAME_LIMIT} 个字符。
                  </p>
                  <p className="assembly-compatibility">
                    {assembly?.modelIds.length ?? 0} 款机型的身体配件可搭配使用，背包／翅膀可留空。
                  </p>
                  {unsupported.length > 0 && (
                    <p className="assembly-unsupported" role="status">
                      旧配方中的
                      {unsupported.map((partSlot) => PART_SLOT_LABELS[partSlot]).join('、')}
                      尚未校准，已保留选择。请替换为兼容配件后保存。
                    </p>
                  )}
                </section>
                <div className="slot-picker" role="group" aria-label="选择部位">
                  {assemblySlots.map((partSlot) => {
                    const source = definitions.find(
                      (part) => part.id === draft.parts[partSlot],
                    )?.mechaName
                    return (
                      <button
                        key={partSlot}
                        type="button"
                        aria-pressed={partSlot === slot}
                        onClick={() => setSlot(partSlot)}
                      >
                        {PART_SLOT_LABELS[partSlot]}
                        <small title={source}>
                          {source ??
                            (optionalSlots.includes(partSlot) ? '可选 · 未装备' : '待选择')}
                        </small>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
            <div className="inventory-filters">
              <label>
                机型
                <select
                  value={modelFilter}
                  onChange={(event) => setModelFilter(event.target.value)}
                >
                  <option value="all">{isAssembly ? '全部兼容机型' : '全部机型'}</option>
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="locked-toggle">
                <input
                  type="checkbox"
                  checked={showLocked}
                  onChange={(event) => setShowLocked(event.target.checked)}
                />
                显示未解锁
              </label>
            </div>
            {isAssembly && optionalSlots.includes(slot) && (
              <button
                type="button"
                className="secondary-button unequip-button"
                aria-pressed={!draft.parts[slot]}
                disabled={!canEdit}
                onClick={() => clearPart(slot)}
              >
                不装备背包／翅膀
              </button>
            )}
            {!options.length && (
              <div className="inventory-empty" role="status">
                {emptyMessage}
              </div>
            )}
            <ul
              className="inventory-grid"
              aria-label={isAssembly ? PART_SLOT_LABELS[slot] + '配件' : '配件列表'}
            >
              {options.map((part) => (
                <InventoryPartCard
                  key={part.id}
                  part={part}
                  unlocked={ownedIds.has(part.id)}
                  selected={Boolean(part.slot && draft.parts[part.slot] === part.id)}
                  assembly={isAssembly}
                  canEdit={canEdit}
                  onSelect={() => selectPart(slot, part.id)}
                />
              ))}
            </ul>
            {unavailableCount > 0 && (
              <p className="workshop-note">
                另有 {unavailableCount} 种配件资源暂不可用，解锁记录已保留。
              </p>
            )}
          </div>
        </div>
        {isAssembly && (
          <WorkbenchSaveBar
            complete={complete}
            missing={missing.map((partSlot) => PART_SLOT_LABELS[partSlot])}
            canEdit={canEdit}
            canRandomize={compatibleOwned.length > 0}
            onOpenHangar={onOpenHangar}
          />
        )}
      </section>
    </main>
  )
}
