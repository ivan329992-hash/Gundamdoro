# Gundamdoro MVP Specification

> Version: v0.1 MVP + approved hangar, multiple-model and inventory extensions; limited compatible assembly
> Platform: Windows desktop  
> Status: Ready for development

## 1. Product goal

Gundamdoro combines a Pomodoro timer with collecting mecha parts and a user-triggered final assembly.

Each completed focus session unlocks exactly one independent part. The MVP validates one question:

> Does collecting visible mecha parts make the user want to start another focus session?

The first built-in mecha requires 5 completed focus sessions. After collecting all parts, the user clicks Assemble whenever ready; final assembly requires no additional focus session.

Every finished build is automatically saved as a distinct local hangar record. Build Again starts a new collection while retaining all previously completed builds. The hangar is keyed by model ID so future models can use the same storage and display flow.

## 2. MVP scope

### Must have

- Windows desktop application
- 25-minute focus timer
- 5-minute break timer
- Pause / resume / cancel
- Model-specific independent collectible parts in persistent display slots; N parts require N focus sessions
- Part reveal after each completed focus session
- Break scene after each non-final part reveal, with End Break
- Manual final assembly and Complete screen after collecting all of the selected model's parts
- Persistent local state
- Correct recovery after app restart
- Configurable focus and break duration
- Local-only assets
- Windows build artifact
- Persistent local hangar of completed builds, accessible from READY and COMPLETE
- Selection between six original built-in mecha and one user-supplied unofficial fan-art model, with model-specific parts and final images

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
- External model-import UI (future work)

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
  | "PART_REWARD"
  | "ASSEMBLY"
  | "BREAK"
  | "COMPLETE";
```

Allowed transitions:

```text
READY -> FOCUS -> PART_REWARD
                   -> BREAK -> READY (parts 1 through N-1)
                   -> READY (part N; collection complete)
READY (all parts collected) -> click Assemble -> ASSEMBLY -> COMPLETE
```

Rules:

- READY -> FOCUS only when the user starts a focus session and there are uncollected parts.
- FOCUS -> PART_REWARD only when the focus timer completes; show the newly collected detached part.
- PART_REWARD -> BREAK while parts remain. The final reveal returns to READY with Assemble enabled, without a break.
- READY -> ASSEMBLY only through the user's Assemble click after all N parts are collected. ASSEMBLY -> COMPLETE after final animation.
- BREAK -> READY when the timer completes or the user clicks End Break. Preserve parts and focus totals.
- Break completion must never auto-start a new focus session.
- Manual assembly must not increment completed sessions, collected parts, or focused minutes.
- ASSEMBLY -> COMPLETE atomically archives this build once, using its persistent `currentBuildId`.
- The hangar is a separate read-only view available in READY/COMPLETE, not a timer phase. Opening or closing it does not change product state.

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

### Timer completion ownership

When a running timer has `endAt <= Date.now()`, the timer tick or startup recovery must call the corresponding completion action with the timer's `sessionId` when the timer is a focus timer. The completion action owns the state transition; UI components must not mutate `phase` directly.

The same completion path is used for live expiry and restart recovery. Repeated calls are safe because `completeFocus` is idempotent by `sessionId`.

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

Only after this check may the app increment the collected-part count (`assembly.currentStage`).

This prevents duplicate progress after rerenders, restart recovery, duplicated callbacks, or sleep/wake behavior.

`completeFocus(sessionId)` must atomically perform these operations after the idempotency check:

1. Set `lastProcessedFocusSessionId` to `sessionId`.
2. Increase `assembly.currentStage` by one, capped at the selected model's collectible count (`totalStages`).
3. Increase `assembly.completedFocusSessions` by one.
4. Add the session's captured `timer.durationMs / 60000` to `totalFocusedMinutes`.
5. Clear the expired timer and enter PART_REWARD.

The action must ignore a null, unknown, or already processed `sessionId`. Canceling a session must never call `completeFocus`.

## 7. Persistence and recovery

Use Zustand Persist with localStorage.

Persist at minimum:

- phase
- timer state
- assembly state
- total focused minutes
- settings
- lastProcessedFocusSessionId
- hangar records and currentBuildId

On app startup, before rendering the normal application content, run `recoverState()` once after persisted data has been successfully parsed and validated. Invalid or incomplete fields in a readable snapshot must be normalized to safe defaults rather than passed to screens. Await startup recovery writes before entering the normal UI.

If a persisted running timer has `endAt > Date.now()`, continue it.

If a persisted running focus timer has expired while the app was closed:

1. Treat it as completed.
2. Run the same idempotent completion path.
3. Advance the mecha at most once.
4. Enter PART_REWARD.

If a persisted running break timer has expired, complete the break and enter READY. A paused timer keeps its paused remaining time. A running focus timer without a valid `sessionId` is invalid and must be reset to safe defaults; it must not advance progress. Break timers do not require a `sessionId`.

Recovery order is:

```text
read persisted state
  -> validate and normalize fields
  -> recoverState()
  -> render the recovered phase
