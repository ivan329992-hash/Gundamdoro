# Model-specific component counts QA

Date: 2026-10-10 (Asia/Shanghai). Implements SPEC section 26; fixed five-session/grouped-wing rules are superseded.

## Changes

- `domain/catalog.ts`, `domain/types.ts`, `domain/inventory.ts`: derive runtime focus count from the validated nonempty stage list; ignore legacy count declarations. Validate consecutive unique stages, component keys/IDs and optional mixing slots. Every stage appears in inventory; stable extra keys such as `wings` or `unit-8` are independent of the five paused custom-mixing slots. Legacy slot-based IDs remain unchanged.
- Wing Zero manifest/presentation metadata: six independent collectibles, ordered torso/head/left-arm/right-arm/legs/wings. The first focus no longer displays wings; the sixth does. Existing five-part prefix and approved cleaned head asset are retained. Other six models still list five collectibles each. Full images and unused alternate sprites do not count.
- `application/snapshot.ts`: schema 5 with the unchanged key and ten fields. Migrate versions 0 through 4, preserving partial progress, captured timers, existing IDs, actual sessions/minutes, drafts and archives. Accepted legacy complete/in-assembly builds are grandfathered when the list grows; no extra focus is fabricated. Partial collections collect the remaining newly added component. Unknown valid extra keys survive reload; custom recipes do not grant ownership.
- Inventory presentation safely labels components without mixing slots. No new timer phase, dependencies, backend, database, artwork generation or resumed custom mixing. README, SPEC, architecture and asset notes describe current behavior; earlier dated QA records remain historical.

## Automated and build verification

`npm test`: **140 tests passed in 17 files**. New tests cover list-derived counts 1/3/6/8, stale or absent count declarations, malformed/duplicate definitions, arbitrary extra-component ownership/restart, non-final breaks, final assembly guards, all seven model loops, old version-4 partial/paused/completed/in-assembly saves, original statistics, new-build count, and expired sixth-focus recovery/idempotency.

`npm run build` passed TypeScript and production Vite bundling. `npm exec --offline -- tauri build --bundles msi` passed (49.21 MiB installer). The existing informational import-library linker warning remains unchanged. `git diff --check` passed.

## Browser verification

Used isolated Playwright session `gundam-variable-qa`; user browser storage was untouched. The initial one-second fast timer was too short for a stable automation Pause click, so the remaining actual focuses used three seconds. This was a test timing issue; no product code change was made for it.

Verified the selector reports six parts/sessions for Wing Zero. Completed six actual timers: fifth reward still enters break, READY at 5/6 has no Assemble button, and sixth focus displays only wings. Paused sixth focus survives reload. Its reveal returns to READY at 6/6; the user-triggered manual build archives once with six real sessions and unchanged captured minutes. Refresh preserves the archive. Build Again retains all six permanent components; inventory includes the independent wings. A new first focus displays torso alone. No horizontal overflow at 420x640.

Separate version-4 browser fixtures verified a completed five-session build remains complete with one original archive and 125 minutes, while a partial 4/5 save becomes 4/6 with the same four components and 100 minutes. Both migrate to version 5. These fixtures were confined to the isolated test profile. Successful flow console output contained no application error.

Visually inspected local screenshots under `output/playwright/`: `variable-six-model-selector.png`, `variable-five-of-six.png`, `variable-sixth-wings-focus.png`, `variable-six-collected.png`, `variable-six-session-hangar.png`, `variable-wing-inventory.png`, `variable-legacy-complete.png` and `variable-legacy-partial.png`. Screenshots/build output are excluded from Git.

## Acceptance and limits

SPEC section 26 acceptance is satisfied for the implemented model/component workflow. Native installation/uninstallation and physical sleep/wake were not repeated. Extending a released model must preserve its existing stage prefix and stable IDs; arbitrary reorder/removal migration and external importing remain separate work. Custom mixing remains paused. No Git commit/push or Python file was created in this task. Local Vite preview is kept running for user testing.
