import { afterEach, describe, expect, it, vi } from 'vitest'
import { shallowRef } from 'vue'
import { createRollSession } from '../rollSession'
import { createDiceSelectionDraft } from '../diceSelectionDraft'
import type { DieId } from '../../core'

const cleanups: (() => void)[] = []
afterEach(() => { cleanups.splice(0).forEach(fn => fn()); vi.useRealTimers() })
function setup() {
  vi.useFakeTimers()
  const session = createRollSession({ random: () => 0.4 })
  session.dispatch({ type: 'RollDice', playerId: 'player-1' })
  session.settle(session.pending.value!.id)
  const enabled = shallowRef(true)
  const dispatch = vi.fn(session.dispatch)
  const draft = createDiceSelectionDraft(() => ({ state: session.state.value, enabled: enabled.value }), dispatch)
  cleanups.push(draft.dispose)
  return { session, enabled, dispatch, draft }
}
const ids: DieId[] = [1, 2, 3, 4, 5].map(i => `player-1/die-${i}` as DieId)

describe('mobile selection idle batch', () => {
  it('publishes intentions immediately, leaves core unchanged at 1999 ms and sends one group at 2000 ms', () => {
    const { session, draft, dispatch } = setup(), before = session.state.value
    for (const id of ids) expect(draft.toggle(id)).toBe(true)
    expect(draft.selectedIds.value).toEqual(ids)
    expect(session.state.value).toBe(before)
    expect(session.pending.value).toBeNull()
    vi.advanceTimersByTime(1999)
    expect(dispatch).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'SetDiceSelection', playerId: 'player-1', dieIds: ids })
    const batch = session.pending.value!
    expect(batch.events.map(e => e.type)).toEqual(['DiceSelectionChanged'])
    expect(batch.state.phase).toEqual(before.phase)
    expect(batch.state.players['player-1'].dice.filter(d => d.selected).map(d => d.id)).toEqual(ids)
    expect(batch.state.players['player-1'].dice.some(d => d.kept)).toBe(false)
    session.settle(batch.id)
    vi.advanceTimersByTime(5000)
    expect(dispatch).toHaveBeenCalledTimes(1)
  })
  it('restarts the one timer on the last valid change, including deselection', () => {
    const { draft, dispatch } = setup()
    draft.toggle(ids[0]!)
    vi.advanceTimersByTime(1999)
    draft.toggle(ids[1]!)
    expect(vi.getTimerCount()).toBe(1)
    vi.advanceTimersByTime(1999)
    expect(dispatch).not.toHaveBeenCalled()
    draft.toggle(ids[0]!)
    vi.advanceTimersByTime(1999)
    expect(dispatch).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'SetDiceSelection', playerId: 'player-1', dieIds: [ids[1]] })
  })
  it('double taps back to the applied selection without a command or movement', () => {
    const { session, draft, dispatch } = setup(), before = session.state.value
    draft.toggle(ids[0]!)
    vi.advanceTimersByTime(600)
    draft.toggle(ids[0]!)
    expect(draft.selectedIds.value).toEqual([])
    vi.advanceTimersByTime(2000)
    expect(dispatch).not.toHaveBeenCalled()
    expect(session.state.value).toBe(before)
    expect(session.pending.value).toBeNull()
    expect(draft.selectedIds.value).toBeNull()
  })
  it('takes five selected, unlocked dice back together', () => {
    const { session, draft, dispatch } = setup()
    ids.forEach(draft.toggle)
    vi.advanceTimersByTime(2000)
    session.settle(session.pending.value!.id)
    ids.forEach(draft.toggle)
    expect(draft.selectedIds.value).toEqual([])
    vi.advanceTimersByTime(1999)
    expect(dispatch).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1)
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'SetDiceSelection', playerId: 'player-1', dieIds: [] })
    expect(session.pending.value!.events).toHaveLength(1)
    expect(session.pending.value!.state.players['player-1'].dice.every(d => !d.selected && !d.kept)).toBe(true)
  })
  it('ignores invalid identities without starting or extending the timer', () => {
    const { draft, dispatch } = setup()
    expect(draft.toggle('player-2/die-1')).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
    draft.toggle(ids[0]!)
    vi.advanceTimersByTime(1000)
    expect(draft.toggle('player-1/bonus-1')).toBe(false)
    vi.advanceTimersByTime(1000)
    expect(dispatch).toHaveBeenCalledTimes(1)
  })
  it('clears callbacks on a changed authoritative state, disabled interaction or disposal', () => {
    const { session, draft, enabled, dispatch } = setup()
    draft.toggle(ids[0]!)
    enabled.value = false
    vi.advanceTimersByTime(2000)
    expect(dispatch).not.toHaveBeenCalled()
    enabled.value = true
    draft.toggle(ids[0]!)
    session.restart()
    vi.advanceTimersByTime(2000)
    expect(dispatch).not.toHaveBeenCalled()
    expect(draft.selectedIds.value).toBeNull()
    draft.dispose()
    expect(vi.getTimerCount()).toBe(0)
  })
})
