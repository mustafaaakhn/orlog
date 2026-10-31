import { afterEach, describe, expect, it, vi } from 'vitest'
import { shallowRef } from 'vue'
import { Game } from '../../core'
import type { GameCommand } from '../../core'
import { createRollSession } from '../rollSession'
import { createDiceSelectionDraft } from '../diceSelectionDraft'

const cleanups: (() => void)[] = []
afterEach(() => { cleanups.splice(0).forEach(fn => fn()); vi.useRealTimers() })
const id = 'player-1/die-1'
function local() {
  vi.useFakeTimers()
  const session = createRollSession({ firstPlayerId: 'player-1', random: () => .4 })
  session.dispatch({ type: 'RollDice', playerId: 'player-1' }); session.settle(session.pending.value!.id)
  const interrupted = shallowRef(false)
  const dispatch = vi.fn(session.dispatchAsync)
  const draft = createDiceSelectionDraft(() => ({ state: session.state.value, enabled: !session.pending.value && !interrupted.value, interrupted: interrupted.value }), dispatch)
  cleanups.push(draft.dispose)
  return { session, draft, dispatch, interrupted }
}
function remote() {
  vi.useFakeTimers()
  const game = new Game({ gameId: 'online', firstPlayerId: 'player-1', random: () => .4 })
  game.dispatch({ type: 'RollDice', playerId: 'player-1' })
  const state = shallowRef(game.state), enabled = shallowRef(true), interrupted = shallowRef(false)
  const receipts: ((accepted: boolean) => void)[] = []
  const dispatch = vi.fn((_command: GameCommand) => {
    enabled.value = false
    return new Promise<boolean>(resolve => receipts.push(resolve))
  })
  const draft = createDiceSelectionDraft(() => ({ state: state.value, enabled: enabled.value, interrupted: interrupted.value }), dispatch)
  cleanups.push(draft.dispose)
  function publishSelection() {
    const command = dispatch.mock.calls[0]![0]
    const result = game.dispatch(command)
    expect(result.ok).toBe(true)
    state.value = game.state
  }
  return { game, state, enabled, interrupted, dispatch, receipts, draft, publishSelection }
}

