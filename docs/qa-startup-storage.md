# Startup storage protection QA

Date: 2026-10-03 (Asia/Shanghai).

## Scope and changes

This maintenance task protects startup saves without changing the five-part focus loop, early End Break, manual assembly, hangar, settings, assets or existing store actions. The storage key remains `gundamdoro-app-state`, version remains 2, and the snapshot still contains the original eight fields. No dependency, database, cloud service or inventory feature was added.

- `src/store/createAppStore.ts` and its tests: defer storage acquisition, require successful hydration before recovery, and await startup recovery writes. Failed hydration cannot write default data. A failed recovery write can be retried without collecting a completed session twice.
- `src/application/snapshot.ts`: reject migrations from newer schema versions rather than silently downgrading and discarding unknown fields. Version-0/1 migrations remain supported.
- `src/main.tsx`, `src/components/Startup/StartupScreen.tsx`, its tests and `src/styles/global.css`: loading/error UI, data-preservation guidance and guarded retry. The normal application and its scheduling hooks mount only after successful initialization.
- `SPEC.md`, `README.md` and `docs/architecture.md`: distinguish invalid fields in readable snapshots from failed storage access, invalid JSON and unsupported newer saves.

## Automated checks

`npm test`: 67 tests passed in 10 files, including all 58 existing regressions and nine additional assertions/scenarios for startup storage handling and screen rendering. Coverage includes synchronous/asynchronous failed reads, failed storage acquisition followed by retry, unchanged corrupt/newer save bytes, pending/rejected startup writes, idempotent recovery retry and loading/error controls.

The default Windows sandbox could not read some Vitest temporary transform files (`ENOENT`); both default and single-worker attempts showed this environment issue. Running the unchanged `npm test` command with normal temporary-directory access passed. No package/configuration change or dependency installation was needed.

`npm run build` passed TypeScript project checks and Vite production bundling. `git diff --check` passed.

## Browser checks

Used isolated Playwright CLI session `gundam-storage-qa` at a temporary local Vite preview on port 1421. Test snapshots and Storage overrides were confined to that browser profile; the user's application data was not modified. Test browsers and preview processes created for this task were stopped afterward.

| Behavior | Result |
| --- | --- |
| Invalid JSON, repeated Retry | Error UI; original bytes unchanged; no normal game controls |
| Read becomes available after failure | Retry restores collected parts and existing hangar |
| Newer version with unknown inventory fields | Refused without downgrading or changing stored bytes |
| Storage getter SecurityError | Error UI; restored permissions allow successful retry |
| Startup QuotaExceededError | Error UI; retry succeeds after restoring writes |
| Pause, reload, resume, cancel | Existing timer behavior retained |
| Five focus targets and early End Break | TORSO, HEAD, LEFT ARM, RIGHT ARM, LEG UNIT; correct rewards/transitions |
| Fifth part, manual assembly and reload mid-assembly | Waits for click; build ID retained; archive inserted once; no extra focus/minutes |
| Hangar and Build Again | Both existing and new archives retained; settings retained |
| Persisted envelope and errors | Version 2, exactly eight fields; no page/console errors |

Screenshots: `output/playwright/storage-startup-error.png` (480x720, visually inspected) and `output/playwright/storage-qa-ready.png`.

## Desktop build and limits

`npm exec --offline -- tauri build --bundles msi` passed using the existing Rust/MSVC/Windows SDK and cached dependencies. Updated bundle: `src-tauri/target/release/bundle/msi/Gundamdoro_0.1.0_x64_en-US.msi`. The existing informational linker import-library warning remains unchanged.

The scoped startup-safety acceptance checks are satisfied; this is a maintenance task after the existing MVP, not a new gameplay phase. Native installation/uninstallation, physical sleep/wake and native WebView storage fault injection were not repeated.

Retry does not repair damaged JSON or convert a newer schema automatically: those failures require correcting the underlying save/access/version condition. Runtime save-failure notifications, automatic backups, asynchronous write ordering/transactions, independent component inventory and mixed-model assembly remain separate work. No Git commit/push, global configuration change or generated Python file was made.
