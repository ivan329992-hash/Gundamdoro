# AGENTS.md

This repository is developed against [SPEC.md](./SPEC.md).

## Mission

Build the v0.1 Windows desktop MVP of Gundamdoro exactly as specified.

The product goal is not to build a feature-complete productivity app. The goal is to validate:

> Completing focus sessions gradually assembles a mecha and makes the next session feel rewarding.

## Source of truth

Before making changes:

1. Read `SPEC.md`.
2. Read this file.
3. Inspect the current repository state.
4. Identify the current development phase.
5. Implement only the next incomplete phase/task unless explicitly instructed otherwise.

If repository code and SPEC conflict, SPEC wins unless the user explicitly changes the requirement.

## Development order

Follow this order:

1. Phase 0 — Bootstrap
2. Phase 1 — Timer engine
3. Phase 2 — State machine and persistence
4. Phase 3 — Mecha system
5. Phase 4 — Assets
6. Phase 5 — Assembly animation
7. Phase 6 — Break / Complete
8. Phase 7 — Settings
9. Phase 8 — Tauri integration
10. Phase 9 — QA

Do not jump ahead merely to make the UI look more complete.

## Hard constraints

Do NOT introduce unless the user changes the SPEC:

- Backend
- Database / SQLite
- Authentication
- Cloud sync
- React Router
- Todo/task system
- Analytics
- AI
- Theme marketplace
- Mobile app
- 3D / WebGL / Live2D / Spine

Do not add large dependencies without a clear need.

## State rules

- All business state belongs in Zustand.
- Components must not directly invent phase transitions.
- Use store actions for transitions.
- Timer source of truth is timestamp-based.
- Do not rely on decrement-only intervals.
- Focus completion must be idempotent using sessionId.
- One focus session may advance the mecha only once.
- Animation errors must not corrupt progress.

## Quality rules

At the end of each phase:

1. Run TypeScript checks.
2. Run relevant tests if present.
3. Run the frontend build.
4. Run Tauri checks/build when the phase requires it.
5. Fix errors before continuing.

Keep implementations small and readable. Prefer straightforward code over architecture for architecture's sake.

## Asset rules

- All runtime assets are local.
- Stage images must use consistent canvas/anchor rules from SPEC.
- Do not add copyrighted official Gundam/Bandai/Sunrise assets to the public repository.
- Use original demo mecha assets.

## UI rule

Functionality first.

The focus screen must stay visually quiet. The strongest visual reward belongs to the ASSEMBLY transition.

## Completion reporting

When finishing a task or phase, report:

- What changed
- Files changed
- Commands/tests run
- Whether the phase DoD is satisfied
- The next phase/task

Do not claim a phase is complete if its Definition of Done is not met.

## First instruction for a fresh Codex session

A fresh Codex session should begin with:

> Read SPEC.md and AGENTS.md. Inspect the repository. Determine the current incomplete phase and implement only that phase. Run checks before reporting completion.
