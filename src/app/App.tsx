/**
 * 应用主界面：根据业务阶段渲染页面，并管理弹窗与视图切换。
 * 业务状态变更统一通过 store actions 执行，组件仅维护临时界面状态。
 */
import { useRef, useState } from 'react'
import { AbandonBuildDialog } from '../components/Mecha/AbandonBuildDialog'
import { AssemblyScreen } from '../components/Mecha/AssemblyScreen'
import { BreakScreen } from '../components/Break/BreakScreen'
import { CompleteScreen } from '../components/Complete/CompleteScreen'
import { SettingsDialog } from '../components/Settings/SettingsDialog'
import { useTimerTick } from '../hooks/useTimerTick'
import { usePhaseTransitions } from '../hooks/usePhaseTransitions'
import { formatTime } from '../domain/timer'
import { AssemblyProgress } from '../components/Mecha/AssemblyProgress'
import { MechaDisplay } from '../components/Mecha/MechaDisplay'
import { FocusPartDisplay } from '../components/Mecha/FocusPartDisplay'
import { PartRewardScreen } from '../components/Mecha/PartRewardScreen'
import { HangarScreen } from '../components/Hangar/HangarScreen'
import { groupHangar } from '../domain/hangar'
import { getMechaManifest } from '../mecha/loader'
import { useAppStore } from '../store/useAppStore'
import { canSelectMecha } from '../domain/collection'
import { ModelSelectionScreen } from '../components/Mecha/ModelSelectionScreen'
import { InventoryScreen } from '../components/Inventory/InventoryScreen'
import { EstimatedEnd } from '../components/Timer/EstimatedEnd'
import { FocusDurationPicker } from '../components/Timer/FocusDurationPicker'
import { TimerExperienceTools } from '../components/Timer/TimerExperience'
import { useTimerExperience } from '../hooks/useTimerExperience'
import { prepareSound } from '../adapters/platform/reminders'
import { appDependencies } from './dependencies'
import { getPartDefinitions } from '../domain/inventory'
import { PersistenceNotice } from '../components/Startup/PersistenceNotice'
import { BackupScreen } from '../components/Settings/BackupScreen'
import { CUSTOM_ASSEMBLY_ENABLED, PARTS_ENTRY_LABEL, visibleHangarEntries } from './features'

export function App() {
  const reminderError = useTimerExperience()
  useTimerTick()
  usePhaseTransitions()
  return (
    <>
      <PersistenceNotice />
      <TimerExperienceTools error={reminderError} />
      <AppContent />
    </>
  )
}

/**
 * 主体视图：优先显示用户打开的仓库、工作台或选型页，否则按业务阶段显示对应页面。
 * 页面开关属于临时界面状态，不改变计时阶段；计时、收集和归档通过 store actions 执行。
 * 扩展辅助页面时增加视图开关与渲染分支；新增业务阶段或规则时需同步调整领域类型和应用用例。
 * 计时刷新、阶段完成调度和提醒由外层 App 的 Hooks 接入，不在此处重复注册。
 */
