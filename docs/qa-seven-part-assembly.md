# Seven-part compatible assembly acceptance

Date: 2026-10-13. Scope: SPEC section 31, extending the two-model pilot in section 30. This supersedes the five-slot/32-combination counts in `qa-compatible-assembly.md`.

## Delivered behavior

- MECHA-01/02 collect torso, head, left arm, right arm, hips, left leg and right leg in seven focuses. Other catalog counts remain five/five/five/five/six. Manual assembly adds no focus credit.
- Seven independent owned-part selectors and randomization use `standard-front-v2`. Hips mount to the chosen torso and both legs mount to the chosen hips. Deterministic masks reuse the two original registered masters; no additional raster generation or distortion.
- Version-6 snapshots preserve the storage key and ten top-level fields. Old earned paired legs unlock all three constituents; completed old progress maps to seven while retaining actual session/minute totals. Unfinished running/paused fifth focuses retain captured timers and earn hips only. Historical v1/profile-less archive recipes retain their renderers; eligible old drafts receive seven slots and a fresh identity.

## Automated and build checks

- `npm test`: 27 files, 328 tests passed. Coverage includes 128 v2 recipes, 32 frozen v1 recipes, similarity transforms and selected-parent attachment, versions 0–5 migration, old running/paused/expired sessions, idempotency, historical profiles, current-version fifth-stage integrity, invalid/duplicate archive evidence and existing module boundaries/regressions.
- `npm exec --offline -- tauri build --bundles msi`: passed, including `tsc -b` and Vite production build. MSI: `src-tauri/target/release/bundle/msi/Gundamdoro_0.1.0_x64_en-US.msi`, 53.21 MiB. Rust reports the existing MSVC import-library informational linker warning; no build error.
- `git diff --check`: passed. Git reports existing LF-to-CRLF conversion notices.

## Browser and native verification

Playwright used an isolated browser profile; native QA used `output/native-seven-part-qa-profile`. Real user progress was not replaced.

- Viewed all 128 recipes in four 32-card screenshots (`output/playwright/seven-matrix-1.png` through `seven-matrix-4.png`). Inspected independent hip/leg swaps at larger size and corrected missing hip-connector coverage. Normal-size previews show continuous joints and consistent proportions.
- Completed seven actual accelerated focus sessions in the browser, including reload after stage five. Stage five held exactly five unlocks; stages six/seven displayed individual legs; manual assembly archived once with seven sessions and actual elapsed credit. Screenshot: `seven-focus-complete.png`.
- Loaded an old v5 fixture with both paired-leg unlocks and a v1 custom archive. Migration displayed 14 current components, retained both old IDs internally, expanded the draft, and preserved five sessions/125 minutes. Independently selected MECHA-02 hips/right leg with MECHA-01 left leg, saved v2 once, and verified five-layer v1 and seven-layer v2 archives together after reload.
- Checked workbench and dossier at 420×640 with no horizontal overflow. Screenshots: `seven-custom-preview.png`, `seven-workbench-narrow.png`, `seven-detail-narrow.png`.
- Launched the rebuilt Windows executable with isolated WebView storage. Opened seven-slot workbench, randomized, named and saved a seven-layer v2 recipe; ownership and 125-minute history remained unchanged. Screenshot: `seven-native.png`. Closed the test app normally afterward.
- Opened the development 128-combination lab and verified the business snapshot stayed byte-for-byte unchanged. Production excludes the development entry.

## Boundaries and next task

Section 31 acceptance is satisfied for the two calibrated models. Other models remain collectible but are not enabled for custom mixing. Minor colored extraction fringes in the existing master artwork remain a high-resolution artwork limitation (see `assembly-artwork.md`). Validation used representative fixtures, not a copy of the user's private save. No Git commit/push or MSI installation was performed. Next: user visual acceptance, then independently calibrate additional models if requested.
