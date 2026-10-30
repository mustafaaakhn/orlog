import { describe, expect, it, vi } from 'vitest'
import { Game } from '../../core'
import { createRollSession } from '../rollSession'

describe('background authoritative presentation', () => {
  it('finishes an in-flight local roll and rejects its stale visual callbacks', async () => {
    const session = createRollSession({ random: () => 0.35 })
    session.dispatch({ type: 'RollDice', playerId: 'player-1' })
    const old = session.pending.value!
    session.setBackground(true)
    expect(session.pending.value).toBeNull()
    expect(session.state.value).toBe(old.state)
    session.present(old.id, old.events[0]!)
    session.settle(old.id)
    expect(session.state.value).toBe(old.state)
    expect(session.history.value).toEqual(old.events)
    session.dispatch({ type: 'ConfirmRoll', playerId: 'player-1' })
    await Promise.resolve()
    expect(session.pending.value).toBeNull()
    expect(session.state.value.phase).toMatchObject({ activePlayerId: 'player-2', step: 'awaiting-roll' })
  })

  it('settles remote batches without a canvas, preserves event order, and never calculates remote outcomes', async () => {
    const game = new Game({ gameId: 'hidden-remote', random: () => 0.35 })
    const session = createRollSession()
    const port = { dispatch: vi.fn(() => true), settled: vi.fn() }
    session.setBackground(true)
    session.startRemote(game.state, port)
    await Promise.resolve()
    const roll = game.dispatch({ type: 'RollDice', playerId: 'player-1' })
    if (!roll.ok) throw new Error('roll expected')
    session.receive(roll.state, roll.events)
    const confirm = game.dispatch({ type: 'ConfirmRoll', playerId: 'player-1' })
    if (!confirm.ok) throw new Error('confirm expected')
    // Both packets can arrive before the microtask draining the first packet.
    session.receive(confirm.state, confirm.events)
    await Promise.resolve()
    session.setBackground(true)
    expect(session.state.value).toBe(confirm.state)
    expect(session.pending.value).toBeNull()
    expect(session.history.value).toEqual([...roll.events, ...confirm.events])
    expect(port.settled.mock.calls).toEqual([[0], [1], [2]])
    expect(port.dispatch).not.toHaveBeenCalled()
    session.setBackground(false)
    session.resume()
    expect(session.pending.value?.events).toEqual([])
    expect(session.state.value.players).toBe(confirm.state.players)
  })

  it('resolves and advances a local round in the background with the same core resources', async () => {
    const session = createRollSession({ random: () => 0.35 })
    session.setBackground(true)
    while (session.state.value.phase.name === 'roll') {
      const phase = session.state.value.phase
      session.dispatch({ type: phase.step === 'awaiting-roll' ? 'RollDice' : 'ConfirmRoll', playerId: phase.activePlayerId })
      await Promise.resolve()
    }
    while (session.state.value.phase.name === 'favor') {
      const phase = session.state.value.phase
      session.dispatch({ type: 'SkipFavor', playerId: phase.activePlayerId })
      await Promise.resolve()
    }
    expect(session.resolveReady()).toBe(true)
    const result = session.pending.value!.state
    await Promise.resolve()
    expect(session.state.value.players).toBe(result.players)
    expect(session.advanceRound()).toBe(true)
    await Promise.resolve()
    expect(session.state.value.round).toBe(2)
    expect(session.pending.value).toBeNull()
    expect(session.history.value.some(event => event.type === 'TokensGained')).toBe(true)
  })
})
