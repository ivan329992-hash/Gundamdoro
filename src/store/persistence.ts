import type { PersistStorage, StorageValue } from 'zustand/middleware'
import type { AppData, PersistenceStatus } from '../domain/types'

/** 串行写入快照，防止异步适配器用较旧的结果覆盖新进度。 */
export function trackPersistence(
  storage: PersistStorage<AppData>,
  onStatus: (status: PersistenceStatus) => void,
) {
  let revision = 0
  let pending: Promise<void> | null = null
  let lastSaved: StorageValue<AppData> | null = null
  let strict = false

  const tracked: PersistStorage<AppData> = {
    ...storage,
    setItem(key, value) {
      const previous = lastSaved
      const fields = Object.keys(value.state) as (keyof AppData)[]
      if (
        !pending &&
        previous &&
        previous.version === value.version &&
        fields.every((field) => Object.is(previous.state[field], value.state[field]))
      ) {
        onStatus('saved')
        return
      }
      const current = ++revision
      const mustSucceed = strict
      onStatus('saving')

      const saved = () => {
        lastSaved = value
        if (current === revision) onStatus('saved')
      }
      const failed = (cause: unknown) => {
        if (current === revision) onStatus('error')
        if (mustSucceed) throw cause
      }
      const write = () => {
        try {
          const result = storage.setItem(key, value)
          if (result instanceof Promise) return result.then(saved, failed)
          saved()
        } catch (cause) {
          failed(cause)
        }
      }

      const result = pending ? pending.then(write, write) : write()
      if (result instanceof Promise) {
        pending = result
        const finished = () => {
          if (pending === result) pending = null
        }
        void result.then(finished, finished)
      }
      return result
    },
  }

  return {
    storage: tracked,
    setStrict: (value: boolean) => {
      strict = value
    },
  }
}
