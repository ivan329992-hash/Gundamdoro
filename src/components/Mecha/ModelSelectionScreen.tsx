/** 【视图·非相位】选机型；真正切换走 selectMecha（有 canSelectMecha 门禁）。 */
import { useEffect, useRef } from 'react'
import { getFinalAsset, getMechaManifests } from '../../mecha/loader'
import { AssetImage } from './AssetImage'

interface ModelSelectionScreenProps {
  currentMechaId: string
  completed: boolean
  onSelect: (mechaId: string) => void
  onClose: () => void
}

export function ModelSelectionScreen({ currentMechaId, completed, onSelect, onClose }: ModelSelectionScreenProps) {
  const backButton = useRef<HTMLButtonElement>(null)
  const models = getMechaManifests()

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
        <p className="model-note">选择下一台要制作的机体。开始收集部件后，本轮机型将锁定至拼装完成。</p>
        <ul className="model-grid" aria-label="可制作机型">
          {models.map((model) => {
            const selected = model.id === currentMechaId
            return (
              <li key={model.id} className={`model-card${selected ? ' is-selected' : ''}`}>
                <div className="model-preview">
                  <AssetImage src={getFinalAsset(model.id)} alt={`${model.name} 预览`} className="mecha-image" />
                </div>
                <h2>{model.name}</h2>
                {model.description && <p>{model.description}</p>}
                <p>{model.totalStages} 个部件 · {model.totalStages} 次专注</p>
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
