import { describe, expect, it, vi } from 'vitest'
import { Game } from '../../core'
import { createRollSession } from '../rollSession'

describe('online presentation session', () => {
  it('waits for an authoritative rematch and ignores old-game batches and receipts after the new snapshot', () => {
    const previous = new Game({ gameId: 'previous', random: () => 0 })
    for (let step = 0; step < 100; step++) {
      const phase = previous.state.phase
      if (phase.name === 'ended') break
      const result = previous.dispatch(phase.name === 'roll'
        ? { type: phase.step === 'awaiting-roll' ? 'RollDice' : 'ConfirmRoll', playerId: phase.activePlayerId }
        : phase.name === 'favor' ? { type: 'SkipFavor', playerId: phase.activePlayerId }
          : { type: phase.name === 'resolution' ? 'ResolveRound' : 'NextRound', playerId: previous.state.firstPlayerId })
      expect(result.ok).toBe(true)
    }
    expect(previous.state.phase.name).toBe('ended')
    const session = createRollSession(), oldPort = { dispatch: vi.fn(() => true), settled: vi.fn() }
    session.startRemote(previous.state, oldPort)
    const oldBatch = session.pending.value!.id
    session.settle(oldBatch)
    expect(session.rematch()).toBe(false)
    expect(session.state.value.gameId).toBe('previous')
    const next = new Game({ gameId: 'next' }), nextPort = { dispatch: vi.fn(() => true), settled: vi.fn() }
    session.startRemote(next.state, nextPort)
    const newBatch = session.pending.value
    session.receive(previous.state, [])
    session.settle(oldBatch)
    expect(session.pending.value).toBe(newBatch)
    expect(nextPort.settled).not.toHaveBeenCalled()
    session.settle(newBatch!.id)
    expect(session.state.value).toEqual(next.state)
    expect(nextPort.settled).toHaveBeenCalledExactlyOnceWith(0)
  })
  it('forwards commands without rolling locally and acknowledges each batch only once after settlement', () => {
    const game = new Game({ gameId: 'remote-match' })
    const session = createRollSession()
    const port = { dispatch: vi.fn(() => true), settled: vi.fn() }
    session.startRemote(game.state, port)
    expect(session.rematch()).toBe(false)
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
