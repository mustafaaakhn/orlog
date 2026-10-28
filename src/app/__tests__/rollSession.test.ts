import { describe, expect, it } from 'vitest'
import { createRollSession } from '../rollSession'

function roll(session: ReturnType<typeof createRollSession>) {
  const phase = session.state.value.phase
  if (phase.name !== 'roll') throw new Error('Expected rolling phase')
  expect(
    session.dispatch({ type: 'RollDice', playerId: phase.activePlayerId }),
  ).toBe(true)
  return session.pending.value!
}
function settle(session: ReturnType<typeof createRollSession>) {
  session.settle(session.pending.value!.id)
}

describe('roll session presentation boundary', () => {
  it('locks commands and hides the new result until the matching recording completes', () => {
    const session = createRollSession(),
      original = session.state.value
    const batch = roll(session)
    expect(session.state.value).toBe(original)
    expect(
      session.dispatch({ type: 'ConfirmRoll', playerId: 'player-1' }),
    ).toBe(false)
    expect(session.select('player-1/die-1')).toBe(false)
    session.settle(batch.id + 1)
    expect(session.pending.value).toBe(batch)
    session.restart()
    expect(session.pending.value).toBe(batch)
    session.settle(batch.id)
    expect(session.state.value.players['player-1'].rollsUsed).toBe(1)
    expect(session.pending.value).toBeNull()
  })

  it('keeps accepted dice unchanged, alternates players, automatically accepts the third roll and stops at favors', () => {
    const session = createRollSession()
    roll(session)
    settle(session)
    const keptFace = session.state.value.players['player-1'].dice[0]!.faceId
    expect(session.select('player-1/die-1')).toBe(true)
    settle(session)
    session.dispatch({ type: 'ConfirmRoll', playerId: 'player-1' })
    settle(session)
    for (let turn = 0; turn < 5; turn++) {
      const batch = roll(session)
      const event = batch.events.find((event) => event.type === 'DiceRolled')!
      if (event.type !== 'DiceRolled') throw new Error('Expected dice')
      if (event.playerId === 'player-1')
        expect(event.dice.some((die) => die.dieId === 'player-1/die-1')).toBe(
          false,
        )
      settle(session)
      if (event.rollNumber === 3)
        expect(
          session.state.value.players[event.playerId].dice.every(
            (die) => die.kept,
          ),
        ).toBe(true)
      expect(session.state.value.players['player-1'].dice[0]!.faceId).toBe(
        keptFace,
      )
      session.dispatch({ type: 'ConfirmRoll', playerId: event.playerId })
      settle(session)
    }
    expect(session.state.value.phase.name).toBe('favor')
    expect(session.pending.value).toBeNull()
  })

  it('recovers the authoritative result after scene loss and ignores stale completion', () => {
    const session = createRollSession(),
      batch = roll(session)
    session.recover()
    expect(session.state.value).toBe(batch.state)
    expect(session.pending.value).toBeNull()
    session.restart()
    session.settle(batch.id)
    expect(session.state.value.revision).toBe(0)
    const next = roll(session)
    session.settle(batch.id)
    expect(session.pending.value).toBe(next)
    session.settle(next.id)
    session.restart()
    expect(
      session.state.value.players['player-1'].dice.every(
        (die) => die.faceId === null,
      ),
    ).toBe(true)
  })
})

