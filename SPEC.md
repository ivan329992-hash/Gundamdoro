# Gundamdoro MVP Specification

> Version: v0.1 MVP  
> Platform: Windows desktop  
> Status: Ready for development

## 1. Product goal

Gundamdoro combines a Pomodoro timer with staged mecha assembly.

Each completed focus session advances the current mecha by exactly one assembly stage. The MVP validates one question:

> Does seeing a mecha gradually assemble make the user want to start another focus session?

The first built-in mecha requires 6 completed focus sessions.

## 2. MVP scope

### Must have

- Windows desktop application
- 25-minute focus timer
- 5-minute break timer
- Pause / resume / cancel
- 6-stage mecha assembly
- Assembly transition after each completed focus session
- Break scene after non-final assembly stages
- Complete screen after stage 6
- Persistent local state
- Correct recovery after app restart
- Configurable focus and break duration
- Local-only assets
- Windows build artifact

### Explicit non-goals

Do not implement in v0.1:

- Accounts or authentication
- Backend services
- Cloud sync
- Database / SQLite
- Todo or task management
- Statistics dashboards
- Achievements / XP / leveling
- AI features
- Community / theme marketplace
- Mobile app
- Multi-device support
- Complex 3D, WebGL, Live2D, Spine, or skeletal animation
- Auto-update
- Multi-mecha collection / hangar

## 3. Fixed technology stack

Use:

- Tauri v2
- React
- TypeScript
- Vite
- Zustand
- Zustand Persist
- Framer Motion

Do not add React Router. The app is a single-window state-driven application.

Core product logic should remain in TypeScript. Rust is only for required Tauri desktop integration.

## 4. Main state machine

Allowed phases:

```ts
type AppPhase =
  | "READY"
  | "FOCUS"
  | "ASSEMBLY"
  | "BREAK"
  | "COMPLETE";
```

Allowed transitions:

```text
READY
  -> FOCUS
  -> ASSEMBLY
       -> BREAK -> READY
       -> COMPLETE
```

Rules:

- READY -> FOCUS only when the user starts a focus session.
- FOCUS -> ASSEMBLY only when the focus timer completes.
- ASSEMBLY -> BREAK when currentStage < totalStages.
- ASSEMBLY -> COMPLETE when currentStage === totalStages.
- BREAK -> READY when the break timer completes.
- Break completion must never auto-start a new focus session.

UI components must not mutate phase directly. State transitions must happen through Zustand actions.

## 5. Timer design

Default durations:

- Focus: 25 minutes
- Break: 5 minutes

Settings ranges:

- Focus: 1-120 minutes
- Break: 1-60 minutes

A hidden development fast mode may use seconds for testing.

### Important implementation rule

Do not use decrementing `setInterval` as the source of truth.

Use timestamps:

```ts
interface TimerState {
  status: "idle" | "running" | "paused";
  durationMs: number;
  remainingMs: number;
  startedAt: number | null;
  endAt: number | null;
  sessionId: string | null;
}
```

When running:

```ts
remainingMs = Math.max(0, endAt - Date.now());
```

The UI may refresh every 250-1000 ms, but timestamps determine actual remaining time.

### Pause

On pause:

```ts
remainingMs = endAt - Date.now();
status = "paused";
endAt = null;
```

### Resume

On resume:

```ts
endAt = Date.now() + remainingMs;
status = "running";
```

## 6. Idempotent focus completion

Every focus session gets:

```ts
sessionId = crypto.randomUUID();
```

Persist:

```ts
lastProcessedFocusSessionId: string | null;
```

Before processing a completed focus session:

```ts
if (sessionId === lastProcessedFocusSessionId) return;
```

Only after this check may the app increment the assembly stage.

This prevents duplicate progress after rerenders, restart recovery, duplicated callbacks, or sleep/wake behavior.

## 7. Persistence and recovery

Use Zustand Persist with localStorage.

Persist at minimum:

- phase
- timer state
- assembly state
- settings
- lastProcessedFocusSessionId

On app startup run `recoverState()`.

If a persisted running timer has `endAt > Date.now()`, continue it.

If a persisted running focus timer has expired while the app was closed:

1. Treat it as completed.
2. Run the same idempotent completion path.
3. Advance the mecha at most once.
4. Enter ASSEMBLY.

Corrupt persisted state must not cause a white screen. Fall back to safe defaults.

## 8. Mecha model

MVP contains one built-in demo mecha:

```text
id: mecha-01
totalStages: 6
```

Suggested stages:

