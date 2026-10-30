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
  it('rematches with the current loadouts and alternating starter, resetting resources and rejecting old presentation callbacks', () => {
    const session = createRollSession()
    session.start({ random: () => 0, firstPlayerId: 'player-2', loadouts: { 'player-1': ['thors-strike'], 'player-2': ['iduns-rejuvenation'] } })
    expect(session.prepareRematch()).toBeNull()
    let oldBatch = 0
    for (let step = 0; step < 100; step++) {
      const state = session.state.value, phase = state.phase
      if (phase.name === 'ended') break
      if (phase.name === 'roll') session.dispatch({ type: phase.step === 'awaiting-roll' ? 'RollDice' : 'ConfirmRoll', playerId: phase.activePlayerId })
      else if (phase.name === 'favor') session.dispatch({ type: 'SkipFavor', playerId: phase.activePlayerId })
      else if (phase.name === 'resolution') session.resolveReady()
      else session.advanceRound()
      oldBatch = session.pending.value!.id
      expect(session.prepareRematch()).toBeNull()
      settle(session)
    }
    expect(session.state.value.phase.name).toBe('ended')
    const oldId = session.state.value.gameId
    const ended = session.state.value
    const draft = session.prepareRematch()!
    expect(session.state.value).toBe(ended)
    expect(draft.loadouts?.['player-1']).toEqual(['thors-strike'])
    expect(session.start({ ...draft, loadouts: { ...draft.loadouts, 'player-1': ['baldrs-invulnerability'] } })).toBe(true)
    const next = session.state.value
    expect(next.gameId).not.toBe(oldId)
    expect([next.round, next.revision, next.firstPlayerId]).toEqual([1, 0, 'player-1'])
    expect(next.players['player-1'].favors).toEqual(['baldrs-invulnerability'])
    expect(next.players['player-2'].favors).toEqual(['iduns-rejuvenation'])
    expect(Object.values(next.players).every(player => player.health === 15 && player.tokens === 0 && player.rollsUsed === 0 && player.dice.every(die => die.faceId === null))).toBe(true)
    expect(session.history.value).toEqual([])
    expect(session.lastEvent.value).toBeNull()
    const batch = roll(session)
    session.settle(oldBatch)
    expect(session.pending.value).toBe(batch)
    settle(session)
    expect(session.state.value.players['player-1'].rollsUsed).toBe(1)
  })
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
    expect(session.state.value.players['player-1'].tokens).toBe(3)
    session.progress(batch.id, gold, 2)
    session.progress(batch.id, gold, 1)
    session.progress(batch.id, gold, Infinity)
    session.progress(batch.id, gold, 1.5)
    expect(session.state.value.players['player-1'].tokens).toBe(3)
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
    expect(session.resolveReady()).toBe(false)
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

describe('automatic battle after both favor decisions', () => {
  for (const firstPlayerId of ['player-1', 'player-2'] as const) {
    it(`waits for both decisions and their presentation, then resolves once with ${firstPlayerId} first`, () => {
      const session = createRollSession({ firstPlayerId, random: () => 0.4 })
      while (session.state.value.phase.name === 'roll') {
        const phase = session.state.value.phase
        session.dispatch({ type: phase.step === 'awaiting-roll' ? 'RollDice' : 'ConfirmRoll', playerId: phase.activePlayerId })
        expect(session.resolveReady()).toBe(false)
        settle(session)
      }
      expect(session.resolveReady()).toBe(false)
      session.dispatch({ type: 'ChooseFavor', playerId: firstPlayerId, favorId: 'thors-strike', level: 3 })
      expect(session.resolveReady()).toBe(false)
      settle(session)
      expect(session.resolveReady()).toBe(false)
      const phase = session.state.value.phase
      if (phase.name !== 'favor') throw new Error('Expected second decision')
      session.dispatch({ type: 'SkipFavor', playerId: phase.activePlayerId })
      const decision = session.pending.value!
      session.settle(decision.id + 1)
      expect(session.resolveReady()).toBe(false)
      settle(session)
      expect(session.resolveReady(true)).toBe(false)
      expect(session.resolveReady()).toBe(true)
      const battle = session.pending.value!
      expect(battle.events).toContainEqual(expect.objectContaining({ type: 'FavorFailed', reason: 'tokens' }))
      expect(session.resolveReady()).toBe(false)
      session.settle(decision.id)
      expect(session.pending.value).toBe(battle)
      settle(session)
      expect(session.resolveReady()).toBe(false)
    })
  }
  it('recovers across a lost scene and rejects old completions after restart or match end', () => {
    const session = createRollSession({ random: () => 0 })
    while (session.state.value.phase.name === 'roll') {
      const phase = session.state.value.phase
      session.dispatch({ type: phase.step === 'awaiting-roll' ? 'RollDice' : 'ConfirmRoll', playerId: phase.activePlayerId }); settle(session)
    }
    session.dispatch({ type: 'SkipFavor', playerId: 'player-1' }); settle(session)
    session.dispatch({ type: 'SkipFavor', playerId: 'player-2' })
    const decision = session.pending.value!
    session.recover()
    expect(session.resolveReady(true)).toBe(false)
    expect(session.resolveReady()).toBe(true)
    const battle = session.pending.value!
    session.settle(decision.id)
    expect(session.pending.value).toBe(battle)
    session.recover(); session.resume()
    const cleanup = session.pending.value!
    expect(cleanup.events).toEqual([])
    expect(session.resolveReady()).toBe(false)
    settle(session)
    expect(session.resolveReady()).toBe(false)
    session.restart()
    session.settle(battle.id); session.settle(cleanup.id)
    expect(session.state.value.revision).toBe(0)
    expect(session.resolveReady()).toBe(false)
  })
})

