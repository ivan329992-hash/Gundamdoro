import { useEffect, useRef, type ReactNode } from 'react'

interface DialogProps {
  open: boolean
  titleId: string
  className?: string
  busy?: boolean
  onClose: () => void
  children: ReactNode
}

/** 原生模态框负责背景隔离、焦点限制及关闭后的焦点恢复。 */
export function Dialog({ open, titleId, className, busy = false, onClose, children }: DialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) element.showModal()
    if (!open && element.open) element.close()
    return () => {
      if (element.open) element.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialog}
      className={`app-dialog${className ? ` ${className}` : ''}`}
      aria-labelledby={titleId}
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
    >
      {children}
    </dialog>
  )
}