1. TORSO
2. HEAD
3. LEFT ARM
4. RIGHT ARM
5. LEG UNIT
6. FINAL ASSEMBLY

Stage names must come from a manifest, not be hard-coded into screens.

Example:

```json
{
  "id": "mecha-01",
  "name": "MECHA-01",
  "totalStages": 6,
  "stages": [
    { "stage": 1, "name": "TORSO" },
    { "stage": 2, "name": "HEAD" },
    { "stage": 3, "name": "LEFT ARM" },
    { "stage": 4, "name": "RIGHT ARM" },
    { "stage": 5, "name": "LEG UNIT" },
    { "stage": 6, "name": "FINAL ASSEMBLY" }
  ]
}
```

## 9. Asset structure

```text
src/assets/mecha/mecha-01/
  stages/
    stage-01.png
    stage-02.png
    stage-03.png
    stage-04.png
    stage-05.png
    stage-06.png
  break/
    break-01.png

src/mecha/mecha-01/
  manifest.json
```

Stage assets must be:

- PNG
- Transparent background
- Same canvas size
- Same visual scale
- Same visual center
- Same bottom anchor

Target canvas: 1080 x 1440.

Prefer:

```css
object-fit: contain;
object-position: center bottom;
```

Do not fix inconsistent source images with per-stage magic offsets in React components. Normalize assets instead.

## 10. Assembly animation

MVP animation uses static stage PNGs plus Framer Motion.

Do not implement frame-by-frame animation or 3D.

Target duration: roughly 3-6 seconds.

Suggested sequence:

1. Focus reaches 00:00.
2. Background dims.
3. Show `ASSEMBLY SEQUENCE`.
4. Render previous stage.
5. Fade/scale next stage in.
6. Brief shake / flash.
7. Show part name + `ASSEMBLY COMPLETE`.
8. Transition to BREAK or COMPLETE.

Primary goal:

> The user should clearly feel that a new part was installed.

Animation failure must never corrupt timer or assembly progress.

## 11. Screens

### READY

Show:

- MECHA-01
- Current stage
- Progress X / 6
- Next part
- Start Focus button
- Settings entry

### FOCUS

Show:

- Timer
- FOCUSING label
- Current mecha stage
- Progress
- Next part
- Pause / Resume
- Cancel

Focus mode should be visually quiet. Avoid distracting continuous animation.

### ASSEMBLY

Show the assembly transition only.

### BREAK

Show:

- break-01.png
- Break timer
- NEXT part

Break starts automatically after non-final assembly animation.

### COMPLETE

Show:

- Full mecha
- MECHA COMPLETE
- Completed focus count
- Total focused minutes
- BUILD AGAIN

BUILD AGAIN resets mecha progress and completed session count, but preserves settings.

## 12. Settings

MVP settings only:

- Focus duration
- Break duration

Settings may only be changed in READY or COMPLETE.

Changes apply to the next timer, not a currently running timer.

## 13. Desktop behavior

Initial window target:

- 480 x 720
- Minimum approximately 420 x 640
- Resizable

Windows notification is desirable:

Focus completion:
```text
MECHA-01
RIGHT ARM ASSEMBLY COMPLETE
```

Break completion:
```text
BREAK COMPLETE
Ready for next assembly.
```

Notification support is lower priority than the core loop.

Not required in v0.1:

- System tray
- Always on top
- Mini mode
- Global hotkeys
- Start on boot

## 14. Suggested store

```ts
interface AppState {
  phase: AppPhase;

  timer: {
    status: "idle" | "running" | "paused";
    durationMs: number;
    remainingMs: number;
    startedAt: number | null;
    endAt: number | null;
    sessionId: string | null;
  };

  assembly: {
    mechaId: string;
    currentStage: number;
    totalStages: number;
    completedFocusSessions: number;
  };

  settings: {
    focusMinutes: number;
    breakMinutes: number;
  };

  lastProcessedFocusSessionId: string | null;
}
```

Required actions:

```text
startFocus
pauseTimer
resumeTimer
cancelTimer
completeFocus
startBreak
completeBreak
finishAssemblyAnimation
resetMecha
updateSettings
recoverState
```

## 15. Suggested project structure

