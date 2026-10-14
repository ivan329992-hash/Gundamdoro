/** 【视图·非相位】选机型；真正切换走 selectMecha（有 canSelectMecha 门禁）。 */
import { useEffect, useRef } from 'react'
import { getFinalAsset, getMechaManifests } from '../../mecha/loader'
import { AssetImage } from './AssetImage'
import { useAppStore } from '../../store/useAppStore'

interface ModelSelectionScreenProps {
  currentMechaId: string
  completed: boolean
  onSelect: (mechaId: string) => void
  onClose: () => void
}

export function ModelSelectionScreen({ currentMechaId, completed, onSelect, onClose }: ModelSelectionScreenProps) {
  const backButton = useRef<HTMLButtonElement>(null)
  const models = getMechaManifests()
  const hangar = useAppStore((state) => state.hangar)
  const revealedModels = new Set(hangar.filter((entry) => entry.kind !== 'custom').map((entry) => entry.mechaId))

  useEffect(() => {
    backButton.current?.focus()
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <main className="model-screen">
      <section className="model-content" aria-labelledby="model-title">
        <header className="model-heading">
          <div>
            <p className="phase-label">GUNDAMDORO / MODEL SELECT</p>
            <h1 id="model-title">选择机型</h1>
          </div>
          <button ref={backButton} type="button" className="secondary-button model-back" onClick={onClose}>返回</button>
        </header>
        <p className="model-note">首次完成制作后，揭晓机体的完整外观。更换未完成的机体需先确认放弃本轮制作，永久库存会保留。</p>
        <ul className="model-grid" aria-label="可制作机型">
          {models.map((model) => {
            const selected = model.id === currentMechaId
            const mystery = !revealedModels.has(model.id)
            return (
              <li key={model.id} className={`model-card${selected ? ' is-selected' : ''}`}>
                <div className="model-preview">
                  <AssetImage src={getFinalAsset(model.id)} alt={`${model.name} ${mystery ? '神秘轮廓，完成制作后揭晓' : '完整外观'}`} className={`mecha-image${mystery ? ' model-silhouette' : ''}`} />
                  {mystery && <span className="model-mystery-mark" aria-hidden="true">?</span>}
                </div>
                <h2>{model.name}</h2>
                {model.description && <p>{model.description}</p>}
                <p>{model.totalStages} 个部件 · {model.totalStages} 次专注</p>
                <p className="model-reveal-note">{mystery ? '完成制作，揭晓完整外观' : '外观已揭晓'}</p>
                <button
                  type="button"
                  disabled={selected && !completed}
                  aria-label={selected && !completed ? `${model.name} 当前机型` : `制作 ${model.name}`}
                  onClick={() => onSelect(model.id)}
                >
                  {selected ? completed ? '再次制作' : '当前机型' : '制作此机型'}
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    </main>
  )
}
