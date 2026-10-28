import { describe, expect, it } from 'vitest'
import { FAVOR_CATALOG } from '../index'

describe('verified first-three favor data', () => {
  it('distinguishes payment windows from numeric priorities', () => {
    expect(FAVOR_CATALOG['vidars-might']).toMatchObject({ priority: 4, timing: 'before-resolution', effect: 'remove-helmets' })
    expect(FAVOR_CATALOG['thors-strike']).toMatchObject({ priority: 6, timing: 'after-resolution', effect: 'damage' })
    expect(FAVOR_CATALOG['iduns-rejuvenation']).toMatchObject({ priority: 7, timing: 'after-resolution', effect: 'heal' })
  })

  it('preserves all three token costs and effect strengths from the rule reference', () => {
    expect(Object.values(FAVOR_CATALOG['thors-strike'].tiers)).toEqual([
      { cost: 4, amount: 2 }, { cost: 8, amount: 5 }, { cost: 12, amount: 8 },
    ])
    expect(Object.values(FAVOR_CATALOG['iduns-rejuvenation'].tiers)).toEqual([
      { cost: 4, amount: 2 }, { cost: 7, amount: 4 }, { cost: 10, amount: 6 },
    ])
    expect(Object.values(FAVOR_CATALOG['vidars-might'].tiers)).toEqual([
      { cost: 2, amount: 2 }, { cost: 4, amount: 4 }, { cost: 6, amount: 6 },
    ])
  })
})
