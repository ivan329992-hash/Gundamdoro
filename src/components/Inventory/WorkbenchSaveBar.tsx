import { useBottomBarSpace } from '../../hooks/useBottomBarSpace'
import { useAppStore } from '../../store/useAppStore'

interface WorkbenchSaveBarProps {
  complete: boolean
  missing: string[]
  canEdit: boolean
  canRandomize: boolean
  onOpenHangar: () => void
}

export function WorkbenchSaveBar({
  complete,
  missing,
  canEdit,
  canRandomize,
  onOpenHangar,
}: WorkbenchSaveBarProps) {
  const bar = useBottomBarSpace()
  const draft = useAppStore((state) => state.workbench)
  const archived = useAppStore((state) =>
    state.hangar.some((entry) => entry.id === state.workbench.id),
  )
  const status = useAppStore((state) => state.persistenceStatus)
  const save = useAppStore((state) => state.saveCustomBuild)
  const retry = useAppStore((state) => state.retryPersistence)
  const randomize = useAppStore((state) => state.randomizeWorkbench)
  const saved = archived && status === 'saved'
  const pending = archived && status === 'saving'

  let message = '搭配已完整，可保存到成品仓库。'
  if (!canEdit) message = '当前阶段暂不能保存。'
  else if (missing.length) message = `还需选择：${missing.join('、')}`
  else if (!complete) message = '部分配件未解锁或资源不可用，请重新选择。'
  else if (!draft.name.trim()) message = '请先填写机体名称。'
  else if (archived && status === 'error')
    message = '作品尚未保存到本机，请重试；成功前请勿关闭或刷新。'
  else if (pending) message = '正在保存到本机…'
  else if (saved) message = '机体已入库，修改搭配或名称可保存新作品。'

  let label = '保存到成品仓库'
  if (saved) label = '已保存到仓库'
  else if (pending) label = '正在保存…'
  else if (archived && status === 'error') label = '重试保存'

  return (
    <aside ref={bar} className="workbench-save-bar" aria-label="拼装保存">
      <div className="workbench-save-summary">
        <p id="workbench-save-status" className="workbench-status" role="status">
          {message}
        </p>
        {saved && (
          <button
            type="button"
            className="secondary-button open-hangar-button"
            onClick={onOpenHangar}
          >
            查看仓库
          </button>
        )}
      </div>
      <div className="workbench-actions">
        <button
          type="button"
          className="secondary-button"
          disabled={!canRandomize || !canEdit}
          onClick={randomize}
        >
          随机搭配
        </button>
        <button
          type="button"
          aria-describedby="workbench-save-status"
          disabled={!complete || !draft.name.trim() || saved || pending || !canEdit}
          onClick={archived ? retry : save}
        >
          {label}
        </button>
      </div>
    </aside>
  )
}
