# Module boundaries

The modular refactor retains the store facade and isolates platform capabilities. The `gundamdoro-app-state` key remains unchanged; version 4 added inventory/draft fields, and current version 8 retains all ten fields and migrates all seven models to independent hips and legs. All seven models share the calibrated body-mixing policy; Wing Zero's wings remain an additional collectible and are selectable in the optional backpack slot.

## Dependency direction

```text
React views/hooks -> store facade -> application use cases -> domain rules
                           |
                     snapshot codec

app/dependencies.ts supplies runtime, catalog, storage and asset/scheduler adapters
```

- `src/domain/`: platform-independent timer calculations, collection rules, settings validation, catalog definitions and hangar insertion. No React, Zustand, Vite, browser APIs, database or network imports.
- `src/application/`: explicit use cases coordinate focus completion, part collection, manual assembly and archiving. Ports supply time, ID generation and catalog metadata. Snapshot validation/migration lives here independently of the storage engine.
- `src/store/`: Zustand holds the business state and maps the existing actions to use cases. The factory accepts dependencies; the default facade remains `useAppStore`. Persist continues to own the existing JSON envelope.
- `src/adapters/`: current browser runtime, localStorage provider, bundled manifest discovery and PNG lookup. Only these modules use `import.meta.glob`, the fast URL flag or native scheduling APIs for these services.
- `src/app/dependencies.ts`: composition root that selects concrete implementations. `src/mecha/loader.ts`, `src/mecha/types.ts` and `src/lib/timer.ts` retain compatible entrypoints for existing UI imports.

## Runtime and presentation

Daily timer presentation lives in `application/timerExperience.ts`: pure ETA, read-only timer projection and successful-completion notice detection. `adapters/platform/reminders.ts` owns synthesized audio and browser/Tauri notification permission/delivery. Optional settings booleans extend the existing v5 envelope without changing top-level fields or legacy duration defaults.

The main app alone hydrates/persists, ticks the state machine and observes completions. The native `mini` entry renders only `MiniTimerWindow`, consumes targeted Tauri projection events and sends pause/sync requests to main. It never runs initialization, store actions, reveal scheduling or completion reminders. `miniWindow.ts` owns window APIs, minimize/restore and listener/heartbeat cleanup. Browser preview consumes the same projection locally; it does not claim OS-level floating-window support. Native capabilities are local-window scoped, with notification rights limited to main.

Timestamp calculations take an explicit time. Store actions retain optional `now` arguments and otherwise use the injected clock. UUID generation and conversion of configured minutes are supplied by the runtime adapter. The existing development `?fast` flag still means seconds; production ignores it.

Application phase policy keeps part reveal at 2800ms, normal assembly completion at 4800ms, and reduced-motion assembly completion at 1400ms. The app-level phase hook schedules completion actions through a scheduler port. PartRewardScreen renders rewards; AssemblyScreen schedules only its local image reveal (2200ms / 400ms). Neither screen changes product phase or performs archiving.

## Persistence contract

Storage offers `getItem`, `setItem`, and `removeItem`, accepting synchronous implementations or Promise-returning implementations. Startup awaits hydration before recovery. Version 8 migrates versions 0 through 7, backfilling ownership from collected progress and fixed archives. Model-count expansion preserves legacy completed/in-assembly status and build identity without inventing focus statistics; partial collections retain their prefix. An unknown active model fails hydration without overwriting the save; unknown valid model/component references remain stored. No database is introduced.

Storage acquisition is deferred to each operation so a temporary access failure can be retried. Initialization checks successful hydration before calling recovery and awaits its write. The bootstrap renders loading/error UI outside the normal app; failed reads, JSON parsing and unsupported newer versions cannot trigger a default-state overwrite. Retry rehydrates failed reads, or retries recovery after a failed startup write without replaying an already completed session. Readable snapshots still use existing field normalization and legacy migration.

An adapter for a future persistence engine must also define write ordering, transaction boundaries and failure handling for that engine. Promise-compatible signatures and startup waiting do not implement cloud sync or database transactions. Inventory and workbench data currently share the local app snapshot; image bytes are never stored in it.

