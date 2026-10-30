import { describe, expect, it } from 'vitest'
import { Game } from '../../core'
import type { FaceId, GameState } from '../../core'
import { inspectableDice } from '../dieInspection'

function fixture() {
  const state = new Game().state
  const players = Object.values(state.players).map(player => ({
    ...player,
    dice: player.dice.map((die, index) => ({
      ...die, faceId: (index === 0 ? 'arrow' : 'axe-1') as FaceId,
      kept: index === 1, selected: index === 2, removed: index === 3,
      value: index === 2 ? 3 : 1,
    })),
  }))
  const targets = players.flatMap(p => p.dice.slice(0, 5).map(d => ({id: d.id, x: 50, y: 50})))
  return { players, targets }
}

describe('visible die inspection and selection ownership', () => {
  it.each(['player-1', 'player-2'] as const)('inspects both seats but only selects the active %s dice', player => {
    const { players, targets } = fixture()
    const inspected = inspectableDice(players, targets, player)
    expect(inspected).toHaveLength(8) // removed and unprojected dice stay absent
    expect(inspected.filter(die => die.canSelect).map(die => die.id)).toEqual([
      `${player}/die-1`, `${player}/die-3`, `${player}/die-5`,
    ])
    expect(inspected.find(die => die.id === `${player}/die-2`)).toMatchObject({ location: 'Kilitli', canSelect: false })
    expect(inspected.filter(die => !die.id.startsWith(player)).every(die => !die.canSelect)).toBe(true)
  })
  it('uses the core face, token border and modified value without inferring from side faces', () => {
    const { players, targets } = fixture()
    const inspected = inspectableDice(players, targets, null)
    expect(inspected.every(die => !die.canSelect)).toBe(true)
    expect(inspected[0]).toMatchObject({ name: 'Ok', face: {symbol: 'arrow', grantsToken: true}, value: 1 })
    expect(inspected[2]).toMatchObject({ name: 'Balta', selected: true, value: 3 })
    expect(inspected[0]!.label).toContain('jeton getirir')
    expect(inspected[2]!.label).toContain('etki 3')
    expect(inspectableDice(players, targets, 'player-1', ['player-1/die-1'])[0]).toMatchObject({ location: 'Kullanıldı', canSelect: false })
  })
  it('never exposes an unrolled face even if a stale projected target exists', () => {
    const state: GameState = new Game().state
    const players = Object.values(state.players)
    expect(inspectableDice(players, [{ id: 'player-1/die-1', x: 50, y: 50 }], 'player-1')).toEqual([])
  })
})