describe('match resource presentation', () => {
  it('applies only matching, ordered event acknowledgements and recovers the final outcome after interruption', () => {
    const session = createRollSession({ random: () => 0 })
    while (session.state.value.phase.name === 'roll') {
      const phase = session.state.value.phase
      session.dispatch({ type: phase.step === 'awaiting-roll' ? 'RollDice' : 'ConfirmRoll', playerId: phase.activePlayerId })
      settle(session)
    }
    for (const playerId of ['player-1', 'player-2'] as const) { session.dispatch({ type: 'SkipFavor', playerId }); settle(session) }
    session.dispatch({ type: 'ResolveRound', playerId: 'player-1' })
    const batch = session.pending.value!, hit = batch.events.find(event => event.type === 'DamageDealt')!
    expect(session.state.value.players['player-2'].health).toBe(15)
    session.present(batch.id + 1, hit)
    expect(session.state.value.players['player-2'].health).toBe(15)
    session.present(batch.id, hit)
    expect(session.state.value.players['player-2'].health).toBe(14)
    session.present(batch.id, hit)
    expect(session.history.value).toHaveLength(1)
    session.recover()
    expect(session.state.value.players['player-2'].health).toBe(9)
    session.present(batch.id, hit)
    expect(session.state.value).toBe(batch.state)
    session.restart()
    expect(session.history.value).toHaveLength(0)
    expect(session.state.value.players['player-2'].health).toBe(15)
  })
  it('starts with the chosen loadout/coin result and gives each restarted match distinct event identities', () => {
    const session = createRollSession()
    expect(session.start({ firstPlayerId: 'player-2', loadouts: { 'player-2': ['vidars-might'] } })).toBe(true)
    const first = roll(session)
    expect(first.events[0]).toMatchObject({ playerId: 'player-2' })
    expect(session.start({})).toBe(false)
    settle(session)
    session.restart()
    const second = roll(session)
    expect(second.events[0]!.id).not.toBe(first.events[0]!.id)
  })
})

function resolveSession(session: ReturnType<typeof createRollSession>) {
  while (session.state.value.phase.name === 'roll') {
    const phase = session.state.value.phase
    session.dispatch({ type: phase.step === 'awaiting-roll' ? 'RollDice' : 'ConfirmRoll', playerId: phase.activePlayerId })
    settle(session)
  }
  while (session.state.value.phase.name === 'favor') {
    const phase = session.state.value.phase
    session.dispatch({ type: 'SkipFavor', playerId: phase.activePlayerId })
    settle(session)
  }
  session.dispatch({ type: 'ResolveRound', playerId: session.state.value.firstPlayerId })
  return session.pending.value!
}

describe('automatic round completion boundary', () => {
  it('waits for the matching batch, dispatches NextRound once and preserves resources', () => {
    const session = createRollSession({ random: () => 0.4 })
    const batch = resolveSession(session)
    expect(session.advanceRound()).toBe(false)
    session.settle(batch.id + 1)
    expect(session.advanceRound()).toBe(false)
    session.settle(batch.id)
    const resources = Object.values(session.state.value.players).map(p => [p.health, p.tokens])
    expect(session.advanceRound()).toBe(true)
    const next = session.pending.value!
    expect(session.advanceRound()).toBe(false)
    session.settle(batch.id)
    expect(session.pending.value).toBe(next)
    session.settle(next.id)
    expect(session.state.value.round).toBe(2)
    expect(session.state.value.firstPlayerId).toBe('player-2')
    expect(Object.values(session.state.value.players).map(p => [p.health, p.tokens])).toEqual(resources)
    expect(session.advanceRound()).toBe(false)
  })

  it('keeps progress monotonic and event history single, rejecting foreign/stale contacts', () => {
    const session = createRollSession({ random: () => 0.4 })
    const batch = resolveSession(session)
    const gold = batch.events.find(e => e.type === 'TokensGained' && e.playerId === 'player-1')!
    session.progress(batch.id + 1, gold, 1)
    session.progress(batch.id, { ...gold }, 1)
    expect(session.state.value.players['player-1'].tokens).toBe(0)
    session.progress(batch.id, gold, 1)
    expect(session.state.value.players['player-1'].tokens).toBe(1)
    session.progress(batch.id, gold, 2)
    session.progress(batch.id, gold, 1)
    session.progress(batch.id, gold, Infinity)
    session.progress(batch.id, gold, 1.5)
    expect(session.state.value.players['player-1'].tokens).toBe(2)
    expect(session.history.value).toHaveLength(0)
    session.present(batch.id, gold)
    session.present(batch.id, gold)
    session.progress(batch.id, gold, 1)
    expect(session.state.value.players['player-1'].tokens).toBe(3)
    expect(session.history.value).toHaveLength(1)
    session.recover()
    session.resume()
    const recovery = session.pending.value!
    expect(recovery.events).toEqual([])
    expect(session.advanceRound()).toBe(false)
    session.progress(batch.id, gold, 1)
    session.settle(batch.id)
    expect(session.pending.value).toBe(recovery)
    session.settle(recovery.id)
    expect(session.advanceRound()).toBe(true)
  })

  it('never advances a finished match, including recovery and callbacks from a previous match', () => {
    const session = createRollSession({ random: () => 0 })
    let final = resolveSession(session)
    session.settle(final.id)
    while (session.state.value.phase.name !== 'ended') {
      expect(session.advanceRound()).toBe(true)
      settle(session)
      final = resolveSession(session)
      session.settle(final.id)
    }
    expect(session.advanceRound()).toBe(false)
    session.recover(); session.resume()
    settle(session)
    expect(session.advanceRound()).toBe(false)
    session.restart()
    session.settle(final.id)
    expect(session.state.value.round).toBe(1)
    expect(session.state.value.revision).toBe(0)
    expect(session.advanceRound()).toBe(false)
  })
})

