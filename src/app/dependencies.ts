/** 【组装根】把 adapters 具体实现插进 AppDependencies，供 store/UI 使用。 */
import { bundledAssets } from '../adapters/assets/bundledAssets'
import { bundledCatalog } from '../adapters/catalog/bundledCatalog'
import { browserRuntime, browserScheduler, watchTimerWake } from '../adapters/platform/browser'
import { getBrowserStorage } from '../adapters/storage/browserStorage'
import type { AppDependencies } from '../application/ports'
import { registeredAssemblyPolicy } from '../adapters/assets/registeredAssembly'
import { createUserModelLibrary } from '../adapters/catalog/userModelLibrary'
import { userModelFiles } from '../adapters/storage/userModelFiles'
import { createBackupPort } from '../adapters/storage/backupAssets'

const userModels = createUserModelLibrary(bundledCatalog, bundledAssets, userModelFiles)

export const appDependencies: AppDependencies = {
  catalog: userModels.catalog,
  runtime: browserRuntime,
  storage: getBrowserStorage,
  assembly: registeredAssemblyPolicy,
  models: userModels.library,
  backup: createBackupPort(userModels.assets),
}

export const appAssets = userModels.assets
export const appScheduler = browserScheduler
export const appTimerWake = watchTimerWake