### Seven-part migration

Catalog `legacyParts` aliases retain historical paired-leg IDs/assets outside the current collectible list. `application/splitPartsMigration.ts` uses per-alias `splitBeforeVersion` gates (6 for the original pilot, 7 for the other models): valid earned paired legs imply three lower-body unlocks, completed progress adds two collected stages without adding focus credit, and unfinished timers retain their captured state. Archive evidence is validated and deduplicated before ownership is inferred; custom recipes never grant parts. Eligible old drafts expand to seven slots with a fresh ID; archived recipes are not rewritten. Version-6 pilot fifth-stage progress and version-7 fifth-stage progress mean hips only and are never promoted again. Wing Zero wings move from stage six to eight; acquired wings and pending old wing focuses remain valid.

`domain/inventory.ts` distinguishes historical five-slot and current seven-slot recipes. The injected assembly policy declares its required slots; UI and application use cases consume that policy. `stagePresentation.ts` selects registered SVG masks for lower-body collectibles, independently of catalog/business rules. The development gallery renders 56 representative seven-model recipes or 128 combinations of a selected pair in four pages without hydrating real state.

### Optional backpack slot

Assembly policy separates seven required `slots` from `optionalSlots` and derives compatible `partIds` from calibrated model parts. Workbench preparation fills required slots only; optional random choices include none. Selected optional components must be owned and calibrated before saving. `clearWorkbenchPart` removes optional slots only, creates a fresh draft identity when needed and shares workshop phase guards. Recipe serialization includes equipped optional IDs; hangar grouping and origin lists distinguish seven/eight-part compositions.

`registered-backpack.json` records the wing source override, semantic segment and canonical back mount. Each torso's source-space back joint is derived with the inverse body fit. V4 draws the independent wing PNG behind every body layer, with uniform scaling; `registeredPartSource` resolves per-part source metadata consistently for previews, resource recovery and the lab. Original raster files are unchanged. V8 keeps optional IDs and unknown valid wing references through restart; upgrading v7 neither backfills inventory nor repeats lower-body migration. Old recipes do not gain wings automatically.

## Extension rules

`domain/hangar.ts` derives read-only model/recipe summaries from the archived records; it never deduplicates persisted history. `mecha/profiles.ts` holds local fictional dossier content separately from manifests, timers and storage. The hangar/detail UI holds only transient selection and focus state. Unknown model IDs remain viewable without requiring a profile or registered asset. No schema change is needed for grouping or dossiers.

Add business rules under domain and coordinate cross-module changes in application use cases. Avoid store-to-store calls and imports from domain/application into UI, adapters or Zustand. Bind platform-specific storage, notifications, assets and app lifecycle behavior in adapters or the composition root.

The default model remains MECHA-01; MECHA-01 through MECHA-06 are selectable. Optional descriptions and explicit part slots are catalog metadata. `domain/inventory.ts` supplies stable part IDs and ownership/composition rules; `application/workbench.ts` coordinates draft preparation, selection, injected randomness and idempotent custom archiving. These modules do not import UI or concrete adapters. The existing focus use case unlocks its one part in the same state update as focus completion.

On 2026-10-15 the user approved removing the disabled `assembly-layouts.json`, `compositionLayout.ts` and profile-less legacy compositor. `CompositeMecha` remains the shared profile dispatcher for workbench and custom hangar cards; records without a profile show explicit unavailable feedback without changing their stored recipes. React holds transient filters/tabs/resource failures only; draft/name/ownership/recipes remain in Zustand. Custom saves do not change the active fixed-model focus build. Mobile/mini-program UI and networking remain separate work.

`domain/assembly.ts` owns the injectable `AssemblyPolicy`, compatibility predicates and uniform two-point similarity transform math. `AppDependencies.assembly` binds the registered profile/model IDs at the composition root; workbench use cases enforce the policy for preparation, selection, randomization and saving. Inventory keeps all models and unlocks; the assembly tab offers only supported models. Existing injected catalogs without a policy retain legacy behavior.

