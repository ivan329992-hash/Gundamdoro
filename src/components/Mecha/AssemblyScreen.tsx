/** 【屏】集齐后手动拼装动画；完成入库由 hook 调 finishAssemblyAnimation。 */
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { getFinalAsset, getMechaManifest } from '../../mecha/loader'
import { appScheduler } from '../../app/dependencies'
import { PRESENTATION_TIMINGS } from '../../application/phaseTransitions'
import { AssetImage } from './AssetImage'
import { StageImage } from './StageImage'
import { useAppStore } from '../../store/useAppStore'

export function AssemblyScreen() {
  const mechaId = useAppStore((state) => state.assembly.mechaId)
  const manifest = getMechaManifest(mechaId)
  const reduceMotion = useReducedMotion()
  const [assembled, setAssembled] = useState(false)

  useEffect(() => {
    return appScheduler.after(
      reduceMotion ? PRESENTATION_TIMINGS.reducedAssemblyReveal : PRESENTATION_TIMINGS.assemblyReveal,
      () => setAssembled(true),
    )
  }, [reduceMotion])

  return (
    <main className="app-shell assembly-shell">
      <section className="assembly-card" aria-labelledby="assembly-title">
        <p className="phase-label">{manifest.name} / FINAL BUILD</p>
        <h1 id="assembly-title">ASSEMBLY SEQUENCE</h1>
        <div className="assembly-canvas">
          {assembled ? (
            <motion.div className="final-mecha" initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: reduceMotion ? 0 : 0.8 }}>
              <AssetImage src={getFinalAsset(mechaId)} alt={`${manifest.name} assembled`} className="mecha-image" />
            </motion.div>
          ) : (
            <div className="assembly-parts">
              {manifest.stages.map((part) => (
                <motion.div key={part.stage} className="assembly-part-tile" initial={{ opacity: 1, scale: 1 }} animate={reduceMotion ? { opacity: 1 } : { opacity: [1, 1, 0], scale: [1, 0.96, 0.5], y: [0, 0, -12] }} transition={{ duration: 2, times: [0, 0.5, 1] }}>
                  <StageImage mechaId={mechaId} stage={part.stage} className="part-image" />
                </motion.div>
              ))}
            </div>
          )}
        </div>
        <p className="assembly-part">{assembled ? 'FINAL ASSEMBLY COMPLETE' : 'CONNECTING PARTS'}</p>
      </section>
    </main>
  )
}
