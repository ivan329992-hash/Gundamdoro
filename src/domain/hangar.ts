/** 【领域·机库】按 buildId 去重后写入已完成机甲记录。 */
import type { BuiltMecha } from './types'

export function addCompletedBuild(hangar: BuiltMecha[], entry: BuiltMecha): BuiltMecha[] {
  return hangar.some((saved) => saved.id === entry.id) ? hangar : [entry, ...hangar]
}
