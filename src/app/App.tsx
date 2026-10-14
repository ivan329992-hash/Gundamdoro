/** 【UI·总调度】读 phase 决定渲染哪块屏；按钮只调 store actions，自己不改业务状态。 */
import { useRef, useState } from 'react'
import { AbandonBuildDialog } from '../components/Mecha/AbandonBuildDialog'
import { AssemblyScreen } from '../components/Mecha/AssemblyScreen'
import { BreakScreen } from '../components/Break/BreakScreen'
import { CompleteScreen } from '../components/Complete/CompleteScreen'
import { SettingsDialog } from '../components/Settings/SettingsDialog'
import { useTimerTick } from '../hooks/useTimerTick'
import { usePhaseTransitions } from '../hooks/usePhaseTransitions'
import { formatTime } from '../lib/timer'
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
import { CUSTOM_ASSEMBLY_ENABLED } from './features'
import { EstimatedEnd } from '../components/Timer/EstimatedEnd'
import { TimerExperienceTools, useTimerExperience } from '../components/Timer/TimerExperience'
import { prepareSound } from '../adapters/platform/reminders'
import { appDependencies } from './dependencies'
import { getPartDefinitions } from '../domain/inventory'

export function App() {
  const reminderError = useTimerExperience()
  useTimerTick()
  usePhaseTransitions()
  return <><TimerExperienceTools error={reminderError} /><AppContent /></>
}

