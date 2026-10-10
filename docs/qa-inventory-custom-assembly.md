# Permanent inventory and custom assembly QA

Date: 2026-10-09 (Asia/Shanghai).

## Scope and behavior

Completed SPEC section 24: permanent reusable part unlocks, an independent inventory/workbench view, model filtering and locked/empty states, manual or random five-slot selection, actual composited preview, naming and custom hangar archiving. Current fixed-model focus collection and manual assembly remain available. Custom saves consume no parts and award no focus sessions/minutes.

Version 4 retains the local storage key and the original eight fields, adding `unlockedParts` and `workbench`. Versions 0/1/2/3 recover ownership from current collected parts and known fixed-model archives. Missing historical builds cannot be inferred. Unknown valid part IDs/archived recipes remain stored. Draft identity/name/selections survive reload; unchanged drafts cannot be saved repeatedly. Editing a recipe or name creates a new identity and does not mutate older archives.

## Changed modules

- `domain/inventory.ts` and shared types/catalog: part slots, stable model/slot IDs, permanent ownership, complete/compatible composition guards and explicit manifest slot validation. All six manifests now identify their component slots.
- `application/workbench.ts`, focus use cases, default state, snapshot codec and store binding: injected random selection, draft actions, idempotent custom saving, atomic focus unlock and version-4 migration. Existing timer/store action entrypoints remain available.
- `InventoryScreen`, `CompositeMecha`, app/Complete/Hangar views and CSS: inventory entry, manual/random selection, persisted naming, sticky or side-by-side preview, recipe-based custom hangar cards and retry/unavailable states.
- Adapter-owned `assembly-layouts.json`/`compositionLayout.ts`: alpha-derived source bounds, neck/shoulder/waist attachment points and scale data for 30 components. Drafts and saved custom models use the same generic static SVG compositor. Actual component PNGs are used; no full-mecha image substitutes for a custom recipe and no image pixels were rewritten.
- Regression tests, SPEC, README and architecture documentation. A pre-existing guide comment containing a glob terminator broke TypeScript parsing; its intent was preserved with safe wording. Dependency checking now strips comments before checking platform globals, avoiding false positives from explanatory annotations while retaining actual import/global checks.

## Automated verification

`npm test`: 109 tests passed in 14 files, including the previous 92 regressions. Added coverage includes focus unlock timing/idempotency/cancel, version-0/1/2/3 ownership migration, wrong-slot/locked/incomplete/blank-name guards, bounded random choice, active-phase guards, non-consumption, custom-save idempotency and immutable recipes, draft restoration/missing identity, unknown component preservation, actual layer rendering and in-canvas geometry data.

`npm run build` passed TypeScript checks and Vite production bundling. `git diff --check` passed.

## Browser and visual verification

Used isolated Playwright CLI session `gundam-workshop-qa`. User browser data was not modified. One actual fast focus granted exactly one component. A seeded version-3 snapshot with four historical completed models recovered 20 unlocks while retaining the real partial focus progress. A separate all-owned fixture was used to inspect all six calibrated same-model compositions; it was confined to the test profile.

| Behavior | Result |
| --- | --- |
| Empty inventory / locked catalogue | Empty guidance, 30 locked definitions, disabled random/save for empty stock |
| Live focus reward | One correct component unlocked; no premature or duplicate grant |
| Legacy migration | Version 4, old archives and current stage/minutes retained; ownership backfilled |
| Manual mixed build | Wing torso, different-model head/legs and close-combat arms render from five real PNG assets |
| Custom save | Record/recipe added once; components and active focus progress/minutes unchanged |
| Reload | Draft name/identity/recipe restored; saved draft remains protected against duplicate save |
| Hangar | Custom composition and five part origins shown alongside preserved fixed models |
| Random selection | Only owned matching-slot parts selected; original focus statistics retained |
| Minimum/wide layouts | 420x640 sticky preview stays visible while browsing; 1000px view uses side-by-side layout |
| Missing image / Retry | Image-only request abort shows feedback; retry restores it; stored JSON remains byte-identical |

All six same-model component combinations and the mixed example were visually inspected. MECHA-03's waist alignment and MECHA-02's redundant neck region were adjusted in layout data after inspection. Original raster assets were preserved.

Normal flow checks passed. Deliberate network fault injection produced expected image failure logs; corrected image-only interception and recovery passed. No unhandled application exception was observed during the successful flow checks.

Screenshots under `output/playwright/`: `component-inventory.png`, `custom-assembly-preview.png`, `custom-assembly-wide.png`, `custom-build-hangar.png`, `workbench-sticky-420x640.png` and `composed-mecha-01.png` through `06.png`. They contain isolated test fixtures, not the user's actual unlocks.

## Desktop verification and remaining limits

`npm exec --offline -- tauri build --bundles msi` passed. The Windows installer is `src-tauri/target/release/bundle/msi/Gundamdoro_0.1.0_x64_en-US.msi` (44.80 MiB). The existing informational linker import-library warning remains unchanged. The implementation and automated/browser/build acceptance checks for SPEC section 24 are satisfied.

Native installation/uninstallation, physical sleep/wake and exhaustive checking of all possible mixed combinations were not repeated. This version uses static 2D source bounds/mounting points; independently posed artwork can retain stylistic seam/proportion differences in unusual mixes. Stackable/consumable parts, external model importing, 3D, databases and networking remain separate work.

The local preview is kept running for user testing. The isolated QA browser is closed after verification. No Git commit/push, global configuration change or generated Python file was made.
