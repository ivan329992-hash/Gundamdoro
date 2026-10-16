import { createMechaCatalog, type MechaCatalog } from '../../domain/catalog'
import { validateUserManifest, type UserModelPackage } from '../../domain/userModels'
import type { AssetResolver, UserModelLibrary } from '../../application/ports'

export interface StoredUserModel { manifest: unknown; assets: Record<string, string> }
export interface UserModelRepository {
  load(): Promise<StoredUserModel[]>
  save(model: UserModelPackage): Promise<StoredUserModel>
}

export function createUserModelLibrary(builtins: MechaCatalog, bundled: AssetResolver, repository: UserModelRepository) {
  let registry = builtins
  let assets: Record<string, Record<string, string>> = {}
  let loaded = false
  let loading: Promise<void> | null = null
  const catalog: MechaCatalog = { defaultMecha: builtins.defaultMecha, find: (id) => registry.find(id), list: () => registry.list() }
  const resolver: AssetResolver = { resolve: (id, path) => assets[id]?.[path] ?? bundled.resolve(id, path) }
  const validate = (record: StoredUserModel) => {
    const manifest = validateUserManifest(record.manifest)
    if ([manifest.finalAsset, ...manifest.stages.map((part) => part.asset)].some((name) => !record.assets[name])) throw new Error('用户机型素材缺失。')
    return manifest
  }
  const library: UserModelLibrary = {
    async load() {
      if (loaded) return
      if (!loading) loading = (async () => {
        const records = await repository.load()
        const models = records.map(validate)
        const next = createMechaCatalog([...builtins.list(), ...models], builtins.defaultMecha.id)
        assets = Object.fromEntries(records.map((record, index) => [models[index].id, record.assets]))
        registry = next
        loaded = true
      })().finally(() => { loading = null })
      await loading
    },
    async save(model) {
      await library.load()
      const manifest = validateUserManifest(model.manifest)
      if (registry.find(manifest.id)) throw new Error('机型已存在，不能覆盖。')
      const saved = await repository.save(model)
      const stored = validate(saved)
      if (stored.id !== manifest.id) throw new Error('保存的机型标识不一致。')
      registry = createMechaCatalog([...registry.list(), stored], builtins.defaultMecha.id)
      assets = { ...assets, [stored.id]: saved.assets }
    },
  }
  return { catalog, assets: resolver, library }
}
