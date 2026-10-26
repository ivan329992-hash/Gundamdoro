import { describe, expect, it } from 'vitest'
import type { AppPhase } from '../domain/types'
import { createFakeApp } from '../test/fakeApp'
import { createAppStore, initializeAppStore } from './createAppStore'

describe('abandon current build', () => {
  it.each<AppPhase>(['READY', 'FOCUS', 'PART_REWARD', 'BREAK'])(
    'resets %s but preserves permanent data and ignores stale completion',
    async (phase) => {
      const fake = createFakeApp(1000)
      const store = createAppStore(fake.dependencies)
      await initializeAppStore(store)
      store.getState().startFocus()
      const first = store.getState().timer
      store.getState().completeFocus(first.sessionId!, first.endAt!)
      store.getState().finishPartReveal()
      store.getState().endBreak()
      store.getState().startFocus()
      const late = store.getState().timer
      store.setState({
        phase,
        totalFocusedMinutes: 12,
        workbench: { id: 'draft', name: 'Keep', parts: {} },
        hangar: [
          {
            id: 'saved',
            mechaId: 'test-model',
            mechaName: 'TEST',
            completedAt: 1,
            completedFocusSessions: 3,
            totalFocusedMinutes: 75,
          },
        ],
      })
      const before = store.getState()
      store.getState().abandonBuild()
      const after = store.getState()
      expect(after.phase).toBe('READY')
      expect(after.assembly.currentStage).toBe(0)
      expect(after.assembly.completedFocusSessions).toBe(0)
      expect(after.totalFocusedMinutes).toBe(0)
      expect(after.currentBuildId).toBeNull()
      expect(after.lastProcessedFocusSessionId).toBeNull()
      expect(after.timer.status).toBe('idle')
      expect(after.timer.sessionId).toBeNull()
      for (const key of ['unlockedParts', 'hangar', 'settings', 'workbench'] as const)
        expect(after[key]).toBe(before[key])
      store.getState().startFocus()
      store.getState().completeFocus(late.sessionId!, late.endAt! + 100000)
      expect(store.getState().assembly.currentStage).toBe(0)
      store.getState().abandonBuild()
      store.getState().abandonBuild()
      const restored = createAppStore(fake.dependencies)
      await initializeAppStore(restored)
      expect(restored.getState().assembly.currentStage).toBe(0)
      expect(restored.getState().unlockedParts).toEqual(before.unlockedParts)
      expect(restored.getState().hangar).toEqual(before.hangar)
    },
  )

  it('allows abandoning a paused focus', () => {
    const store = createAppStore(createFakeApp().dependencies)
    store.getState().startFocus()
    store.getState().pauseTimer()
    store.getState().abandonBuild()
    expect(store.getState().phase).toBe('READY')
    expect(store.getState().timer.status).toBe('idle')
  })

  it.each<AppPhase>(['ASSEMBLY', 'COMPLETE'])('does not abandon %s', (phase) => {
    const store = createAppStore(createFakeApp().dependencies)
    store.setState({ phase })
    const before = store.getState()
    store.getState().abandonBuild()
    expect(store.getState()).toBe(before)
  })
})
