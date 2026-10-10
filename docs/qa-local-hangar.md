# Local hangar QA

Date: 2026-10-02 (Asia/Shanghai).

## Behavior

Every completed manual assembly is archived automatically. Each build has a persistent ID, a model ID/name snapshot, completion timestamp, completed focus sessions and focused minutes. Two builds of MECHA-01 are two records. Build Again resets only the current collection and retains the hangar. READY and COMPLETE expose the hangar; opening it does not change the timer phase.

Persistence version 2 preserves older progress. A version-0/1 completed build is imported once. Its completion date is shown as unknown because older storage had no such field. An interrupted manual assembly retains a stable identity and archives only when completed. Valid archives survive invalid active timer data. Unknown model records retain their metadata while unavailable images use a placeholder.

The model registry discovers local manifests. Hangar previews resolve each record's model ID rather than showing the default model for every record. Only MECHA-01 is currently buildable; new designs and model selection are future work.

## Automated coverage

`npm test`: 42 tests in 4 files pass, including the existing timer, focus target and part collection regressions.

New coverage verifies archive-once behavior, separate IDs for repeated models, immutable statistics after reset, no premature archive, rehydration during/after assembly, legacy completion import, preserving version-1 manual assembly, retaining archives when an active timer is corrupt, unfamiliar model IDs and malformed/duplicate archive records. Loader coverage checks ID-based image resolution and unknown IDs returning no image.

## Browser verification

Used the isolated Playwright CLI session `gundam-hangar-qa` at `http://localhost:1420/?fast=1`. User browser data was left in place.

| Check | Result |
| --- | --- |
| Empty hangar from READY | Passed; empty message, return control and count zero |
| Two complete five-session builds | Passed; each completion adds exactly one record |
| Restart during final animation | Passed; build ID retained and completion archives once |
| Reset and reload between builds | Passed; archived models preserved |
| Open from READY and COMPLETE | Passed; correct count and original phase on return |
| Escape to return | Passed |
| Version-1 COMPLETE migration | Passed; 125 minutes and five sessions retained, completion date unknown |
| Reload after migration | Passed; no duplicate archive |
| Unregistered model record | Passed; record retained, resource-unavailable placeholder shown |
| Warehouse at 420x640 | Passed; two records visible without horizontal overflow |
| READY and COMPLETE navigation | Passed at 420x640 and 480x720; warehouse entry fully visible |
| Browser console | No errors observed during the flow |

Screenshots: `output/playwright/hangar-empty.png`, `hangar-two-builds.png`, `hangar-legacy-complete.png`, and `complete-hangar-420x640.png` / `complete-hangar-480x720.png`.

## Checks and limits

TypeScript/Vite production build and `git diff --check` pass. This feature uses the existing localStorage/Zustand persistence and adds no dependencies, backend, database or remote assets. Archive records contain metadata, not embedded PNG data.

The Windows production MSI is rebuilt for the hangar feature. Installing/uninstalling it and physical sleep/wake are not repeated by this change. No commit, tag or push was performed. Old completed builds that had already been discarded by Build Again before this feature existed cannot be recovered from absent data.
