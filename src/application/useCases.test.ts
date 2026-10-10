import { describe, expect, it } from 'vitest'
import { createFakeApp } from '../test/fakeApp'
import { createDefaultData } from './state'
import { createAppUseCases } from './useCases'

describe('platform-independent application use cases', () => {
  it('uses injected time, IDs, model definition and duration without browser globals', () => {
    const fake = createFakeApp(1000)
    const commands = createAppUseCases(fake.dependencies)
    const initial = createDefaultData(fake.dependencies)
    expect(initial.assembly.mechaId).toBe('test-model')
    expect(initial.assembly.totalStages).toBe(3)
    const running = commands.startFocus(initial)
    expect(running.timer.endAt).toBe(26_000)
    expect(running.timer.sessionId).toBe('test-id-1')
    fake.setNow(26_000)
    const revealed = commands.syncTimer(running)
    expect(revealed.phase).toBe('PART_REWARD')
    expect(revealed.assembly.currentStage).toBe(1)
    expect(commands.completeFocus(revealed, 'test-id-1')).toBe(revealed)
    expect(initial.phase).toBe('READY')
    expect(running.assembly.currentStage).toBe(0)
  })

  it('coordinates collection and archiving while retaining immutable old records', () => {
    const fake = createFakeApp(1000)
    const commands = createAppUseCases(fake.dependencies)
    let data = createDefaultData(fake.dependencies)
    for (let part = 1; part <= 3; part++) {
      data = commands.startFocus(data)
      fake.setNow(data.timer.endAt!)
      data = commands.syncTimer(data)
      data = commands.finishPartReveal(data)
      if (part < 3) data = commands.endBreak(data)
    }
    expect(data.phase).toBe('READY')
    expect(data.hangar).toHaveLength(0)
    data = commands.startAssembly(data)
    data = commands.finishAssemblyAnimation(data)
    expect(data.hangar[0].mechaName).toBe('TEST MODEL')
    expect(data.hangar[0].completedFocusSessions).toBe(3)
    expect(commands.finishAssemblyAnimation(data)).toBe(data)
    const saved = data.hangar[0]
    const reset = commands.resetMecha(data)
    expect(reset.hangar[0]).toBe(saved)
    expect(reset.assembly.currentStage).toBe(0)
  })
})
