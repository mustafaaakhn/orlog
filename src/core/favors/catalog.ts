import { deepFreeze } from '../immutable'
import type { FavorDefinition, FavorId, FavorLevel } from '../types'

// Shared data for rule execution and the favor picker.
export const FAVOR_CATALOG: Readonly<Record<FavorId, FavorDefinition>> = deepFreeze({
  'thors-strike': {
    id: 'thors-strike',
    name: "Thor's Strike",
    priority: 6,
    timing: 'after-resolution',
    effect: 'damage',
    tiers: {
      1: { cost: 4, amount: 2 },
      2: { cost: 8, amount: 5 },
      3: { cost: 12, amount: 8 },
    },
  },
  'iduns-rejuvenation': {
    id: 'iduns-rejuvenation',
    name: "Iðunn's Rejuvenation",
    priority: 7,
    timing: 'after-resolution',
    effect: 'heal',
    tiers: {
      1: { cost: 4, amount: 2 },
      2: { cost: 7, amount: 4 },
      3: { cost: 10, amount: 6 },
    },
  },
  'vidars-might': {
    id: 'vidars-might',
    name: "Víðarr's Might",
    priority: 4,
    timing: 'before-resolution',
    effect: 'remove-helmets',
    tiers: {
      1: { cost: 2, amount: 2 },
      2: { cost: 4, amount: 4 },
      3: { cost: 6, amount: 6 },
    },
  },
})

export const DEFAULT_FAVORS: readonly FavorId[] = deepFreeze([
  'thors-strike', 'iduns-rejuvenation', 'vidars-might',
])

export function isFavorId(value: unknown): value is FavorId {
  return typeof value === 'string' && Object.hasOwn(FAVOR_CATALOG, value)
}

export function isFavorLevel(value: unknown): value is FavorLevel {
  return value === 1 || value === 2 || value === 3
}
