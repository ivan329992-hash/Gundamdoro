/** 【组件】READY/奖励：已收集零件槽位展示。 */
import { motion, useReducedMotion } from 'framer-motion'
import { getMechaManifest } from '../../mecha/loader'
import { StageImage } from './StageImage'

interface MechaDisplayProps {
  currentStage: number
  highlightStage?: number
  mechaId?: string
}

export function MechaDisplay({ currentStage, highlightStage, mechaId }: MechaDisplayProps) {
  const manifest = getMechaManifest(mechaId)
  const reduceMotion = useReducedMotion()

  return (
    <div className="mecha-display">
      <ul className="parts-grid" aria-label={`${manifest.name} collected parts`}>
        {manifest.stages.map((part) => {
          const unlocked = part.stage <= currentStage
          const isNew = part.stage === highlightStage
          return (
            <motion.li
              key={`${manifest.id}:${part.stage}`}
              className={`part-slot${unlocked ? ' is-unlocked' : ''}${isNew ? ' is-new' : ''}`}
              initial={isNew ? { opacity: 0, scale: reduceMotion ? 1 : 0.9 } : false}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.8 }}
            >
              <div className="part-preview">
                {unlocked ? (
                  <StageImage mechaId={manifest.id} stage={part.stage} className="part-image" />
                ) : (
                  <span className="locked-part">未解锁</span>
                )}
              </div>
              <strong>{part.name}</strong>
              <span className="part-status">{unlocked ? '已收集' : '待解锁'}</span>
            </motion.li>
          )
        })}
      </ul>
    </div>
  )
}
