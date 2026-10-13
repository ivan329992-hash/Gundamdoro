# Hangar dossiers acceptance — 2026-10-11

Approved scope: group duplicate models visually, preserve history, add clickable dossiers and seven independent local profiles. No schema change, native API change, new dependencies or Git publication.

## Changed areas

- `src/domain/hangar.ts` and its tests: immutable grouping by model, canonical custom recipes, real cumulative totals and unknown-date handling.
- `src/mecha/profiles.ts`: six original fictional profiles plus explicitly unofficial Wing Zero EW application interpretation.
- `src/components/Hangar/HangarScreen.tsx`, `MechaDetail.tsx` and detail tests: accessible detail entry/return, keyboard focus, local full art, parameters/story/records and unavailable-resource fallback.
- `src/app/App.tsx`, `src/components/Complete/CompleteScreen.tsx`, `src/styles/global.css`: distinct-model entrance counts and responsive terminal styling. SPEC, README and architecture document the behavior.

## Results

`npm test`: 153 tests across 20 files passed, including six new cases covering grouping, preserved history/statistics, unknown dates, distinct/equivalent custom recipes, all seven dossiers and unknown-model fallback. `npm run build`: TypeScript and production frontend build passed.

Playwright used an isolated profile with five fixture records across three models. Verified empty hangar, three displayed cards, detail entry, fan-art disclaimer, Escape/focus restoration, unknown model fallback, unchanged five records/READY phase, and grouping after refresh. Screenshots visually inspected at 1100×850 and 420×640; no horizontal overflow. Images stored under ignored `output/playwright/hangar-dossier-*.png`, not user save data.

Desktop installer/native WebView testing was not repeated for this frontend-only extension. Existing build artifacts are not updated by the frontend build. Local preview remains on port 1420.
