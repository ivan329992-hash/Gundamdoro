# Daily timer and desktop mini-window acceptance — 2026-10-12

Scope: READY quick durations, estimated finish time, optional sound/native or browser notifications, and a desktop mini timer. Prior dossier changes remain preserved. No Git commit/push, database, router, new reward rule or top-level persistence field.

## Implementation

- `application/timerExperience.ts` supplies pure ETA, state projection and completion notice detection; its tests cover successful/duplicate/canceled/abandoned focus, natural/skipped break and old/new settings persistence.
- Settings retain version 5 and the existing key with optional `soundEnabled`, `notificationsEnabled`, `miniTimerEnabled`. Missing values mean sound on, notifications off and mini on. Explicit invalid values are ignored by normalization; captured running timer durations remain immutable.
- `adapters/platform/reminders.ts` handles gesture-unlocked synthesized audio and notification permission/delivery. Tauri notification plugin JS/Rust are on the 2.5 series. System toast sound and suppression remain controlled by Windows; application beep is independently optional.
- `adapters/platform/miniWindow.ts` owns scoped events/window operations and disposable heartbeats. Main alone hydrates, persists, completes focus and schedules animations. Mini renders read-only phase/time/target, calculates remaining time from timestamps and requests owner sync/pause. A hidden static native window is draggable/always-on-top; the app exits when main is destroyed.
- Timer UI, App, BreakScreen, SettingsDialog, main entry, Tauri configuration/capabilities and README/SPEC/architecture document the new behavior. Web preview uses the same mini card inside the page only.

## Automated and browser checks

`npm test`: 164 tests in 23 files passed. Added ETA/notice/preferences coverage, native bridge tests including disabled widget and listener/timer cleanup, and notification permission/delivery tests. `npm run build`: TypeScript and Vite passed. `git diff --check`: passed with existing line-ending informational warnings.

Playwright browser QA used a separate profile. Verified 45/15-minute shortcuts, paused ETA, mini preview control synchronization, settings persistence, one focus and one natural-break reminder, and no further sound/notification after disabling. Browser notification and audio APIs were mocked to count delivery without affecting the user's system. At 420×640 the abandonment button ends at y=593.5; the focus controls remain in view. Screenshot: ignored `output/playwright/daily-timer-mini.png`.

## Native checks

Windows MSI production build passed (about 51 MiB). Initial dependency retrieval was slow; after resolution, offline builds used downloaded packages. Initial plain Cargo check lacked Windows SDK library paths; release bundling succeeded with process-local MSVC/SDK paths. The existing informational linker import-library warning remains unchanged. Rust formatting could not be checked automatically because this toolchain has no rustfmt component; no global toolchain changes were made.

The release executable was launched using isolated WebView2 user data under ignored `output/native-timer-qa-profile`, with a process-local debugging port. Playwright attached through CDP to the actual two native WebViews. Verified minimize → mini visible, mini pause/resume → owner state, return → main restored and mini hidden, disabled preference → no mini, with no page errors. An accelerated saved native focus fixture expired while minimized: exactly one stage/session/minute/unlock was granted. Actual native screenshot: ignored `output/playwright/native-mini-timer.png`.

Normal main-window close was checked twice after both WebViews were ready, using isolated `output/native-timer-close-qa-profile`: closing the main window exited the host process with the hidden mini window present. A premature startup probe and a CDP browser-close probe were not treated as valid normal-window-close acceptance checks; their owned test processes were cleaned up without touching user application processes.

The installer was generated, not installed over the user's application. Installed-app Windows toast appearance, OS quiet mode, actual speaker audibility, long-duration suspend/wake and multi-monitor placement remain manual checks. Window dragging is wired to Tauri startDragging and permission-checked by the build; its physical movement was not automated. No claim of reminders while the app is closed or PC asleep.

References: [Tauri notifications](https://v2.tauri.app/plugin/notification/) and [Playwright WebView2 testing](https://playwright.dev/docs/webview2).
