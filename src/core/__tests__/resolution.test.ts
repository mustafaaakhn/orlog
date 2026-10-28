import { describe, expect, it } from 'vitest'
import { Game, PLAYER_IDS, FAVOR_CATALOG, createSeededRandom } from '../index'
import type { FaceId, FavorId, FavorLevel, GameEventPayload, CommandResult } from '../index'
import { resolveRound } from '../resolution'

type Draft = Parameters<typeof resolveRound>[0]
function fixture(first: 'player-1' | 'player-2' = 'player-1') {
  const state: Draft = JSON.parse(JSON.stringify(new Game({ firstPlayerId: first }).state))
  state.phase = { name: 'resolution' }
  for (const id of PLAYER_IDS) {
    state.players[id].favorChoice = { status: 'skipped' }
    state.players[id].dice.forEach(die => { die.faceId = 'helmet'; die.kept = true })
  }
  return state
}
function faces(state: Draft, id: 'player-1' | 'player-2', values: FaceId[]) {
  state.players[id].dice.forEach((die, i) => { die.faceId = values[i] ?? 'helmet' })
}
function run(state: Draft) { const events: GameEventPayload[] = []; resolveRound(state, events); return events }
function choose(state: Draft, id: 'player-1' | 'player-2', favorId: FavorId, level: FavorLevel = 1) {
  state.players[id].favorChoice = { status: 'chosen', favorId, level }
}

