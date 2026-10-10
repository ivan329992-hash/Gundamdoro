# Gundamdoro

A desktop Pomodoro timer where focused work collects mecha parts for a final build.

## MVP idea

Each of five focus sessions unlocks one detached part in a separate collection slot. The first four reveals lead to a break, which can be ended early. The fifth returns to the collection screen. Once all parts are collected, click Assemble to build the mecha without an extra focus session.

Core loop:

```text
READY -> FOCUS -> PART_REWARD -> BREAK -> READY (parts 1-4)
                            \-> READY (part 5)
READY (5 / 5) -> click Assemble -> ASSEMBLY -> COMPLETE
```

Finished builds are automatically archived in the local hangar. Open `仓库` from READY or COMPLETE to view model images, completion dates and per-build focus totals. Build Again preserves all archived models; repeated builds of the same model are saved separately.

Click `选择机型` before collecting the first part, or after completing a build, to choose MECHA-01 through MECHA-06 or `飞翼零式 EW`. Each model has five focus rewards and its own final image. Once a part is earned, finish the current build before changing models. `BUILD AGAIN` repeats the selected model; selecting a model from COMPLETE starts a fresh build and keeps the archived collection.

The additional original designs are MECHA-03 (重装突击型), MECHA-04 (羽翼巡航型), MECHA-05 (骨架近战型) and MECHA-06 (高速突击型). Backpack, wings and torso-mounted equipment belong to the torso collectible. See [design directions and prompts](docs/design-four-models.md) and [refinement prompts](docs/design-four-models-resume.md).

Open `配件仓库` from READY or COMPLETE to inspect permanently unlocked components. Each completed focus unlocks that model's matching component once; components survive BUILD AGAIN/model changes. Filter by model or inspect locked components to see how to earn them.

Custom assembly is paused: its UI entrypoints are hidden, while existing drafts, unlocks and archived custom recipes remain stored. The fixed-model manual final assembly is unchanged. Do not enable `CUSTOM_ASSEMBLY_ENABLED` until all selectable components have compatible mixing layouts and visual acceptance.

`飞翼零式 EW` is user-supplied generated unofficial fan art, included at the user's explicit request. Its five rewards are torso + wings, corrected head, left arm, right arm and paired legs; torso/wings are displayed separately in one reward group. Final assembly uses the provided whole-model PNG. See [asset provenance and boundaries](src/assets/mecha/wing-zero-ew/ASSETS.md). It is not official or licensed artwork, and the code license does not grant character/commercial-use rights.

See the [Wing Zero EW integration acceptance record](docs/qa-wing-zero-ew.md) for regression and browser checks.

## Planned stack

- Tauri v2
- React
- TypeScript
- Vite
- Zustand + persist
- Framer Motion

Development requirements are defined in [SPEC.md](./SPEC.md). Codex instructions are defined in [AGENTS.md](./AGENTS.md).

> MVP scope with approved extensions: Windows desktop, local-only, six original built-in mecha plus one user-supplied unofficial fan-art model, five focus rewards per model and manual assembly, no backend, no accounts, no cloud sync.

## Development

```bash
npm install
npm run dev
npm run build
npx tauri dev
```

Use `npm test` for the timer/store regression suite. Browser preview at `http://localhost:1420/` updates while editing. In BREAK, click `结束休息`; after collecting all parts, click `开始拼装`.

Stored version-0 progress is migrated automatically to the five-part workflow; settings and focus history are preserved.

Persistence version 2 also migrates version-1 state. An existing completed model is imported into the hangar once, with its completion time marked unknown if it was never recorded. Current collection progress remains independent of the hangar.

Current saves use version 4 and migrate versions 0/1/2/3 without changing the storage key or losing existing progress/hangar records. The snapshot adds permanent unlock IDs and a workbench draft. Migration recovers components from the current collected-part count and known completed fixed models; absent historical builds cannot be reconstructed. Custom recipes do not grant ownership. An unavailable active model stops startup without overwriting the save; restore its model files or use the matching app version to retry. Unknown models/parts in historical records are preserved with resource-unavailable feedback.

See the [initial multiple-model acceptance record](docs/qa-multiple-models.md), [four additional models acceptance record](docs/qa-four-additional-models.md), [inventory and custom assembly acceptance record](docs/qa-inventory-custom-assembly.md) and [MECHA-02 asset prompts/provenance](src/assets/mecha/mecha-02/ASSETS.md).

If startup cannot read or parse the local save, the save comes from a newer app, or startup recovery cannot write, a retry screen is shown instead of entering the app. Check storage permissions and the app version, then click `重新读取存档`. Failed reads do not reset or overwrite the original save; do not clear application data to dismiss this error. Invalid fields in readable saves are still normalized automatically.

The model registry discovers `src/mecha/<model-id>/manifest.json`; every valid registered model appears in the selection screen. Use a unique stable model ID, add local part assets under `src/assets/mecha/<model-id>/parts/` and a full-model asset under `final/` referenced by `finalAsset`. Add `break/break-01.png` for a model-specific break scene, or reuse the default factory scene. Hangar previews resolve the stored model ID. Do not remove or rename a model ID that existing saves use.

The production Windows bundle is generated with `npx tauri build`. For local timer verification only, append `?fast=1` to the Vite URL; this converts configured minutes to seconds in development mode and is disabled in production builds.

## Architecture

Business rules are separated into `src/domain/` and `src/application/`; Zustand remains the state facade in `src/store/`. Runtime, storage, catalog and asset implementations are bound in `src/app/dependencies.ts`. The current adapters retain localStorage, bundled images and the existing fast-mode behavior.

See [module boundaries and extension rules](docs/architecture.md). `npm test` includes dependency checks that prevent core rules from importing UI, stores, adapters or browser APIs. Startup waits for storage hydration before recovering timers and rendering the app; version-4 snapshots retain the existing key and original fields while adding inventory/draft data. Static assembly source bounds and mounting points live in `src/adapters/assets/assembly-layouts.json`; original PNG files are not modified.
