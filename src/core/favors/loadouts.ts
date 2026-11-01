import { FAVOR_CATALOG } from './catalog'
import { MAX_FAVORS } from '../rules'
import { mathRandom, randomIndex } from '../random'
import type { RandomSource } from '../random'
import type { FavorId } from '../types'

export function availableFavors(blocked: readonly FavorId[]): FavorId[] {
  return (Object.keys(FAVOR_CATALOG) as FavorId[]).filter(id => !blocked.includes(id))
}

export function randomLoadout(blocked: readonly FavorId[], random: RandomSource = mathRandom): FavorId[] {
  const pool = availableFavors(blocked)
  if (pool.length < MAX_FAVORS) throw new RangeError('Not enough available gods for a loadout.')
  return Array.from({ length: MAX_FAVORS }, () => pool.splice(randomIndex(random, pool.length), 1)[0]!)
}

// A fresh pool is needed once fewer than three unused gods remain.
export function nextBlockedFavors(previous: readonly FavorId[], played: readonly FavorId[]): FavorId[] {
  const used = [...new Set([...previous, ...played])]
  return availableFavors(used).length < MAX_FAVORS ? [] : used
}
