/** 【适配器·存储】把 window.localStorage 接到 KeyValueStorage 端口。 */
import type { KeyValueStorage } from '../../application/ports'

export function getBrowserStorage(): KeyValueStorage {
  return window.localStorage
}
