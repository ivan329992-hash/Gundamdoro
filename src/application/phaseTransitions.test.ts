import { describe, expect, it, vi } from 'vitest'
import { schedulePhaseCompletion } from './phaseTransitions'
import type { SchedulerPort } from './ports'

function fakeScheduler() {
  let callback: (() => void) | undefined
  const cancel = vi.fn(() => {
    callback = undefined
  })
  const scheduler: SchedulerPort = {
    after: vi.fn((_delay, next) => {
      callback = next
      return cancel
    }),
    every: vi.fn(() => cancel),
  }
  return { scheduler, cancel, fire: () => callback?.() }
}

describe('phase completion coordination', () => {
  it.each([false, true])('keeps part reveal at 2800ms with reduced motion %s', (reduced) => {
    const fake = fakeScheduler()
    const actions = { finishPartReveal: vi.fn(), finishAssemblyAnimation: vi.fn() }
    const stop = schedulePhaseCompletion('PART_REWARD', reduced, actions, fake.scheduler)
    expect(fake.scheduler.after).toHaveBeenCalledWith(2800, expect.any(Function))
    fake.fire()
    expect(actions.finishPartReveal).toHaveBeenCalledOnce()
    stop()
    expect(fake.cancel).toHaveBeenCalledOnce()
  })

  it.each([
    [false, 4800],
    [true, 1400],
  ] as const)(
    'keeps manual assembly completion with reduced motion %s at %i ms',
    (reduced, delay) => {
      const fake = fakeScheduler()
      const actions = { finishPartReveal: vi.fn(), finishAssemblyAnimation: vi.fn() }
      schedulePhaseCompletion('ASSEMBLY', reduced, actions, fake.scheduler)
      expect(fake.scheduler.after).toHaveBeenCalledWith(delay, expect.any(Function))
      fake.fire()
      expect(actions.finishAssemblyAnimation).toHaveBeenCalledOnce()
      expect(actions.finishPartReveal).not.toHaveBeenCalled()
    },
  )

  it('cancels callbacks when the coordinator is disposed', () => {
    const fake = fakeScheduler()
    const actions = { finishPartReveal: vi.fn(), finishAssemblyAnimation: vi.fn() }
    schedulePhaseCompletion('ASSEMBLY', false, actions, fake.scheduler)()
    fake.fire()
    expect(actions.finishAssemblyAnimation).not.toHaveBeenCalled()
  })

  it('does not schedule transitions while ready or focusing', () => {
    const fake = fakeScheduler()
    const actions = { finishPartReveal: vi.fn(), finishAssemblyAnimation: vi.fn() }
    schedulePhaseCompletion('READY', false, actions, fake.scheduler)
    schedulePhaseCompletion('FOCUS', false, actions, fake.scheduler)
    expect(fake.scheduler.after).not.toHaveBeenCalled()
  })
})
