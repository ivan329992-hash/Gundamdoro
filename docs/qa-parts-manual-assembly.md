# Five-part collection and manual assembly QA

Date: 2026-10-02 (Asia/Shanghai).

## Approved behavior

Complete five focus sessions to collect torso, head, left arm, right arm and leg unit. Each detached part occupies its own fixed display slot. Show a short part reveal after focus completion. Parts 1-4 lead to a break; End Break returns immediately to READY without changing progress. Part 5 returns directly to READY with Assemble enabled. Only the user's click starts final assembly; it does not add a focus session or focused minutes.

## Automated checks

`npm test`: 3 files, 26 passing tests across timer utilities, store transitions/recovery/migration, and manifest asset selection.

The regression suite covers pause/resume timestamps, pause after expiry, early/stale/duplicate callbacks, early break termination, all five focus sessions, manual assembly guards, no sixth focus, reset, restart during running/paused focus, expired focus/break recovery, persistent readiness, version-0 migration, settings guards and collection bounds. Asset checks ensure five distinct part URLs and a separate full-mecha URL.

`npm run build`: TypeScript project checks and Vite production build pass. `git diff --check` passes.

## Browser checks

Used a separate Playwright CLI session (`gundam-parts-qa`) at `http://localhost:1420/?fast=1`. The user's own browser storage and running development server were left in place.

| Check | Result |
| --- | --- |
| Start, pause, reload while paused, resume, cancel | Passed; paused time stays fixed and cancel returns to READY |
| Five focus completions | Passed; part count and completed sessions reach exactly five |
| New-part reveal | Passed; only one slot is marked new; prior slots remain opaque and visible |
| End Break for parts 1-4 | Passed; READY with idle timer, parts and totals preserved |
| Last part | Passed; returns directly to READY and exposes Assemble; no sixth focus |
| Reload before manual assembly | Passed; all five parts remain and the app waits for a click |
| Final reveal | Passed; one full-mecha image, with all part tiles removed |
| Manual assembly statistics | Passed; completed sessions and focused minutes unchanged |
| Build Again | Passed; collection and totals reset, settings preserved |
| Expired running focus snapshot | Passed; awards one part; repeated reload does not award it again |
| Legacy version-0 assembly snapshot at stage five | Passed; migrates to five parts and READY with manual assembly |
| Reduced motion | Passed; shorter final transition preserves totals |
| Window sizes | Passed; collection at 480x720 and 420x640; initial READY at 420x640 has no horizontal or vertical overflow |

Screenshots are saved under `output/playwright/`: `part-02-reveal.png`, `break-end-button.png`, `parts-collected-420x640.png`, `final-assembly.png`, `complete-five-sessions.png`, and `ready-420x640.png`.

The previous overlapping whole-mecha layers are absent. All five generated PNG sprites are 1080x1440 and preserve alpha transparency.

## Desktop verification and limits

The Windows x64 Tauri production build and MSI bundling pass with cached Rust dependencies and the installed MSVC/Windows SDK. The toolchain still emits its existing informational linker warning about creating the library/import files.

These checks validate the workflow through browser UI, persisted snapshots, unit tests and production compilation. Physical system sleep/wake and installing/uninstalling the MSI were not repeated in this change. No Git commit, tag or push was performed.

## Follow-up: large single-part focus preview

FOCUS displays this session's target detached part (`currentStage + 1`), using a 300px canvas (240px at short window heights). The first focus previews TORSO. The fourth previews RIGHT ARM while collected progress remains 3 / 5. This is a preview; only focus completion awards the part. READY and PART_REWARD retain the collection grid.

The regression suite now has 33 passing tests, including server-rendered component checks for all five target mappings and the specific fourth-focus off-by-one bug. The TypeScript/Vite build passes. An isolated browser check verified the same five targets, exactly one focus image, no focus collection grid, unchanged collected counts during preview, and unchanged collection after cancel. The large preview layout was verified at 480x720 and 420x640 without overflow. The corrected fourth-focus screenshot is `output/playwright/focus-fourth-target-right-arm.png`; earlier size-verification screenshots remain under `output/playwright/`.

This UI follow-up is available through the development preview; the MSI above was built before this follow-up and was not rebuilt for this layout-only change.
