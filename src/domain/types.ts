/** 【领域·字典】全应用共享类型：相位、机甲清单、机库记录、AppData/AppActions。先读这个文件。 */
import type { TimerState } from './timer'
import type { UserModelDraft } from './userModels'

export type AppPhase = 'READY' | 'FOCUS' | 'PART_REWARD' | 'ASSEMBLY' | 'BREAK' | 'COMPLETE'

export type LegacyPartSlot = 'torso' | 'head' | 'left-arm' | 'right-arm' | 'legs'
export type ModularPartSlot = Exclude<LegacyPartSlot, 'legs'> | 'hips' | 'left-leg' | 'right-leg'
export type PartSlot = LegacyPartSlot | ModularPartSlot | 'wings'
export type DraftComposition = Partial<Record<PartSlot, string>>
export type Composition = DraftComposition & (Record<LegacyPartSlot, string> | Record<ModularPartSlot, string>)

export interface WorkbenchDraft {
  id: string | null
  name: string
  parts: DraftComposition
}

export interface PartDefinition {
  id: string
  mechaId: string
  mechaName: string
  stage: number
  slot?: PartSlot
  name: string
  asset: string
}

export interface MechaStage {
  stage: number
  name: string
  asset: string
  slot?: PartSlot
  partId?: string
}

export interface MechaManifest {
  id: string
  name: string
  description?: string
  totalStages: number
  stages: MechaStage[]
  finalAsset: string
  legacyParts?: (MechaStage & { splitInto: string[]; splitBeforeVersion?: number })[]
}

export interface BuiltMecha {
  id: string
  mechaId: string
  mechaName: string
  completedAt: number | null
  completedFocusSessions: number
  totalFocusedMinutes: number
  kind?: 'custom'
  composition?: Composition
  assemblyProfile?: string
}

export interface Settings {
  focusMinutes: number
  breakMinutes: number
  soundEnabled?: boolean
  notificationsEnabled?: boolean
  miniTimerEnabled?: boolean
}

export interface AssemblyState {
  mechaId: string
  currentStage: number
  totalStages: number
  completedFocusSessions: number
}

export interface AppData {
  phase: AppPhase
  timer: TimerState
  assembly: AssemblyState
  totalFocusedMinutes: number
  settings: Settings
  lastProcessedFocusSessionId: string | null
  hangar: BuiltMecha[]
  currentBuildId: string | null
  unlockedParts: string[]
  workbench: WorkbenchDraft
}

export interface AppActions {
  importModel: (draft: UserModelDraft) => Promise<string>
  selectMecha: (mechaId: string) => void
  startFocus: (now?: number) => void
  pauseTimer: (now?: number) => void
  resumeTimer: (now?: number) => void
  cancelTimer: () => void
  abandonBuild: () => void
  completeFocus: (sessionId: string, now?: number) => void
  completeBreak: (now?: number) => void
  endBreak: () => void
  finishPartReveal: (now?: number) => void
  startAssembly: () => void
  finishAssemblyAnimation: (now?: number) => void
  resetMecha: () => void
  updateSettings: (settings: Partial<Settings>) => void
  recoverState: (now?: number) => void
  syncTimer: (now?: number) => void
  prepareWorkbench: () => void
  selectWorkbenchPart: (slot: PartSlot, partId: string) => void
  clearWorkbenchPart: (slot: PartSlot) => void
  setWorkbenchName: (name: string) => void
  randomizeWorkbench: () => void
  saveCustomBuild: () => void
}

export type AppState = AppData & AppActions
