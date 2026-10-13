/** 【领域·机库】按 buildId 去重后写入已完成机甲记录。 */
import type { BuiltMecha } from './types'

export function addCompletedBuild(hangar: BuiltMecha[], entry: BuiltMecha): BuiltMecha[] {
  return hangar.some((saved) => saved.id === entry.id) ? hangar : [entry, ...hangar]
}

export interface HangarGroup {
  key: string
  latest: BuiltMecha
  count: number
  sessions: number
  minutes: number
  firstCompletedAt: number | null
  hasUnknownDate: boolean
}

export function groupHangar(hangar: BuiltMecha[]): HangarGroup[] {
  const groups = new Map<string, HangarGroup>()
  for (const entry of [...hangar].sort((a, b) => (b.completedAt ?? -1) - (a.completedAt ?? -1))) {
    const key = entry.kind === 'custom'
      ? `custom:${entry.composition ? JSON.stringify(Object.entries(entry.composition).sort(([a], [b]) => a.localeCompare(b))) : entry.id}`
      : `model:${entry.mechaId}`
    const group = groups.get(key)
    if (!group) {
      groups.set(key, { key, latest: entry, count: 1, sessions: entry.completedFocusSessions,
        minutes: entry.totalFocusedMinutes, firstCompletedAt: entry.completedAt, hasUnknownDate: entry.completedAt === null })
    } else {
      group.count++
      group.sessions += entry.completedFocusSessions
      group.minutes += entry.totalFocusedMinutes
      group.hasUnknownDate ||= entry.completedAt === null
      if (entry.completedAt !== null) group.firstCompletedAt = Math.min(group.firstCompletedAt ?? entry.completedAt, entry.completedAt)
    }
  }
  return [...groups.values()]
}