function AppContent() {

  const phase = useAppStore((state) => state.phase)
  const timer = useAppStore((state) => state.timer)
  const currentStage = useAppStore((state) => state.assembly.currentStage)
  const mechaId = useAppStore((state) => state.assembly.mechaId)
  const canChangeModel = useAppStore(canSelectMecha)
  const selectMecha = useAppStore((state) => state.selectMecha)
  const settings = useAppStore((state) => state.settings)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [hangarOpen, setHangarOpen] = useState(false)
  const [modelsOpen, setModelsOpen] = useState(false)
  const [partsOpen, setPartsOpen] = useState(false)
  const [abandonOpen, setAbandonOpen] = useState(false)
  const resumeAfterCancel = useRef(false)
  const openAbandon = () => {
    const state = useAppStore.getState()
    resumeAfterCancel.current = state.phase === 'FOCUS' && state.timer.status === 'running'
    if (resumeAfterCancel.current) state.pauseTimer()
    resumeAfterCancel.current = resumeAfterCancel.current && useAppStore.getState().timer.status === 'paused'
    setAbandonOpen(true)
  }
  const abandonDialog = <AbandonBuildDialog open={abandonOpen}
    onCancel={() => {
      setAbandonOpen(false)
      if (resumeAfterCancel.current) useAppStore.getState().resumeTimer()
      resumeAfterCancel.current = false
    }}
    onConfirm={() => {
      useAppStore.getState().abandonBuild()
      resumeAfterCancel.current = false
      setAbandonOpen(false)
      if (canSelectMecha(useAppStore.getState())) setModelsOpen(true)
    }} />
  const ownedCount = useAppStore((state) => getPartDefinitions(appDependencies.catalog).filter((part) => state.unlockedParts.includes(part.id)).length)
  const prepareWorkbench = useAppStore((state) => state.prepareWorkbench)
  const openParts = () => { if (CUSTOM_ASSEMBLY_ENABLED) prepareWorkbench(); setPartsOpen(true) }
  const hangarCount = useAppStore((state) => groupHangar(state.hangar).length)
  const startFocus = useAppStore((state) => state.startFocus)
  const pauseTimer = useAppStore((state) => state.pauseTimer)
  const resumeTimer = useAppStore((state) => state.resumeTimer)
  const cancelTimer = useAppStore((state) => state.cancelTimer)
  const startAssembly = useAppStore((state) => state.startAssembly)
  const manifest = getMechaManifest(mechaId)
  const allPartsCollected = currentStage === manifest.totalStages
  const isActive = phase === 'FOCUS'
  const isPaused = timer.status === 'paused'
  const phaseLabel = phase === 'FOCUS' ? 'FOCUSING' : phase === 'READY' ? 'SYSTEM READY' : phase

  if (partsOpen && (phase === 'READY' || phase === 'COMPLETE')) {
    return <InventoryScreen onClose={() => setPartsOpen(false)} onOpenHangar={() => { setPartsOpen(false); setHangarOpen(true) }} />
  }

  if (hangarOpen && (phase === 'READY' || phase === 'COMPLETE')) {
    return <HangarScreen onClose={() => setHangarOpen(false)} />
  }

  if (modelsOpen && canChangeModel) {
    return <ModelSelectionScreen
      currentMechaId={mechaId}
      completed={phase === 'COMPLETE'}
      onClose={() => setModelsOpen(false)}
      onSelect={(id) => {
        selectMecha(id)
        setModelsOpen(false)
      }}
    />
  }

  if (phase === 'PART_REWARD') {
    return <><PartRewardScreen />{abandonDialog}</>
  }

  if (phase === 'ASSEMBLY') {
    return <AssemblyScreen />
  }

  if (phase === 'BREAK') {
    return <><BreakScreen onAbandonBuild={openAbandon} />{abandonDialog}</>
  }

  if (phase === 'COMPLETE') {
    return (
      <>
        <CompleteScreen onOpenSettings={() => setSettingsOpen(true)} onOpenHangar={() => setHangarOpen(true)} onOpenModels={() => setModelsOpen(true)} onOpenParts={openParts} />
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
        />
      </>
    )
  }

  return (
    <main className="app-shell">
      {abandonDialog}
      <p className="eyebrow">GUNDAMDORO / MVP 0.1</p>
      <section className={`hero-card${isActive ? ' focus-card' : ''}`} aria-labelledby="app-title">
        <div className={`status-dot${isActive ? ' is-active' : ''}`} aria-hidden="true" />
        <h1 id="app-title">{manifest.name}</h1>
        <p className="phase-label">{phaseLabel}</p>
        {isActive ? <FocusPartDisplay mechaId={mechaId} currentStage={currentStage} /> : <MechaDisplay mechaId={mechaId} currentStage={currentStage} />}
        <AssemblyProgress mechaId={mechaId} currentStage={currentStage} />
        {!allPartsCollected && <div className="timer-panel" aria-live="polite">
          <span className="timer-label">{isActive ? 'FOCUS TIMER' : 'SESSION TIMER'}</span>
          <strong className="timer-value">{formatTime(timer.remainingMs)}</strong>
          <EstimatedEnd timer={timer} />
        </div>}
        {phase === 'READY' && !allPartsCollected && <div className="quick-durations" aria-label="快捷专注时长">
          {[15, 25, 45].map((minutes) => <button key={minutes} type="button" className="secondary-button" aria-pressed={settings.focusMinutes === minutes} onClick={() => updateSettings({ focusMinutes: minutes })}>{minutes} 分钟</button>)}
        </div>}
        {phase === 'READY' && (allPartsCollected
          ? <button type="button" onClick={startAssembly}>开始拼装</button>
          : <button type="button" onClick={() => { void prepareSound(); startFocus() }}>START FOCUS</button>)}
        {isActive && (
          <div className="timer-controls focus-controls">
            <button type="button" onClick={() => { void prepareSound(); if (isPaused) resumeTimer(); else pauseTimer() }}>
              {isPaused ? '继续' : '暂停'}
            </button>
            <button type="button" className="secondary-button" onClick={cancelTimer}>
              取消本次
            </button>
            <button type="button" className="secondary-button" onClick={openAbandon}>放弃制作</button>
          </div>
        )}
        <p className="bootstrap-note">
          {isPaused ? 'Timer paused' : allPartsCollected ? 'All parts collected. Assemble whenever you are ready.' : 'Complete a focus session to collect the next part.'}
        </p>
        {phase === 'READY' && (
          <div className="ready-navigation">
            <button type="button" className="secondary-button" onClick={() => canChangeModel ? setModelsOpen(true) : openAbandon()}>{canChangeModel ? '选择机型' : '放弃并换机型'}</button>
            <button type="button" className="secondary-button" onClick={() => setSettingsOpen(true)}>SETTINGS</button>
            <button type="button" className="secondary-button" onClick={() => setHangarOpen(true)}>仓库（{hangarCount}）</button>
          </div>
        )}
        {phase === 'READY' && !canChangeModel && <p className="bootstrap-note">更换机型需确认放弃本轮进度，永久库存保留</p>}
        {phase === 'READY' && <button type="button" className="secondary-button workshop-entry" onClick={openParts}>{CUSTOM_ASSEMBLY_ENABLED ? '配件仓库与拼装' : '配件仓库'}（{ownedCount}）</button>}
      </section>
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
      />
    </main>
  )
}
