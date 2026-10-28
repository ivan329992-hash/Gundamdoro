import { describe, expect, it, vi } from 'vitest'
import { collectLocalBackup, prepareBackupPlan, restoreBackupModels } from './backup'
import { createBackupFake } from '../test/backup'
import { createDefaultData } from './state'
import { createUserModelPackage } from '../domain/userModels'
import { draftModel } from '../test/userModels'
import { createAppUseCases } from './useCases'
import { BACKUP_LIMITS } from '../domain/backup'

describe('local backup use cases', () => {
  it('includes ten progress fields and all personal models without platform URLs or state mutation', async () => {
    const fake = createBackupFake()
    const model = createUserModelPackage(draftModel(), 'user-test')
    fake.models.set(model.manifest.id, model)
    const state = createDefaultData(fake.dependencies)
    state.unlockedParts = ['removed-model:shield']
    state.hangar = [
      {
        id: 'history',
        mechaId: 'removed-model',
        mechaName: '保留档案',
        completedAt: null,
        completedFocusSessions: 2,
        totalFocusedMinutes: 50,
      },
    ]
    const original = structuredClone(state)
    const backup = await collectLocalBackup(state, fake.dependencies)
    expect(backup.progress.version).toBe(8)
    expect(Object.keys(backup.progress.state as object)).toHaveLength(10)
    expect(backup.models).toEqual([model])
    expect(state).toEqual(original)
    const plan = await prepareBackupPlan(backup, state, fake.dependencies)
    expect(plan.data).toEqual(state)
    expect(plan.summary).toMatchObject({ builds: 1, ownedParts: 1, userModels: 1 })
  })

  it('previews a missing user model before writing and restores immutable files only when requested', async () => {
    const source = createBackupFake()
    const model = createUserModelPackage(draftModel(), 'user-private')
    source.models.set(model.manifest.id, model)
    const state = createAppUseCases(source.dependencies).selectMecha(
      createDefaultData(source.dependencies),
      model.manifest.id,
    )
    const backup = await collectLocalBackup(state, source.dependencies)
    const target = createBackupFake()
    const plan = await prepareBackupPlan(
      backup,
      createDefaultData(target.dependencies),
      target.dependencies,
    )
    expect(plan.data.assembly.mechaId).toBe(model.manifest.id)
    expect(target.models.size).toBe(0)
    await restoreBackupModels(backup, target.dependencies)
    await restoreBackupModels(backup, target.dependencies)
    expect(target.models.size).toBe(1)
    expect(target.models.get(model.manifest.id)).toEqual(model)
  })

  it('preserves extra local models and refuses same-ID content conflicts before writes', async () => {
    const source = createBackupFake()
    const model = createUserModelPackage(draftModel(), 'user-test')
    source.models.set(model.manifest.id, model)
    const backup = await collectLocalBackup(
      createDefaultData(source.dependencies),
      source.dependencies,
    )
    const target = createBackupFake()
    target.models.set('user-extra', createUserModelPackage(draftModel(), 'user-extra'))
    target.models.set(model.manifest.id, {
      ...model,
      images: { ...model.images, 'final.png': new Uint8Array([...model.images['final.png'], 1]) },
    })
    await expect(
      prepareBackupPlan(backup, createDefaultData(target.dependencies), target.dependencies),
    ).rejects.toThrow('同 ID')
    expect(target.models.size).toBe(2)
  })

  it('rejects active, corrupt, incomplete or newer progress instead of normalizing it into defaults', async () => {
    const fake = createBackupFake()
    const current = createDefaultData(fake.dependencies)
    const backup = await collectLocalBackup(current, fake.dependencies)
    for (const state of [
      { ...current, phase: 'FOCUS' },
      { ...current, hangar: [{ id: 'broken' }] },
      { ...current, settings: { focusMinutes: -1, breakMinutes: 5 } },
      { ...current, assembly: { ...current.assembly, mechaId: 'missing-model' } },
      { ...current, workbench: undefined },
      { ...current, timer: { ...current.timer, durationMs: -1, remainingMs: -1 } },
    ])
      await expect(
        prepareBackupPlan(
          { ...backup, progress: { version: 8, state } },
          current,
          fake.dependencies,
        ),
      ).rejects.toThrow()
    await expect(
      prepareBackupPlan(
        { ...backup, progress: { ...backup.progress, version: 9 } },
        current,
        fake.dependencies,
      ),
    ).rejects.toThrow('版本')
  })

  it('keeps completed build identity and does not grant another archive or focus credit', async () => {
    const fake = createBackupFake()
    const useCases = createAppUseCases(fake.dependencies)
    let state = createDefaultData(fake.dependencies)
    for (let part = 0; part < 3; part++) {
      state = useCases.startFocus(state)
      state = useCases.completeFocus(state, state.timer.sessionId!, state.timer.endAt!)
      state = useCases.finishPartReveal(state)
      state = useCases.endBreak(state)
    }
    state = useCases.finishAssemblyAnimation(useCases.startAssembly(state))
    const backup = await collectLocalBackup(state, fake.dependencies)
    const plan = await prepareBackupPlan(
      backup,
      createDefaultData(fake.dependencies),
      fake.dependencies,
    )
    expect(plan.data.hangar).toEqual(state.hangar)
    expect(plan.data.currentBuildId).toBe(state.currentBuildId)
    expect(plan.data.totalFocusedMinutes).toBe(state.totalFocusedMinutes)
  })

  it('restores partial collection from fast preview into a normal-minute runtime without changing credit', async () => {
    const source = createBackupFake(1000)
    const useCases = createAppUseCases(source.dependencies)
    let state = useCases.startFocus(createDefaultData(source.dependencies))
    state = useCases.completeFocus(state, state.timer.sessionId!, state.timer.endAt!)
    state = useCases.endBreak(useCases.finishPartReveal(state))
    const backup = await collectLocalBackup(state, source.dependencies)
    const target = createBackupFake(60_000)
    const plan = await prepareBackupPlan(
      backup,
      createDefaultData(target.dependencies),
      target.dependencies,
    )
    expect(plan.data.timer).toMatchObject({
      status: 'idle',
      durationMs: 25 * 60_000,
      remainingMs: 25 * 60_000,
    })
    expect(plan.data.assembly).toEqual(state.assembly)
    expect(plan.data.totalFocusedMinutes).toBe(state.totalFocusedMinutes)
    expect(plan.data.unlockedParts).toEqual(state.unlockedParts)
  })

  it('checks the personal model count before reading any binaries', async () => {
    const fake = createBackupFake()
    for (let i = 0; i <= BACKUP_LIMITS.models; i++) {
      const model = createUserModelPackage(draftModel(), `user-${i}`)
      fake.models.set(model.manifest.id, model)
    }
    const read = vi.spyOn(fake.backup, 'readModel')
    await expect(
      collectLocalBackup(createDefaultData(fake.dependencies), fake.dependencies),
    ).rejects.toThrow('32')
    expect(read).not.toHaveBeenCalled()
  })
})
