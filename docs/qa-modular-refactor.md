# Behavior-preserving modular refactor QA

Date: 2026-10-02 (Asia/Shanghai).

## Scope

Separated domain rules, application coordination/snapshot codec, concrete adapters and the Zustand state facade. No gameplay, UI layout, images, dependencies, database, network functionality or data schema was added. The original `useAppStore` action API, `useTimerStore` alias, mecha loader/type entrypoints and timer utility entrypoints remain available.

`src/store/useAppStore.ts` is now the default six-line facade; `src/store/createAppStore.ts` binds the application use cases to Zustand and persist. `src/app/dependencies.ts` wires the existing browser runtime, localStorage, bundled catalog/assets and scheduler. See `docs/architecture.md` for dependency direction and adapter limits.

## Automated checks

Before changes: 42 tests in 4 files passed.

After changes: 58 tests in 9 files passed. The original 42 regressions remain passing; added tests cover:

- Pure use cases with a different injected model, clock, ID generator and duration policy.
- Synchronous storage restoration, asynchronous hydration waiting and unchanged persisted fields/envelope.
- Part reveal at 2800ms, assembly completion at 4800ms/1400ms, cancellation and no transitions during READY/FOCUS.
- Development fast-mode compatibility and production ignoring the URL flag.
- TypeScript-parser dependency checks for production domain/application imports and forbidden platform globals, including TS/TSX/JS source files.

`npm run build` passes TypeScript project checks and Vite production bundling. `git diff --check` passes.

## Browser checks

Used isolated Playwright CLI session `gundam-refactor-qa`, without altering the user's own browser profile or restarting their existing development server.

| Behavior | Result |
| --- | --- |
| Start, pause, wait, reload paused, resume, cancel | Passed |
| Five focus targets | Passed: TORSO, HEAD, LEFT ARM, RIGHT ARM, LEG UNIT |
| Reward completion and early End Break | Passed; existing automatic transitions retained |
| Last part and manual assembly | Passed; waits at READY after part five |
| Reload before/during final assembly | Passed; build ID and manual assembly state retained |
| Archive once, warehouse return and Build Again | Passed; original statistics, settings and saved model retained |
| Persisted JSON contract | Passed; storage key, version 2 and the exact original eight data fields retained |
| Version-0 assembly snapshot | Passed; migrates through part reveal without granting another part |
| Version-1 completed snapshot | Passed; one legacy archive with unknown completion date |
| Repeated migration/reload | Passed; no duplicate archives |
| Reduced-motion assembly | Passed; same completed-session/minute totals |
| Normal/fast URL modes | Passed; configured 1 minute becomes 60000ms or 1000ms respectively |

Screenshots: `output/playwright/refactor-hangar.png` and `output/playwright/refactor-ready-420x640.png`.

The browser console reported no errors. The existing Framer Motion warning appeared when reduced motion was deliberately enabled for testing.

## Desktop check and remaining limits

`npm exec --offline -- tauri build --bundles msi` succeeded using the existing Rust/MSVC/Windows SDK and cached dependencies. Artifact: `src-tauri/target/release/bundle/msi/Gundamdoro_0.1.0_x64_en-US.msi`. The existing informational linker warning about producing import-library files remains unchanged.

Native installation/uninstallation and physical sleep/wake were not repeated. This refactor creates replacement points; SQLite transactions, cloud synchronization, component mixing and mobile/mini-program UI remain future work. No Git commit, tag, push or generated Python file was produced.