describe('third roll automatic handoff', () => {
  function thirdRoll(session: ReturnType<typeof createRollSession>) {
    for (let i = 0; i < 4; i++) {
      roll(session); settle(session)
      const phase = session.state.value.phase
      if (phase.name !== 'roll') throw new Error('Expected roll')
      session.dispatch({ type: 'ConfirmRoll', playerId: phase.activePlayerId }); settle(session)
    }
    return roll(session)
  }
  it('waits for the last recording, honors blocking and hands off exactly once', () => {
    const session = createRollSession()
    expect(session.finishLastRoll()).toBe(false)
    const third = thirdRoll(session)
    expect(session.finishLastRoll()).toBe(false)
    session.settle(third.id + 1)
    expect(session.finishLastRoll()).toBe(false)
    session.settle(third.id)
    expect(session.state.value.players['player-1'].dice.every(die => die.kept)).toBe(true)
    expect(session.finishLastRoll(true)).toBe(false)
    expect(session.finishLastRoll()).toBe(true)
    const handoff = session.pending.value!
    expect(session.finishLastRoll()).toBe(false)
    session.settle(third.id)
    expect(session.pending.value).toBe(handoff)
    settle(session)
    expect(session.state.value.phase).toEqual({ name: 'roll', step: 'awaiting-roll', activePlayerId: 'player-2' })
    const last = roll(session)
    expect(session.finishLastRoll()).toBe(false)
    settle(session)
    expect(session.finishLastRoll()).toBe(true)
    expect(session.pending.value!.events).toContainEqual(expect.objectContaining({type: 'PhaseChanged', phase: { name: 'favor', activePlayerId: 'player-1' }}))
    settle(session)
    expect(session.state.value.phase.name).toBe('favor')
    expect(session.finishLastRoll()).toBe(false)
    expect(last.state.players['player-2'].rollsUsed).toBe(3)
  })
  it('leaves the first two confirmations explicit and rejects previous-match completions', () => {
    const session = createRollSession()
    roll(session); settle(session)
    expect(session.finishLastRoll()).toBe(false)
    session.restart()
    const third = thirdRoll(session)
    session.recover()
    expect(session.finishLastRoll(true)).toBe(false)
    expect(session.finishLastRoll()).toBe(true)
    const handoff = session.pending.value!
    session.settle(third.id)
    expect(session.pending.value).toBe(handoff)
    session.recover(); session.restart()
    session.settle(handoff.id)
    expect(session.finishLastRoll()).toBe(false)
    expect(session.state.value.revision).toBe(0)
  })
})
