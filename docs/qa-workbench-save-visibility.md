# Workbench save visibility correction

Date: 2026-10-13. The user reported that custom assembly appeared to have no Save button.

Root cause: the existing button was inside the scrolling workbench form. In a 420×640 browser viewport, after browsing the last part, the button's top was -710.8px and therefore off screen. Saving itself was already implemented.

Changes: `src/components/Inventory/InventoryScreen.tsx` moves the single save/random action group and status into a fixed bottom bar, with a hangar shortcut after successful save. Missing parts, unavailable parts and blank names explain disabled saving. `src/styles/global.css` styles the bar and reserves bottom padding. Business actions, IDs, ownership, focus statistics and storage are unchanged. README/SPEC describe the persistent entrypoint.

Verification:

- `npm test`: 29 files, 372 tests passed.
- `npm run build`: TypeScript and Vite production build passed.
- Playwright in isolated `save-placement` browser storage: Save remained inside the viewport and passed center-point hit testing at both page top/bottom in 320×568, 420×640 and 1280×720. No horizontal overflow. Screenshots in `output/playwright/save-button-before.png`, `save-button-after-320.png`, `save-button-after-420.png`, `save-button-after-1280.png`, `save-button-saved.png`.
- Blank name and missing required parts disabled Save with an explanation. A complete recipe saved once, displayed 已保存到仓库, opened its dossier via the same bar, and survived reload. The bar is absent in inventory-only and hangar views. Real user data was not changed.
- `git diff --check`: passed.

The browser UI correction is complete. No Rust/native APIs changed; this small presentation fix was not separately repackaged or retested in the native executable. Next: user verification in the running browser preview. No Git commit/push.
