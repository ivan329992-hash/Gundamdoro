/** 【屏】启动加载 / 读档失败 Retry。在 App 挂载前由 main.tsx 显示。 */
interface StartupScreenProps {
  loading: boolean
  onRetry: () => void
}

export function StartupScreen({ loading, onRetry }: StartupScreenProps) {
  return (
    <main className="app-shell">
      <p className="eyebrow">GUNDAMDORO / MVP 0.1</p>
      <section
        className="hero-card startup-card"
        aria-labelledby="startup-title"
        aria-busy={loading}
      >
        <h1 id="startup-title">{loading ? '正在读取存档' : '暂时无法打开存档'}</h1>
        <p className="startup-message" role={loading ? 'status' : 'alert'}>
          {loading
            ? '正在恢复专注进度与仓库，请稍候。'
            : '本地存储可能不可用、存档无法解析，或需要更新的程序与机型资源。为保护已有进度，暂未进入应用。'}
        </p>
        {!loading && (
          <>
            <p className="startup-message">请检查存储权限和程序版本后重试。不要清除应用数据。</p>
            <button type="button" onClick={onRetry}>
              重新读取存档
            </button>
          </>
        )}
      </section>
    </main>
  )
}
