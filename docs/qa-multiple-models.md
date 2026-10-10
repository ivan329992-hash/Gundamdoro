# Multiple-model extension QA

Date: 2026-10-04 (Asia/Shanghai).

## Result and scope

MECHA-01 and the original MECHA-02 are selectable before collecting the first part or after completing a build. Each has five independent part sprites and its own full-mecha image. One active build is maintained; earning a part locks model selection until assembly completes. Selecting another model keeps settings and all archived builds. BUILD AGAIN repeats the selected model.

This extension follows SPEC section 23. Independent component inventory and mixed-model assembly remain separate tasks. No new dependency, database, backend, network service or Git commit/push was introduced.

## Implementation

- `src/domain/catalog.ts`, `collection.ts`, `types.ts`: catalog enumeration, shared selection eligibility and the `selectMecha` action contract.
- `src/application/useCases.ts`, `snapshot.ts`, `src/store/createAppStore.ts`: guarded selection, model-preserving reset/recovery and version-3 persistence; versions 0/1/2 migrate while preserving the storage key and eight data fields. An unavailable active model fails hydration without overwriting the save; unknown archived models remain stored.
- `src/app/App.tsx`, model/focus/reward/assembly/break/completion views, `src/mecha/loader.ts` and CSS: model selection and explicit model-ID asset/metadata resolution throughout the UI.
- `src/mecha/mecha-02/manifest.json`, six PNGs under `src/assets/mecha/mecha-02/` and `ASSETS.md`: original ivory/navy/amber design generated with the built-in imagegen tool. Prompts and provenance are recorded in ASSETS.md; all six sprites use genuine alpha and a consistent 1086 x 1448 (3:4) canvas. The default factory break scene is shared.
- `src/store/multiModel.test.ts`, existing storage/loader/focus tests, SPEC, README and architecture documentation: regression coverage, migration/selection rules and instructions for adding further model manifests/assets.

## Automated checks

`npm test`: 86 tests passed in 11 files, retaining the previous 67 tests and adding 19 multi-model scenarios. New coverage includes two injected models with different part counts, blocked switches during active/paused/partially completed builds, stale focus callbacks after switching, model-preserving resets, two-model archives, expired non-default focus recovery, migration from versions 0/1/2 and non-overwrite behavior when an active model is unavailable.

Asset and render tests verify 12 distinct part/final images across both models and all five non-default focus previews. Existing dependency-boundary tests remain passing.

`npm run build` passed TypeScript project checks and Vite production bundling. `git diff --check` passed. No core rule imports a UI/store/adapter or platform global.

## Browser checks

Used isolated Playwright CLI session `gundam-multi-qa` with the local Vite fast-mode preview. The user's browser profile and application data were not changed.

| Behavior | Result |
| --- | --- |
| Selector previews and reload of selected MECHA-02 | Two distinct loaded previews; selection retained |
| MECHA-02 pause/reload/resume/cancel | Model ID, session ID and paused remaining time retained |
| Both models' five-focus workflows | Correct model-specific target and reward images; first four reveal/break transitions preserved |
| Switching after a part is collected | Disabled in READY; core action guards active/paused phases |
| Fifth part and manual assembly | Waits for user click; no extra focus/minutes |
| MECHA-02 reload before/during assembly | Model/build ID retained; one archive; correct final image |
| BUILD AGAIN | MECHA-02 retained, progress cleared, archive retained |
| Version-2 snapshot upgrade | Version 3 and original eight fields; seeded historical archive retained |
| Two-model warehouse | Both images load and resolve by each saved model ID |
| COMPLETE selector, Escape and choosing another model | Escape retains completion; selection starts a fresh model while keeping settings/history |
| 480x720 and 420x640 layouts | Selector and focus screenshots visually inspected; minimum-window controls visible without horizontal overflow |

MECHA-02 was archived through its full workflow in the first browser run. After resuming in a fresh isolated browser, the two-model warehouse check used a seeded historical MECHA-02 record plus a newly completed MECHA-01 build. The automated store test additionally completes and archives both injected models sequentially without synthetic progress.

No page errors or console errors were observed. Screenshots are saved under `output/playwright/`: `multi-model-selection.png`, `multi-model-focus.png`, `multi-model-hangar.png`, `multi-model-selection-420x640.png` and `multi-model-focus-420x640.png`.

## Desktop build and limits

`npm exec --offline -- tauri build --bundles msi` passed with the existing Rust/MSVC/Windows SDK and offline dependency cache. Updated artifact: `src-tauri/target/release/bundle/msi/Gundamdoro_0.1.0_x64_en-US.msi` (17.98 MiB). The existing informational linker import-library warning remains unchanged. The multiple-model extension acceptance checks in SPEC section 23 are satisfied.

Native installation/uninstallation, physical sleep/wake and native WebView fault injection were not repeated. This extension supplies selectable whole models and model-aware data/asset resolution; it does not implement component quantities, composition anchors or multiple unfinished builds.

Task-created preview processes and isolated browser sessions were closed after verification. No generated Python file was created.
