# Model appearance rewards and compact hangar cards

Date: 2026-10-13. Two approved UI changes: omit component-origin lists from custom hangar cards and conceal uncompleted model previews behind a silhouette/question mark.

## Changes

- `src/components/Hangar/HangarScreen.tsx`: custom cards retain finished art, name, count, date and dossier access, without listing torso/head/arm/leg/wing origins. Fixed-model focus statistics remain visible. Detailed recipe origins remain in `MechaDetail`; persisted recipes are unchanged.
- `src/components/Mecha/ModelSelectionScreen.tsx`: derive revealed models from completed non-custom hangar records. Uncompleted models use the existing alpha artwork as a flat silhouette with a centered question mark; completed models show full art. Repeated builds, unknown historical dates and restart retain reveal status. Custom recipes do not reveal their source models. There is no new persisted flag, unlock credit or migration.
- `src/styles/global.css`: silhouette filtering and noninteractive question overlay. When image loading fails, the overlay hides so existing error/Retry controls remain readable.
- `ModelSelectionScreen.test.tsx` verifies initial concealment, fixed-history reveal and custom/unavailable-history exclusion. README/SPEC document both behaviors.

## Verification

- `npm test`: 30 files, 375 tests passed.
- `npm run build`: TypeScript and Vite production build passed.
- `npm exec --offline -- tauri build --bundles msi`: passed; installer `src-tauri/target/release/bundle/msi/Gundamdoro_0.1.0_x64_en-US.msi`, 59.81 MiB. Existing informational MSVC import-library linker warning remains.
- Playwright isolated browser fixture: custom eight-part card had no definition list, while its dossier retained all eight origins and the fixed card retained focus statistics. With one fixed MECHA-02 history and a mixed recipe using every model, six models remained silhouetted and only MECHA-02 revealed. Computed filtering was `brightness(0) invert(1)` with opacity 0.28. Narrow 420×640 layout had no horizontal overflow; image-error Retry remained usable without the question overlay covering it.
- Completed seven actual accelerated MECHA-03 focus sessions, manually assembled and opened model selection. MECHA-03 then revealed; reload retained five mysteries/two revealed models and exactly three fixture archives. Manual assembly added no extra focus credit.
- Final Windows executable, isolated `output/native-model-mystery-qa-profile`: fresh profile showed seven mysteries, imported completed history showed five. Custom card origins were absent, eight dossier origins remained, and reload did not duplicate archives. Closed QA application normally afterward.
- `git diff --check`: passed. Real user data was not replaced; no original PNG was edited, no dependency/backend added and no Git commit/push performed.

Screenshots: `output/playwright/hangar-summary.png`, `model-mystery-wide.png`, `model-mystery-narrow.png`, `model-mystery-first-row.png`, `model-mystery-native.png`.

Both UI tasks are complete. Next: user visual acceptance in the running browser preview.