describe('selection confirmation and interruptions', () => {
  it('flushes the last draft before early confirmation and sends only one confirm through rapid repeated clicks', async () => {
    const { session, draft, dispatch } = local()
    draft.toggle(id); draft.toggle('player-1/die-2')
    vi.advanceTimersByTime(100)
    const result = draft.confirm()
    draft.confirm(); draft.confirm()
    expect(dispatch.mock.calls.map(([command]) => command.type)).toEqual(['SetDiceSelection'])
    expect(session.pending.value!.events.map(event => event.type)).toEqual(['DiceSelectionChanged'])
    expect(draft.confirming.value).toBe(true)
    session.settle(session.pending.value!.id)
    expect(dispatch.mock.calls.map(([command]) => command.type)).toEqual(['SetDiceSelection', 'ConfirmRoll'])
    expect(session.pending.value!.state.players['player-1'].dice.slice(0, 2).every(die => die.kept)).toBe(true)
    expect(await result).toBe(true)
    vi.advanceTimersByTime(5000)
    expect(dispatch).toHaveBeenCalledTimes(2)
  })
  it.each(['before', 'after'] as const)('serializes a confirm at the exact idle deadline (%s timer callback)', async order => {
    const { session, draft, dispatch } = local()
    draft.toggle(id)
    vi.advanceTimersByTime(order === 'before' ? 1999 : 2000)
    const result = draft.confirm()
    vi.advanceTimersByTime(1)
    draft.confirm()
    expect(dispatch).toHaveBeenCalledTimes(1)
    session.settle(session.pending.value!.id)
    expect(await result).toBe(true)
    expect(dispatch.mock.calls.map(([command]) => command.type)).toEqual(['SetDiceSelection', 'ConfirmRoll'])
  })
  it('confirms an unchanged or empty draft without creating a selection event', async () => {
    const { session, draft, dispatch } = local()
    draft.toggle(id); draft.toggle(id)
    expect(await draft.confirm()).toBe(true)
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'ConfirmRoll', playerId: 'player-1' })
    expect(session.pending.value!.events.some(event => event.type === 'DiceSelectionChanged')).toBe(false)
  })
  it.each(['receipt-first', 'presentation-first'] as const)('waits for both network acceptance and full presentation: %s', async order => {
    const h = remote()
    h.draft.toggle(id)
    const result = h.draft.confirm()
    h.draft.confirm()
    if (order === 'receipt-first') {
      h.receipts[0]!(true); await Promise.resolve()
      expect(h.dispatch).toHaveBeenCalledTimes(1)
      h.publishSelection()
      expect(h.dispatch).toHaveBeenCalledTimes(1)
      h.enabled.value = true
    } else {
      h.publishSelection(); h.enabled.value = true
      expect(h.dispatch).toHaveBeenCalledTimes(1)
      h.receipts[0]!(true); await Promise.resolve()
    }
    expect(h.dispatch).toHaveBeenCalledTimes(2)
    expect(h.dispatch.mock.calls[1]![0]).toEqual({ type: 'ConfirmRoll', playerId: 'player-1' })
    h.receipts[1]!(true)
    expect(await result).toBe(true)
  })
  it('drops a rejected selection and does not send the queued confirm against stale state', async () => {
    const h = remote(), before = h.state.value
    h.draft.toggle(id)
    const result = h.draft.confirm()
    h.receipts[0]!(false)
    expect(await result).toBe(false)
    h.enabled.value = true
    vi.advanceTimersByTime(5000)
    expect(h.dispatch).toHaveBeenCalledTimes(1)
    expect(h.state.value).toBe(before)
    expect(h.draft.selectedIds.value).toBeNull()
  })
  it('cancels idle and in-flight work on a lifecycle interruption, ignoring its late receipt', async () => {
    const h = remote()
    h.draft.toggle(id)
    vi.advanceTimersByTime(1000)
    h.interrupted.value = true
    expect(h.draft.selectedIds.value).toBeNull()
    vi.advanceTimersByTime(2000)
    expect(h.dispatch).not.toHaveBeenCalled()
    h.interrupted.value = false
    h.draft.toggle(id)
    const result = h.draft.confirm()
    h.interrupted.value = true
    expect(await result).toBe(false)
    h.receipts[0]!(true)
    h.publishSelection(); h.enabled.value = true; h.interrupted.value = false
    await Promise.resolve()
    expect(h.dispatch).toHaveBeenCalledTimes(1)
    expect(h.draft.applying.value).toBe(false)
  })
  it.each(['match', 'phase', 'removed', 'face', 'revision'] as const)('rejects a late selection receipt after an incompatible %s change', async change => {
    const h = remote()
    h.draft.toggle(id)
    const result = h.draft.confirm(), state = h.state.value
    h.state.value = change === 'match' ? new Game({ gameId: 'next' }).state
      : change === 'phase' ? { ...state, phase: { name: 'favor', activePlayerId: 'player-2' } }
        : change === 'revision' ? { ...state, revision: state.revision + 2 }
          : { ...state, players: { ...state.players, 'player-1': { ...state.players['player-1'], dice: state.players['player-1'].dice.map(die => die.id === id
            ? { ...die, ...(change === 'removed' ? { removed: true } : { faceId: 'hand' as const }) } : die) } } }
    h.receipts[0]!(true); h.enabled.value = true
    expect(await result).toBe(false)
    expect(h.dispatch).toHaveBeenCalledTimes(1)
  })
  it('never confirms or rerolls when only the idle timer expires', () => {
    const h = local()
    h.draft.toggle(id); vi.advanceTimersByTime(2000)
    h.session.settle(h.session.pending.value!.id)
    vi.advanceTimersByTime(10000)
    expect(h.dispatch.mock.calls.map(([command]) => command.type)).toEqual(['SetDiceSelection'])
    expect(h.session.state.value.phase).toEqual({ name: 'roll', activePlayerId: 'player-1', step: 'selecting-dice' })
  })
  it('keeps last-roll auto-keep/advance in the existing session and never drafts locked dice', () => {
    const h = local()
    for (let step = 0; step < 12 && h.session.state.value.players['player-1'].rollsUsed < 3; step++) {
      const phase = h.session.state.value.phase
      if (phase.name !== 'roll') throw new Error('Expected roll')
      h.session.dispatch({ type: phase.step === 'awaiting-roll' ? 'RollDice' : 'ConfirmRoll', playerId: phase.activePlayerId })
      h.session.settle(h.session.pending.value!.id)
    }
    expect(h.session.state.value.players['player-1'].rollsUsed).toBe(3)
    expect(h.draft.toggle(id)).toBe(false)
    expect(h.session.finishLastRoll()).toBe(true)
    expect(h.session.pending.value!.state.players['player-1'].dice.every(die => die.kept)).toBe(true)
  })
})
