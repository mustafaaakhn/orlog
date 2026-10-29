import { describe, expect, it } from 'vitest'
import { inspectFavor, leaveFavor } from '../favorInspection'
import type { FavorInspection } from '../favorInspection'
import type { SceneFavorTarget } from '../../scene/dieTargets'

const thor: SceneFavorTarget = { playerId: 'player-1', favorId: 'thors-strike', x: 80, y: 70 }
const frigg: SceneFavorTarget = { ...thor, favorId: 'friggs-sight' }
const empty: FavorInspection = { target: null, pinned: false }

describe('temporary favor inspection and intentional pinning', () => {
  it('closes hover/focus preview on leaving and allows a fresh preview', () => {
    const preview = inspectFavor(empty, thor, false)
    expect(preview).toEqual({ target: thor, pinned: false })
    expect(leaveFavor(preview)).toEqual(empty)
    expect(inspectFavor(preview, frigg, false).target).toBe(frigg)
  })
  it('keeps pinned identity and draft component through hover, blur and pointer leave', () => {
    const pinned = inspectFavor(empty, thor, true)
    expect(inspectFavor(pinned, frigg, false)).toBe(pinned)
    expect(leaveFavor(pinned)).toBe(pinned)
    expect(inspectFavor(pinned, frigg, true)).toEqual({ target: frigg, pinned: true })
  })
})
