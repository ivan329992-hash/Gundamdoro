import type { LocalBackup } from '../domain/backup'
import type { UserModelPackage } from '../domain/userModels'
import { createFakeApp } from './fakeApp'
import type { BackupPort } from '../application/ports'

export function createBackupFake(millisecondsPerMinute = 1000) {
  const fake = createFakeApp(millisecondsPerMinute)
  const builtins = fake.dependencies.catalog
  const models = new Map<string, UserModelPackage>()
  fake.dependencies.catalog = {
    defaultMecha: builtins.defaultMecha,
    list: () => [...builtins.list(), ...[...models.values()].map((model) => model.manifest)],
    find: (id) => models.get(id)?.manifest ?? builtins.find(id),
  }
  const backup: BackupPort = {
    readModel: async (manifest) => {
      const model = models.get(manifest.id)
      if (!model) throw new Error('测试素材缺失')
      return structuredClone(model)
    },
    // 用例/门面测试只替换文件容器，真实二进制校验另在适配器测试覆盖。
    encode: async (value) =>
      new TextEncoder().encode(
        JSON.stringify(value, (_key, item: unknown) =>
          item instanceof Uint8Array ? [...item] : item,
        ),
      ),
    decode: async (bytes) => {
      const result = JSON.parse(new TextDecoder().decode(bytes)) as LocalBackup
      result.models = result.models.map((model) => ({
        manifest: model.manifest,
        images: Object.fromEntries(
          Object.entries(model.images).map(([name, image]) => [name, new Uint8Array(image)]),
        ),
      }))
      return result
    },
  }
  fake.dependencies.backup = backup
  fake.dependencies.models = {
    load: async () => {},
    save: async (model) => {
      if (models.has(model.manifest.id)) throw new Error('测试机型已存在')
      models.set(model.manifest.id, structuredClone(model))
    },
  }
  return { ...fake, models, backup }
}