`adapters/assets/registered-assembly-v3.json` stores master paths, seven polygon masks, neck/shoulder/waist/hip joints and semantic segments. Hips attach to the selected torso; both legs attach to the selected hips. The v1/v2/v3 geometry remains frozen for archived recipes. V4 derives its body geometry from v3 and adds the optional joint/layer and original wing PNG from `registered-backpack.json`. `registeredAssembly.ts` derives geometry; `RegisteredMecha` renders the actual selected masked layers, sharing the same renderer in the draft, hangar and detail. The first four collectible/final PNGs remain unchanged; `presentation.json` selects clipped registered views for hips and independent legs. New custom records persist optional `assemblyProfile` in the v8 envelope; `CompositeMecha` dispatches v1/v2/v3/v4 to their respective geometry and reports missing/unknown profiles without guessing. Unsupported drafts are preserved until explicit user selection/randomization. Hangar display grouping includes the profile, preserving all stored records.

The development-only `dev/AssemblyLab` renders independent sample recipes and transient calibration edits without hydration or business-state actions. Its entry is dynamically imported behind Vite's development flag, excluded from production, and exports reviewed JSON rather than writing runtime storage. It must never unlock real parts. The catalog derives `totalStages` from each collectible list, independently of custom-mixing slots. Inventory defines every component with a stable key (`partId`, existing slot key, or legacy stage fallback); an extra component need not have a mixing slot. Wing Zero EW has eight stages, with independent wings after its seven body modules. The other models each have seven stages. `stagePresentation.ts` discovers optional source viewports independently of domain rules; `StageImage` shares these across focus, collection, transition tiles and inventory. Runtime assets remain bundled locally with provenance retained.

`npm test` runs dependency-boundary tests using the TypeScript parser, pure use-case tests, storage hydration/envelope contracts, phase timing tests, and existing regressions. Keep tests updated if a dependency boundary deliberately changes.

## User model resources (step one)

`domain/userModels.ts` defines import payloads, bounds and safe generated manifests. `application/importModel.ts` enforces phase eligibility and coordinates a resource-library port; `store.importModel` does not mutate collection, ownership, settings or archives. The import UI holds transient file selections and previews, just as settings forms hold unsubmitted input. Saved user definitions are immutable catalog resources, not another progress store.

`adapters/catalog/userModelLibrary.ts` merges the built-in catalog with validated user manifests and extends the synchronous asset resolver. The store initializer loads this library before hydration; the injected catalog is therefore ready for snapshot validation and expired-focus recovery. Failed resource loading does not start hydration or trigger a default-state write. Successful loading is cached; Retry repeats failed loading. The progress envelope stays version 8 with ten fields.

`adapters/storage/userModelFiles.ts` supplies two repository implementations behind the same boundary: browser OPFS with separate binaries and a manifest-last commit marker, and Tauri scoped main-window commands. Windows `user_models.rs` validates generated IDs, exact filenames, signatures and byte limits, writes a new temporary directory, then renames it into the app-local `user-models` library. A cross-device rename error uses exclusive destination creation and copy instead: `.import-pending` precedes file copying; `.import-complete` is created only after writes and validation succeed. Loading ignores unfinished copies and empty orphan directories, but reports invalid committed metadata/assets. Existing rename-committed version-1 directories remain readable. Native image display uses the asset protocol restricted to PNG/JPEG/WebP files under that library, without general filesystem access. Only `http-range` was added to the lockfile for this Tauri feature; existing core package versions were retained.

User models use explicit `part-N` keys without body slots, so they participate in collection, permanent inventory and fixed-build history but not calibrated mixing. Part count comes from the imported list. Whole-image segmentation and user joint/mask calibration are separate future deliveries, not silently inferred from arbitrary images. Failed browser imports may leave uncommitted private directories; these do not appear in the catalog. Browser storage remains origin/profile scoped and may be cleared/evicted by the browser; no backup or cross-platform transfer is provided yet.
