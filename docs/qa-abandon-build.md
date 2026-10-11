# Abandon-build acceptance — 2026-10-11

Scope: abandon an unfinished fixed-model collection and choose another model; keep single-session cancel unchanged. No schema or native-platform change.

## Changed files

- `src/application/useCases.ts`, `src/domain/types.ts`, `src/store/createAppStore.ts`: explicit guarded reset action, reusing the existing new-build initializer.
- `src/app/App.tsx`, `src/components/Mecha/AbandonBuildDialog.tsx`: confirmation, running-focus pause/cancel-resume and model-selection coordination.
- `src/components/Break/BreakScreen.tsx`, `src/components/Mecha/ModelSelectionScreen.tsx`, `src/styles/global.css`: entries, explanatory copy and compact accessible modal layout.
- `src/store/abandonBuild.test.ts`, `SPEC.md`, `README.md`: regressions and approved behavior.

## Verification

`npm test`: 147 tests across 18 files passed. Seven added cases cover READY/FOCUS/PART_REWARD/BREAK resets, permanent data retention, stale session completion, repeated abandonment, persisted reload, paused focus and ASSEMBLY/COMPLETE guards. Initial sandbox invocation failed on Vitest temporary-cache access; normal-environment rerun passed.

`npm run build`: TypeScript and Vite production build passed. `git diff --check`: passed (existing line-ending informational warnings only).

Playwright used a separate browser profile, without touching the user's saved data. Verified running-focus confirmation pauses, Escape resumes, canceling a previously paused focus retains pause, confirmation resets and opens selection, actual model switch, break cancellation, partial READY abandonment, inventory preservation and refresh. At 420×640 the focus abandonment button occupies y=550.5 through 584.5, within the viewport.

No new Windows installer/native build or installed-desktop interaction test was performed for this frontend-only change. The local Vite preview remains available on port 1420.
