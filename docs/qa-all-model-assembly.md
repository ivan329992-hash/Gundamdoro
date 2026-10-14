# All-model independent lower-body and assembly acceptance

Date: 2026-10-13. Scope: SPEC section 32. Earlier two-model QA reports describe the prior release, not the current catalog counts.

## Delivered changes

- MECHA-03–06 now require seven focuses, with separate hips, left leg and right leg. Wing Zero EW requires eight: seven body modules followed by existing independent wings. All seven models offer their seven owned body parts for manual/random custom mixing. Wings remain a collectible outside the body assembly slots.
- Five separate front-view masters were generated using the built-in imagegen tool and copied into `src/assets/mecha/<model>/assembly/master-front-v1.png`. Original collectible/final images were not overwritten. `registered-assembly-v3.json` records calibrated masks, source dimensions and parented joints; original v1/v2 profile files remain frozen.
- Version 7 uses per-alias migration gates: the pilot models split only before v6, other models before v7. Existing progress, captured timers, acquired wings, names, archive IDs and actual focus statistics survive. Draft aliases expand with new identity; archived compositions retain their original profile/rendering.
- The development lab shows 56 representative recipes or 128 complete combinations of a selected model pair. It does not allocate all 823,543 possible recipes or write business state.

## Automated and production verification

- `npm test`: 28 files, 354 tests passed. New coverage includes fresh seven/eight-part collection for every remaining model, v0–6 earned paired-leg migration, fifth-focus/wing-focus running and paused recovery, historical reward/break handling, v6 pilot hips-only integrity, complete wing archive identity, mixed-origin v3 saving, v2 history, and all 49 ordered source/parent pairings across seven modules. Existing tests continue covering idempotency, timestamp math, storage errors, dependency boundaries and compatibility policy guards.
- `npm exec --offline -- tauri build --bundles msi`: passed, including TypeScript and Vite production checks. Final installer: `src-tauri/target/release/bundle/msi/Gundamdoro_0.1.0_x64_en-US.msi`, 59.81 MiB. The pre-existing MSVC import-library informational linker warning remains; no new build errors.
- `git diff --check`: passed. No existing raster asset appears in `git diff --name-only -- src/assets`. New raster assets are additions only. Production output excludes AssemblyLab.

## Real browser and Windows checks

Playwright used separate `all-models` and `all-model-focus` profiles. Native QA used the isolated `output/native-all-models-qa-profile`; no real user progress was replaced and no MSI was installed.

- Inspected seven monochrome-model assemblies plus 49 representative mixes in `output/playwright/all-models-matrix-final-1.png` and `all-models-matrix-final-2.png`. Large spot checks corrected MECHA-04 antenna fragments leaking into torso masks and MECHA-03 backpack remnants leaking into arm masks. Additional montage checks covered all 128 recipes for each of MECHA-03/Wing Zero, MECHA-04/05 and MECHA-06/01 (`all-models-pair-*.png`). These are bounded visual samples, not exhaustive verification of every seven-model recipe.
- Loaded a v6 fixture containing seven fixed-model histories and profile-less/v1/v2 custom recipes. The inventory displayed 50 current components, retaining seven historical aliases internally. MECHA-03 old completed progress became 7/7 while keeping five actual sessions and 125 minutes. Selected one body part from each of the seven models, saved once as v3, opened its dossier, reloaded, and confirmed all four recipe formats remained viewable. Screenshots: `all-models-custom.png`, `all-models-detail.png`.
- Checked workbench and dossier at 420×640 with no horizontal overflow (`all-models-workbench-narrow.png`).
- Ran eight real accelerated Wing Zero focus sessions, reloading after hips. Targets five through eight displayed HIP UNIT, LEFT LEG, RIGHT LEG and wings respectively. Each session granted exactly one part; the final reveal returned to READY and manual assembly archived once with eight real sessions (`all-models-wing-complete.png`).
- Verified the development lab left the business snapshot byte-for-byte unchanged after switching pair galleries and pages.
- Launched the final rebuilt Windows executable, verified seven-layer mixed preview, simulated image failure/retry without changing the snapshot, randomized owned parts, saved v3 once and recovered all 12 fixture archives after restart. Captured minutes remained 125 (`all-models-native.png`). Closed the QA application normally.

## Artwork and remaining limits

Prompts, generated-source filenames and all final project paths are recorded in `assembly-artwork-all-models.md`. Wing Zero remains explicitly unofficial/unlicensed generated fan art. Native MECHA-06 output differs by one canvas pixel; actual dimensions are recorded and uniform semantic transforms preserve its proportions. Fine colored extraction fringes remain a possible high-resolution artwork cleanup task.

Section 32 acceptance is satisfied. Next: user visual acceptance. Optional future work includes independent backpack/wing mixing and high-resolution edge cleanup. No Git commit/push or new backend/dependency was included.
