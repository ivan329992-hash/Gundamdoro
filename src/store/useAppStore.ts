/** 【Store·门面】默认单例 store。UI 几乎都从这里读状态/调 action。 */
import { appDependencies } from '../app/dependencies'
import { createAppStore } from './createAppStore'

export const useAppStore = createAppStore(appDependencies)
