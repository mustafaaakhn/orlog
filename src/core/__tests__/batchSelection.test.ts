import { describe, expect, it } from 'vitest'
import { Game } from '../game'
import type { DieId, GameCommand } from '../types'

const playerId = 'player-1'
const five: DieId[] = [1, 2, 3, 4, 5].map(i => `player-1/die-${i}` as DieId)
function rolledGame() {
  const game = new Game({ random: () => 0.4 })
  game.dispatch({ type: 'RollDice', playerId })
  return game
}

describe('atomic dice selection', () => {
  it('selects five dice in one revision and one event without locking, rerolling or advancing', () => {
    const game = rolledGame(), before = game.state
    const result = game.dispatch({ type: 'SetDiceSelection', playerId, dieIds: five })
    expect(result.ok).toBe(true)
    expect(result.events).toEqual([expect.objectContaining({ type: 'DiceSelectionChanged', dieIds: five, revision: before.revision + 1 })])
    expect(result.state.revision).toBe(before.revision + 1)
    expect(result.state.phase).toEqual(before.phase)
    expect(result.state.players[playerId].dice.filter(d => d.selected).map(d => d.id)).toEqual(five)
    expect(result.state.players[playerId].dice.map(d => ({ ...d, selected: false }))).toEqual(before.players[playerId].dice)
    expect(result.state.players['player-2']).toEqual(before.players['player-2'])
    expect(result.state.players[playerId].health).toBe(before.players[playerId].health)
    expect(result.state.players[playerId].tokens).toBe(before.players[playerId].tokens)
  })
  it('returns a group to the bowl, skips an identical final selection and protects previously locked dice', () => {
    const game = rolledGame()
    game.dispatch({ type: 'SetDiceSelection', playerId, dieIds: five })
    const selected = game.state
    const same = game.dispatch({ type: 'SetDiceSelection', playerId, dieIds: [...five].reverse() })
    expect(same.ok).toBe(true)
    expect(same.state).toBe(selected)
    expect(same.events).toEqual([])
    const returned = game.dispatch({ type: 'SetDiceSelection', playerId, dieIds: [] })
    expect(returned.events).toHaveLength(1)
    expect(returned.state.players[playerId].dice.every(d => !d.selected && !d.kept)).toBe(true)
    game.dispatch({ type: 'SetDiceSelection', playerId, dieIds: [five[0]!] })
    game.dispatch({ type: 'ConfirmRoll', playerId })
    game.dispatch({ type: 'RollDice', playerId: 'player-2' })
    game.dispatch({ type: 'ConfirmRoll', playerId: 'player-2' })
    game.dispatch({ type: 'RollDice', playerId })
    const before = game.state
    const invalid = game.dispatch({ type: 'SetDiceSelection', playerId, dieIds: five })
    expect(invalid).toMatchObject({ ok: false, error: { code: 'DIE_LOCKED' } })
    expect(game.state).toBe(before)
    game.dispatch({ type: 'SetDiceSelection', playerId, dieIds: [five[1]!] })
    game.dispatch({ type: 'SetDiceSelection', playerId, dieIds: [] })
    expect(game.state.players[playerId].dice[0]!.kept).toBe(true)
  })
  it.each([
    { dieIds: ['player-1/die-1', 'player-2/die-1'] },
    { dieIds: ['player-1/die-1', 'player-1/die-1'] },
    { dieIds: null },
    { dieIds: 'player-1/die-1' },
    { dieIds: [null] },
  ])('rejects a malformed or foreign list atomically: %j', input => {
    const game = rolledGame(), before = game.state
    expect(game.dispatch({ type: 'SetDiceSelection', playerId, ...input } as GameCommand).ok).toBe(false)
    expect(game.state).toBe(before)
  })
  it('checks phase and player before accepting a group', () => {
    const game = new Game()
    expect(game.dispatch({ type: 'SetDiceSelection', playerId, dieIds: [] })).toMatchObject({ ok: false, error: { code: 'ROLL_REQUIRED' } })
    game.dispatch({ type: 'RollDice', playerId })
    expect(game.dispatch({ type: 'SetDiceSelection', playerId: 'player-2', dieIds: [] })).toMatchObject({ ok: false, error: { code: 'WRONG_PLAYER' } })
  })
})