```

Corrupt persisted state must not cause a white screen. Normalize invalid fields in readable snapshots to safe defaults while preserving valid hangar records. If storage cannot be read, JSON cannot be parsed, or the snapshot version is newer than this app, show a startup error with Retry. Do not recover from defaults, overwrite or clear the stored snapshot after failed hydration. Failed startup recovery writes also show Retry; retrying must not collect a part twice.

Persistence version 1 migrates the former six-stage workflow: preserve settings, focus totals and completed-session history; clamp collected parts to five. A legacy ASSEMBLY snapshot becomes PART_REWARD. A legacy running focus or break after all parts are collected returns to READY without adding progress. Preserve a legacy COMPLETE snapshot as completed. A new READY snapshot with all five parts must remain READY until the user clicks Assemble; a new ASSEMBLY snapshot may replay final assembly after restart.

Persistence version 2 introduced the hangar. Preserve all version-1 timer/collection state and assign a stable build ID if a manual assembly was already running. Import a legacy COMPLETE snapshot into the hangar once; use `completedAt: null` when the old app did not store completion time. Preserve existing hangar entries when the active timer is corrupt. Unknown model IDs in archived records remain stored even if their assets are unavailable. Deduplicate archive records by build ID.

Persistence version 3 introduced model-aware progress recovery. Resolve active progress using its saved `assembly.mechaId` and that model's manifest. Do not replace a recognized non-default model with MECHA-01. If a nonempty saved active model ID is not registered, show startup Retry and leave the original save unchanged. A missing model ID in legacy data defaults to MECHA-01.

Current persistence version is 8; sections 31–33 define model-specific lower-body migration and the optional backpack slot, upgrading versions 0–7. Version 4 introduced `unlockedParts` and `workbench`; retain the storage key and all ten fields. Migrate versions 0/1/2/3/4 and backfill permanent part unlocks from valid collection progress and registered fixed-model hangar entries. Version 5 supports additional component keys independently of custom-mixing slots and safely extends legacy completed/in-assembly collections when a model's list grows, without adding focus history or minutes. Preserve partial progress, unknown valid IDs, custom recipes and historical metadata. Do not infer absent builds or grant ownership from custom compositions.

Records made and discarded by Build Again before the hangar feature existed cannot be reconstructed from absent historical data; migration imports the currently persisted completed build only.

## 8. Mecha model

The approved multiple-model extension contains six original built-in demo mecha:

```text
id: mecha-01 through mecha-06
totalStages: 5
```

Collectible parts, in unlock order:

1. TORSO
2. HEAD
3. LEFT ARM
4. RIGHT ARM
5. LEG UNIT

Part names and asset paths come from the manifest. Derive the total focus count from `stages.length`; a legacy `totalStages` declaration does not override the list. The separate `finalAsset` does not count as a collectible stage. New component types may use stable model-local `partId` keys independently of optional custom-mixing slots.

Optional manifest `description` supplies a short model-design label in the selector. The four additional designs are heavy assault (03), winged aerial (04), skeletal close-combat (05) and high-mobility interceptor (06). Backpack, wings and torso-mounted equipment remain part of the torso collectible; they do not introduce another focus stage. These four asset sets place pelvis in the leg unit and end torso above it. Mixed-model composition still requires a separate implementation and attachment metadata.

Example:

```json
{
  "id": "mecha-01",
  "name": "MECHA-01",
  "totalStages": 5,
  "finalAsset": "stages/stage-06.png",
  "stages": [
    { "stage": 1, "name": "TORSO", "asset": "parts/torso.png" },
    { "stage": 2, "name": "HEAD", "asset": "parts/head.png" },
    { "stage": 3, "name": "LEFT ARM", "asset": "parts/left-arm.png" },
    { "stage": 4, "name": "RIGHT ARM", "asset": "parts/right-arm.png" },
    { "stage": 5, "name": "LEG UNIT", "asset": "parts/leg-unit.png" }
  ]
}
```

## 9. Asset structure

```text
src/assets/mecha/mecha-01/
  parts/
    torso.png
    head.png
    left-arm.png
    right-arm.png
    leg-unit.png
  stages/
    stage-06.png
  break/
    break-01.png

src/mecha/mecha-01/
  manifest.json
