# Gundamdoro

A desktop Pomodoro timer where focused work collects mecha parts for a final build.

## MVP idea

Each focus session unlocks one detached part in a separate collection slot. The selected model's collectible list determines the number of sessions. All reveals except the last lead to a break, which can be ended early; the last returns to the collection screen. Once all parts are collected, click Assemble without an extra focus session.

Core loop:

```text
READY -> FOCUS -> PART_REWARD -> BREAK -> READY (parts 1 through N-1)
                            \-> READY (part N)
READY (N / N) -> click Assemble -> ASSEMBLY -> COMPLETE
```

Finished builds are automatically archived in the local hangar. Open `仓库` from READY or COMPLETE to view model images, completion dates and per-build focus totals. Build Again preserves all archived models; repeated builds of the same model are saved separately.

Click `选择机型` before collecting the first part, or after completing a build, to choose MECHA-01 through MECHA-06 or `飞翼零式 EW`. Each model's part list determines its focus count: the six original models currently have five parts each, while Wing Zero EW has six. To change an unfinished build, click `放弃制作` during focus, `放弃制作并换机型` during break, or `放弃并换机型` in READY and confirm. This clears only current-build progress/statistics and opens model selection; permanent inventory, hangar, settings and drafts survive. Confirmation pauses running focus; cancel/Escape resumes it, while an already paused timer stays paused. `取消本次` only cancels one session and retains collection progress. `BUILD AGAIN` repeats the selected model.

The additional original designs are MECHA-03 (重装突击型), MECHA-04 (羽翼巡航型), MECHA-05 (骨架近战型) and MECHA-06 (高速突击型). Backpack, wings and torso-mounted equipment belong to the torso collectible. See [design directions and prompts](docs/design-four-models.md) and [refinement prompts](docs/design-four-models-resume.md).

Open `配件仓库` from READY or COMPLETE to inspect permanently unlocked components. Each completed focus unlocks that model's matching component once; components survive BUILD AGAIN/model changes. Filter by model or inspect locked components to see how to earn them.

Custom assembly is paused: its UI entrypoints are hidden, while existing drafts, unlocks and archived custom recipes remain stored. The fixed-model manual final assembly is unchanged. Do not enable `CUSTOM_ASSEMBLY_ENABLED` until all selectable components have compatible mixing layouts and visual acceptance.

`飞翼零式 EW` is user-supplied generated unofficial fan art, included at the user's explicit request. Its six rewards are torso, cleaned head, left arm, right arm, paired legs and wings. Wings are collected separately on the sixth focus; the original five-part order is retained for save compatibility. Final assembly uses the provided whole-model PNG. See [asset provenance and boundaries](src/assets/mecha/wing-zero-ew/ASSETS.md). It is not official or licensed artwork, and the code license does not grant character/commercial-use rights.

See the [Wing Zero EW integration acceptance record](docs/qa-wing-zero-ew.md) for regression and browser checks.

Current model-specific focus-count behavior and compatibility checks are recorded in [variable component count QA](docs/qa-variable-part-counts.md).

## Planned stack

- Tauri v2
- React
- TypeScript
- Vite
- Zustand + persist
- Framer Motion

Development requirements are defined in [SPEC.md](./SPEC.md). Codex instructions are defined in [AGENTS.md](./AGENTS.md).

> MVP scope with approved extensions: Windows desktop, local-only, six original built-in mecha plus one user-supplied unofficial fan-art model, model-specific collectible counts and manual assembly, no backend, no accounts, no cloud sync.

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

Current saves use version 5 and migrate versions 0/1/2/3/4 without changing the storage key or original fields. Inventory now accepts stable IDs for additional component types such as wings. Partial older Wing Zero progress retains its five-part prefix and actual focus history; its next build requires six focuses. Legacy completed/in-assembly models stay completed/accepted without inventing sessions or minutes; historical archive statistics remain unchanged. Migration recovers components from collected progress and known completed fixed models; absent history cannot be reconstructed. Custom recipes do not grant ownership. An unavailable active model stops startup without overwriting the save. Unknown valid part IDs are preserved with resource-unavailable feedback.

See the [initial multiple-model acceptance record](docs/qa-multiple-models.md), [four additional models acceptance record](docs/qa-four-additional-models.md), [inventory and custom assembly acceptance record](docs/qa-inventory-custom-assembly.md) and [MECHA-02 asset prompts/provenance](src/assets/mecha/mecha-02/ASSETS.md).

If startup cannot read or parse the local save, the save comes from a newer app, or startup recovery cannot write, a retry screen is shown instead of entering the app. Check storage permissions and the app version, then click `重新读取存档`. Failed reads do not reset or overwrite the original save; do not clear application data to dismiss this error. Invalid fields in readable saves are still normalized automatically.

The model registry discovers `src/mecha/<model-id>/manifest.json`; every valid registered model appears in the selection screen. The `stages` list is the source of truth for the focus count; runtime `totalStages` is derived from its length (legacy declarations are ignored). Number stages consecutively from 1. Each stage defines one collectible; the final image and unused/alternate asset files do not count. Use a stable model-local `partId` for additional components, e.g. `wings` or `rifle`, independent of the five optional custom-mixing slots. Preserve existing component IDs and stage order when extending a released model. Add local images under `parts/` and the full image under `final/` referenced by `finalAsset`. A model-specific `break/break-01.png` is optional. Do not remove or rename IDs referenced by saves.

The production Windows bundle is generated with `npx tauri build`. For local timer verification only, append `?fast=1` to the Vite URL; this converts configured minutes to seconds in development mode and is disabled in production builds.

## Architecture

Business rules are separated into `src/domain/` and `src/application/`; Zustand remains the state facade in `src/store/`. Runtime, storage, catalog and asset implementations are bound in `src/app/dependencies.ts`. The current adapters retain localStorage, bundled images and the existing fast-mode behavior.

See [module boundaries and extension rules](docs/architecture.md). `npm test` includes dependency checks that prevent core rules from importing UI, stores, adapters or browser APIs. Startup waits for storage hydration before recovery; version-5 snapshots retain the existing key and ten data fields. Static custom assembly mounting points live in `src/adapters/assets/assembly-layouts.json`; optional fixed-model source viewports live alongside each manifest in `presentation.json`.
