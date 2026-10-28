import { describe, expect, it } from 'vitest'
import { Group } from 'three'
import { Game, createSeededRandom } from '../../core'
import type { CommandResult, DieId, GameState } from '../../core'
import type { PresentationBatch } from '../../app/rollSession'
import { bowlSlot, faceUpRotation, reserveSlot } from '../../scene/diceGeometry'
import { createDicePresenter } from '../dicePresenter'

function batch(result: CommandResult): PresentationBatch {
  if (!result.ok) throw new Error(result.error.message)
  return {
    id: result.state.revision,
    revision: result.state.revision,
    events: result.events,
    state: result.state,
  }
}
function pieces(state: GameState) {
  const dice = new Map<DieId, Group>()
  for (const player of Object.values(state.players)) {
    player.dice.forEach((die, index) => {
      const object = new Group(),
        marker = new Group()
      marker.name = 'selection-marker'
      object.add(marker)
      if (die.faceId) object.quaternion.copy(faceUpRotation(die.faceId))
      const inBowl =
        state.phase.name === 'roll' &&
        state.phase.activePlayerId === player.id &&
        !die.kept &&
        !die.selected
      object.position.set(
        ...(inBowl
          ? bowlSlot(index)
          : reserveSlot(player.id, index, die.selected)),
      )
      dice.set(die.id, object)
    })
  }
  return dice
}

describe('dice presentation ownership', () => {
  it('clears the rim during selection while keeping accepted dice stationary', async () => {
    const game = new Game({ random: createSeededRandom(1) })
    game.dispatch({ type: 'RollDice', playerId: 'player-1' })
    game.dispatch({
      type: 'SetDieSelection',
      playerId: 'player-1',
      dieId: 'player-1/die-1',
      selected: true,
    })
    game.dispatch({ type: 'ConfirmRoll', playerId: 'player-1' })
    game.dispatch({ type: 'RollDice', playerId: 'player-2' })
    game.dispatch({ type: 'ConfirmRoll', playerId: 'player-2' })
    game.dispatch({ type: 'RollDice', playerId: 'player-1' })
    const dice = pieces(game.state),
      kept = dice.get('player-1/die-1')!,
      moving = dice.get('player-1/die-2')!
    const position = kept.position.toArray(),
      rotation = kept.quaternion.toArray()
    const frames: {
      y: number
      z: number
      kept: number[]
      rotation: number[]
    }[] = []
    const presenter = createDicePresenter(dice, () =>
      frames.push({
        y: moving.position.y,
        z: moving.position.z,
        kept: kept.position.toArray(),
        rotation: kept.quaternion.toArray(),
      }),
    )
    try {
      await presenter.play(
        batch(
          game.dispatch({
            type: 'SetDieSelection',
            playerId: 'player-1',
            dieId: 'player-1/die-2',
            selected: true,
          }),
        ),
      )
      expect(Math.max(...frames.map((frame) => frame.y))).toBeGreaterThan(1.8)
      const crossing = frames.filter((frame) => frame.z > 2.5 && frame.z < 3.3)
      expect(crossing.length).toBeGreaterThan(0)
      expect(crossing.every((frame) => frame.y > 1.8)).toBe(true)
      expect(
        frames.every(
          (frame) =>
            JSON.stringify(frame.kept) === JSON.stringify(position) &&
            JSON.stringify(frame.rotation) === JSON.stringify(rotation),
        ),
      ).toBe(true)
      expect(moving.position.toArray()).toEqual(
        reserveSlot('player-1', 1, true),
      )
    } finally {
      presenter.dispose()
    }
  })

  it('completes an already arranged batch without leaving the command lock waiting on an empty timeline', async () => {
    const game = new Game()
    game.dispatch({ type: 'RollDice', playerId: 'player-1' })
    const confirmed = batch(
      game.dispatch({ type: 'ConfirmRoll', playerId: 'player-1' }),
    )
    const presenter = createDicePresenter(pieces(confirmed.state), () => {})
    try {
      await presenter.play(confirmed)
    } finally {
      presenter.dispose()
    }
  })
})
