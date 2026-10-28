import { afterEach, describe, expect, it, vi } from 'vitest'
import { userModelFiles } from './userModelFiles'
import { createUserModelPackage } from '../../domain/userModels'
import { draftModel } from '../../test/userModels'

const native = vi.hoisted(() => ({ desktop: false, invoke: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({
  isTauri: () => native.desktop,
  invoke: native.invoke,
  convertFileSrc: (path: string) => `asset:${path}`,
}))

class MemoryDirectory {
  readonly kind = 'directory'
  directories = new Map<string, MemoryDirectory>()
  files = new Map<string, Blob>()
  failWrite = ''
  async getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<MemoryDirectory> {
    if (!this.directories.has(name)) {
      if (!options?.create) throw new DOMException('missing', 'NotFoundError')
      this.directories.set(name, new MemoryDirectory())
    }
    return this.directories.get(name)!
  }
  async getFileHandle(name: string, options?: { create?: boolean }) {
    if (!this.files.has(name)) {
      if (!options?.create) throw new DOMException('missing', 'NotFoundError')
      this.files.set(name, new Blob())
    }
    return {
      getFile: async () => new File([this.files.get(name)!], name),
      createWritable: async () => {
        let pending = new Blob()
        return {
          write: async (data: Blob | string) => {
            if (this.failWrite === name) throw new Error('quota exceeded')
            pending = new Blob([data])
          },
          close: async () => {
            this.files.set(name, pending)
          },
          abort: vi.fn(async () => {}),
        }
      },
    }
  }
  async *entries() {
    for (const entry of this.directories.entries()) yield entry
  }
  async removeEntry(name: string) {
    this.directories.delete(name)
  }
}

function filesystem() {
  const root = new MemoryDirectory()
  vi.stubGlobal('navigator', { storage: { getDirectory: async () => root } })
  let next = 0
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:test-${++next}`)
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  return root
}

afterEach(() => {
  native.desktop = false
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  native.invoke.mockReset()
})

describe('local user model file repository', () => {
  it('cleans only its failed new directory and permits retrying the same backup model ID', async () => {
    const root = filesystem()
    const library = await root.getDirectoryHandle('gundamdoro-user-models', { create: true })
    let fail = true
    vi.spyOn(library, 'getDirectoryHandle').mockImplementation(async (name, options) => {
      const directory = await MemoryDirectory.prototype.getDirectoryHandle.call(
        library,
        name,
        options,
      )
      if (fail && options?.create) {
        directory.failWrite = 'manifest.json'
        fail = false
      }
      return directory
    })
    const model = createUserModelPackage(draftModel(), 'user-retry')
    await expect(userModelFiles.save(model)).rejects.toThrow('quota')
    expect(library.directories.has(model.manifest.id)).toBe(false)
    await userModelFiles.save(model)
    expect((await userModelFiles.load())[0].manifest).toEqual(model.manifest)
    await expect(userModelFiles.save(model)).rejects.toThrow('不能覆盖')
    expect(library.directories.has(model.manifest.id)).toBe(true)
  })
  it('does not create storage for an empty library, saves separate binaries and rebuilds URLs on restart', async () => {
    const root = filesystem()
    expect(await userModelFiles.load()).toEqual([])
    expect(root.directories.size).toBe(0)
    const model = createUserModelPackage(draftModel(), 'user-test')
    const saved = await userModelFiles.save(model)
    const directory = root.directories.get('gundamdoro-user-models')!.directories.get('user-test')!
    expect(directory.files.size).toBe(5)
    expect(JSON.parse(await directory.files.get('manifest.json')!.text())).toEqual({
      version: 1,
      manifest: model.manifest,
    })
    expect(saved.assets['final.png']).toMatch(/^blob:/)
    const restored = await userModelFiles.load()
    expect(restored[0].manifest).toEqual(model.manifest)
    expect(restored[0].assets['final.png']).not.toBe(saved.assets['final.png'])
    await expect(userModelFiles.save(model)).rejects.toThrow('不能覆盖')
  })

  it('ignores interrupted imports and rejects corrupt committed manifests', async () => {
    const root = filesystem()
    const library = await root.getDirectoryHandle('gundamdoro-user-models', { create: true })
    const pending = await library.getDirectoryHandle('user-pending', { create: true })
    expect(await userModelFiles.load()).toEqual([])
    pending.files.set('manifest.json', new Blob())
    expect(await userModelFiles.load()).toEqual([])
    pending.files.set('manifest.json', new Blob(['not JSON']))
    await expect(userModelFiles.load()).rejects.toThrow()
  })

  it('does not expose a quota-failed import and releases all temporary URLs', async () => {
    const root = filesystem()
    const library = await root.getDirectoryHandle('gundamdoro-user-models', { create: true })
    const create = vi.spyOn(library, 'getDirectoryHandle')
    create.mockImplementation(async (name, options) => {
      const directory = await MemoryDirectory.prototype.getDirectoryHandle.call(
        library,
        name,
        options,
      )
      directory.failWrite = 'manifest.json'
      return directory
    })
    await expect(
      userModelFiles.save(createUserModelPackage(draftModel(), 'user-test')),
    ).rejects.toThrow('quota exceeded')
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(4)
    expect(await userModelFiles.load()).toEqual([])
  })

  it('fails safely when committed resources are missing and revokes earlier loaded URLs', async () => {
    const root = filesystem()
    await userModelFiles.save(createUserModelPackage(draftModel(), 'user-test'))
    const directory = root.directories.get('gundamdoro-user-models')!.directories.get('user-test')!
    directory.files.delete('part-2.png')
    await expect(userModelFiles.load()).rejects.toThrow('missing')
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2)
  })

  it('leaves builtins usable without OPFS but reports unsupported import explicitly', async () => {
    vi.stubGlobal('navigator', { storage: {} })
    expect(await userModelFiles.load()).toEqual([])
    await expect(
      userModelFiles.save(createUserModelPackage(draftModel(), 'user-test')),
    ).rejects.toThrow('不支持')
  })

  it('uses native scoped commands and reconstructs asset protocol URLs rather than source-file references', async () => {
    native.desktop = true
    const model = createUserModelPackage(draftModel(), 'user-test')
    const record = {
      manifest: model.manifest,
      assets: { 'final.png': 'app-data/user-models/user-test/final.png' },
    }
    native.invoke.mockResolvedValueOnce(record).mockResolvedValueOnce([record])
    expect((await userModelFiles.save(model)).assets['final.png']).toBe(
      'asset:app-data/user-models/user-test/final.png',
    )
    expect(native.invoke.mock.calls[0][0]).toBe('save_user_model')
    expect(native.invoke.mock.calls[0][1].images[0].bytes).toEqual(
      Array.from(model.images['final.png']),
    )
    expect((await userModelFiles.load())[0].manifest).toEqual(model.manifest)
    expect(native.invoke.mock.calls[1][0]).toBe('load_user_models')
  })
})
