import { describe, expect, it } from 'vitest'
import { inspectFavor, leaveFavor } from '../favorInspection'
import type { FavorInspection } from '../favorInspection'
import type { SceneFavorTarget } from '../../scene/dieTargets'

const thor: SceneFavorTarget = { playerId: 'player-1', favorId: 'thors-strike', x: 80, y: 70 }
const frigg: SceneFavorTarget = { ...thor, favorId: 'friggs-sight' }
const empty: FavorInspection = { target: null, pinned: false }

describe('temporary favor inspection and intentional pinning', () => {
  it('closes hover/focus preview on leaving and allows a fresh preview', () => {
    const preview = inspectFavor(empty, thor, false, 'player-1')
    expect(preview).toEqual({ target: thor, pinned: false })
    expect(leaveFavor(preview)).toEqual(empty)
    expect(inspectFavor(preview, frigg, false, 'player-1').target).toBe(frigg)
  })
  it('keeps pinned identity and draft component through hover, blur and pointer leave', () => {
    const pinned = inspectFavor(empty, thor, true, 'player-1')
    expect(inspectFavor(pinned, frigg, false, 'player-1')).toBe(pinned)
    expect(leaveFavor(pinned)).toBe(pinned)
    expect(inspectFavor(pinned, frigg, true, 'player-1')).toEqual({ target: frigg, pinned: true })
  })
})

// Inspection is available in every idle phase; only a player's favor turn permits pinning.
describe('inspection ownership', () => {
  const enemy: SceneFavorTarget = { ...frigg, playerId: 'player-2' }
  it('previews both sides outside the favor phase without allowing selection', () => {
    for (const target of [thor, enemy]) {
      expect(inspectFavor(empty, target, false, null)).toEqual({ target, pinned: false })
      expect(inspectFavor(empty, target, true, null)).toEqual({ target, pinned: false })
    }
  })
  it('keeps opponent activation read-only during the human favor turn', () => {
    expect(inspectFavor(empty, enemy, true, 'player-1')).toEqual({ target: enemy, pinned: false })
    const ownDraft = inspectFavor(empty, thor, true, 'player-1')
    expect(inspectFavor(ownDraft, enemy, true, 'player-1')).toBe(ownDraft)
    expect(leaveFavor(ownDraft)).toBe(ownDraft)
    expect(inspectFavor(empty, enemy, true, 'player-2')).toEqual({ target: enemy, pinned: true })
  })
})