describe('ordered round resolution', () => {
  it('awards only fixed framed faces, retaining their underlying attack/defense effect', () => {
    const state = fixture()
    faces(state, 'player-1', ['arrow', 'arrow', 'hand', 'shield', 'helmet', 'hand'])
    const events = run(state)
    expect(events[0]).toMatchObject({ type: 'TokensGained', tokens: 6, dieIds: expect.any(Array) })
    expect(events.filter(e => e.type === 'DamageDealt')).toHaveLength(2)
  })
  it('matches arrows only to shields and axes only to helmets, one defense per attack', () => {
    const state = fixture()
    faces(state, 'player-1', ['arrow', 'arrow', 'axe-1', 'axe-2', 'shield', 'shield'])
    faces(state, 'player-2', ['shield', 'helmet', 'hand', 'hand', 'hand', 'hand'])
    const events = run(state)
    expect(events.filter(e => e.type === 'AttackBlocked').map(e => e.symbol)).toEqual(['arrow', 'axe'])
    expect(state.players['player-2'].health).toBe(13)
    expect(events.filter(e => e.type === 'DamageDealt').map(e => e.dieId)).toEqual(['player-1/die-2', 'player-1/die-4'])
  })
  it('resolves ranged attacks for both players before melee, starting with the first player', () => {
    const state = fixture('player-2')
    for (const id of PLAYER_IDS) faces(state, id, ['axe-1', 'arrow', 'hand', 'hand', 'hand', 'hand'])
    const hits = run(state).filter(e => e.type === 'DamageDealt')
    expect(hits.map(e => e.dieId)).toEqual(['player-2/die-2', 'player-1/die-2', 'player-2/die-1', 'player-1/die-1'])
  })
  it('limits stealing to available tokens and lets the second player steal back newly transferred tokens', () => {
    const state = fixture()
    state.players['player-2'].tokens = 1
    faces(state, 'player-1', ['hand', 'hand', 'axe-1', 'axe-1', 'axe-1', 'axe-1'])
    faces(state, 'player-2', ['hand', 'hand', 'axe-1', 'axe-1', 'axe-1', 'axe-1'])
    const events = run(state).filter(e => e.type === 'TokensStolen')
    expect(events.map(e => e.amount)).toEqual([1, 1])
    expect(state.players['player-1'].tokens).toBeGreaterThanOrEqual(0)
    expect(state.players['player-2'].tokens).toBeGreaterThanOrEqual(0)
  })
  it('handles no tokens and no hands without creating negative resources', () => {
    const state = fixture()
    for (const id of PLAYER_IDS) faces(state, id, Array(6).fill('axe-1'))
    expect(run(state).filter(e => e.type === 'TokensStolen').map(e => e.amount)).toEqual([0, 0])
    expect(PLAYER_IDS.map(id => state.players[id].tokens)).toEqual([0, 0])
  })
  it.each([1, 2, 3] as const)('executes Thor tier %i with its exact payment and damage', level => {
    const state = fixture(), tier = FAVOR_CATALOG['thors-strike'].tiers[level]
    state.players['player-1'].tokens = tier.cost
    choose(state, 'player-1', 'thors-strike', level)
    const events = run(state)
    expect(events.find(e => e.type === 'FavorInvoked')).toMatchObject({ cost: tier.cost })
    expect(state.players['player-2'].health).toBe(15 - tier.amount)
  })
  it.each([1, 2, 3] as const)('executes Iðunn tier %i and caps healing at 15', level => {
    const state = fixture(), tier = FAVOR_CATALOG['iduns-rejuvenation'].tiers[level]
    state.players['player-1'].tokens = tier.cost
    state.players['player-1'].health = 14
    choose(state, 'player-1', 'iduns-rejuvenation', level)
    expect(run(state).find(e => e.type === 'HealthRestored')).toMatchObject({ amount: 1, health: 15 })
  })
  it.each([1, 2, 3] as const)('restores the full Iðunn tier %i amount when below the cap', level => {
    const state = fixture(), tier = FAVOR_CATALOG['iduns-rejuvenation'].tiers[level]
    state.players['player-1'].health = 1
    state.players['player-1'].tokens = tier.cost
    choose(state, 'player-1', 'iduns-rejuvenation', level)
    expect(run(state).find(e => e.type === 'HealthRestored')).toMatchObject({ amount: tier.amount, health: 1 + tier.amount })
  })
  it.each([1, 2, 3] as const)('executes Víðarr tier %i before gold and removes helmet defense and frames', level => {
    const state = fixture(), tier = FAVOR_CATALOG['vidars-might'].tiers[level]
    state.players['player-1'].tokens = tier.cost
    faces(state, 'player-1', Array(6).fill('axe-1'))
    choose(state, 'player-1', 'vidars-might', level)
    const events = run(state)
    expect(events[0]).toMatchObject({ type: 'FavorInvoked' })
    expect(events[1]).toMatchObject({ type: 'HelmetsRemoved', dieIds: state.players['player-2'].dice.slice(0, tier.amount).map(d => d.id) })
    expect(state.players['player-2'].dice.filter(die => die.removed)).toHaveLength(tier.amount)
    expect(state.players['player-2'].health).toBe(15 - tier.amount)
    expect(events.find(e => e.type === 'TokensGained' && e.playerId === 'player-2')).toMatchObject({ tokens: level === 1 ? 2 : level === 2 ? 1 : 0 })
  })
  it('cannot pay for Víðarr using gold from the same round', () => {
    const state = fixture()
    choose(state, 'player-1', 'vidars-might')
    expect(run(state)[0]).toMatchObject({ type: 'FavorFailed' })
  })
  it('can pay for Thor using gold earned this round', () => {
    const state = fixture()
    faces(state, 'player-1', ['arrow', 'arrow', 'hand', 'shield', 'helmet', 'hand'])
    choose(state, 'player-1', 'thors-strike')
    expect(run(state).some(e => e.type === 'FavorInvoked')).toBe(true)
  })
  it('can pay for Thor with stolen tokens, and loses a planned favor after theft', () => {
    const state = fixture()
    faces(state, 'player-1', Array(6).fill('hand'))
    faces(state, 'player-2', Array(6).fill('axe-1'))
    state.players['player-2'].tokens = 4
    for (const id of PLAYER_IDS) choose(state, id, 'thors-strike')
    const events = run(state)
    expect(events.filter(e => e.type === 'FavorInvoked').map(e => e.playerId)).toEqual(['player-1'])
    expect(events.find(e => e.type === 'FavorFailed')).toMatchObject({ playerId: 'player-2' })
  })
  it('uses numeric priority then first-player order and stops before a later healing can revive a loser', () => {
    const state = fixture('player-2')
    for (const id of PLAYER_IDS) state.players[id].tokens = 12
    state.players['player-2'].health = 1
    choose(state, 'player-2', 'iduns-rejuvenation', 3)
    choose(state, 'player-1', 'thors-strike', 3)
    const events = run(state)
    expect(state.phase).toEqual({ name: 'ended', winnerId: 'player-1' })
    expect(events.some(e => e.type === 'HealthRestored')).toBe(false)
    expect(events.filter(e => e.type === 'FavorInvoked')).toHaveLength(1)
  })
  it('breaks equal favor priorities using the first player, stopping before the second lethal Thor', () => {
    const state = fixture('player-2')
    for (const id of PLAYER_IDS) { state.players[id].health = 1; state.players[id].tokens = 12; choose(state, id, 'thors-strike', 3) }
    expect(run(state).filter(e => e.type === 'FavorInvoked').map(e => e.playerId)).toEqual(['player-2'])
    expect(state.phase).toEqual({ name: 'ended', winnerId: 'player-2' })
  })
  it('checks death after each hit, before retaliation, stealing or favors', () => {
    const state = fixture()
    for (const id of PLAYER_IDS) { state.players[id].health = 1; faces(state, id, Array(6).fill('arrow')) }
    const events = run(state)
    expect(events.filter(e => e.type === 'DamageDealt')).toHaveLength(1)
    expect(events.some(e => e.type === 'TokensStolen')).toBe(false)
    expect(state.phase).toEqual({ name: 'ended', winnerId: 'player-1' })
  })
})

