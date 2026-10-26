import { useState } from 'react'
import type { DraftComposition } from '../../domain/types'
import { CompositeMecha } from '../Mecha/CompositeMecha'
import { Dialog } from '../shared/Dialog'

interface WorkbenchPreviewProps {
  parts: DraftComposition
  profile?: string
}

export function WorkbenchPreview({ parts, profile }: WorkbenchPreviewProps) {
  const [expanded, setExpanded] = useState(false)
  const count = Object.values(parts).filter(Boolean).length

  return (
    <>
      <section className="workbench-preview" aria-label="当前拼装预览">
        <header className="workbench-preview-heading">
          <span>拼装预览 · 已选 {count} 个配件</span>
          <button type="button" className="secondary-button" onClick={() => setExpanded(true)}>
            放大预览
          </button>
        </header>
        <CompositeMecha parts={parts} profile={profile} />
      </section>
      <Dialog
        open={expanded}
        titleId="preview-title"
        className="preview-dialog"
        onClose={() => setExpanded(false)}
      >
        <header className="dialog-heading">
          <h2 id="preview-title">机体预览</h2>
          <button
            type="button"
            className="dialog-close"
            aria-label="关闭预览"
            onClick={() => setExpanded(false)}
          >
            ×
          </button>
        </header>
        <div className="expanded-mecha-preview">
          {expanded && <CompositeMecha parts={parts} profile={profile} />}
        </div>
      </Dialog>
    </>
  )
}
