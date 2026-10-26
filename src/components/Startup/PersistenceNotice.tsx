import { useEffect } from 'react'
import { useAppStore } from '../../store/useAppStore'

/** 所有页面共用的运行期保存失败提示，重试写入当前完整进度。 */
export function PersistenceNotice() {
  const status = useAppStore((state) => state.persistenceStatus)
  const retry = useAppStore((state) => state.retryPersistence)

  useEffect(() => {
    if (status === 'saved') return
    const confirmLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', confirmLeaving)
    return () => window.removeEventListener('beforeunload', confirmLeaving)
  }, [status])

  if (status !== 'error') return null

  return (
    <aside className="persistence-notice" role="alert" aria-label="进度尚未保存">
      <div>
        <strong>进度尚未保存到本机</strong>
        <p>当前进度仍在本次窗口中。请检查可用空间或存储权限，重试成功前请勿关闭或刷新。</p>
      </div>
      <button type="button" onClick={retry}>
        重试保存
      </button>
    </aside>
  )
}
