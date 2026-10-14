# Optional backpack / wings acceptance

Date: 2026-10-13. Scope: SPEC section 33.

## Delivered

- Added an optional 背包／翅膀 selector alongside the seven required body slots. Owned `wing-zero-ew:wings` can be equipped on all seven bodies or removed with 不装备背包／翅膀. Preparation defaults to none; randomization samples none or owned compatible wings. Body-only builds remain saveable.
- V4 reuses frozen v3 body geometry and the existing `parts/wings.png`, with per-part asset/dimension metadata and a derived torso back joint. Wings draw behind all body modules with uniform scaling. No raster asset was generated or edited. Original torso-integrated equipment remains attached to its torso.
- Version 8 retains the storage key and ten fields, preserving optional IDs in drafts, saved recipes and unknown references. V7 upgrades do not repeat paired-leg migration or grant ownership. Equipping/unequipping changes draft identity; existing recipes retain their original v1/v2/v3/profile-less renderer. Equipped/unequipped compositions group separately.
- Store actions enforce phase, ownership, matching slot and calibration guards. Selected optional parts are validated and serialized; saving consumes nothing and grants no focus credit. Unequip is restricted to optional slots.

## Checks

- `npm test`: 29 files, 372 tests passed. New tests cover locked/wrong-slot/unknown wings, empty defaults, all workshop phase guards, random boundary/none choices, equip/unequip identity, idempotent archives, unknown-reference preservation, restart, v7 paused timer and hips-only integrity, all seven back mounts, original source resolution and back-to-front rendering. Existing focus counts and migration regressions pass.
- `npm exec --offline -- tauri build --bundles msi`: passed, including TypeScript and Vite production build. Installer: `src-tauri/target/release/bundle/msi/Gundamdoro_0.1.0_x64_en-US.msi`, 59.81 MiB. Existing informational MSVC import-library linker warning remains.
- `git diff --check`: passed; production excludes AssemblyLab.

## Browser and desktop acceptance

Playwright used isolated `wings-slot` browser storage; native QA used `output/native-wings-qa-profile`. Real user saves were not replaced and the MSI was not installed.

- Loaded a v7 fixture with 49 owned body parts, old v3 history, hips-only stage five and 125 minutes. The new selector showed locked wings without an equip button; a seven-part v4 build saved successfully without wings.
- Added the earned wing ID to the isolated fixture, reloaded and confirmed it was not automatically equipped. Equipped and saved eight-part v4, unequipped and saved seven-part v4, then re-equipped an unsaved draft and reloaded. Draft, old archive, equipped archive and unequipped archives all survived. Identical no-wing v4 records grouped together while equipped and old-v3 records remained separate; 4 original archive rows displayed as 3 groups.
- Simulated wing image failure and used Retry; the business snapshot remained byte-for-byte unchanged. Captured collection stayed 5/7, five sessions and 125 minutes; ownership stayed 50 components.
- Verified narrow 420×640 workbench/dossier with no horizontal overflow. The equipped dossier reports eight parts and the wing origin. Screenshots: `output/playwright/wings-workbench-preview.png`, `wings-workbench-narrow.png`, `wings-detail.png`.
- Inspected 56 wing-equipped sample recipes across all seven models in `wings-gallery-1.png` and `wings-gallery-2.png`. Wings remain behind head/torso/arms/hips/legs with no whole-body substitution. Checked the lab's wing source editor uses the independent PNG and safely falls back to torso when changing to a model without optional source art. Lab operations did not change the business snapshot.
- Launched the rebuilt Windows executable with isolated WebView storage, unequipped/saved, equipped/saved and reloaded into the winged dossier. Six fixture archives, 50 owned parts, stage five and 125 minutes remained correct. Screenshot: `wings-native.png`. Closed the QA application normally.

## Outcome

Section 33 acceptance is satisfied. Next: user visual acceptance. Only the already separate Wing Zero wings are available in this optional slot; extracting other torso-integrated backpacks is separate artwork work. Existing generated-art edge fringes and unofficial fan-art provenance remain unchanged. No Git commit/push was performed.
