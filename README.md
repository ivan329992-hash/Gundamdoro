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

Finished builds are automatically archived in the local hangar. Open `仓库` from READY or COMPLETE: repeated builds of one model share one card showing completion count, while every original record stays saved. Custom cards omit the component-origin list; the recipe remains available in the dossier. Click the card or `查看机体档案` for a mecha-style dossier with full-model art, role, component count, story, design features and cumulative personal statistics. Capability indices are fictional display settings, not official performance; Wing Zero EW content is explicitly unofficial application-only interpretation. Escape returns to the hangar first, then closes it. Unknown models and historical dates retain honest unavailable/unknown labels. Build Again preserves all archived models.

Uncompleted models appear in selection as a flat silhouette with a centered question mark. Completing and archiving that fixed model reveals its full preview permanently, including after restart/Build Again. Custom mixed builds do not reveal their source models. No additional unlock flag or storage migration is needed.

Click `选择机型` before collecting the first part, or after completing a build, to choose MECHA-01 through MECHA-06 or `飞翼零式 EW`. Each model's part list determines its focus count: all six original models have seven body parts (torso, head, arms, hips, left leg, right leg), and Wing Zero EW has those seven plus its independent wings (eight focuses). To change an unfinished build, click `放弃制作` during focus, `放弃制作并换机型` during break, or `放弃并换机型` in READY and confirm. This clears only current-build progress/statistics and opens model selection; permanent inventory, hangar, settings and drafts survive. Confirmation pauses running focus; cancel/Escape resumes it, while an already paused timer stays paused. `取消本次` only cancels one session and retains collection progress. `BUILD AGAIN` repeats the selected model.

The additional original designs are MECHA-03 (重装突击型), MECHA-04 (羽翼巡航型), MECHA-05 (骨架近战型) and MECHA-06 (高速突击型). Backpack, wings and torso-mounted equipment belong to the torso collectible. See [design directions and prompts](docs/design-four-models.md) and [refinement prompts](docs/design-four-models-resume.md).

Open `配件仓库` from READY or COMPLETE to inspect permanently unlocked components. Each completed focus unlocks that model's matching component once; components survive BUILD AGAIN/model changes. Filter by model or inspect locked components to see how to earn them.

Open `配件仓库与拼装` → `自定义拼装` to mix permanently unlocked body components from all seven models. Seven required body slots share a calibrated frame, plus an optional 背包／翅膀 slot. Equip owned Wing Zero EW wings on any body, or choose 不装备背包／翅膀. Preparation leaves it empty; randomization includes both empty and owned choices. Hips, left leg and right leg can each come from a different model. Choose parts, name the result, then save it to the hangar without consuming parts or adding focus credit. Each selected component must already be owned. Unsupported old draft selections stay saved and must be explicitly replaced; legacy archived compositions retain their original rendering.

Assembly uses separate registered front-view masters, deterministic polygon masks and semantic joint/limb calibration. The first four collectible images and fixed-model final artwork are unchanged; the three lower-body collectibles use masked views of the registered masters. New custom records capture `assemblyProfile: standard-front-v4` inside version 8 so future artwork changes do not silently reinterpret old recipes. See [initial artwork prompts](docs/assembly-artwork.md) and [all-model artwork, saved paths and prompts](docs/assembly-artwork-all-models.md).

For development-only visual calibration, open `http://localhost:1420/?assembly-lab=1`. The independent lab shows 56 representative seven-model samples, or all 128 combinations of a selected model pair in four groups without reading/writing real progress or unlocks. Select a model, slot and mask/segment/joint point; click/drag on the master or enter coordinates, then export the resolved `registered-assembly-v4.json`. Optional wing sample controls do not grant ownership. Review exports through the normal code-review/check workflow; edit current backpack calibration in `src/adapters/assets/registered-backpack.json` and preserve archived profiles. The lab is excluded from production and does not grant test components in the application.

`飞翼零式 EW` is user-supplied generated unofficial fan art, included at the user's explicit request. Its eight rewards are torso, cleaned head, left arm, right arm, hips, left leg, right leg and wings. Wings are collected separately on the eighth focus; old earned paired legs migrate to the three lower-body parts. Final assembly uses the provided whole-model PNG. See [asset provenance and boundaries](src/assets/mecha/wing-zero-ew/ASSETS.md). It is not official or licensed artwork, and the code license does not grant character/commercial-use rights.

See the [Wing Zero EW integration acceptance record](docs/qa-wing-zero-ew.md) for regression and browser checks.

Current model-specific focus-count behavior and compatibility checks are recorded in [variable component count QA](docs/qa-variable-part-counts.md).

For all seven models, older earned paired legs unlock hips and both legs while retaining the historical ID. Old completed builds keep their actual historical session statistics. An unfinished fifth focus keeps its timer and collects hips only; two more focuses collect the legs. Old drafts are expanded with a new draft identity, while archived v1/profile-less recipes keep their original appearance. See [all-model assembly acceptance](docs/qa-all-model-assembly.md).

