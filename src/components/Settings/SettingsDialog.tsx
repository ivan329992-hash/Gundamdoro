/** 【对话框】改专注/休息分钟；保存走 updateSettings（仅 READY/COMPLETE 有效）。 */
import { useEffect, useState } from 'react'

interface SettingsDialogProps {
  open: boolean
  focusMinutes: number
  breakMinutes: number
  onSave: (focusMinutes: number, breakMinutes: number) => void
  onClose: () => void
}

export function SettingsDialog({ open, focusMinutes, breakMinutes, onSave, onClose }: SettingsDialogProps) {
  const [focusValue, setFocusValue] = useState(String(focusMinutes))
  const [breakValue, setBreakValue] = useState(String(breakMinutes))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setFocusValue(String(focusMinutes))
      setBreakValue(String(breakMinutes))
      setError(null)
    }
  }, [breakMinutes, focusMinutes, open])

  if (!open) {
    return null
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextFocus = Number(focusValue)
    const nextBreak = Number(breakValue)
    if (!Number.isInteger(nextFocus) || nextFocus < 1 || nextFocus > 120) {
      setError('Focus duration must be 1–120 minutes.')
      return
    }
    if (!Number.isInteger(nextBreak) || nextBreak < 1 || nextBreak > 60) {
      setError('Break duration must be 1–60 minutes.')
      return
    }

    onSave(nextFocus, nextBreak)
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <form className="settings-dialog" onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="dialog-heading">
          <h2 id="settings-title">SETTINGS</h2>
          <button type="button" className="dialog-close" onClick={onClose} aria-label="Close settings">×</button>
        </div>
        <label>
          FOCUS MINUTES
          <input type="number" min="1" max="120" value={focusValue} onChange={(event) => setFocusValue(event.target.value)} />
        </label>
        <label>
          BREAK MINUTES
          <input type="number" min="1" max="60" value={breakValue} onChange={(event) => setBreakValue(event.target.value)} />
        </label>
        {error && <p className="settings-error" role="alert">{error}</p>}
        <button type="submit">SAVE SETTINGS</button>
      </form>
    </div>
  )
}
