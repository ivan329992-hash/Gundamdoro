import type { BuiltMecha } from '../domain/types'

/** 暂停跨机型拼装；仅控制可用性与展示，不迁移或删除历史数据。 */
export const CUSTOM_ASSEMBLY_ENABLED = false

export const PARTS_ENTRY_LABEL = CUSTOM_ASSEMBLY_ENABLED ? '配件仓库与拼装' : '配件仓库'

export function visibleHangarEntries(entries: BuiltMecha[]): BuiltMecha[] {
  return CUSTOM_ASSEMBLY_ENABLED ? entries : entries.filter((entry) => entry.kind !== 'custom')
}
