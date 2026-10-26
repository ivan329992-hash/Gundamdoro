/** 【对话框】改专注/休息分钟；保存走 updateSettings（仅 READY/COMPLETE 有效）。 */
import { useEffect, useState } from 'react'
import type { Settings } from '../../domain/types'
import { prepareSound, requestReminders } from '../../adapters/platform/reminders'
import { Dialog } from '../shared/Dialog'

interface SettingsDialogProps {
  open: boolean
  focusMinutes: number
  breakMinutes: number
  preferences?: Settings
  onSave: (focusMinutes: number, breakMinutes: number, preferences: Partial<Settings>) => void
  onClose: () => void
}

export function SettingsDialog({
  open,
  focusMinutes,
  breakMinutes,
  preferences,
  onSave,
  onClose,
}: SettingsDialogProps) {
  const [focusValue, setFocusValue] = useState(String(focusMinutes))
  const [breakValue, setBreakValue] = useState(String(breakMinutes))
  const [error, setError] = useState<string | null>(null)
  const [sound, setSound] = useState(true)
  const [notifications, setNotifications] = useState(false)
  const [mini, setMini] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setFocusValue(String(focusMinutes))
      setBreakValue(String(breakMinutes))
      setError(null)
      setSound(preferences?.soundEnabled !== false)
      setNotifications(preferences?.notificationsEnabled === true)
      setMini(preferences?.miniTimerEnabled !== false)
    }
  }, [breakMinutes, focusMinutes, open, preferences])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextFocus = Number(focusValue)
    const nextBreak = Number(breakValue)
    if (!Number.isInteger(nextFocus) || nextFocus < 1 || nextFocus > 120) {
      setError('专注时长需为 1–120 分钟的整数。')
      return
    }
    if (!Number.isInteger(nextBreak) || nextBreak < 1 || nextBreak > 60) {
      setError('休息时长需为 1–60 分钟的整数。')
      return
    }

    setSaving(true)
    if (sound) void prepareSound()
    try {
      if (notifications && !(await requestReminders())) {
        setNotifications(false)
        setError('通知权限未开启。可以到系统或浏览器设置中开启，或关闭通知后保存。')
        return
      }
      onSave(nextFocus, nextBreak, {
        soundEnabled: sound,
        notificationsEnabled: notifications,
        miniTimerEnabled: mini,
      })
    } catch {
      setError('无法申请通知权限，请关闭通知后保存；计时功能不受影响。')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      className="settings-dialog"
      titleId="settings-title"
      busy={saving}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <div className="dialog-heading">
          <h2 id="settings-title">计时设置</h2>
          <button
            type="button"
            disabled={saving}
            className="dialog-close"
            onClick={onClose}
            aria-label="关闭设置"
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
            value={focusValue}
            onChange={(event) => setFocusValue(event.target.value)}
          />
        </label>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={sound}
            onChange={(event) => setSound(event.target.checked)}
          />
          完成提示音
        </label>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={notifications}
            onChange={(event) => setNotifications(event.target.checked)}
          />
          完成时发送系统通知
        </label>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={mini}
            onChange={(event) => setMini(event.target.checked)}
          />
          最小化时显示桌面迷你计时器
        </label>
        <p className="settings-hint">迷你计时器需要桌面版；通知受系统权限及免打扰设置影响。</p>
        <label>
          休息时长（分钟）
          <input
            type="number"
            min="1"
            max="60"
            value={breakValue}
            onChange={(event) => setBreakValue(event.target.value)}
          />
        </label>
        {error && (
          <p className="settings-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={saving}>
          {saving ? '正在保存…' : '保存设置'}
        </button>
      </form>
    </Dialog>
  )
}
