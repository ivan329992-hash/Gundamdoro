import { describe, expect, it } from 'vitest'
import { createFakeApp } from '../test/fakeApp'
import { createDefaultData } from './state'
import { createAppUseCases } from './useCases'
import { completionNotice, estimatedEndAt, projectTimer } from './timerExperience'
import { createAppStore, initializeAppStore } from '../store/createAppStore'
import { APP_STORAGE_KEY, APP_STORAGE_VERSION } from './snapshot'

describe('daily timer experience', () => {
  it('estimates READY and running end times but does not claim a paused finish time', () => {
    const fake = createFakeApp()
    const initial = createDefaultData(fake.dependencies)
    const commands = createAppUseCases(fake.dependencies)
    expect(estimatedEndAt(initial.timer, 1000)).toBe(1501000)
    const running = commands.startFocus(initial, 1000)
    expect(estimatedEndAt(running.timer, 4000)).toBe(running.timer.endAt)
    const paused = commands.pauseTimer(running, 5000)
    expect(estimatedEndAt(paused.timer, 8000)).toBeNull()
    expect(estimatedEndAt(commands.resumeTimer(paused, 9000).timer, 9000)).toBe(
      running.timer.endAt! + 4000,
    )
  })

  it('projects the upcoming focus target and newly earned reward without exposing storage', () => {
    const fake = createFakeApp()
    const commands = createAppUseCases(fake.dependencies)
    const initial = createDefaultData(fake.dependencies)
    expect(projectTimer(initial, fake.dependencies.catalog).targetName).toBe('CORE')
    const running = commands.startFocus(initial)
    const reward = commands.completeFocus(running, running.timer.sessionId!, running.timer.endAt!)
    expect(projectTimer(reward, fake.dependencies.catalog).targetName).toBe('CORE')
    const ready = commands.endBreak(commands.finishPartReveal(reward))
    expect(projectTimer(ready, fake.dependencies.catalog).targetName).toBe('HEAD')
    expect(Object.keys(projectTimer(ready, fake.dependencies.catalog)).sort()).toEqual([
      'modelName',
      'phase',
      'targetName',
      'timer',
    ])
  })

  it('notices only completed focus, not cancel, abandonment or duplicate callbacks', () => {
    const fake = createFakeApp()
    const commands = createAppUseCases(fake.dependencies)
    const running = commands.startFocus(createDefaultData(fake.dependencies))
    const reward = commands.completeFocus(running, running.timer.sessionId!, running.timer.endAt!)
    expect(
      completionNotice(running, reward, fake.dependencies.catalog, running.timer.endAt!),
    ).toMatchObject({ body: 'CORE 已收集，辛苦了。' })
    for (const next of [commands.cancelTimer(running), commands.abandonBuild(running), running])
      expect(
        completionNotice(running, next, fake.dependencies.catalog, running.timer.endAt!),
      ).toBeNull()
    expect(
      completionNotice(
        reward,
        commands.completeFocus(reward, running.timer.sessionId!),
        fake.dependencies.catalog,
        running.timer.endAt!,
      ),
    ).toBeNull()
  })

  it('notices expired break but not skipped or abandoned break', () => {
    const fake = createFakeApp()
    const commands = createAppUseCases(fake.dependencies)
    const running = commands.startFocus(createDefaultData(fake.dependencies))
    const reward = commands.completeFocus(running, running.timer.sessionId!, running.timer.endAt!)
    const rest = commands.finishPartReveal(reward, 2000)
    expect(
      completionNotice(rest, commands.endBreak(rest), fake.dependencies.catalog, 2001),
    ).toBeNull()
    expect(
      completionNotice(
        rest,
        commands.abandonBuild(rest),
        fake.dependencies.catalog,
        rest.timer.endAt!,
      ),
    ).toBeNull()
    expect(
      completionNotice(
        rest,
        commands.completeBreak(rest, rest.timer.endAt!),
        fake.dependencies.catalog,
        rest.timer.endAt!,
      ),
    ).toMatchObject({ title: '休息结束' })
  })

  it('round-trips preferences and quick durations without changing captured active timers or legacy defaults', async () => {
    const fake = createFakeApp()
    const store = createAppStore(fake.dependencies)
    await initializeAppStore(store)
    expect(store.getState().settings).toEqual({ focusMinutes: 25, breakMinutes: 5 })
    store.getState().updateSettings({
      focusMinutes: 45,
      soundEnabled: false,
      notificationsEnabled: true,
      miniTimerEnabled: false,
    })
    store.getState().startFocus()
    const captured = store.getState().timer.durationMs
    store.getState().updateSettings({ focusMinutes: 15 })
    expect(store.getState().timer.durationMs).toBe(captured)
    const restored = createAppStore(fake.dependencies)
    await initializeAppStore(restored)
    expect(restored.getState().settings).toEqual({
      focusMinutes: 45,
      breakMinutes: 5,
      soundEnabled: false,
      notificationsEnabled: true,
      miniTimerEnabled: false,
    })
    expect(JSON.parse(fake.values.get(APP_STORAGE_KEY)!).version).toBe(APP_STORAGE_VERSION)
  })

  it('recovers a long clock gap once and only credits the captured focus duration', async () => {
    const fake = createFakeApp()
    const store = createAppStore(fake.dependencies)
    await initializeAppStore(store)
    const notices: string[] = []
    const stop = store.subscribe((next, previous) => {
      const notice = completionNotice(
        previous,
        next,
        fake.dependencies.catalog,
        fake.dependencies.runtime.now(),
      )
      if (notice) notices.push(notice.title)
    })
    store.getState().startFocus()
    const { endAt, sessionId, durationMs } = store.getState().timer
    fake.setNow(endAt! + 8 * 60 * 60_000)
    for (let i = 0; i < 3; i++) store.getState().syncTimer()
    store.getState().completeFocus(sessionId!)
    store.getState().recoverState()
    expect(store.getState().phase).toBe('PART_REWARD')
    expect(store.getState().assembly.completedFocusSessions).toBe(1)
    expect(store.getState().assembly.currentStage).toBe(1)
    expect(store.getState().totalFocusedMinutes).toBe(durationMs / 60_000)
    expect(notices).toEqual(['TEST MODEL · 专注完成'])

    store.getState().finishPartReveal()
    const breakEnd = store.getState().timer.endAt!
    fake.setNow(breakEnd + 2 * 60 * 60_000)
    for (let i = 0; i < 3; i++) store.getState().syncTimer()
    expect(store.getState().phase).toBe('READY')
    expect(store.getState().timer.status).toBe('idle')
    expect(store.getState().assembly.completedFocusSessions).toBe(1)
    expect(notices).toEqual(['TEST MODEL · 专注完成', '休息结束'])
    stop()
  })

  it('does not complete a paused or canceled focus after a long clock gap', async () => {
    const fake = createFakeApp()
    const store = createAppStore(fake.dependencies)
    await initializeAppStore(store)
    store.getState().startFocus()
    const session = store.getState().timer.sessionId!
    fake.setNow(2_000)
    store.getState().pauseTimer()
    const paused = store.getState().timer
    fake.setNow(24 * 60 * 60_000)
    store.getState().syncTimer()
    store.getState().recoverState()
    expect(store.getState().timer).toBe(paused)
    expect(store.getState().assembly.currentStage).toBe(0)
    store.getState().resumeTimer()
    expect(store.getState().timer.endAt).toBe(fake.dependencies.runtime.now() + paused.remainingMs)
    store.getState().cancelTimer()
    fake.setNow(48 * 60 * 60_000)
    store.getState().syncTimer()
    store.getState().completeFocus(session)
    expect(store.getState().phase).toBe('READY')
    expect(store.getState().assembly.currentStage).toBe(0)
    expect(store.getState().totalFocusedMinutes).toBe(0)
  })
})