```

Part assets must depict isolated detached modules with a transparent background and consistent canvas size. Show them in separate fixed collection slots on READY and PART_REWARD. FOCUS shows only the current session's target detached part at a larger size, selected at `currentStage + 1`. This preview does not mean the part has already been collected. Do not use half-assembled whole-mecha images as collectible parts. The full-mecha asset is displayed only during manual final assembly and COMPLETE.

Runtime PNG assets must be:

- PNG
- Transparent background
- Same canvas size
- Consistent framing within each collection slot
- Centered independent parts
- A stable full-mecha canvas for the final reveal

Target canvas: 1080 x 1440 with a 3:4 aspect ratio. Keep one consistent canvas size within each model's sprite set; native generated 1086 x 1448 canvases are also accepted. Registered assembly masters may retain native one-pixel dimension variation when their actual dimensions and semantic frame are recorded; original collectible canvas rules remain unchanged. All model sets use the same aspect ratio and contain framing without per-part offsets.

Prefer:

```css
object-fit: contain;
object-position: center bottom;
```

Do not fix inconsistent source images with per-stage magic offsets in React components. Normalize assets instead.

The approved custom-assembly renderer may use data-driven source bounds and neck/shoulder/waist mounting points in an adapter-owned layout file. Keep the renderer generic and use the same layout data for draft and archived compositions. Existing source PNGs remain unchanged; viewport crops normalize legacy duplicate waist/neck regions. This is static 2D composition, without skeletal animation or 3D.

## 10. Assembly animation

MVP animation uses independent part PNGs plus Framer Motion, and one separate full-mecha image.

Do not implement frame-by-frame animation or 3D.

Part reveal duration: approximately 2.8 seconds. Final assembly duration: roughly 3-6 seconds. Respect reduced-motion preferences.

Suggested sequence:

1. Focus reaches 00:00; show `PART SECURED` and the new detached part in its own collection slot.
2. Keep already collected parts static and visible in their own slots; animate only the new part.
3. Reveal completion enters BREAK while parts remain, or READY after the final part.
4. After the user clicks Assemble, show the collected parts and play a short final-build transition.
5. Remove the part layer before revealing the full mecha; do not overlay mismatched whole-mecha images.
6. Finish final assembly at COMPLETE without changing focus totals.

Primary goal:

> The user should clearly see each newly collected part and choose when to assemble the full mecha.

Animation failure must never corrupt timer or assembly progress.

## 11. Screens

### READY

Show:

- Selected model name
- Collection slots containing all acquired detached parts
- Parts collected X / N, using the selected model's collectible count
- Next part
- Start Focus button while parts remain; Assemble button once all model parts are collected
- Settings entry
- Hangar entry with the completed-build count
- Model-selection entry; disable it once this build has collected a part and explain that selection unlocks after assembly

### FOCUS

Show:

- Timer
- FOCUSING label
- One large, static preview of this session's target detached part, labeled FOCUS TARGET
- Progress
- Next part
- Pause / Resume
- Cancel

Focus mode should be visually quiet. Avoid distracting continuous animation.

The first focus previews TORSO; subsequent sessions preview HEAD, LEFT ARM, RIGHT ARM, then LEG UNIT. Choose the target from the manifest at the collected count plus one; the fourth focus, with three parts collected, must preview RIGHT ARM. Keep the collected count unchanged until focus completes and retain the next-part label. The large preview uses a 300px canvas, reduced to 240px in short windows so timer controls remain visible. READY and PART_REWARD retain the separate collection slots.

### PART_REWARD

Show the new part reveal and retain existing parts in separate slots. Return to the next phase through `finishPartReveal`.

### ASSEMBLY

Show the user-triggered final assembly transition only, using all N acquired parts and the separate full-mecha asset.

### BREAK

Show:

- break-01.png
- Break timer
- NEXT part
- End Break button, which immediately returns to READY and preserves parts and focus totals

Break starts automatically after every non-final reveal. The final part returns directly to the collection screen with Assemble enabled.

### COMPLETE

Show:

- Full mecha
- MECHA COMPLETE
- Completed focus count
- Total focused minutes
- BUILD AGAIN
- Saved-to-hangar confirmation and hangar entry

BUILD AGAIN resets mecha progress, completed session count, `totalFocusedMinutes`, and currentBuildId, but preserves the selected model, settings and the hangar. COMPLETE also offers model selection to begin a new build of either registered model.

`Total focused minutes` is the sum of the `durationMs` captured when each focus session started, converted to minutes. A canceled session is not counted. A recovered expired session is counted only when its `completeFocus` call passes the same idempotency check.

### HANGAR view

Show completed models newest first, with model name/ID, a locally resolved full-mecha image, completion time, completed focus sessions and focused minutes captured for that build. Each build is a separate record, including repeated builds of the same model. Show a clear empty state, Return control and Escape-to-return behavior. If a model is unregistered or its image is absent, show a resource-unavailable placeholder and retain the record. The view does not allow deletion, cloud sync, or model selection in this extension.

Register future manifests under `src/mecha/<model-id>/manifest.json`; the loader discovers them and rejects duplicate IDs. Place their local part images under `parts/` and full-model images under `final/` (or the established `stages/stage-06.png` convention). `getFinalAsset(modelId)` resolves each archive model separately. The build workflow currently continues to use the built-in MECHA-01.

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

Windows build prerequisites for development and release are Rust stable with the MSVC target, Visual C++ Build Tools, WebView2, and the Tauri bundle icon assets. The release target is the host Windows architecture unless a separate target is explicitly configured.

Windows notification is desirable:

Focus completion:
```text
MECHA-01
RIGHT ARM COLLECTED
```

Break completion:
```text
BREAK COMPLETE
Ready for the next focus session.
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

  totalFocusedMinutes: number;

  settings: {
    focusMinutes: number;
    breakMinutes: number;
  };

  lastProcessedFocusSessionId: string | null;
  currentBuildId: string | null;
  hangar: BuiltMecha[];
}

interface BuiltMecha {
  id: string; // Stable build ID, distinct from the model ID
  mechaId: string;
  mechaName: string;
  completedAt: number | null;
  completedFocusSessions: number;
  totalFocusedMinutes: number;
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
endBreak
finishPartReveal
startAssembly
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
    usePhaseTransitions.ts

  domain/
    types.ts
    timer.ts
    collection.ts
    hangar.ts
    settings.ts
    catalog.ts

  application/
    ports.ts
    useCases.ts
    archiveBuild.ts
    snapshot.ts
    phaseTransitions.ts

