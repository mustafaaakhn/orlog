import { describe, expect, it } from 'vitest'
import { FAVOR_CATALOG } from '../../core'
import type { FavorId } from '../../core'
import { createRollSession } from '../rollSession'
function finish(session: ReturnType<typeof createRollSession>) {
  for (let step = 0; step < 150; step++) {
    const state = session.state.value, phase = state.phase
    if (phase.name === 'ended') return
    if (phase.name === 'roll') session.dispatch({ type: phase.step === 'awaiting-roll' ? 'RollDice' : 'ConfirmRoll', playerId: phase.activePlayerId })
    else if (phase.name === 'favor') session.dispatch({ type: 'SkipFavor', playerId: phase.activePlayerId })
    else if (phase.name === 'resolution') session.resolveReady()
    else session.advanceRound()
    session.settle(session.pending.value!.id)
  }
  throw new Error('Expected a completed match')
}
const all = Object.keys(FAVOR_CATALOG) as FavorId[]
describe('local match series lifecycle', () => {
  it('keeps older personal bans across matches and preserves the finished game when a forbidden start is attempted', () => {
    const session = createRollSession({ random: () => 0 })
    session.start({ random: () => 0, loadouts: { 'player-1': all.slice(0, 3), 'player-2': all.slice(3, 6) } })
    finish(session)
    const first = session.prepareRematch()!
    expect(session.prepareRematch()).toEqual(first) // Opening/cancelling preparation does not consume a pool.
    expect(session.start({ ...first.options, loadouts: { 'player-1': all.slice(3, 6), 'player-2': all.slice(0, 3) } })).toBe(true)
    finish(session)
    const next = session.prepareRematch()!, ended = session.state.value
    expect(new Set(next.blockedFavors['player-1'])).toEqual(new Set(all.slice(0, 6)))
    expect(new Set(next.blockedFavors['player-2'])).toEqual(new Set(all.slice(0, 6)))
    expect(session.start({ ...next.options, loadouts: { 'player-1': all.slice(0, 3), 'player-2': all.slice(6, 9) } })).toBe(false)
    expect(session.state.value).toBe(ended)
    expect(session.error.value).toContain('tekrar seçemezsin')
    expect(session.prepareRematch()).toEqual(next)
    session.restart()
    expect(session.start({ random: () => 0, loadouts: { 'player-1': all.slice(0, 3), 'player-2': all.slice(3, 6) } })).toBe(true)
    finish(session)
    expect(session.prepareRematch()!.blockedFavors['player-1']).toEqual(all.slice(0, 3))
  })
  it('renews each player’s pool after six full loadouts so another match can always start', () => {
    const session = createRollSession({ random: () => 0 })
    for (let index = 0; index < 6; index++) {
      const next = session.prepareRematch()
      const other = ((index + 1) % 6) * 3
      expect(session.start({ ...(next?.options ?? { random: () => 0 }),
        loadouts: { 'player-1': all.slice(index * 3, index * 3 + 3), 'player-2': all.slice(other, other + 3) } })).toBe(true)
      finish(session)
      expect(session.prepareRematch()!.blockedFavors['player-1']).toHaveLength(index === 5 ? 0 : (index + 1) * 3)
    }
    const renewed = session.prepareRematch()!
    expect(renewed.blockedFavors).toEqual({ 'player-1': [], 'player-2': [] })
    expect(session.start({ ...renewed.options, loadouts: { 'player-1': all.slice(0, 3), 'player-2': all.slice(0, 3) } })).toBe(true)
  })
})