Optional backpack acceptance is recorded in [backpack/wings QA](docs/qa-optional-backpack.md). Saving or unequipping changes only the draft/recipe; wing inventory and focus counts stay unchanged. Equipped and unequipped variants have separate hangar groups. MECHA-03/04/06 torso-integrated equipment is not separately selectable.

In the custom assembly tab, 保存到成品仓库 and 随机搭配 stay fixed at the bottom while browsing parts. The bar explains missing required parts or a blank name. After saving, use 查看成品仓库 in the same bar; it does not appear in inventory-only or hangar views.

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

READY now offers 15/25/45-minute shortcuts; settings still accept custom durations. The timer displays estimated local finish time, or a paused message until resumed. Settings also control completion sound, system notifications (off until explicitly enabled/permitted), and the desktop mini timer (on by default).

In the Windows app, minimize via the title bar or `最小化`: a draggable, always-on-top mini timer remains visible, with pause/resume, hide and return-to-main controls. Closing the main app exits both windows; minimizing does not stop the timer. The mini is a read-only state mirror, so it cannot duplicate collections or overwrite saves. In a browser, `迷你计时预览` displays an in-page overlay only, not a desktop widget. Windows notifications should be verified with the installed app and may be suppressed by system notification/quiet-mode settings. Audio is unlocked by interaction and may be unavailable before the first click. No reminders run while the entire app is closed.

Stored version-0 progress is migrated automatically to the current model-specific workflow; settings and actual focus history are preserved.

Persistence version 2 also migrates version-1 state. An existing completed model is imported into the hangar once, with its completion time marked unknown if it was never recorded. Current collection progress remains independent of the hangar.

Current saves use version 8 and migrate versions 0/1/2/3/4/5/6/7 without changing the storage key or original fields. Inventory now accepts stable IDs for additional component types such as wings. Partial older progress retains its first four parts and actual focus history; earned paired legs expand to three lower-body parts. A pending old wing focus still targets wings after migration. Legacy completed/in-assembly models stay completed/accepted without inventing sessions or minutes; historical archive statistics remain unchanged. Migration recovers components from collected progress and known completed fixed models; absent history cannot be reconstructed. Custom recipes do not grant ownership. An unavailable active model stops startup without overwriting the save. Unknown valid part IDs are preserved with resource-unavailable feedback.

See the [initial multiple-model acceptance record](docs/qa-multiple-models.md), [four additional models acceptance record](docs/qa-four-additional-models.md), [inventory and custom assembly acceptance record](docs/qa-inventory-custom-assembly.md) and [MECHA-02 asset prompts/provenance](src/assets/mecha/mecha-02/ASSETS.md).

If startup cannot read or parse the local save, the save comes from a newer app, or startup recovery cannot write, a retry screen is shown instead of entering the app. Check storage permissions and the app version, then click `重新读取存档`. Failed reads do not reset or overwrite the original save; do not clear application data to dismiss this error. Invalid fields in readable saves are still normalized automatically.

The model registry discovers `src/mecha/<model-id>/manifest.json`; every valid registered model appears in the selection screen. The `stages` list is the source of truth for the focus count; runtime `totalStages` is derived from its length (legacy declarations are ignored). Number stages consecutively from 1. Each stage defines one collectible; the final image and unused/alternate asset files do not count. Use a stable model-local `partId` for additional components, e.g. `wings` or `rifle`, independent of the custom-mixing slots. Preserve existing component IDs and stage order when extending a released model. Add local images under `parts/` and the full image under `final/` referenced by `finalAsset`. A model-specific `break/break-01.png` is optional. Do not remove or rename IDs referenced by saves.

The production Windows bundle is generated with `npx tauri build`. For local timer verification only, append `?fast=1` to the Vite URL; this converts configured minutes to seconds in development mode and is disabled in production builds.

## Architecture

Business rules are separated into `src/domain/` and `src/application/`; Zustand remains the state facade in `src/store/`. Runtime, storage, catalog and asset implementations are bound in `src/app/dependencies.ts`. The current adapters retain localStorage, bundled images and the existing fast-mode behavior.

See [module boundaries and extension rules](docs/architecture.md). `npm test` includes dependency checks that prevent core rules from importing UI, stores, adapters or browser APIs. Startup waits for storage hydration before recovery; version-8 snapshots retain the existing key and ten data fields. Current body masks/segments live in `src/adapters/assets/registered-assembly-v3.json`, with v4 back-joint/wing calibration in `registered-backpack.json`; `registered-assembly.json`, `registered-assembly-v2.json` and `registered-assembly-v3.json` are frozen for v1/v2/v3 archives; `assembly-layouts.json` remains for historical recipes. Optional fixed-model source viewports live alongside each manifest in `presentation.json`.