```text
src/
  app/
    App.tsx
    AppShell.tsx

  components/
    Timer/
      Timer.tsx
      TimerControls.tsx
    Mecha/
      MechaDisplay.tsx
      AssemblyProgress.tsx
      AssemblyAnimation.tsx
    Settings/
      SettingsDialog.tsx

  screens/
    ReadyScreen.tsx
    FocusScreen.tsx
    AssemblyScreen.tsx
    BreakScreen.tsx
    CompleteScreen.tsx

  store/
    useAppStore.ts

  hooks/
    useTimerTick.ts

  mecha/
    types.ts
    loader.ts
    mecha-01/
      manifest.json

  assets/
    mecha/
      mecha-01/
        stages/
        break/

  lib/
    timer.ts
    formatTime.ts

  styles/
    global.css

  main.tsx

src-tauri/
README.md
SPEC.md
AGENTS.md
```

## 16. Error handling

- Asset failure: show `MECHA ASSET ERROR` and Retry; do not lose timer state.
- Corrupt persisted data: recover to safe defaults rather than crash.
- Clamp stage to `0..totalStages`.
- Never allow Stage 7 / 6.
- The app must remain usable offline.
- No telemetry, remote API, CDN asset, or remote font dependency.

## 17. Public repository asset boundary

Do not include unlicensed official Gundam/Bandai/Sunrise imagery, logos, animation screenshots, or scanned manuals.

The public demo should use original generated mecha assets.

The code may later support user-supplied local themes, but theme-import UI is not part of v0.1.

## 18. Acceptance tests

### TC-01 Start Focus
READY -> Start -> FOCUS and timer runs.

### TC-02 Pause
Remaining time freezes while paused.

### TC-03 Resume
Timer resumes from saved remaining time.

### TC-04 Focus Complete
A completed focus changes FOCUS -> ASSEMBLY and advances exactly one stage.

### TC-05 Assembly Complete
If not final stage, animation completion enters BREAK and starts break timer.

### TC-06 Break Complete
BREAK -> READY. Do not auto-start focus.

### TC-07 Final Assembly
Stage 5 focus completion -> Stage 6 -> ASSEMBLY -> COMPLETE. No break.

### TC-08 Restart During Focus
Restart app before endAt. Remaining time is reconstructed correctly.

### TC-09 Restart After Expiry
Restart after focus endAt. Progress advances exactly once and enters ASSEMBLY.

### TC-10 Build Again
From COMPLETE, BUILD AGAIN resets assembly/session progress but preserves settings.

## 19. Development phases

### Phase 0 — Bootstrap
- Tauri v2 + Vite + React + TypeScript
- Install Zustand and Framer Motion
- Base project structure
- Dark app shell
- Confirm `tauri dev`

### Phase 1 — Timer engine
- Timestamp timer
- Start / pause / resume / cancel
- Timer UI
- Formatting utilities

### Phase 2 — State machine and persistence
- AppPhase
- Store actions
- Session idempotency
- Zustand Persist
- Recovery after restart

### Phase 3 — Mecha system
- Manifest
- Loader
- Assembly state
- Stage image selection
- Progress and next-part UI

### Phase 4 — Asset preparation
- Add and normalize 6 stage PNGs
- Add break scene
- Verify consistent anchors

### Phase 5 — Assembly animation
- AssemblyScreen
- Previous/next stage layering
- Fade/scale/shake/flash
- Automatic BREAK / COMPLETE transition

### Phase 6 — Break and completion
- BreakScreen
- Break timer flow
- CompleteScreen
- Build Again

### Phase 7 — Settings
- Focus and break duration
- Validation
- Lock during active timer

### Phase 8 — Tauri integration
- Window configuration
- Optional notifications
- App icon
- Production build

### Phase 9 — QA
- Run TC-01 through TC-10
- Test restart/recovery
- Test sleep/wake behavior where practical
- TypeScript check
- Build
- Tag v0.1.0 when complete

## 20. v0.1 Definition of Done

All of the following must be true:

- Windows desktop app launches.
- READY -> FOCUS works.
- Timer uses timestamps and behaves correctly.
- Pause / resume / cancel work.
- Restart recovery works.
- Focus completion is idempotent.
- Every completed focus advances exactly one stage.
- Assembly animation visibly communicates installation.
- Non-final assembly enters break.
- Break ends at READY.
- Sixth focus produces COMPLETE.
- Build Again works.
- State persists.
- App works offline.
- TypeScript build passes.
- Tauri production build passes.

Do not mark v0.1 complete until all above conditions are met.

## 21. Later candidates — not v0.1

Potential v0.2+ ideas only:

- System tray
- Always on top
- Mini mode
- Multiple mecha
- Theme packs/import
- Better part-fly-in animation
- Sound effects
- Hangar / collection
- Focus history
- Statistics
