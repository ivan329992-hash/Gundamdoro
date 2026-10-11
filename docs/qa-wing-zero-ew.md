# Wing Zero EW integration acceptance

Date: 2026-10-10 (Asia/Shanghai).

## Scope

Added the user-provided generated unofficial fan-art model `wing-zero-ew` alongside the six original models. The user explicitly requested including its assets in Git. All seven selected PNGs are unchanged copies: corrected head, torso, wings, left/right arms, paired legs and full-body final image. Source notes/prompts and unofficial/unlicensed boundaries are retained under `src/assets/mecha/wing-zero-ew/`; this is not an original or officially licensed character design.

The original five-session workflow remains: torso and separate wings are one reward group, then corrected head, left arm, right arm and legs. No sixth focus. Optional adapter-owned presentation metadata gives source viewports and grouped standalone previews; original models retain their existing image rendering. Final assembly/completion/hangar use the provided full-body image, never a hard-spliced component composite. The default factory break scene is reused.

Custom mixing entrypoints are hidden by `CUSTOM_ASSEMBLY_ENABLED = false`. Inventory remains available; existing ownership, drafts, custom archive recipes and store actions are preserved. New fan-art parts are not claimed to have mixing layouts. Storage remains version 4 with the same key. A fixed body minimum width that caused horizontal scrolling alongside native vertical scrollbars was reduced; desktop minimum window dimensions remain unchanged.

## Verification

- `npm test`: 122 tests passed in 15 files. New coverage checks grouped torso/wings, corrected head crop, unchanged original markup, paused mixing UI, companion PNG dimensions/viewports, and each of the seven registered models completing five focuses, one idempotent archive, restart and model-preserving Build Again.
- `npm run build`: TypeScript and production Vite build passed. Windows MSI packaging also passed; the existing informational linker import-library warning is unchanged.
- Isolated Playwright profile: selected the new model, configured DEV fast mode, completed all five actual focus timers with early-ended breaks, checked torso/wings display, paused/reloaded the corrected-head focus, refreshed at the fifth reward before manual assembly, archived once, reloaded and inspected the hangar, then Build Again and persistent inventory. User browser data was not changed.
- Visually inspected all imported source PNGs and actual focus/complete/inventory screenshots. Corrected head is enlarged through its source viewport; torso/wings remain visibly separate. Checked narrow layouts and retained all previous original models. No application error appeared in the successful browser flow console.

Screenshots are local-only under `output/playwright/wing-*.png`; they are excluded from Git along with build/cache output. Generated publishing helpers under `output/` contain no credentials; any existing Git credential is read into process memory only. No Python file was generated.

Installation/uninstallation and physical sleep/wake were not repeated. The full-body master retains the original user's head colors; the corrected detached head is intentionally a newer source variant, not an edited whole-model image. This task does not generate new artwork or resume custom mixing.

## Head-color follow-up — 2026-10-10

The user rejected the whitened lateral head panels after reference review. Built-in imagegen edited the detached head into `parts/head-blue-v2.png`, restoring blue side armor while retaining the white crown/faceplate, yellow antenna, green sensors and red chin. The former `head-corrected.png` remains for rollback. The full-body master already has blue side armor and was not changed. See `head-blue-v2.prompt.md` for the exact prompt and source identity.

The new PNG is 1086 × 1448 RGBA with transparent corners. Read-only alpha sampling found visible bounds x448..682, y188..372 inside the revised source viewport `[425,160,280,240]`; blue pixels are present. Native dimensions and companion/viewport tests passed. Updated resource-selection/render tests reject the old head URL. `npm test` again passed all 122 tests; `npm run build` passed TypeScript and production bundling.

An isolated browser completed the first fast focus, entered and paused the head focus, refreshed, decoded the new resource and captured its enlarged preview. The 420 × 640 layout has no horizontal overflow or asset-error alert. Source and actual preview were visually inspected; screenshots are `output/playwright/wing-head-blue-v2-preview.png` and `wing-head-blue-v2-focus.png`. No timer, storage or archive rule changed. This follow-up has not been committed/pushed or rebuilt into a desktop installer.

## Marked fragment cleanup — 2026-10-10

The user marked unwanted white/gray pieces around the antenna roots and upper helmet. Two built-in imagegen edit passes produced `parts/head-clean-v3.png`; only the second output was selected. It removes the flared upper gray wedges and side scraps while retaining the central white crown/faceplate, blue sides and gold antenna. The earlier versions remain available for rollback, and the final whole-model PNG is unchanged. Exact prompts/source IDs are recorded in `head-clean-v3.prompt.md`.

The selected PNG remains 1086 × 1448 RGBA with transparent corners. Its sampled alpha bounds x42..1042, y298..1084 fit the new source viewport `[20,275,1046,840]`, leaving antenna margins. Generation reframed the head; the adapter metadata was updated accordingly, without per-component React offsets or changes to state/timers. Updated resource assertions reject prior head URLs. All 122 tests, TypeScript and the production frontend build passed; `git diff --check` passed.

An isolated browser verified the actual second-focus preview, image decode, paused-session reload and 420 × 640 layout with no asset alert or horizontal overflow. The actual preview was visually inspected; screenshots are `output/playwright/wing-head-clean-v3-preview.png` and `wing-head-clean-v3-focus.png`. Browser test data did not affect user storage. This revision was not committed/pushed or repackaged into the desktop installer. No Python file was created.