describe('grouped favor damage session contacts', () => {
  it('publishes a real five-damage event once, rejects duplicate/foreign/stale contacts and waits for settlement', () => {
    const session = createRollSession({ random: () => .6 })
    // Defensive, token-bearing rolls fund Thor without injecting presentation state.
    for (let round = 0; round < 3; round++) {
      const batch = resolveSession(session)
      session.settle(batch.id)
      expect(session.advanceRound()).toBe(true)
      settle(session)
    }
    while (session.state.value.phase.name === 'roll') {
      const phase = session.state.value.phase
      session.dispatch({ type: phase.step === 'awaiting-roll' ? 'RollDice' : 'ConfirmRoll', playerId: phase.activePlayerId })
      settle(session)
    }
    while (session.state.value.phase.name === 'favor') {
      const phase = session.state.value.phase
      expect(session.dispatch({ type: 'ChooseFavor', playerId: phase.activePlayerId, favorId: 'thors-strike', level: 2 })).toBe(true)
      settle(session)
    }
    expect(session.resolveReady()).toBe(true)
    const batch = session.pending.value!, hits = batch.events.filter(e => e.type === 'DamageDealt' && e.favorId)
    expect(hits).toHaveLength(2)
    const hit = hits[0]!
    if (hit.type !== 'DamageDealt') throw new Error('Expected favor damage')
    const previous = session.state.value
    session.progress(batch.id + 1, hit, 1)
    session.progress(batch.id, { ...hit }, 1)
    session.progress(batch.id, hit, 2)
    expect(session.state.value).toBe(previous)
    session.progress(batch.id, hit, 1)
    expect(hit.amount).toBe(5)
    expect(session.state.value.players[hit.targetId].health).toBe(hit.health)
    const contacted = session.state.value
    session.progress(batch.id, hit, 1)
    expect(session.state.value).toBe(contacted)
    expect(session.advanceRound()).toBe(false)
    session.present(batch.id, hit)
    session.present(batch.id, hit)
    expect(session.history.value.filter(e => e.id === hit.id)).toHaveLength(1)
    session.progress(batch.id, hits[1]!, 1)
    const later = session.state.value
    session.progress(batch.id, hit, 1)
    expect(session.state.value).toBe(later)
    session.recover()
    expect(session.state.value).toBe(batch.state)
    session.progress(batch.id, hit, 1)
    expect(session.state.value).toBe(batch.state)
    expect(session.advanceRound()).toBe(true)
  })
})

describe('grouped god payment session contact', () => {
  it('deducts a real ten-token payment once and rejects old or duplicated contacts', () => {
    const session = createRollSession({ random: () => .6 })
    for (let round = 0; round < 3; round++) {
      const batch = resolveSession(session)
      session.settle(batch.id)
      expect(session.advanceRound()).toBe(true)
      settle(session)
    }
    while (session.state.value.phase.name === 'roll') {
      const phase = session.state.value.phase
      session.dispatch({ type: phase.step === 'awaiting-roll' ? 'RollDice' : 'ConfirmRoll', playerId: phase.activePlayerId })
      settle(session)
    }
    while (session.state.value.phase.name === 'favor') {
      const phase = session.state.value.phase
      expect(session.dispatch({ type: 'ChooseFavor', playerId: phase.activePlayerId, favorId: 'iduns-rejuvenation', level: 3 })).toBe(true)
      settle(session)
    }
    expect(session.resolveReady()).toBe(true)
    const batch = session.pending.value!, payments = batch.events.filter(e => e.type === 'FavorInvoked')
    expect(payments).toHaveLength(2)
    const paid = payments[0]!
    if (paid.type !== 'FavorInvoked') throw new Error('Expected payment')
    for (const event of batch.events) {
      if (event === paid) break
      session.present(batch.id, event)
    }
    const before = session.state.value
    expect(paid.cost).toBe(10)
    expect(before.players[paid.playerId].tokens).toBe(paid.tokens + 10)
    session.progress(batch.id + 1, paid, 1)
    session.progress(batch.id, { ...paid }, 1)
    session.progress(batch.id, paid, 2)
    expect(session.state.value).toBe(before)
    session.progress(batch.id, paid, 1)
    expect(session.state.value.players[paid.playerId].tokens).toBe(paid.tokens)
    const after = session.state.value
    session.progress(batch.id, paid, 1)
    expect(session.state.value).toBe(after)
    session.present(batch.id, paid)
    session.present(batch.id, paid)
    expect(session.history.value.filter(e => e.id === paid.id)).toHaveLength(1)
    session.recover()
    session.progress(batch.id, paid, 1)
    expect(session.state.value).toBe(batch.state)
  })
})
