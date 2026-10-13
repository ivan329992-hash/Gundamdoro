/** 【屏】休息倒计时 + 下一零件提示；到期 syncTimer→completeBreak。 */
import { motion, useReducedMotion } from 'framer-motion'
import { getBreakAsset, getMechaManifest, getNextStageDefinition } from '../../mecha/loader'
import { formatTime } from '../../lib/timer'
import { useAppStore } from '../../store/useAppStore'
import { EstimatedEnd } from '../Timer/EstimatedEnd'

export function BreakScreen({ onAbandonBuild }: { onAbandonBuild?: () => void }) {
  const timer = useAppStore((state) => state.timer)
  const currentStage = useAppStore((state) => state.assembly.currentStage)
  const endBreak = useAppStore((state) => state.endBreak)
  const mechaId = useAppStore((state) => state.assembly.mechaId)
  const manifest = getMechaManifest(mechaId)
  const nextStage = getNextStageDefinition(currentStage, mechaId)
  const breakAsset = getBreakAsset(mechaId)
  const reduceMotion = useReducedMotion()

  return (
    <main className="break-screen" style={breakAsset ? { backgroundImage: `url(${breakAsset})` } : undefined}>
      <motion.div
        className="break-ambient-light"
        aria-hidden="true"
        animate={reduceMotion ? { opacity: 0.18 } : { opacity: [0.12, 0.26, 0.12] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="break-steam-field" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <motion.span
            className="break-steam"
            key={index}
            animate={reduceMotion ? { opacity: 0 } : { opacity: [0, 0.2, 0], y: [18, -42], x: [0, index % 2 === 0 ? 8 : -8] }}
            transition={{ duration: 5 + index, delay: index * 1.4, repeat: Infinity, ease: 'easeOut' }}
          />
        ))}
      </div>
      <section className="break-card" aria-labelledby="break-title">
        <p className="eyebrow">{manifest.name} / RECOVERY BAY</p>
        <h1 id="break-title">BREAK</h1>
        <p className="break-next">NEXT PART <strong>{nextStage?.name ?? 'MECHA COMPLETE'}</strong></p>
        <strong className="break-timer" aria-live="polite">{formatTime(timer.remainingMs)}</strong>
        <EstimatedEnd timer={timer} />
        <p className="bootstrap-note">Take a short recovery break.</p>
        <button type="button" className="secondary-button" onClick={endBreak}>结束休息</button>
        {onAbandonBuild && <button type="button" className="secondary-button" onClick={onAbandonBuild}>放弃制作并换机型</button>}
      </section>
    </main>
  )
}
