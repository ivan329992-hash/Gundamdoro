import { useEffect, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { BACKUP_LIMITS } from '../../domain/backup'
import { downloadBackupFile } from '../../adapters/storage/backupFile'

const errorMessage = (cause: unknown) => (cause instanceof Error ? cause.message : String(cause))

export function BackupScreen({ onClose }: { onClose: () => void }) {
  const operation = useAppStore((state) => state.backupOperation)
  const plan = useAppStore((state) => state.backupPlan)
  const exportBackup = useAppStore((state) => state.exportBackup)
  const inspectBackup = useAppStore((state) => state.inspectBackup)
  const restoreBackup = useAppStore((state) => state.restoreBackup)
  const clearPreview = useAppStore((state) => state.clearBackupPreview)
  const [busyFile, setBusyFile] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const busy = busyFile || operation !== 'idle'

  useEffect(() => {
    setConfirmed(false)
  }, [plan])
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        clearPreview()
        onClose()
      }
    }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [busy, clearPreview, onClose])

  const close = () => {
    clearPreview()
    onClose()
  }
  const saveFile = async () => {
    setError('')
    setMessage('')
    try {
      downloadBackupFile(await exportBackup())
      setMessage('备份已生成并交给系统保存，请确认文件已保存。')
    } catch (cause) {
      setError(errorMessage(cause))
    }
  }
  const readFile = async (file?: File) => {
    if (!file) return
    clearPreview()
    setConfirmed(false)
    setFileName(file.name)
    setError('')
    setMessage('')
    setBusyFile(true)
    try {
      if (!file.size || file.size > BACKUP_LIMITS.fileBytes)
        throw new Error('请选择有效且不超过 128 MiB 的完整备份文件。')
      await inspectBackup(new Uint8Array(await file.arrayBuffer()))
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setBusyFile(false)
    }
  }
  const restore = async () => {
    if (!confirmed || busy) return
    setError('')
    setMessage('')
    try {
      await restoreBackup()
      setMessage('恢复完成。进度、仓库、草稿和设置已替换，本机额外机型素材保留。')
      setFileName('')
    } catch (cause) {
      setError(errorMessage(cause))
    }
  }

  return (
    <main className="backup-screen">
      <section className="backup-content" aria-labelledby="backup-title" aria-busy={busy}>
        <header className="backup-heading">
          <div>
            <p className="phase-label">GUNDAMDORO / LOCAL ARCHIVE</p>
            <h1 id="backup-title">备份与恢复</h1>
          </div>
          <button
            type="button"
            className="secondary-button"
            autoFocus
            disabled={busy}
            onClick={close}
          >
            返回应用
          </button>
        </header>
        <p className="backup-note">
          仅保存在本地，不联网、不上传。文件未加密，请妥善保存，不要分享含私人记录或素材的备份。
        </p>
        <section className="backup-panel" aria-labelledby="backup-export-title">
          <h2 id="backup-export-title">导出完整备份</h2>
          <p>保存当前收集进度、永久配件、成品仓库、拼装草稿、设置，以及所有已导入机型和图片。</p>
          <p>内置素材由程序提供，不重复打包。完整备份最多 128 MiB、32 个用户机型。</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void saveFile()
            }}
          >
            导出完整备份
          </button>
        </section>
        <section className="backup-panel" aria-labelledby="backup-import-title">
          <h2 id="backup-import-title">选择备份并预览</h2>
          <p>选择 .gundamdoro 文件。完成格式、图片和完整性校验后，才允许确认恢复。</p>
          <label className="backup-file">
            选择备份文件
            <input
              type="file"
              accept=".gundamdoro"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                void readFile(file)
              }}
            />
          </label>
          {fileName && <p className="backup-file-name">已选择：{fileName}</p>}
          {plan && (
            <>
              <dl className="backup-summary">
                <div>
                  <dt>备份时间</dt>
                  <dd>{new Date(plan.summary.createdAt).toLocaleString('zh-CN')}</dd>
                </div>
                <div>
                  <dt>当前机型</dt>
                  <dd>{plan.summary.modelName}</dd>
                </div>
                <div>
                  <dt>本轮收集</dt>
                  <dd>
                    {plan.summary.collected} / {plan.summary.totalParts}
                  </dd>
                </div>
                <div>
                  <dt>永久配件记录</dt>
                  <dd>{plan.summary.ownedParts}</dd>
                </div>
                <div>
                  <dt>仓库成品</dt>
                  <dd>{plan.summary.builds}</dd>
                </div>
                <div>
                  <dt>用户机型</dt>
                  <dd>{plan.summary.userModels}</dd>
                </div>
              </dl>
              <div className="backup-warning">
                <strong>恢复会覆盖当前进度，不合并统计。</strong>
                <p>
                  当前收集、仓库、草稿和设置将替换为备份内容。机型素材只补充、不删除；同 ID
                  内容冲突会拒绝恢复。请先导出当前数据。
                </p>
                <label>
                  <input
                    type="checkbox"
                    checked={confirmed}
                    disabled={busy}
                    onChange={(event) => setConfirmed(event.target.checked)}
                  />
                  我已备份当前数据，确认覆盖进度和仓库
                </label>
              </div>
              <button
                type="button"
                disabled={busy || !confirmed}
                onClick={() => {
                  void restore()
                }}
              >
                确认恢复备份
              </button>
            </>
          )}
        </section>
        {busy && (
          <p className="backup-note" role="status">
            {operation === 'restoring'
              ? '正在补充素材并恢复进度，请勿关闭或刷新…'
              : '正在处理备份，请稍候…'}
          </p>
        )}
        {error && (
          <p className="backup-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="backup-success" role="status">
            {message}
          </p>
        )}
      </section>
    </main>
  )
}
