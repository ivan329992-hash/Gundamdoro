/** 【组装根】把 adapters 具体实现插进 AppDependencies，供 store/UI 使用。 */
import { bundledAssets } from '../adapters/assets/bundledAssets'
import { bundledCatalog } from '../adapters/catalog/bundledCatalog'
import { browserRuntime, browserScheduler } from '../adapters/platform/browser'
import { getBrowserStorage } from '../adapters/storage/browserStorage'
import type { AppDependencies } from '../application/ports'

export const appDependencies: AppDependencies = {
  catalog: bundledCatalog,
  runtime: browserRuntime,
  storage: getBrowserStorage,
}

export const appAssets = bundledAssets
export const appScheduler = browserScheduler