function AppContent() {
  // 按需订阅业务状态：currentStage 是已收集数量，mechaId 决定当前模型的资源和配件清单。
  const phase = useAppStore((state) => state.phase)
  const timer = useAppStore((state) => state.timer)
  const currentStage = useAppStore((state) => state.assembly.currentStage)
  const mechaId = useAppStore((state) => state.assembly.mechaId)
  // 直接换型仅允许在 COMPLETE 或尚未收集配件的 READY；已有进度时必须先确认放弃。
  const canChangeModel = useAppStore(canSelectMecha)
  const selectMecha = useAppStore((state) => state.selectMecha)
  const settings = useAppStore((state) => state.settings)
  const updateSettings = useAppStore((state) => state.updateSettings)
  // 这些开关只控制当前窗口的页面和弹窗，不写入业务存档，也不新增业务阶段。
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [backupOpen, setBackupOpen] = useState(false)
  const [hangarOpen, setHangarOpen] = useState(false)
  const [modelsOpen, setModelsOpen] = useState(false)
  const [partsOpen, setPartsOpen] = useState(false)
  const [abandonOpen, setAbandonOpen] = useState(false)
  // 记录确认框是否暂停了原本运行中的专注；取消时不能误启动原本已暂停的计时。
  const resumeAfterCancel = useRef(false)
  const openAbandon = () => {
    // 事件发生时读取最新状态，避免使用渲染时的旧快照处理计时到期边界。
    const state = useAppStore.getState()
    resumeAfterCancel.current = state.phase === 'FOCUS' && state.timer.status === 'running'
    if (resumeAfterCancel.current) state.pauseTimer()
    // 暂停动作也可能处理已到期计时，只有实际进入 paused 才允许取消确认后恢复。
    resumeAfterCancel.current =
      resumeAfterCancel.current && useAppStore.getState().timer.status === 'paused'
    setAbandonOpen(true)
  }
  // READY、FOCUS、BREAK 共用确认框；PART_REWARD 也保留它以处理打开确认框时恰好到期的情况。
  const abandonDialog = (
    <AbandonBuildDialog
      open={abandonOpen}
      onCancel={() => {
        // 取消只关闭确认框，并按需恢复专注，不清空本轮进度。
        setAbandonOpen(false)
        if (resumeAfterCancel.current) useAppStore.getState().resumeTimer()
        resumeAfterCancel.current = false
      }}
      onConfirm={() => {
        // 放弃动作负责重置本轮并保留永久配件、仓库、设置和草稿；成功允许换型后才显示选型页。
        useAppStore.getState().abandonBuild()
        resumeAfterCancel.current = false
        setAbandonOpen(false)
        if (canSelectMecha(useAppStore.getState())) setModelsOpen(true)
      }}
    />
  )
  // 入口数量从存档派生：配件按当前目录中已解锁的种类计数，成品按分组卡片计数，不是历史制作总次数。
  const ownedCount = useAppStore(
    (state) =>
      getPartDefinitions(appDependencies.catalog).filter((part) =>
        state.unlockedParts.includes(part.id),
      ).length,
  )
  const prepareWorkbench = useAppStore((state) => state.prepareWorkbench)
  // 先通过用例准备工作台草稿，再打开配件页；此操作不发放配件或保存成品。
  const openParts = () => {
    if (CUSTOM_ASSEMBLY_ENABLED) prepareWorkbench()
    setPartsOpen(true)
  }
  const hangarCount = useAppStore((state) => groupHangar(visibleHangarEntries(state.hangar)).length)
  // 交互统一调用 store 动作；可否执行、阶段切换和持久化由 store 及应用用例处理。
  const startFocus = useAppStore((state) => state.startFocus)
  const pauseTimer = useAppStore((state) => state.pauseTimer)
  const resumeTimer = useAppStore((state) => state.resumeTimer)
  const cancelTimer = useAppStore((state) => state.cancelTimer)
  const startAssembly = useAppStore((state) => state.startAssembly)
  // 从模型清单派生显示条件，专注次数随模型配件数变化，不在界面写死。
  const manifest = getMechaManifest(mechaId)
  const allPartsCollected = currentStage === manifest.totalStages
  const isActive = phase === 'FOCUS'
  const isPaused = timer.status === 'paused'
  const phaseLabel = phase === 'FOCUS' ? 'FOCUSING' : phase === 'READY' ? 'SYSTEM READY' : phase
  // READY/FOCUS 主视图与 COMPLETE 分支复用设置弹窗；保存走 updateSettings，其用例限制可编辑阶段。
  const settingsDialog = (
    <SettingsDialog
      open={settingsOpen}
      focusMinutes={settings.focusMinutes}
      breakMinutes={settings.breakMinutes}
      preferences={settings}
      onSave={(focusMinutes, breakMinutes, preferences) => {
        updateSettings({ focusMinutes, breakMinutes, ...preferences })
        setSettingsOpen(false)
      }}
      onClose={() => setSettingsOpen(false)}
      onOpenBackup={() => {
        setSettingsOpen(false)
        setBackupOpen(true)
      }}
    />
  )

  // 辅助页面优先于阶段页面，以下 return 顺序决定显示优先级；打开它们不暂停或切换业务阶段。
  if (backupOpen && (phase === 'READY' || phase === 'COMPLETE')) {
    return <BackupScreen onClose={() => setBackupOpen(false)} />
  }
  // 配件仓库与工作台仅在 READY/COMPLETE 可显示，保存后的仓库快捷入口关闭工作台再打开成品仓库。
  if (partsOpen && (phase === 'READY' || phase === 'COMPLETE')) {
    return (
      <InventoryScreen
        onClose={() => setPartsOpen(false)}
        onOpenHangar={() => {
          setPartsOpen(false)
          setHangarOpen(true)
        }}
      />
    )
  }

  // 成品仓库及其详情由 HangarScreen 管理，返回时仅关闭视图，保留当前制作状态。
  if (hangarOpen && (phase === 'READY' || phase === 'COMPLETE')) {
    return <HangarScreen onClose={() => setHangarOpen(false)} />
  }

  // 选型页受领域规则保护；选择后由 selectMecha 开始对应模型的新一轮制作，再返回主视图。
  if (modelsOpen && canChangeModel) {
    return (
      <ModelSelectionScreen
        currentMechaId={mechaId}
        completed={phase === 'COMPLETE'}
        onClose={() => setModelsOpen(false)}
        onSelect={(id) => {
          selectMecha(id)
          setModelsOpen(false)
        }}
      />
    )
  }

  // 奖励页展示刚获得的独立配件；展示结束后的阶段切换由外层 usePhaseTransitions 调度。
  if (phase === 'PART_REWARD') {
    return (
      <>
        <PartRewardScreen />
        {abandonDialog}
      </>
    )
  }

  // 最终拼装只能由集齐后的用户点击启动，动画完成动作负责归档，不增加专注次数。
  if (phase === 'ASSEMBLY') {
    return <AssemblyScreen />
  }

  // 休息页提供倒计时、结束休息与放弃制作；正常结束休息后返回 READY，不自动开始专注。
  if (phase === 'BREAK') {
    return (
      <>
        <BreakScreen onAbandonBuild={openAbandon} />
        {abandonDialog}
      </>
    )
  }

  // 完成页提供重新制作和各辅助入口；这些回调只控制导航，具体业务动作由对应组件调用。
  if (phase === 'COMPLETE') {
    return (
      <>
        <CompleteScreen
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenHangar={() => setHangarOpen(true)}
          onOpenModels={() => setModelsOpen(true)}
          onOpenParts={openParts}
        />
        {settingsDialog}
      </>
    )
  }

  // 其余已定义阶段为 READY/FOCUS，共用主布局；新增业务阶段时应先补齐上面的专用分支。
  return (
    <main className="app-shell">
      {abandonDialog}
      <p className="eyebrow">GUNDAMDORO / MVP 0.1</p>
      <section
        className={`hero-card${isActive ? ' focus-card' : ' ready-card'}`}
        aria-labelledby="app-title"
      >
        <div className={`status-dot${isActive ? ' is-active' : ''}`} aria-hidden="true" />
        <h1 id="app-title">{manifest.name}</h1>
        <p className="phase-label">{phaseLabel}</p>
        {/* 专注中仅预览本次目标配件；待机的配件概览放在主操作之后，避免把开始按钮挤出首屏。 */}
        {isActive && <FocusPartDisplay mechaId={mechaId} currentStage={currentStage} />}
        <AssemblyProgress mechaId={mechaId} currentStage={currentStage} />
        {/* 集齐后隐藏计时区域，等待手动拼装；剩余时间来自 store，预计结束时间由时间戳推导。 */}
        {!allPartsCollected && (
          <div className="timer-panel" aria-live="polite">
            <span className="timer-label">{isActive ? 'FOCUS TIMER' : 'SESSION TIMER'}</span>
            <strong className="timer-value">{formatTime(timer.remainingMs)}</strong>
            <EstimatedEnd timer={timer} />
          </div>
        )}
        {/* 快捷时长仅在待机且尚未集齐时显示，更新下次专注配置，不修改已启动计时的时长。 */}
        {phase === 'READY' && !allPartsCollected && (
          <FocusDurationPicker
            minutes={settings.focusMinutes}
            onChange={(focusMinutes) => updateSettings({ focusMinutes })}
          />
        )}
        {/* 待机主按钮按收集状态切换为开始专注或拼装；开始专注时利用用户点击预先解锁音频播放。 */}
        {phase === 'READY' &&
          (allPartsCollected ? (
            <button type="button" onClick={startAssembly}>
              开始拼装
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                void prepareSound()
                startFocus()
              }}
            >
              开始专注
            </button>
          ))}
        {/* “取消本次”保留本轮已收集配件；“放弃制作”需二次确认并重置整轮收集。 */}
        {isActive && (
          <div className="timer-controls focus-controls">
            <button
              type="button"
              onClick={() => {
                void prepareSound()
                if (isPaused) resumeTimer()
                else pauseTimer()
              }}
            >
              {isPaused ? '继续' : '暂停'}
            </button>
            <button type="button" className="secondary-button" onClick={cancelTimer}>
              取消本次
            </button>
            <button type="button" className="secondary-button" onClick={openAbandon}>
              放弃制作
            </button>
          </div>
        )}
        <p className="bootstrap-note">
          {isPaused
            ? '计时已暂停，继续后重新计算结束时间。'
            : allPartsCollected
              ? '配件已集齐，准备好后即可开始拼装。'
              : '完成一次专注，解锁下一件配件。'}
        </p>
        {phase === 'READY' && (
          <section className="ready-collection" aria-label="本轮配件收集">
            <div className="collection-heading">
              <span>本轮配件</span>
              <span>
                {currentStage} / {manifest.totalStages}
              </span>
            </div>
            <div
              className="collection-scroll"
              role="region"
              aria-label="配件概览，可滚动查看"
              tabIndex={0}
            >
              <MechaDisplay mechaId={mechaId} currentStage={currentStage} />
            </div>
          </section>
        )}
        {/* 待机导航不改变业务阶段；已有收集进度时，“换机型”必须经过放弃确认。 */}
        {phase === 'READY' && (
          <div className="ready-navigation">
            <button
              type="button"
              className="secondary-button"
              onClick={() => (canChangeModel ? setModelsOpen(true) : openAbandon())}
            >
              {canChangeModel ? '选择机型' : '放弃并换机型'}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setSettingsOpen(true)}
            >
              设置
            </button>
            <button type="button" className="secondary-button" onClick={() => setHangarOpen(true)}>
              仓库（{hangarCount}）
            </button>
          </div>
        )}
        {phase === 'READY' && !canChangeModel && (
          <p className="bootstrap-note">更换机型需确认放弃本轮进度，永久库存保留</p>
        )}
        {phase === 'READY' && (
          <button type="button" className="secondary-button workshop-entry" onClick={openParts}>
            {PARTS_ENTRY_LABEL}（{ownedCount}）
          </button>
        )}
      </section>
      {/* 与完成页复用同一份弹窗定义，避免设置字段和保存逻辑出现两套实现。 */}
      {settingsDialog}
    </main>
  )
}
