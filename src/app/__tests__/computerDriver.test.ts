import { afterEach, expect, it, vi } from 'vitest'
import { createComputerDriver } from '../computerDriver'
import { createRollSession } from '../rollSession'
import { DIFFICULTIES } from '../../ai/computer'
import { Game, createSeededRandom } from '../../core'

afterEach(() => vi.useRealTimers())
it('dispatches one ordinary command and waits for presentation before deciding again', () => {
  vi.useFakeTimers()
  const session = createRollSession({ firstPlayerId: 'player-2' }), dispatch = vi.fn(session.dispatch)
  const driver = createComputerDriver(dispatch)
  driver.update({ state: session.state.value, playerId: 'player-2', difficulty: 'normal', blocked: false })
  vi.advanceTimersByTime(DIFFICULTIES.normal.delayMs - 1)
  expect(dispatch).not.toHaveBeenCalled()
  vi.advanceTimersByTime(1)
  expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'RollDice', playerId: 'player-2' })
  driver.update({ state: session.state.value, playerId: 'player-2', difficulty: 'normal', blocked: !!session.pending.value })
  vi.runAllTimers()
  expect(dispatch).toHaveBeenCalledTimes(1)
  session.settle(session.pending.value!.id)
  driver.update({ state: session.state.value, playerId: 'player-2', difficulty: 'normal', blocked: false })
  vi.runAllTimers()
  expect(dispatch).toHaveBeenCalledTimes(2)
  driver.dispose()
})
it('cancels stale decisions on scene loss, hidden tab, restart, mode switch and disposal', () => {
  vi.useFakeTimers()
  const dispatch = vi.fn(() => true), driver = createComputerDriver(dispatch)
  const turn = { state: new Game({ firstPlayerId: 'player-2' }).state, playerId: 'player-2' as const, difficulty: 'easy' as const, blocked: false }
  for (const update of [() => driver.update({ ...turn, blocked: true }), () => driver.update({ ...turn, playerId: null }), () => driver.update({ ...turn, state: new Game().state }), () => driver.dispose()]) {
    driver.update(turn)
    update()
    vi.runAllTimers()
    expect(dispatch).not.toHaveBeenCalled()
  }
  driver.update(turn)
  vi.runAllTimers()
  expect(dispatch).toHaveBeenCalledTimes(1)
})

it('waits for the accepted batch presentation, then confirms once without a human draft timer', () => {
  vi.useFakeTimers()
  const session = createRollSession({ firstPlayerId: 'player-2', random: createSeededRandom(1) })
  session.dispatch({ type: 'RollDice', playerId: 'player-2' })
  session.settle(session.pending.value!.id)
  const dispatch = vi.fn(session.dispatch), driver = createComputerDriver(dispatch)
  const update = () => driver.update({ state: session.state.value, playerId: 'player-2', difficulty: 'normal', blocked: !!session.pending.value })
  update(); vi.advanceTimersByTime(350)
  expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'SetDiceSelection', playerId: 'player-2', dieIds: ['player-2/die-2', 'player-2/die-6'] })
  expect(session.pending.value!.events).toHaveLength(1)
  update(); vi.advanceTimersByTime(5000)
  expect(dispatch).toHaveBeenCalledTimes(1)
  session.settle(session.pending.value!.id)
  update(); vi.advanceTimersByTime(350)
  expect(dispatch).toHaveBeenLastCalledWith({ type: 'ConfirmRoll', playerId: 'player-2' })
  expect(dispatch).toHaveBeenCalledTimes(2)
  update(); vi.runAllTimers()
  expect(dispatch).toHaveBeenCalledTimes(2)
  driver.dispose()
})
