import { canUseWorkbench } from '../domain/inventory'
import { createUserModelPackage, type UserModelDraft } from '../domain/userModels'
import type { AppDependencies } from './ports'
import type { AppPhase } from '../domain/types'

export async function importUserModel(
  draft: UserModelDraft,
  phase: AppPhase,
  dependencies: AppDependencies,
): Promise<string> {
  if (!canUseWorkbench(phase)) throw new Error('请在待机或制作完成后导入机型。')
  if (!dependencies.models) throw new Error('当前环境不支持保存用户机型。')
  const model = createUserModelPackage(draft, `user-${dependencies.runtime.newId()}`)
  if (dependencies.catalog.find(model.manifest.id)) throw new Error('机型标识重复，请重试。')
  await dependencies.models.save(model)
  return model.manifest.id
}
