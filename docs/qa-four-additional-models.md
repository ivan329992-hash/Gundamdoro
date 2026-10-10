# Four additional original models QA

Completed verification date: 2026-10-05 (Asia/Shanghai).

## Scope

Expanded the selectable catalog from two to six original models. New designs: MECHA-03 heavy assault (重装突击型), MECHA-04 winged aerial (羽翼巡航型), MECHA-05 skeletal close-combat (骨架近战型), and MECHA-06 high-mobility interceptor (高速突击型). Each has one full-model image and five collectible modules, for 24 new selected runtime PNGs.

Model data is discovered through the existing catalog/asset adapters. No timer transition, store action, persisted field, dependency, database or network functionality was added. Storage remains `gundamdoro-app-state`, schema version 3, with the same eight fields. The existing default factory break scene is shared.

## Changes and asset verification

- Added `src/mecha/mecha-03` through `mecha-06` manifests and corresponding local PNG sets under `src/assets/mecha/`.
- Added optional manifest descriptions in `src/domain/types.ts`/`catalog.ts` and displayed them in `ModelSelectionScreen`; existing model IDs/names and stored archive metadata remain stable.
- Generated artwork with the built-in imagegen tool. Full designs/prompts are recorded in `docs/design-four-models.md`; completed/refinement prompts are recorded in `docs/design-four-models-resume.md` and each model's ASSETS.md. Official product pages were used as design-direction references; no official image or logo was copied into runtime assets.
- Selected `parts/torso-v3.png` for MECHA-04 to retain complete wings and remove pelvic armor, and `parts/torso-v2.png` for MECHA-05 to remove invented rear fins and shoulder shells. Three unused torso variants are preserved under the models' `source/` directories and excluded from runtime asset discovery; no image was deleted.
- Updated the loader regression and added `tests/mecha-assets.test.js` to check selected PNG signatures, local paths, transparency support, positive dimensions, 3:4 aspect ratio and consistent canvas dimensions per model. README, SPEC and architecture documentation now describe six selectable models.

All 24 new selected PNGs are 1086 x 1448, matching the 3:4 aspect ratio. Native bitmap checks found transparent or nearly transparent corner pixels (alpha 0-1). Full robots, component silhouettes and refined torso outputs were visually inspected. PNG decoding was also verified in the browser.

## Automated checks

`npm test`: 92 tests passed in 12 files, retaining the previous 86 tests and adding six model-level PNG checks. The loader confirms all six model IDs, all four new design descriptions and 36 distinct selected part/final image URLs. Existing timer, archive, migration, model-switching and dependency-boundary regressions remain passing.

`npm run build` passed TypeScript project checks and Vite production bundling. `git diff --check` passed.

## Browser checks

Used isolated Playwright CLI session `gundam-six-qa` at `http://localhost:1420/?fast=1`. The user's browser storage was not modified. Each of the four new models was completed through five actual focus sessions in the test profile, then manually assembled; no synthetic collection progress or archive record was injected.

| Behavior | Result |
| --- | --- |
| Six selectable previews/design labels | All six full-model PNGs decode; correct labels and distinct URLs |
| Five focus targets per new model | Correct model-specific torso, head, left arm, right arm and leg unit |
| Part rewards and break flow | Every accumulated sprite decodes; first four rewards enter break; End Break preserves progress |
| Model switching after part collection | Locked; current build remains unchanged |
| Fifth part/manual assembly | Waits for user click; assembly does not add focused minutes/sessions |
| Reload and archive identity | Selected model retained; MECHA-04 mid-assembly reload retains the build ID; repeated reloads do not duplicate archives |
| Four completed models together | All four real records retained; hangar images resolve from each record's model ID |
| BUILD AGAIN and saved envelope | MECHA-06 retained, progress reset, four archives and settings retained; version 3 and eight fields |
| 480x720 / 420x640 layouts | Screenshots visually inspected; minimum-width selector has no horizontal overflow |

No page errors or browser console errors were observed. Screenshots: `output/playwright/six-model-selector.png`, `six-model-selector-420x640.png`, `mecha04-wing-focus.png`, and `four-new-models-hangar.png`.

## Desktop build and limits

`npm exec --offline -- tauri build --bundles msi` passed with the existing Rust/MSVC/Windows SDK and offline cache. Updated artifact: `src-tauri/target/release/bundle/msi/Gundamdoro_0.1.0_x64_en-US.msi` (44.80 MiB). The pre-existing informational linker import-library warning remains unchanged. This model-content extension's acceptance checks are satisfied.

Native installation/uninstallation, physical sleep/wake and native WebView fault injection were not repeated. Independent component inventory, cross-model composition and attachment metadata remain separate work. The localhost development preview is kept running for the user's web testing; the isolated QA browser is closed after verification. No Git commit/push or generated Python file was produced.
