import { useState } from 'react'
import { Dialog } from '../shared/Dialog'

const presets = [15, 25, 45]

/** 待机页的时长入口；临时输入保存在组件内，确认后由调用方更新设置。 */
export function FocusDurationPicker({
  minutes,
  onChange,
}: {
  minutes: number
  onChange: (minutes: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(String(minutes))
  const custom = !presets.includes(minutes)

  return (
    <>
      <div className="quick-durations" aria-label="快捷专注时长">
        {presets.map((value) => (
          <button
            key={value}
            type="button"
            className="secondary-button"
            aria-pressed={minutes === value}
            onClick={() => onChange(value)}
          >
            {value} 分钟
          </button>
        ))}
      </div>
      <button
        type="button"
        className="secondary-button custom-duration-button"
        aria-pressed={custom}
        aria-haspopup="dialog"
        onClick={() => {
          setDraft(String(minutes))
          setOpen(true)
        }}
      >
        {custom ? `自定义专注时长 · ${minutes} 分钟` : '自定义专注时长'}
      </button>
      <Dialog
        open={open}
        titleId="duration-title"
        className="settings-dialog"
        onClose={() => setOpen(false)}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const value = Number(draft)
            if (!Number.isInteger(value) || value < 1 || value > 120) return
            onChange(value)
            setOpen(false)
          }}
        >
          <div className="dialog-heading">
            <h2 id="duration-title">自定义专注时长</h2>
            <button
              type="button"
              className="dialog-close"
              aria-label="关闭自定义时长"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>
          <label>
            专注时长（分钟）
            <input
              autoFocus
              type="number"
              min="1"
              max="120"
              step="1"
              required
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          </label>
          <p className="bootstrap-note">输入 1–120 分钟，设置下一次专注的时长。</p>
          <button type="submit">应用时长</button>
        </form>
      </Dialog>
    </>
  )
}
