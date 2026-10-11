# Module boundaries

The modular refactor retains the store facade and isolates platform capabilities. The `gundamdoro-app-state` key remains unchanged; version 4 added inventory/draft fields, and current version 5 retains all ten fields while generalizing component IDs and model-specific counts. Custom mixing entrypoints remain paused.

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

Timestamp calculations take an explicit time. Store actions retain optional `now` arguments and otherwise use the injected clock. UUID generation and conversion of configured minutes are supplied by the runtime adapter. The existing development `?fast` flag still means seconds; production ignores it.

Application phase policy keeps part reveal at 2800ms, normal assembly completion at 4800ms, and reduced-motion assembly completion at 1400ms. The app-level phase hook schedules completion actions through a scheduler port. PartRewardScreen renders rewards; AssemblyScreen schedules only its local image reveal (2200ms / 400ms). Neither screen changes product phase or performs archiving.

## Persistence contract

Storage offers `getItem`, `setItem`, and `removeItem`, accepting synchronous implementations or Promise-returning implementations. Startup awaits hydration before recovery. Version 5 migrates versions 0 through 4, backfilling ownership from collected progress and fixed archives. Model-count expansion preserves legacy completed/in-assembly status and build identity without inventing focus statistics; partial collections retain their prefix. An unknown active model fails hydration without overwriting the save; unknown valid model/component references remain stored. No database is introduced.

Storage acquisition is deferred to each operation so a temporary access failure can be retried. Initialization checks successful hydration before calling recovery and awaits its write. The bootstrap renders loading/error UI outside the normal app; failed reads, JSON parsing and unsupported newer versions cannot trigger a default-state overwrite. Retry rehydrates failed reads, or retries recovery after a failed startup write without replaying an already completed session. Readable snapshots still use existing field normalization and legacy migration.

An adapter for a future persistence engine must also define write ordering, transaction boundaries and failure handling for that engine. Promise-compatible signatures and startup waiting do not implement cloud sync or database transactions. Inventory and workbench data currently share the local app snapshot; image bytes are never stored in it.

## Extension rules

Add business rules under domain and coordinate cross-module changes in application use cases. Avoid store-to-store calls and imports from domain/application into UI, adapters or Zustand. Bind platform-specific storage, notifications, assets and app lifecycle behavior in adapters or the composition root.

The default model remains MECHA-01; MECHA-01 through MECHA-06 are selectable. Optional descriptions and explicit part slots are catalog metadata. `domain/inventory.ts` supplies stable part IDs and ownership/composition rules; `application/workbench.ts` coordinates draft preparation, selection, injected randomness and idempotent custom archiving. These modules do not import UI or concrete adapters. The existing focus use case unlocks its one part in the same state update as focus completion.

`adapters/assets/assembly-layouts.json` owns alpha bounds, source viewport crops and mounting points. `CompositeMecha` generically places actual part PNGs with static SVG layers and is shared by workbench and custom hangar cards. React holds transient filters/tabs/resource failures only; draft/name/ownership/recipes remain in Zustand. Custom saves do not change the active fixed-model focus build. Mobile/mini-program UI and networking remain separate work.

Custom mixing remains paused through `app/features.ts`; persisted drafts/recipes and old hangar rendering remain compatible. The catalog derives `totalStages` from each collectible list, independently of custom-mixing slots. Inventory defines every component with a stable key (`partId`, existing slot key, or legacy stage fallback); an extra component need not have a mixing slot. Wing Zero EW has six stages, with independent wings appended after its original five-part prefix. `stagePresentation.ts` discovers optional source viewports independently of domain rules; `StageImage` shares these across focus, collection, transition tiles and inventory. Runtime assets remain bundled locally with provenance retained.

`npm test` runs dependency-boundary tests using the TypeScript parser, pure use-case tests, storage hydration/envelope contracts, phase timing tests, and existing regressions. Keep tests updated if a dependency boundary deliberately changes.