function success(result: CommandResult) { if (!result.ok) throw new Error(result.error.message); return result }
function ready(game: Game) {
  while (game.state.phase.name === 'roll') {
    const phase = game.state.phase
    success(game.dispatch({ type: phase.step === 'awaiting-roll' ? 'RollDice' : 'ConfirmRoll', playerId: phase.activePlayerId }))
  }
  for (const playerId of [game.state.firstPlayerId, game.state.firstPlayerId === 'player-1' ? 'player-2' : 'player-1'] as const)
    success(game.dispatch({ type: 'SkipFavor', playerId }))
}

describe('complete match state machine', () => {
  it('cleans round data, preserves resources, alternates first player and stamps the new round', () => {
    const game = new Game({ random: () => 0 })
    ready(game)
    success(game.dispatch({ type: 'ResolveRound', playerId: 'player-1' }))
    expect(game.state.phase.name).toBe('round-complete')
    const health = game.state.players['player-1'].health
    const result = success(game.dispatch({ type: 'NextRound', playerId: 'player-1' }))
    expect(game.state.phase).toEqual({ name: 'roll', activePlayerId: 'player-2', step: 'awaiting-roll' })
    expect(game.state.players['player-1']).toMatchObject({ health, rollsUsed: 0, favorChoice: { status: 'pending' } })
    expect(game.state.players['player-1'].dice.every(d => !d.faceId && !d.kept && !d.selected)).toBe(true)
    expect(result.events.every(e => e.round === 2)).toBe(true)
  })
  it('rejects wrong actors, premature/repeated resolution, next round and all commands after game end', () => {
    const game = new Game({ random: () => 0 })
    expect(game.dispatch({ type: 'ResolveRound', playerId: 'player-1' }).ok).toBe(false)
    ready(game)
    expect(game.dispatch({ type: 'ResolveRound', playerId: 'player-2' }).ok).toBe(false)
    success(game.dispatch({ type: 'ResolveRound', playerId: 'player-1' }))
    expect(game.dispatch({ type: 'ResolveRound', playerId: 'player-1' }).ok).toBe(false)
    expect(game.dispatch({ type: 'NextRound', playerId: 'player-2' }).ok).toBe(false)
    success(game.dispatch({ type: 'NextRound', playerId: 'player-1' }))
    ready(game)
    success(game.dispatch({ type: 'ResolveRound', playerId: game.state.firstPlayerId }))
    success(game.dispatch({ type: 'NextRound', playerId: game.state.firstPlayerId }))
    ready(game)
    success(game.dispatch({ type: 'ResolveRound', playerId: game.state.firstPlayerId }))
    expect(game.state.phase.name).toBe('ended')
    const ended = game.state
    for (const type of ['NextRound', 'ResolveRound', 'RollDice', 'SkipFavor'] as const) {
      expect(game.dispatch({ type, playerId: 'player-1' }).ok).toBe(false)
      expect(game.state).toBe(ended)
    }
  })
  it.each([3, 42, 131])('plays a seeded full match without invalid commands and with contiguous immutable events: seed %i', seed => {
    const game = new Game({ random: createSeededRandom(seed) })
    let sequence = 0
    for (let round = 0; round < 200 && game.state.phase.name !== 'ended'; round++) {
      ready(game)
      sequence = game.state.eventSequence
      const result = success(game.dispatch({ type: 'ResolveRound', playerId: game.state.firstPlayerId }))
      expect(result.events.map(e => e.sequence)).toEqual(result.events.map((_, i) => sequence + i + 1))
      expect(Object.isFrozen(result.events[0])).toBe(true)
      expect(JSON.parse(JSON.stringify(result))).toEqual(result)
      if (game.state.phase.name === 'round-complete') success(game.dispatch({ type: 'NextRound', playerId: game.state.firstPlayerId }))
    }
    expect(game.state.phase.name).toBe('ended')
    expect(PLAYER_IDS.every(id => game.state.players[id].tokens >= 0 && game.state.players[id].health >= 0)).toBe(true)
  })
})
