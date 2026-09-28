# Gundamdoro

A desktop Pomodoro timer where focused work gradually assembles a mecha.

## MVP idea

Each completed focus session advances one assembly stage. After six focus sessions, the first mecha is complete.

Core loop:

```text
READY -> FOCUS -> ASSEMBLY -> BREAK -> READY
                         \-> COMPLETE
```

## Planned stack

- Tauri v2
- React
- TypeScript
- Vite
- Zustand + persist
- Framer Motion

Development requirements are defined in [SPEC.md](./SPEC.md). Codex instructions are defined in [AGENTS.md](./AGENTS.md).

> MVP scope: Windows desktop, local-only, one built-in mecha, six assembly stages, no backend, no accounts, no cloud sync.
