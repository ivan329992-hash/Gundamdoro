import { useEffect, useRef } from 'react'

interface Props {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function AbandonBuildDialog({ open, onCancel, onConfirm }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal()
    if (!open && dialog.current?.open) dialog.current.close()
  }, [open])
  return <dialog ref={dialog} className="abandon-dialog" aria-labelledby="abandon-title"
    onCancel={(event) => { event.preventDefault(); onCancel() }}>
    <h2 id="abandon-title">放弃本轮制作？</h2>
    <p>本轮收集进度、专注次数和分钟数将清零，当前未完成的专注不会获得配件。</p>
    <p>永久配件库存、成品仓库和设置都会保留。</p>
    <button type="button" autoFocus onClick={onCancel}>继续制作</button>
    <button type="button" className="secondary-button" onClick={onConfirm}>放弃并选择机型</button>
  </dialog>
}
