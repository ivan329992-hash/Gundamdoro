import { PART_SLOT_LABELS } from '../../domain/inventory'
import type { PartDefinition } from '../../domain/types'
import { RegisteredPartImage } from '../Mecha/RegisteredMecha'
import { StageImage } from '../Mecha/StageImage'

interface InventoryPartCardProps {
  part: PartDefinition
  unlocked: boolean
  selected: boolean
  assembly: boolean
  canEdit: boolean
  onSelect: () => void
}

export function InventoryPartCard({
  part,
  unlocked,
  selected,
  assembly,
  canEdit,
  onSelect,
}: InventoryPartCardProps) {
  let preview = <span>未解锁</span>
  if (unlocked) {
    preview =
      assembly && part.slot ? (
        <RegisteredPartImage modelId={part.mechaId} slot={part.slot} />
      ) : (
        <StageImage mechaId={part.mechaId} stage={part.stage} className="part-image" />
      )
  }

  let action = <span className="part-locked">完成该机型第 {part.stage} 次专注</span>
  if (unlocked) {
    action = assembly ? (
      <button
        type="button"
        className={selected ? 'secondary-button' : ''}
        disabled={selected || !canEdit}
        onClick={onSelect}
      >
        {selected ? '已选用' : '选用此配件'}
      </button>
    ) : (
      <span className="part-owned">已解锁 · 可重复使用</span>
    )
  }

  return (
    <li
      className={`inventory-card${selected && assembly ? ' is-selected' : ''}${unlocked ? '' : ' is-locked'}`}
    >
      <div className="inventory-part-preview">{preview}</div>
      <strong>{part.slot ? PART_SLOT_LABELS[part.slot] : part.name}</strong>
      <p>{part.mechaName}</p>
      {action}
    </li>
  )
}
