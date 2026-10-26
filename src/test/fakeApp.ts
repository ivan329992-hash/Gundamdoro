/** 【测试夹具】假时钟/假存储/小图鉴，给 useCases 与 store 测试注入用。 */
import type { AppDependencies, KeyValueStorage } from '../application/ports'
import { createMechaCatalog } from '../domain/catalog'

export function createFakeApp(millisecondsPerMinute = 60_000) {
  const values = new Map<string, string>()
  const storage: KeyValueStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
    removeItem: (key) => {
      values.delete(key)
    },
  }
  let now = 1_000
  let nextId = 0
  const dependencies: AppDependencies = {
    catalog: createMechaCatalog(
      [
        {
          id: 'test-model',
          name: 'TEST MODEL',
          totalStages: 3,
          finalAsset: 'final/model.png',
          stages: [
            { stage: 1, name: 'CORE', asset: 'parts/core.png' },
            { stage: 2, name: 'HEAD', asset: 'parts/head.png' },
            { stage: 3, name: 'LEGS', asset: 'parts/legs.png' },
          ],
        },
      ],
      'test-model',
    ),
    runtime: {
      now: () => now,
      newId: () => `test-id-${++nextId}`,
      random: () => 0.5,
      millisecondsPerMinute: () => millisecondsPerMinute,
    },
    storage: () => storage,
  }
  return {
    dependencies,
    values,
    storage,
    setNow: (value: number) => {
      now = value
    },
  }
}
