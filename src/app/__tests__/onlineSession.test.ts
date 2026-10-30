import { describe, expect, it, vi } from 'vitest'
import { Game } from '../../core'
import { createRollSession } from '../rollSession'

describe('online presentation session', () => {
  it('forwards commands without rolling locally and acknowledges each batch only once after settlement', () => {
    const game = new Game({ gameId: 'remote-match' })
    const session = createRollSession()
    const port = { dispatch: vi.fn(() => true), settled: vi.fn() }
    session.startRemote(game.state, port)
    const initialId = session.pending.value!.id
    expect(session.dispatch({ type: 'RollDice', playerId: 'player-1' })).toBe(false)
    session.settle(initialId)
    session.settle(initialId)
    expect(port.settled.mock.calls).toEqual([[0]])
    expect(session.dispatch({ type: 'RollDice', playerId: 'player-1' })).toBe(true)
    expect(port.dispatch).toHaveBeenCalledWith({ type: 'RollDice', playerId: 'player-1' }, 0)
    expect(session.state.value.revision).toBe(0)
    expect(session.pending.value).toBeNull()
    const result = game.dispatch({ type: 'RollDice', playerId: 'player-1' })
    if (!result.ok) throw new Error('roll expected')
    session.receive(result.state, result.events)
    expect(session.state.value.revision).toBe(0)
    const batchId = session.pending.value!.id
    session.receive(result.state, result.events)
    expect(session.pending.value!.id).toBe(batchId)
    session.settle(batchId)
    expect(session.state.value).toBe(result.state)
    expect(port.settled.mock.calls).toEqual([[0], [1]])
  })

  it('recovers the server snapshot after scene loss and leaves automatic round advancement to the server', () => {
    const game = new Game({ gameId: 'remote-match' })
    const session = createRollSession()
    const port = { dispatch: vi.fn(() => true), settled: vi.fn() }
    session.startRemote(game.state, port)
    session.settle(session.pending.value!.id)
    const result = game.dispatch({ type: 'RollDice', playerId: 'player-1' })
    if (!result.ok) throw new Error('roll expected')
    session.receive(result.state, result.events)
    const stale = session.pending.value!.id
    session.recover()
    expect(session.state.value).toBe(result.state)
    expect(session.pending.value).toBeNull()
    session.resume()
    expect(session.pending.value!.events).toEqual([])
    session.settle(stale)
    expect(session.pending.value).not.toBeNull()
    session.settle(session.pending.value!.id)
    expect(session.finishLastRoll()).toBe(false)
    expect(session.resolveReady()).toBe(false)
    expect(session.advanceRound()).toBe(false)
    expect(port.dispatch).not.toHaveBeenCalled()
    session.restart()
    expect(session.state.value.gameId).toContain('local-match')
    expect(session.dispatch({ type: 'RollDice', playerId: 'player-1' })).toBe(true)
    expect(port.dispatch).not.toHaveBeenCalled()
  })
})
