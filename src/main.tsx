/** 【入口】启动顺序：StartupScreen → 水合+recover → 渲染 App。失败只显示 Retry，不覆盖存档。 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import { App } from './app/App'
import { useAppStore } from './store/useAppStore'
import { initializeAppStore } from './store/createAppStore'
import { StartupScreen } from './components/Startup/StartupScreen'
import { isMiniWindow } from './adapters/platform/miniWindow'
import { MiniTimerWindow } from './components/Timer/MiniTimer'

const root = createRoot(document.getElementById('root')!)
let starting = false

async function startApp() {
  if (starting) return
  starting = true
  root.render(<StartupScreen loading onRetry={() => { void startApp() }} />)
  try {
    await initializeAppStore(useAppStore)
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  } catch {
    root.render(<StartupScreen loading={false} onRetry={() => { void startApp() }} />)
  } finally {
    starting = false
  }
}

if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('assembly-lab')) {
  void import('./dev/AssemblyLab').then(({ default: AssemblyLab }) => root.render(<AssemblyLab />))
} else if (isMiniWindow()) root.render(<MiniTimerWindow />)
else void startApp()
