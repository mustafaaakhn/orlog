import { describe, expect, it } from 'vitest'
import { Group, Vector3, Mesh, SphereGeometry, MeshStandardMaterial } from 'three'
import { Game, PLAYER_IDS } from '../../core'
import type { GameEvent, GameState, DieId } from '../../core'
import { createEventQueue } from '../eventQueue'
import { applyResourceEvent } from '../resources'
import { createCombatPresenter } from '../combatPresenter'
import type { createBoard } from '../../scene/board'

function resolution() {
  const game = new Game({ random: () => 0 })
  while (game.state.phase.name === 'roll') {
    const phase = game.state.phase
    game.dispatch({ type: phase.step === 'awaiting-roll' ? 'RollDice' : 'ConfirmRoll', playerId: phase.activePlayerId })
  }
  for (const playerId of PLAYER_IDS) game.dispatch({ type: 'SkipFavor', playerId })
  const before = game.state
  const result = game.dispatch({ type: 'ResolveRound', playerId: 'player-1' })
  if (!result.ok) throw new Error(result.error.message)
  return { before, ...result }
}
function mockBoard(state: GameState) {
  const dice = new Map<DieId, Group>()
  Object.values(state.players).forEach(player => player.dice.forEach(die => dice.set(die.id, new Group())))
  return { dice, effect: new Mesh(new SphereGeometry(), new MeshStandardMaterial()), tokenEffect: new Group(), resourcePosition: () => new Vector3(2, 0, 0), totem: () => new Group() } as unknown as ReturnType<typeof createBoard>
}

describe('sequential presentation', () => {
  it('updates resources only after the animation completion signal and cancels without late application', async () => {
    const { before, events } = resolution()
    let displayed = before, release = () => {}
    const queue = createEventQueue(() => new Promise<void>(resolve => { release = resolve }), event => { displayed = applyResourceEvent(displayed, event) })
    const hit = events.find(e => e.type === 'DamageDealt')!
    const playing = queue.play([hit])
    expect(displayed).toBe(before)
    release()
    await playing
    expect(displayed.players['player-2'].health).toBe(14)
    const again = queue.play([events.find(e => e.type === 'DamageDealt' && e !== hit)!])
    queue.dispose()
    release()
    await again
    expect(displayed.players['player-2'].health).toBe(14)
  })
  it('plays actual GSAP animations at normal and fast speed with identical event order and resources', async () => {
    const { before, events, state } = resolution()
    const orders: string[][] = []
    for (const speed of [1, 4]) {
      let displayed = before
      const order: string[] = [], board = mockBoard(before)
      const presenter = createCombatPresenter(board, () => {}, () => speed)
      const queue = createEventQueue(presenter.play, event => { order.push(event.id); displayed = applyResourceEvent(displayed, event) })
      try {
        await queue.play(events)
        expect(displayed.players).toEqual(state.players)
        expect(board.effect.visible).toBe(false)
        orders.push(order)
      } finally { queue.dispose(); presenter.dispose() }
    }
    expect(orders[0]).toEqual(orders[1])
  }, 15000)
  it('disposes an in-flight animation, completes its wait and never applies its event', async () => {
    const { before, events } = resolution()
    const presenter = createCombatPresenter(mockBoard(before), () => {}, () => 1)
    const applied: GameEvent[] = []
    const queue = createEventQueue(presenter.play, e => applied.push(e))
    const playing = queue.play([events.find(e => e.type === 'DamageDealt')!])
    queue.dispose()
    presenter.dispose()
    await playing
    expect(applied).toHaveLength(0)
  })
})
