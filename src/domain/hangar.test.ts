import { describe, expect, it } from 'vitest'
import { groupHangar } from './hangar'
import type { BuiltMecha } from './types'

const build = (id: string, mechaId = 'mecha-01', completedAt: number | null = 100): BuiltMecha => ({
  id, mechaId, mechaName: mechaId, completedAt, completedFocusSessions: 5, totalFocusedMinutes: 125,
})

describe('hangar model summaries', () => {
  it('keeps distinct rendering profiles separate without changing saved recipes', () => {
    const composition = Object.fromEntries(['torso', 'head', 'left-arm', 'right-arm', 'legs'].map((slot) => [slot, `mecha-01:${slot}`])) as NonNullable<BuiltMecha['composition']>
    const legacy: BuiltMecha = { ...build('old'), kind: 'custom', composition }
    const current = { ...legacy, id: 'new', assemblyProfile: 'standard-front-v1' }
    expect(groupHangar([legacy, current, { ...current, id: 'second' }]).map((group) => group.count)).toEqual([1, 2])
  })
  it('returns no groups for an empty hangar', () => expect(groupHangar([])).toEqual([]))
  it('groups fixed models without changing history and sums actual statistics', () => {
    const records = [build('a'), build('b', 'mecha-01', 200), build('c', 'mecha-02', 300)]
    const saved = JSON.stringify(records)
    const groups = groupHangar(records)
    expect(groups.map((group) => group.latest.id)).toEqual(['c', 'b'])
    expect(groups[1]).toMatchObject({ count: 2, sessions: 10, minutes: 250, firstCompletedAt: 100, hasUnknownDate: false })
    expect(JSON.stringify(records)).toBe(saved)
  })
  it('does not fabricate first-completion dates for legacy entries', () => {
    const group = groupHangar([build('a', 'unknown', null), build('b', 'unknown', 200)])[0]
    expect(group).toMatchObject({ count: 2, firstCompletedAt: 200, hasUnknownDate: true })
    expect(groupHangar([build('a', 'unknown', null)])[0].firstCompletedAt).toBeNull()
  })
  it('keeps different custom recipes separate and merges identical recipes regardless of key order', () => {
    const composition = { torso: 'mecha-01:torso', head: 'mecha-01:head', 'left-arm': 'mecha-01:left-arm', 'right-arm': 'mecha-01:right-arm', legs: 'mecha-01:legs' }
    const first: BuiltMecha = { ...build('a'), kind: 'custom', composition }
    const second: BuiltMecha = { ...build('b'), kind: 'custom', composition: { legs: composition.legs, head: composition.head, torso: composition.torso, 'right-arm': composition['right-arm'], 'left-arm': composition['left-arm'] } }
    const third: BuiltMecha = { ...build('c'), kind: 'custom', composition: { ...composition, head: 'mecha-02:head' } }
    expect(groupHangar([first, second, third, build('fixed')]).map((group) => group.count)).toEqual([2, 1, 1])
  })
})
