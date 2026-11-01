import { describe, expect, it } from 'vitest'
import { FAVOR_CATALOG } from '../favors/catalog'
import { availableFavors, nextBlockedFavors, randomLoadout } from '../favors/loadouts'
import type { FavorId } from '../types'

const own: FavorId[] = ['thors-strike', 'iduns-rejuvenation', 'vidars-might']
const other: FavorId[] = ['baldrs-invulnerability', 'bragis-verve', 'skadis-hunt']
describe('per-player rematch loadouts', () => {
  it('excludes the player’s used gods while allowing the opponent’s gods', () => {
    const available = availableFavors(own)
    expect(available).toHaveLength(17)
    expect(available.filter(id => own.includes(id))).toEqual([])
    expect(other.every(id => available.includes(id))).toBe(true)
    expect(own).toEqual(['thors-strike', 'iduns-rejuvenation', 'vidars-might'])
  })
  it('gives the computer three different, available gods without changing either input', () => {
    const blocked = (Object.keys(FAVOR_CATALOG) as FavorId[]).slice(0, 17)
    const result = randomLoadout(blocked, () => .999)
    expect(result).toHaveLength(3)
    expect(new Set(result).size).toBe(3)
    expect(result.every(id => !blocked.includes(id))).toBe(true)
    expect(blocked).toHaveLength(17)
  })
  it('does not silently give the computer a forbidden god when fewer than three remain', () => {
    const blocked = (Object.keys(FAVOR_CATALOG) as FavorId[]).slice(0, 18)
    expect(() => randomLoadout(blocked)).toThrow(RangeError)
  })
})

describe('god-pool renewal', () => {
  it('accumulates personal choices across games and never mutates the supplied history', () => {
    const first = nextBlockedFavors([], own)
    const second = nextBlockedFavors(first, other)
    expect(second).toEqual([...own, ...other])
    expect(first).toEqual(own)
    expect(nextBlockedFavors(second, other)).toEqual(second)
  })
  it('keeps fifteen used gods locked, then renews after the sixth three-god loadout', () => {
    const all = Object.keys(FAVOR_CATALOG) as FavorId[]
    let blocked: FavorId[] = []
    for (let game = 0; game < 5; game++) {
      blocked = nextBlockedFavors(blocked, all.slice(game * 3, game * 3 + 3))
      expect(blocked).toHaveLength((game + 1) * 3)
    }
    const renewed = nextBlockedFavors(blocked, all.slice(15, 18))
    expect(renewed).toEqual([])
    expect(availableFavors(renewed)).toHaveLength(20)
    expect(nextBlockedFavors(renewed, own)).toEqual(own)
  })
})
