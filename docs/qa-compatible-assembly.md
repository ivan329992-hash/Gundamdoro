# Compatible assembly pilot acceptance — 2026-10-13

Baseline: local commit `fb05590`. Scope: SPEC section 30, MECHA-01/MECHA-02 only, five slots, 32 combinations. No Git commit/push, database, cloud, 3D, new collection rewards or replacement of existing fixed-model artwork.

## Changes

- Added two original front-view assembly masters under each model's `assembly/master-front-v1.png`; prompts, source outputs and caveats are in `assembly-artwork.md`. Existing manifests, collectible PNGs and fixed-model final PNGs were not changed.
- `domain/assembly.ts` defines compatibility policy and two-point uniform transform math. The composition root injects the two-model policy through `AppDependencies`; workbench preparation/selection/randomization/save enforce it independently of the UI.
- `registered-assembly.json`/`registeredAssembly.ts` supply polygon masks and semantic segments/joints. `RegisteredMecha` and assembly-only thumbnails use actual selected masked source layers; workbench/hangar/detail share the renderer. Historical profile-less records still use the legacy compositor. Unknown profiles show explicit unavailable feedback.
- Custom records persist optional `assemblyProfile` inside the unchanged version-5 envelope/key/ten top-level fields. Unsupported drafts/ownership/history are preserved, saves remain idempotent and do not consume inventory or grant focus credit. Hangar grouping includes the render profile.
- The assembly entry is enabled with two compatible models, clear locked/unsupported/empty/error states and larger sticky preview. A development-only calibration/gallery entry edits transient mask/segment/joint points and exports reviewed JSON without initializing or writing business state. Production output excludes its UI/module.

## Automated checks

- `npm test`: **207 tests in 26 files passed**, including 32 combination geometry cases, segment/rotation/aspect-ratio guards, policy-filtered preparation/selection/randomization, unsupported draft preservation, ownership guards, idempotent/profile-aware saves, legacy/future profile persistence, dispatch and grouping. Existing timer/recovery/asset/storage/module-boundary tests remain green.
- `npm run build`: TypeScript and Vite production build passed.
- `git diff --check`: passed; existing LF/CRLF informational warnings remain.
- Production JS/CSS scan found no calibration UI strings/classes (`装配校准与 32`, `lab-gallery`, `导出校准 JSON`). The development entry is not shipped.

## Browser checks

Playwright used isolated session `gundam-assembly-v2`; fixtures did not touch the user's normal browser/application data. Verified:

- All 32 registered combinations in the gallery, both same-model restorations and larger asymmetric mixed examples. At normal UI sizes there were no obvious detached joints, missing major modules, distorted limb proportions or cropped feet/antennae.
- Semantic masks were checked against PNG alpha: sampling every 2 pixels at alpha >= 128 covered approximately **99.987%** of MECHA-01 and **99.966%** of MECHA-02's visible source pixels. This is sampled coverage, not a claim of exact pixel reconstruction after normalization; a handful of seam/edge pixels remain.
- Manual head/left-arm/legs selection, naming, save, disabled duplicate save, hangar/detail profile dispatch, reload and draft recovery. Saves retained all unlocks, phase and focus totals.
- Twelve randomization runs selected only the compatible two-model parts. At 420×640 the preview remained visible while scrolling and changing the right arm; 1000px layout used side-by-side preview/controls.
- Empty inventory disabled random/save; locked browsing showed the two compatible torso options without granting ownership. One real accelerated focus unlocked exactly `mecha-01:torso`, and the partial assembly showed only the owned torso.
- Image-only request failure produced resource/retry feedback; the persisted snapshot stayed byte-identical, and retry recovered the images. Expected request-failure console errors were confined to this deliberate fault test; normal profile/legacy flows had no unhandled page errors.
- Unsupported old draft choices stayed stored and save-disabled; old archived recipes used the legacy renderer, unknown future profiles showed unavailable feedback. Calibration edits, export and reset left the business snapshot byte-identical; exported torso X changed to 544 as requested and reset returned to 543.

Screenshots and JSON export remain ignored under `output/playwright/`: `assembly-v2-matrix-initial.png`, `assembly-v2-preview-initial.png`, `assembly-v2-mixed-large.png`, `assembly-v2-workbench-wide.png`, `assembly-v2-showcase.png`, `assembly-v2-workbench-420.png`, `assembly-v2-native.png`, `registered-assembly-export.json`.

## Windows checks

Offline `npm exec --offline -- tauri build --bundles msi` passed with process-local MSVC/Windows SDK paths. Installer: `src-tauri/target/release/bundle/msi/Gundamdoro_0.1.0_x64_en-US.msi`, **53.21 MiB**. The pre-existing linker import-library informational warning remains unchanged.

Launched the release executable with isolated WebView2 data under ignored `output/native-assembly-v2-profile` and a process-local debugging port. Attached Playwright to the actual native WebViews: selected the mixed head/left-arm/legs, named/saved the custom build, verified five masked image layers and `standard-front-v1`, ten unchanged owned parts and zero added focus sessions, with no page errors. Normal main-window close exited the host process. The owned QA process was cleaned up; the installer was not installed over the user's application.

## Result and limits

The two-model pilot's automated, visual/browser and native-build/smoke acceptance checks passed. It is ready for user review, not a claim that all catalog models can mix. Source artwork still has a few colored silhouette-edge artifacts that may need additional registration-preserving cleanup for high-resolution marketing images. Installation/uninstallation, notification delivery, physical suspend/wake and multi-monitor behavior were not repeated because native timer behavior was unchanged. No automatic sample unlocks are shipped.

Next: user visual acceptance of the pilot before extending the same authoring/calibration contract to additional models.