  adapters/
    platform/
    storage/
    catalog/
    assets/

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

- Asset failure: show `MECHA ASSET ERROR` and Retry; retry only reloads the failed local asset and does not alter timer, phase, assembly, or persisted progress.
- Corrupt fields in readable persisted data: normalize to safe defaults and retain valid archive records. Unreadable/unparseable or newer-version snapshots: show startup Retry without overwriting or clearing data.
- Clamp stage to `0..totalStages`.
- Never collect beyond N / N; reject focus starts once all selected-model parts are acquired.
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
A completed focus changes FOCUS -> PART_REWARD and collects exactly one detached part.

### TC-05 Part Reveal Complete
For parts 1 through N-1, reveal completion enters BREAK and starts the break timer. The final reveal returns to READY and enables Assemble.

### TC-06 Break Complete
BREAK -> READY. Do not auto-start focus.

### TC-07 Final Assembly
N focus completions collect all N parts. READY waits for the user's Assemble click, then ASSEMBLY -> COMPLETE. No additional focus or minutes/sessions are added by assembly.

### TC-08 Restart During Focus
Restart app before endAt. Remaining time is reconstructed correctly.

### TC-09 Restart After Expiry
Restart after focus endAt. Progress advances exactly once and enters PART_REWARD.

### TC-10 Build Again
From COMPLETE, BUILD AGAIN resets assembly/session progress and focused-minute totals but preserves settings.

It must also preserve all hangar records and clear the active build identity.

### TC-11 End Break
Click End Break before expiry: BREAK -> READY with idle focus timer; preserve collected parts, session history, totals and settings. Repeated clicks or a late break callback must be harmless.

### TC-12 Await Manual Assembly
Reload after collecting the final part: show all N separate parts and Assemble; do not automatically assemble or start a timer. Clicking Assemble twice must not duplicate progress.

### TC-13 Collection Display
Already collected parts retain their own slots when the next part arrives. No whole-mecha ghost layers, occlusion or replay of previous part animations.

### TC-14 Archive Completed Build
Finish manual assembly: one hangar record is saved with this build's model ID, timestamp and focus totals. Duplicate completion callbacks and reloads do not add another record. An interrupted final animation must finish using the same build ID.

### TC-15 Build Again Keeps Hangar
Build Again -> READY with a fresh collection and the old archive preserved. A second completed build of the same model gets a separate ID; its statistics do not overwrite the first record.

### TC-16 Legacy Hangar Migration
A version-0/1 COMPLETE snapshot is imported once with unknown completion time shown honestly. Older active focus/break/manual assembly progress remains usable. Corrupt active timer data must not erase completed builds.

### TC-17 Hangar View
Open from READY and COMPLETE, inspect empty/populated states, return without changing phase, refresh and reopen to see persistent records. Keep unfamiliar model records visible even when a model asset cannot be resolved.

### Required automated logic coverage

Before Phase 9 is complete, automated tests must cover at least:

- Timestamp-based remaining time calculation.
- Pause freezing remaining time and resume rebuilding `endAt`.
- Duplicate `completeFocus` calls advancing stage and totals only once.
- Expired focus recovery advancing exactly once.
- Stage clamping so progress never exceeds `totalStages`.
- Canceling a session without increasing completed sessions or focused minutes.
- Ending breaks early, guarding manual assembly, fifth-part return to READY, and version-0 state migration.
- Archive idempotency, two builds of one model, preserved history after reset/restart, version-1 migration, and unknown/malformed archive records.

## 19. Development phases

### Phase 0 — Bootstrap
- Tauri v2 + Vite + React + TypeScript
- Install Zustand and Framer Motion
- Base project structure
- Dark app shell
- Minimal Tauri window configuration
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
- Independent part asset selection and separate final asset
- Progress and next-part UI

### Phase 4 — Asset preparation
- Add and normalize five detached part PNGs and a full-mecha PNG
- Add break scene
- Verify consistent anchors

### Phase 5 — Assembly animation
- PartRewardScreen with separate collection slots
- AssemblyScreen for manual final assembly
- New-part reveal and final-build transition without whole-image ghost layers
- Automatic BREAK / READY after reveals, COMPLETE after manual assembly

### Phase 6 — Break and completion
- BreakScreen
- Break timer flow
- End Break action
- CompleteScreen
- Build Again

### Phase 7 — Settings
- Focus and break duration
- Validation
- Lock during active timer

### Phase 8 — Tauri integration
- Production Tauri integration and Windows bundle configuration
- Optional notifications
- App icon
- Production build

### Phase 9 — QA
- Run TC-01 through TC-13
- Test restart/recovery
- Test sleep/wake behavior where practical
- TypeScript check
- Build
- Tag v0.1.0 when complete

### Approved extension — Local hangar
- Atomically save finished builds with stable IDs and model metadata
- Persist completed models independently of current-build progress
- Migrate legacy completed models without fabricating completion dates
- Add a hangar view in READY/COMPLETE and model-specific asset resolution
- Verify TC-14 through TC-17 and the existing focus/assembly loop

## 20. v0.1 Definition of Done

All of the following must be true:

- Windows desktop app launches.
- READY -> FOCUS works.
- Timer uses timestamps and behaves correctly.
- Pause / resume / cancel work.
- Restart recovery works.
- Focus completion is idempotent.
- Every completed focus collects exactly one detached part.
- New-part reveals preserve existing collection slots without ghost layers.
- Every non-final part reveal enters break; the final reveal returns to READY.
- Break expiry and End Break return to READY.
- All N model parts unlock manual assembly; only the user's click can begin the final build.
- Manual assembly produces COMPLETE without increasing focus counts or minutes.
- Build Again works.
- State persists.
- Finished builds persist in the hangar and survive Build Again.
- App works offline.
- TypeScript build passes.
- Tauri production build passes.

Do not mark v0.1 complete until all above conditions are met.

## 21. Later candidates — not v0.1

Potential v0.2+ ideas only:

- System tray
- Always on top
- Mini mode
- More original mecha designs beyond the six built-in models
- Theme packs/import
- Better part-fly-in animation
- Sound effects
- External model importing
- Focus history
- Statistics

## 22. Approved behavior-preserving modular refactor

Preserve the current screens, five-part collection, manual assembly, hangar behavior, development fast mode, timings, store action names, local assets and persisted key/schema version 2. This refactor does not add SQLite, cloud sync, authentication, mixed-part inventory or additional buildable models.

Domain/application code must remain independent of React, Zustand, Vite, browser APIs and concrete storage. Inject catalog, clock, ID and duration configuration through ports. Keep Zustand as the business-state holder and the existing `useAppStore` facade; use application use cases for cross-module coordination.

Move snapshot normalization/migration out of the store. The storage contract permits synchronous or asynchronous implementations, and startup must await hydration before recovery and normal rendering. Continue reading and writing the existing `gundamdoro-app-state` JSON envelope without altering fields or migration behavior.

The app-level coordinator schedules the existing part-reveal and final-assembly completion actions. Screens handle presentation; image reveal stays at 2200ms (400ms reduced motion), part reveal at 2800ms, and final completion at 4800ms (1400ms reduced motion).

Regression acceptance includes the existing tests, pure use cases with injected non-default model/time/IDs, synchronous and asynchronous storage restoration, dependency-boundary checks, browser completion/restart flows and the frontend/desktop production builds. See AGENTS.md for dependency and extension rules. Detailed notes under `docs/` are local-only and are not required to build or develop a fresh checkout.

## 23. Approved extension — Multiple buildable models

The user prioritized multiple models before independent part inventory and mixed-model assembly. This extension supersedes the original single-model and version-2 restrictions while preserving the focus/reward/manual-assembly loop.

- Discover selectable models from the injected catalog. Ship MECHA-01 through MECHA-06, each with five detached part PNGs and its own full-mecha PNG. Model selection and the hangar may preview full models. Models without their own break image share the existing factory break scene; a model-specific `break/break-01.png` takes precedence when provided.
- Keep one active build. `selectMecha(mechaId)` may begin a fresh build only in READY with zero collected parts, or in COMPLETE after the finished build has been archived. Unknown IDs and switches during FOCUS (including paused), PART_REWARD, BREAK, ASSEMBLY or partially collected READY are ignored. Canceling the first focus without earning a part permits selection again.
- The selector is a separate view, not a timer phase. Returning without choosing preserves state. Selecting another model resets current-build counters and identity while preserving settings and all archive records. BUILD AGAIN restarts the current model.
- Resolve focus target, collection slots, progress, reward, final assembly, completion and recovery from the active model ID. Archive each completed model with its own ID/name/statistics; hangar images resolve from each saved entry, independent of the active model.
- Verify every registered model's asset set, locked switching, pause/restart and expired-focus recovery on non-default models, old-save migration, manual assembly/reload, mixed-model hangar history, and model-preserving BUILD AGAIN. Run TypeScript, automated tests, browser checks and a Windows production build.

Stackable component quantities, multiple unfinished focus builds, database and networking remain separate work. Permanent inventory and cross-model composition are covered by the following approved extension.

## 24. Approved extension — Permanent part inventory and custom assembly

First-version rules follow the previously proposed reusable-unlock design. Each valid focus completion also unlocks the model's corresponding part exactly once by a stable model/slot ID. Unlocks survive model switching, BUILD AGAIN, custom saves and restart. Repeated collection does not create stackable quantities.

- Slots are torso, head, left-arm, right-arm and legs. Manifests declare slot metadata; catalog validation rejects unknown/duplicate slots. Existing stage-order defaults remain supported for older injected catalogs.
- Open the inventory/workbench view from READY (including partial current collections) or COMPLETE. It does not change the timer phase. Inventory supports model filtering, locked/empty/unavailable states and optional locked-catalog browsing.
- All selected parts and the name live in a persisted Zustand draft. Allow only unlocked, matching-slot registered parts. Random selection uses an injected random source and chooses from owned parts per slot. Incomplete or blank-name builds cannot be saved. Workshop actions during FOCUS, PART_REWARD, BREAK or ASSEMBLY are ignored.
- Preview the actual five component PNG layers aligned by calibrated mounting points; do not substitute a whole-model image for mixed builds. Render the same recipe in the hangar. Keep the preview visible while browsing components in narrow/wide layouts. Resource errors show retry/unavailable feedback without modifying ownership, focus state or saved recipes.
- Saving a complete custom build archives its name, five part IDs, completion time and stable draft ID. Repeated saves/reload do not duplicate that draft. Editing name or composition creates a new draft identity; older archived recipes are immutable. Saving consumes no components and awards no focus sessions/minutes. Custom records display part origins; fixed-model history and statistics remain unchanged.

Acceptance covers one-time focus unlocks, canceled/stale completions, version-0/1/2/3 inventory migration, draft restart, locked/wrong-slot guards, random bounds, save idempotency, non-consumption, unchanged focus progress, unknown part preservation, real component previews and custom/fixed records together. Run TypeScript, relevant/full regressions, browser visual/flow checks and the Windows production build.

## 25. Approved change — Wing Zero EW assets and paused custom assembly

On 2026-10-09 the user paused further custom mixing and provided a generated Wing Zero EW fan-art package; on 2026-10-10 they explicitly requested including that package in Git. This exception permits that named generated fan-art model alongside the six original demo models. It does not authorize downloading official artwork or imply a character license. Retain its non-official/unlicensed provenance and distinguish it from original models.

- Register stable ID `wing-zero-ew`, display name `飞翼零式 EW`; preserve every existing model ID and persistence version 4. Include all seven selected PNG files with source notes so a clone can run the same model.
- Keep five focus rewards: torso plus separate wings as one reward group, corrected head, left arm, right arm, paired legs. No sixth session. Show torso and wings separately within that one group, without generating an assembled composite. Manual final assembly, completion and hangar use the provided full-body image; break uses the default factory scene.
- Keep original PNG bytes. Optional adapter-owned `src/mecha/<id>/presentation.json` defines source viewports and companion images for readable part previews. Apply it consistently in focus, collection/reward, final-transition part tiles and inventory; models without metadata retain their previous rendering.
- Hide custom assembly entrypoints via a presentation feature switch. Inventory remains available. Do not remove underlying store actions, drafts, ownership or archived custom recipes, and do not claim new fan-art components are calibrated for mixing.
- Verify transparent consistent canvases including companion wings, corrected head choice, five-reward/one-archive behavior, restart and Build Again, unchanged original models, browser previews and production builds before committing.

## 26. Approved change — Focus count follows model components

On 2026-10-10 the user removed the fixed five-session rule. This section supersedes earlier fixed-count and grouped-wing rules; historical migration and QA examples remain release-specific.

- Each manifest stage is one independently collected component and one focus session. Runtime `totalStages = stages.length`; validate nonempty lists, consecutive unique stage numbers, valid component keys and unique IDs. Keep optional legacy count declarations readable but do not let them determine behavior.
- Collection/inventory includes every component, not only the five custom-mixing body slots. Optional `partId` is a stable model-local ASCII key such as `wings`, `rifle` or `shield`. Existing model/slot IDs remain unchanged. Unknown valid component IDs survive reload. Do not enable or expand custom mixing in this task.
- MECHA-01 through MECHA-06 retain their five currently listed components. Wing Zero EW now lists six: torso, cleaned head, left arm, right arm, paired legs, wings. Append wings at stage 6 to preserve the released five-part prefix. First focus shows torso only; sixth focus shows wings only. Final image and unselected sprite versions do not count.
- Persist schema version 5 with the same key and ten fields. Migrate versions 0 through 4 without resetting real progress, captured timers, sessions, minutes, drafts or hangar records. Legacy completed/in-assembly models remain accepted with their prior build identity and statistics; Build Again uses the new count. Partial legacy builds retain their original prefix and collect remaining new parts. Never fabricate extra focus statistics.
- All non-final rewards lead to break; only the last returns directly to READY. Manual assembly requires all model components, adds no sessions/minutes and archives once. Verify counts 1/3/6/8, additional-component ownership/reload, fifth-part break and sixth-part wings for Wing Zero, old partial/paused/completed/in-assembly saves, expired final-focus idempotency, UI and desktop builds.

## 27. Approved change — Abandon the active build

The user explicitly requested abandoning the entire unfinished collection to select another model. This supersedes the disabled model-selection UI rule for partial collections, without weakening `selectMecha` guards.

- READY partial collections, FOCUS and BREAK expose a confirmation entry. Opening it pauses running focus; cancel/Escape resumes only a previously running focus. Already paused focus remains paused.
- Confirming calls `abandonBuild`: return to READY, reset current collection, sessions, minutes, timer and active build/session identities, then open model selection. Preserve permanent part ownership, hangar, settings and workbench draft. No part is granted for unfinished focus.
- The action also accepts PART_REWARD for expiry races, but ignores ASSEMBLY and COMPLETE. Stale focus callbacks cannot collect into the new build. Existing single-session cancel retains collection progress.
- Keep the existing storage key/schema. Verify reset, preservation, stale callbacks, reload and confirmation behavior.

## 28. Approved extension — Model dossiers and grouped hangar

The user approved a deduplicated hangar with clickable mecha-style detail views, seven model profiles, background stories and parameters.

- Group fixed builds by model ID for display only. Preserve every archived build, ID and captured statistic; sum real sessions/minutes and display completion count. Entrance counts show distinct models; the hangar also shows total completed builds. Identical legacy custom recipes group by canonical composition; different recipes remain distinct.
- Clicking a card or its detail button opens a read-only dossier, without routing or phase changes. Include full-model art, role, manifest-derived component count, fictional capability indices, story, design features and personal aggregate records. Escape/Return first returns to the hangar and restores focus; Escape there closes it.
- Custom hangar cards show the finished model and summary only, omitting per-part origin lists. Keep the full composition and its origin list in the read-only detail dossier; fixed-model focus statistics remain on their cards.
- Model selection initially shows each uncompleted model as a flat silhouette with a centered question mark. Reveal full previews only after that fixed model has a completed hangar record. Custom recipes and merely owning its components do not reveal source models; derive visibility from existing history without a new persisted unlock flag. Preserve selection guards, resource retry and keyboard behavior.
- Keep profile content separate from UI and persistence. Six original models receive original fictional settings. Wing Zero EW explicitly labels application-only fan interpretation, not official lore or performance. No invented official physical specifications, new remote assets, backend or schema migration.
- Unknown model/profile/image resources retain historical records and show unavailable feedback. Unknown historical dates are not invented; show earliest known date and explain uncertainty when appropriate.
- Verify grouping, aggregation, custom/unknown compatibility, all seven profiles, empty state, reload, keyboard return, responsive layout, tests and frontend build. Native platform behavior is unchanged.

## 29. Approved extension — Daily timer experience and desktop mini timer

On 2026-10-12 the user approved quick durations, estimated finish time, optional completion reminders and a desktop widget visible after minimizing. This supersedes the former mini-mode/always-on-top non-goals only for the mini timer.

- READY offers 15/25/45-minute shortcuts through the existing settings action. Preserve custom 1–120-minute values, break settings and captured active timers. Show estimated local finish time in READY/FOCUS/BREAK; paused focus explains that resuming recalculates the finish time. Development fast mode retains its seconds-based behavior.
- Sound defaults on; system notifications default off and require explicit permission. Preferences are optional validated booleans inside the existing version-5 settings object, retaining the storage key, ten top-level fields and all legacy defaults. Settings remain editable only in READY/COMPLETE. Completion reminders observe successful focus completion and natural break expiry only; no reminder for cancellation, abandoned progress, skipped break or duplicate completion. Reminder errors never roll back progress.
- Windows uses Tauri's notification plugin; browsers use the Notification API when supported. Prime local synthesized audio from user interaction. Native toast availability and notification sound depend on installation, OS permission and do-not-disturb settings. Do not promise delivery while the entire app is closed or the system is asleep.
- The main window remains the sole business-state and persistence owner. A hidden, undecorated, draggable, always-on-top mini window becomes visible when main is minimized (unless disabled). Show phase, timestamp-derived remaining time and target, with pause/resume requests, hide and restore-main controls. Mini must not hydrate/persist a second app store, award parts, schedule reward animations or send reminders. Synchronize projection/events, poll from the visible mini to request main synchronization, clean up listeners/timers, and exit the app when main is closed.
- Browser preview provides an in-page version of the same mini UI and clearly states it cannot float above other applications. No router, backend, tray, global hotkeys or new rewards/statistics rules. Verify legacy/preferences reload, time math, completion idempotency, permission denial, mini synchronization/cleanup, browser controls/layout, native build and actual minimize/restore behavior where possible.

## 30. Approved extension — Compatible two-model assembly pilot

On 2026-10-13 the user resumed custom assembly after approving a shared-proportion, registered-artwork approach. This supersedes the paused entrypoint only for the two calibrated original models, MECHA-01 and MECHA-02.

- Preserve existing collectible and fixed-model final artwork. Add separate straight-on assembly masters with consistent pose, lighting and frame proportions. Use deterministic SVG polygon masks to extract the actual selected module from its own master, never substitute an unmasked whole-model image for a mixed recipe. Calibrate semantic neck, shoulder, waist and limb segments; use uniform similarity transforms, not arbitrary bounding-box heights or anisotropic stretching.
- Offer only the ten calibrated parts on the assembly tab; inventory still lists all earned components. Selection, draft preparation, randomization and saving enforce compatibility in application use cases through an injected domain policy. Locked components remain locked. Existing unsupported drafts and archived recipes remain stored; tell users to replace unsupported draft parts explicitly rather than silently discard them.
- Keep five slots, reusable unlocks, explicit naming and idempotent saving. New custom records capture optional `assemblyProfile` inside the existing version-5 envelope. Legacy custom records without that field retain the old compositor; unknown profiles show unavailable feedback. Group distinct presentation profiles separately. Neither saving nor calibration grants focus credit or consumes parts.
- Provide a development-only calibration/32-combination gallery, with read-only sample recipes separate from real unlocks and a local editor/export for masks and semantic points. It must not hydrate, modify or persist the user's business state. Production excludes the calibration entry.
- Verify all 32 combinations visually, mask coverage and transform math, compatibility guards, legacy/unknown profile persistence and rendering, save/reload/hangar flows, resource failures, narrow layout, existing regressions, frontend and Windows production builds. Do not enable additional models, official assets, networking, databases, 3D or Git publication in this task.

## 31. Approved change — Independent hips and left/right legs

On 2026-10-13 the user approved replacing the paired lower-body part with separate hips, left leg and right leg for MECHA-01 and MECHA-02. The other five catalog models remain unchanged.

- The two pilot models now collect seven stages: torso, head, left arm, right arm, hips, left leg, right leg. Keep the first four IDs/order/assets unchanged. Add stable `hips`, `left-leg`, `right-leg` IDs and retain the old `legs` ID/asset as a historical alias outside the collectible list. New builds require seven focus completions; manual assembly/custom saves award no additional credit.
- Use deterministic registered SVG masks from the existing local masters for the three lower-body collectibles and assembly layers. No independently regenerated PNGs or stretched parts. Hip choice controls both hip socket locations; each leg attaches to the selected hips, which attach to the selected torso. Capture new custom recipes with profile `standard-front-v2`; keep `standard-front-v1` and profile-less archive renderers unchanged.
- Persist version 6 with the same key and ten top-level fields. In versions 0–5, an earned old paired-leg component implies ownership of its three constituent parts, retaining the old ID. Completed old collection/assembly maps to seven collected components without changing real session/minute totals or archive identity. Partial builds retain the first four stages; unfinished running/paused focus keeps its captured timer/session and follows the new next-stage target. Never grant unearned legs for an unfinished session. Completed old fifth-part reward/break returns to READY rather than replaying a different reward.
- Convert eligible old draft paired-leg selection into the same model's hips and two legs with a new draft identity; preserve names and all archived compositions. Unsupported other-model legacy selections/unknown IDs remain stored with explicit feedback. Custom recipes do not confer inventory ownership. Version-6 fifth-stage progress is hips-only and must never be treated as legacy completed paired legs.
- Support seven independent selectors, random owned-compatible choices, profile-aware archive descriptions and a development-only 128-combination gallery/calibrator. Verify all combinations, independent leg/hip swaps, migration/reload/paused/expired/idempotent completion, fresh seven-focus flow, all historical recipe formats, current-version fifth-stage integrity, tests and frontend/Windows builds. No Git publication or unrelated expansion.

## 32. Approved extension — Seven-part assembly for every built-in model

On 2026-10-13 the user requested adapting the remaining five models to the independent hips/legs system and compatible assembly.

- MECHA-03–06 collect the same seven body modules as MECHA-01/02. Wing Zero EW collects seven body modules followed by its existing independent wings (eight focuses). Preserve the first four collectible IDs/images and every fixed final image; retain old paired-leg IDs/assets as aliases. Existing generated fan-art provenance remains explicit.
- Add separate registered front-view masters for the five remaining models and calibrate each module against the common semantic frame. Use actual selected masked modules with uniform transforms and hips-parented legs. Keep compact backpack equipment with original torso identities where feasible. Wing Zero's original wings remain an independent collectible, outside the seven body-mixing slots; body assembly previews omit the wings.
- New seven-model custom recipes use `standard-front-v3`; freeze both previous registered profiles and the profile-less renderer. Owned compatible body components from all seven models are selectable and randomizable. Saving remains idempotent and grants no inventory or focus credit.
- Persist version 7 with the same key/ten fields. Migrate remaining-model paired legs from versions 0–6; the first two models split only before version 6. Preserve already earned wings, incomplete running/paused target timers, completed archive IDs and real statistics. Remap old fifth/sixth collected stages by the two inserted lower-body stages, without treating v6 pilot hips-only progress as completed paired legs. Fresh saves never promote hips-only progress. Old draft aliases expand with a new identity; archive recipes remain unchanged.
- Use a bounded development gallery with selectable model pairs and complete 128 pair combinations, plus a representative mixed-model gallery; do not materialize all 7^7 combinations. Verify every model/mask, all ordered source-to-parent connections, representative rendered mixes, migration versions and Wing Zero stages, save/reload/resource errors, responsive UI, tests and frontend/Windows builds. No Git publication is included.

## 33. Approved extension — Optional backpack / wings slot

The user approved an optional backpack/wings slot so the already collected Wing Zero EW wings can be equipped on any compatible body.

- Keep the seven required body slots and all current focus counts (seven for original models, eight for Wing Zero). Reuse the existing `wing-zero-ew:wings` component and original local PNG. Add optional slot `wings`, displayed as 背包／翅膀; it defaults empty and has an explicit unequip action. No additional focus, consumption or unlock is granted by equipping/saving.
- Only owned, matching-slot, calibrated components can be equipped. Preparation must not silently equip a backpack; randomization includes an empty choice and never chooses locked wings. Seven-part recipes remain saveable without a backpack; selected optional parts must pass ownership/compatibility checks. Unequipping changes draft identity, preserves archived recipes and obeys the same phase guard as other workshop actions.
- Register `standard-front-v4` with the original seven body geometries plus a calibrated back joint and optional wing image. Place wings behind all body layers, anchored to the selected torso with uniform scaling. Preserve v1/v2/v3 and profile-less archive rendering; current torso-integrated equipment remains part of the torso.
- Persist version 8 with the existing key/ten fields, preserving optional wing IDs in drafts/recipes and distinguishing otherwise identical equipped/unequipped builds. Upgrading v7 must not rerun paired-leg migration, fabricate ownership, alter timers/focus credit or automatically add wings to old recipes. Unsupported valid wing references remain stored with unavailable feedback.
- Verify locked/empty/unequip/random/save/reload guards, all seven torso mounts and back-to-front layering, optional asset failure/retry, old recipe formats, lab no-write behavior, narrow layout, full regressions and frontend/Windows builds. No Git publication or new raster generation is included.
- Workshop save/random actions remain visible in a viewport-bottom bar while browsing parts. Explain disabled saves (missing required components or blank name), provide a hangar shortcut after success, and reserve page space so the final selectable parts remain reachable. This presentation fix does not change save guards or storage.

## 34. Approved extension — User model import, step one

On 2026-10-15 the user approved three sequential deliveries: split-asset model import; whole-image manual segmentation; mixing calibration. Implement only the first delivery now. This supersedes the external-model-import non-goal for this local workflow only, not networking, AI or a database.

- Add an import entry in model selection, available through existing READY/COMPLETE selection guards. Users provide a name, optional description, final image and 1–32 independently named component images; support reorder/removal before saving. Component order defines focus order/count. Importing registers a model only; it does not select it automatically, collect parts, create hangar records or award focus credit.
- Validate raster signatures and browser decoding for PNG/JPEG/WebP; reject SVG, invalid/empty images, more than 8 MiB per image, 16 million decoded pixels or 64 MiB per set. Generate namespaced model IDs and non-mixing component keys; never use user filenames or arbitrary paths as storage paths. The final image is not another component. Preserve built-in IDs and existing timers, unlocks, drafts and archives.
- Keep user metadata and image binaries in a separate version-1 local resource library, not image data URLs inside the progress snapshot. Windows copies assets to the app-local `user-models` directory through main-window-only scoped commands and normally publishes a complete temporary directory by rename. If the filesystem reports cross-device rename even within that directory, exclusively create a new destination, mark it pending, copy and validate all files, then create a completion marker last. Pending/incomplete directories never register; existing models are never overwritten. The browser preview uses origin-private file storage (OPFS), writing the manifest last. Unsupported browsers may use builtins but import reports unavailable. Storage/quota errors retain input for retry. No global filesystem permission or database is added.
- Merge user definitions through the injected catalog and resource resolver. Load the resource library before hydrating/recovering progress so saved active user models are recognized. A failed library read/validation must not hydrate, recover or overwrite progress; startup Retry reloads the library. Keep progress key `gundamdoro-app-state`, schema version 8 and its ten fields. User model definitions behave as immutable catalog resources; collection/ownership/draft/archive business state stays in Zustand. Mini and calibration entries do not load or write a second resource library.
- User models reuse focus/reward/break/manual assembly/hangar/Build Again and mystery previews. Their components appear in inventory but lack calibrated mixing slots and must not enter custom assembly. Do not implement whole-image cutting, user mixing calibration, model edits/deletion, export/import packages or cloud sync in this step. Verify validation, order, save failure, load-before-hydration, variable counts, completion idempotency, restart and asset recovery, browser UI, narrow layout, Rust boundaries and Windows builds.

## 35. Approved extension — Local backup and restore

On 2026-10-28 the user approved a local backup/restore feature. This supersedes section 34's package-export restriction only for complete personal backups; model sharing, editing, cloud sync, accounts and databases remain outside scope.

- Add Settings → Backup and Restore, available only in READY/COMPLETE with no unfinished timer. Export one `.gundamdoro` file containing the version-8 progress envelope (the same ten fields) and every registered user model's validated manifest and original image bytes. Built-in artwork remains supplied by the application. Backup operation/preview state is temporary and must never enter progress snapshots.
- Use a version-1 binary container with bounded JSON metadata and original image blocks, plus SHA-256 integrity verification. This is not encryption or authentication. Limit the complete file to 128 MiB, metadata to 4 MiB and user models to 32; retain existing per-image, pixel and per-model limits. Reject damaged/truncated files, unsupported versions, invalid images, duplicate IDs/files, extra bytes and arbitrary paths before allowing restore. Normal progress migrations remain unchanged; this first backup format accepts only current version-8 progress, including destination-runtime reconstruction of idle timer duration.
- Preview backup date, active model, collection, permanent part records, completed builds and user-model count without writing. Require an unchecked explicit overwrite acknowledgement. Restore replaces progress, hangar, draft and settings; it does not merge statistics. Never remove or overwrite existing model resources. Reuse same-ID identical manifests/images and reject conflicting contents. Preserve valid unknown historical references under existing snapshot rules; reject unavailable active models and malformed/incomplete progress rather than silently normalize away data.
- Restore validated resources first, then wait for older queued progress writes and persist the replacement snapshot. Apply restored in-memory progress only after that write succeeds. Block business mutations and duplicate backup operations while processing. On failure, retain current progress and allow retry; successfully added resources may remain. Browser resource writes serialize through same-origin Web Locks where available and clean only their own failed newly created directory; committed model directories remain immutable. Resource-write errors must not commit progress, and progress-write errors must propagate to the UI.
- Keep application/domain independent of browser and Tauri APIs through injected backup/resource ports. Reuse existing scoped native model commands, asset resolver and browser file selection/download. No new database, dependency, broad filesystem permission or network service. Backups require a normally started app and do not repair a corrupt startup resource library; users must retain a compatible application with its built-in assets. Verify cross-context image/progress restoration, repeated restore, cancellation, corrupt files, same-ID conflicts, write failure/retry, pending-write ordering, narrow UI, regressions and Windows builds. Distinguish native save-dialog/manual checks from browser automation evidence.
