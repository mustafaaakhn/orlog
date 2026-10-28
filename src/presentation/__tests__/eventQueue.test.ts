import { describe, expect, it } from 'vitest'
import { Game, PLAYER_IDS } from '../../core'
import type { GameEvent } from '../../core'
import { createEventQueue } from '../eventQueue'
import { applyResourceEvent } from '../resources'
import { createCombatPresenter } from '../combatPresenter'
import { mockBoard } from './testBoard'

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

it('pauses before contact application and resumes in order; disposing a hidden queue releases its wait', async () => {
  const { events } = resolution()
  const applied: string[] = []
  let release = () => {}
  const queue = createEventQueue(() => new Promise<void>(r => { release = r }), event => applied.push(event.id))
  const playing = queue.play([events[0]!])
  queue.setPaused(true)
  release()
  await Promise.resolve()
  expect(applied).toEqual([])
  queue.setPaused(false)
  await playing
  expect(applied).toEqual([events[0]!.id])
  queue.setPaused(true)
  const hidden = queue.play(events)
  queue.dispose()
  await hidden
  expect(applied).toHaveLength(1)
})

it('reduced combat preserves the complete resource result and leaves no visible effects', async () => {
  const { before, events, state } = resolution()
  const board = mockBoard(before), presenter = createCombatPresenter(board, () => {}, () => 1, () => true)
  let shown = before
  const queue = createEventQueue(presenter.play, event => { shown = applyResourceEvent(shown, event) })
  await queue.play(events)
  expect(shown.players).toEqual(state.players)
  expect(board.effect.visible).toBe(false)
  queue.dispose(); presenter.dispose()
}, 10000)
