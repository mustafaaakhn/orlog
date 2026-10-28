import { describe, expect, it } from 'vitest'
import { Game, FAVOR_CATALOG, PLAYER_IDS, createSeededRandom, validFavorInput, describeFavorTier } from '../index'
import type { DieId, FaceId, FavorId, FavorLevel, FavorInput, GameEventPayload, PlayerId } from '../index'
import { resolveRound } from '../resolution'
import { applyResourceEvent } from '../../presentation/resources'
import { eventText } from '../../presentation/eventText'

type Draft = Parameters<typeof resolveRound>[0]
const a = 'player-1', b = 'player-2'
const tiers = [1, 2, 3] as const
function fixture(first: PlayerId = a): Draft {
  const state = JSON.parse(JSON.stringify(new Game({ firstPlayerId: first }).state)) as Draft
  state.phase = { name: 'resolution' }
  for (const id of PLAYER_IDS) {
    state.players[id].tokens = 100
    state.players[id].favorChoice = { status: 'skipped' }
    state.players[id].dice.forEach(d => { d.faceId = 'helmet'; d.kept = true })
  }
  return state
}
function faces(s: Draft, id: PlayerId, list: FaceId[]) { s.players[id].dice.forEach((d, i) => { d.faceId = list[i] ?? 'helmet' }) }
function choose(s: Draft, id: PlayerId, favorId: FavorId, level: FavorLevel = 1, input?: FavorInput) {
  s.players[id].favorChoice = { status: 'chosen', favorId, level, ...(input ? { input: JSON.parse(JSON.stringify(input)) } : {}) }
}
function run(s: Draft, random = () => 0.4) { const events: GameEventPayload[] = []; resolveRound(s, events, random); return events }
function ids(id: PlayerId, count: number): DieId[] { return Array.from({ length: count }, (_, i) => `${id}/die-${i + 1}` as DieId) }

// Independent expected values verify executable effects, not just catalog snapshots.
describe.each(tiers)('expanded favor execution, tier %i', level => {
  const i = level - 1
  it('Baldr adds defense to each die without multiplying its gold frame', () => {
    const s = fixture(); faces(s, a, ['shield']); faces(s, b, ['arrow', 'arrow', 'arrow', 'arrow'])
    choose(s, a, 'baldrs-invulnerability', level)
    const events = run(s)
    expect(events.filter(e => e.type === 'AttackBlocked')).toHaveLength([2, 3, 4][i]!)
    expect(s.players[a].dice.every(d => d.value === [2, 3, 4][i])).toBe(true)
    expect(events.find(e => e.type === 'TokensGained' && e.playerId === a)).toMatchObject({ dieIds: ids(a, 1).concat(['player-1/die-2', 'player-1/die-4', 'player-1/die-5']) })
  })
  it('Bragi grants tokens per physical hand in addition to ordinary stealing', () => {
    const s = fixture(); faces(s, a, ['hand', 'hand']); choose(s, a, 'bragis-verve', level)
    const events = run(s)
    expect(events.find(e => e.type === 'TokensGranted')).toMatchObject({ amount: [4, 6, 8][i] })
    expect(events.find(e => e.type === 'TokensStolen' && e.playerId === a)).toMatchObject({ amount: 2 })
  })
  it('Brunhild multiplies the total melee count with a single upward rounding', () => {
    const s = fixture(); faces(s, a, ['axe-1', 'axe-1', 'axe-1', 'shield', 'shield', 'shield']); faces(s, b, Array(6).fill('hand'))
    choose(s, a, 'brunhilds-fury', level)
    expect(run(s).filter(e => e.type === 'DamageDealt')).toHaveLength([5, 6, 9][i]!)
    expect(s.players[b].health).toBe(15 - [5, 6, 9][i]!)
  })
  it('Freyja adds actual identified dice whose random outcomes participate in this round', () => {
    const s = fixture(); choose(s, a, 'freyjas-plenty', level)
    let calls = 0
    const events = run(s, () => { calls++; return 0.4 })
    expect(calls).toBe([1, 2, 3][i])
    expect(s.players[a].dice).toHaveLength(6 + level)
    expect(s.players[a].dice.slice(6).map(d => d.id)).toEqual(Array.from({ length: level }, (_, n) => `player-1/bonus-${n + 1}`))
    expect(events.find(e => e.type === 'DiceRecast')).toMatchObject({ added: true, dice: expect.any(Array) })
    expect(s.players[b].health).toBe(15 - level)
    expect(s.players[a].rollsUsed).toBe(0)
  })
  it('Freyr lets the player choose a tied majority and increases hand stealing', () => {
    const s = fixture(); faces(s, a, ['hand', 'hand', 'hand'])
    choose(s, a, 'freyrs-gift', level, { symbol: 'hand' })
    const events = run(s)
    expect(events.find(e => e.type === 'TokensStolen' && e.playerId === a)).toMatchObject({ amount: [5, 6, 7][i] })
    expect(s.players[a].dice[0]!.value).toBe([3, 4, 5][i])
  })
  it('Frigg rerolls selected dice from both players using injected randomness and preserves roll counts', () => {
    const s = fixture(), targets = [a + '/die-1', b + '/die-1', a + '/die-2', b + '/die-2'] as DieId[]
    choose(s, a, 'friggs-sight', level, { dieIds: targets.slice(0, level + 1) })
    let calls = 0; const events = run(s, () => { calls++; return 0.4 })
    expect(calls).toBe([2, 3, 4][i])
    expect(events.filter(e => e.type === 'DiceRecast').flatMap(e => e.dice)).toHaveLength(level + 1)
    expect(PLAYER_IDS.map(id => s.players[id].rollsUsed)).toEqual([0, 0])
    expect(s.players[b].dice[2]!.faceId).toBe('helmet')
  })
  it('Heimdall heals immediately after each real block, up to 15', () => {
    const s = fixture(); s.players[a].health = 1
    faces(s, b, ['axe-1', 'axe-1']); choose(s, a, 'heimdalls-watch', level)
    expect(run(s).filter(e => e.type === 'HealthRestored').map(e => e.amount)).toEqual([level, level])
    expect(s.players[a].health).toBe(1 + 2 * level)
  })
  it('Hel heals only actual unblocked melee damage, never ranged attacks', () => {
    const s = fixture(); s.players[a].health = 1
    faces(s, a, ['axe-1', 'axe-1', 'arrow']); faces(s, b, ['helmet', 'hand', 'hand', 'hand', 'hand', 'hand'])
    choose(s, a, 'hels-grip', level)
    expect(run(s).filter(e => e.type === 'HealthRestored').map(e => e.amount)).toEqual([level])
  })
  it('Loki bans selected dice before both gold and attacks', () => {
    const s = fixture(); faces(s, b, Array(6).fill('arrow'))
    choose(s, a, 'lokis-trick', level, { dieIds: ids(b, level) })
    const events = run(s)
    expect(s.players[b].dice.filter(d => d.removed).map(d => d.id)).toEqual(ids(b, level))
    expect(events.filter(e => e.type === 'DamageDealt')).toHaveLength(6 - level)
    expect(events.find(e => e.type === 'TokensGained' && e.playerId === b)).toMatchObject({ dieIds: ids(b, 3).slice(level) })
  })
  it('Mimir grants tokens for actual received damage before stealing resolves', () => {
    const s = fixture(); faces(s, b, ['arrow', 'arrow']); choose(s, a, 'mimirs-wisdom', level)
    const events = run(s)
    expect(events.filter(e => e.type === 'TokensGranted').map(e => e.amount)).toEqual([level, level])
    expect(events.findIndex(e => e.type === 'TokensGranted')).toBeLessThan(events.findIndex(e => e.type === 'TokensStolen'))
  })
  it('Odin pays after resolution, sacrifices chosen health and grants the exact token multiple', () => {
    const s = fixture(); choose(s, a, 'odins-sacrifice', level, { health: 2 })
    const events = run(s)
    expect(events.find(e => e.type === 'TokensGranted')).toMatchObject({ amount: [6, 8, 10][i] })
    expect(s.players[a].health).toBe(13)
    expect(events.findIndex(e => e.type === 'FavorInvoked')).toBeGreaterThan(events.findIndex(e => e.type === 'TokensStolen'))
  })
  it('Skadi adds arrows to every arrow die while retaining one gold per framed die', () => {
    const s = fixture(); faces(s, a, ['arrow', 'arrow']); choose(s, a, 'skadis-hunt', level)
    const events = run(s)
    expect(events.filter(e => e.type === 'DamageDealt')).toHaveLength([4, 6, 8][i]!)
    expect(s.players[a].dice.slice(0, 2).map(d => d.value)).toEqual([level + 1, level + 1])
  })
  it('Skuld destroys tokens per physical arrow before framed tokens are awarded', () => {
    const s = fixture(); faces(s, a, ['arrow', 'arrow']); choose(s, a, 'skulds-claim', level)
    const events = run(s)
    expect(events[1]).toMatchObject({ type: 'TokensDestroyed', amount: [4, 6, 8][i], tokens: 100 - [4, 6, 8][i]! })
  })
  it('Thrymr downgrades the opponent before payment, cancelling at zero without charging', () => {
    const s = fixture(); choose(s, a, 'thrymrs-theft', level); choose(s, b, 'thors-strike', 3)
    const events = run(s)
    expect(events.find(e => e.type === 'FavorReduced')).toMatchObject({ level: 3 - level })
    if (level === 3) {
      expect(events.find(e => e.type === 'FavorFailed')).toMatchObject({ reason: 'cancelled', cost: 0 })
      expect(events.filter(e => e.type === 'FavorInvoked')).toHaveLength(1)
    } else expect(events.find(e => e.type === 'FavorInvoked' && e.playerId === b)).toMatchObject({ level: 3 - level, cost: [8, 4][i] })
  })
  it('Tyr sacrifices chosen health and destroys tokens without creating negative resources', () => {
    const s = fixture(); choose(s, a, 'tyrs-pledge', level, { health: 2 })
    expect(run(s).find(e => e.type === 'TokensDestroyed')).toMatchObject({ amount: [4, 6, 8][i] })
    expect(s.players[a].health).toBe(13)
  })
  it('Ullr bypasses shields for the first N arrows without consuming those shields', () => {
    const s = fixture(); faces(s, a, Array(6).fill('arrow')); faces(s, b, Array(6).fill('shield'))
    choose(s, a, 'ullrs-aim', level)
    const events = run(s)
    expect(events.filter(e => e.type === 'DamageDealt')).toHaveLength([2, 3, 6][i]!)
    expect(events.filter(e => e.type === 'AttackBlocked')).toHaveLength(6 - [2, 3, 6][i]!)
  })
  it('Var heals on actual opponent payment before that favor deals its damage', () => {
    const s = fixture(); s.players[a].health = 1; choose(s, a, 'vars-bond', level); choose(s, b, 'thors-strike')
    const events = run(s), healed = events.find(e => e.type === 'HealthRestored')
    expect(healed).toMatchObject({ amount: [4, 8, 12][i] })
    expect(s.players[a].health).toBe([3, 7, 11][i])
    expect(events.findIndex(e => e === healed)).toBeLessThan(events.findIndex(e => e.type === 'DamageDealt'))
  })
})

describe('interacting favors and boundaries', () => {
  it.each([a, b] as const)('uses first player %s for equal-priority Thrymr cancellation', first => {
    const s = fixture(first)
    for (const id of PLAYER_IDS) choose(s, id, 'thrymrs-theft')
    expect(run(s).filter(e => e.type === 'FavorInvoked').map(e => e.playerId)).toEqual([first])
  })
  it.each([a, b] as const)('uses first player %s for Loki versus Frigg targeting', first => {
    const s = fixture(first); choose(s, a, 'lokis-trick', 1, { dieIds: ids(b, 1) }); choose(s, b, 'friggs-sight', 1, { dieIds: ids(b, 2) })
    const events = run(s)
    expect(events.filter(e => e.type === 'DiceRecast').flatMap(e => e.dice)).toHaveLength(first === a ? 1 : 2)
    expect(s.players[b].dice[0]!.removed).toBe(true)
  })
  it('reduces Frigg targets before consuming any random numbers', () => {
    const s = fixture(); choose(s, a, 'thrymrs-theft'); choose(s, b, 'friggs-sight', 3, { dieIds: ids(b, 4) })
    let calls = 0; const events = run(s, () => { calls++; return 0.4 })
    expect(calls).toBe(3)
    expect(events.find(e => e.type === 'DiceRecast')).toMatchObject({ dice: expect.arrayContaining([{ ...s.players[b].dice[0]! }]) })
    expect(s.players[b].dice[3]!.faceId).toBe('helmet')
  })
  it('does not undo already-invoked Var when a later equal-priority Thrymr runs', () => {
    const s = fixture(); s.players[a].health = 1; choose(s, a, 'vars-bond'); choose(s, b, 'thrymrs-theft', 3)
    const events = run(s)
    expect(events.some(e => e.type === 'FavorReduced')).toBe(false)
    expect(events.find(e => e.type === 'HealthRestored')).toMatchObject({ amount: 9 })
  })
  it('Var gains nothing from an unaffordable favor or cancelled favor', () => {
    const s = fixture(); choose(s, a, 'vars-bond'); choose(s, b, 'thors-strike', 3); s.players[b].tokens = 0
    expect(run(s).some(e => e.type === 'HealthRestored')).toBe(false)
  })
  it('Skuld can prevent a later favor, but cannot take gold not yet earned', () => {
    const s = fixture(); faces(s, a, ['arrow', 'arrow']); s.players[b].tokens = 4; choose(s, a, 'skulds-claim'); choose(s, b, 'vidars-might')
    const events = run(s)
    expect(events.find(e => e.type === 'FavorFailed')).toMatchObject({ playerId: b })
    expect(s.players[b].tokens).toBe(3)
  })
  it('Bragi pays before gold and cannot use prospective hand income to activate', () => {
    const s = fixture(); s.players[a].tokens = 3; faces(s, a, Array(6).fill('hand')); choose(s, a, 'bragis-verve')
    const events = run(s)
    expect(events[0]).toMatchObject({ type: 'FavorFailed' })
    expect(events.some(e => e.type === 'TokensGranted')).toBe(false)
  })
  it('Baldr before Vidar loses defense units; a partially removed die retains its gold', () => {
    const s = fixture(); choose(s, a, 'baldrs-invulnerability', 3); choose(s, b, 'vidars-might')
    const events = run(s)
    expect(s.players[a].dice[0]).toMatchObject({ value: 2, removed: false })
    expect(events.find(e => e.type === 'TokensGained' && e.playerId === a)).toMatchObject({ dieIds: ['player-1/die-2', 'player-1/die-4', 'player-1/die-5'] })
  })
  it('Freyr recomputes a majority removed by Loki and resolves the new tie in documented order', () => {
    const s = fixture(b); faces(s, a, ['hand', 'hand', 'axe-1', 'arrow', 'shield', 'helmet'])
    choose(s, a, 'freyrs-gift', 1, { symbol: 'hand' }); choose(s, b, 'lokis-trick', 2, { dieIds: ids(a, 2) })
    run(s)
    expect(s.players[a].dice[2]!.value).toBe(3)
    expect(s.players[a].dice[0]!.removed).toBe(true)
  })
  it.each(['odins-sacrifice', 'tyrs-pledge'] as const)('%s stops immediately on lethal self-sacrifice', favorId => {
    const s = fixture(); choose(s, a, favorId, 1, { health: 15 }); const events = run(s)
    expect(s.phase).toEqual({ name: 'ended', winnerId: b })
    expect(events.at(-3)).toMatchObject({ type: 'HealthSacrificed', health: 0 })
    expect(events.some(e => e.type === 'TokensGranted' || e.type === 'TokensDestroyed')).toBe(false)
  })
  it('caps the sacrifice at health remaining after attacks', () => {
    const s = fixture(); s.players[a].health = 3; faces(s, b, ['arrow']); choose(s, a, 'odins-sacrifice', 1, { health: 3 })
    expect(run(s).find(e => e.type === 'HealthSacrificed')).toMatchObject({ amount: 2, health: 0 })
  })
  it('does not grant Mimir income after a lethal hit or heal Hel after killing the opponent', () => {
    const s = fixture(); s.players[b].health = 1; faces(s, a, Array(6).fill('axe-1')); faces(s, b, Array(6).fill('hand'))
    choose(s, a, 'hels-grip'); choose(s, b, 'mimirs-wisdom')
    const events = run(s)
    expect(events.some(e => e.type === 'HealthRestored' || e.type === 'TokensGranted')).toBe(false)
  })
  it('stops before Odin when Thor is lethal', () => {
    const s = fixture(); s.players[a].health = 1; choose(s, a, 'odins-sacrifice', 1, { health: 0 }); choose(s, b, 'thors-strike')
    expect(run(s).some(e => e.type === 'HealthSacrificed')).toBe(false)
  })
  it('Mimir can receive resources from a blocked-free Thor hit after combat', () => {
    const s = fixture(); choose(s, a, 'mimirs-wisdom'); choose(s, b, 'thors-strike')
    expect(run(s).find(e => e.type === 'TokensGranted')).toMatchObject({ amount: 2 })
  })
})

function ready(game: Game) {
  while (game.state.phase.name === 'roll') {
    const p = game.state.phase
    expect(game.dispatch({ type: p.step === 'awaiting-roll' ? 'RollDice' : 'ConfirmRoll', playerId: p.activePlayerId }).ok).toBe(true)
  }
}
function settleRound(game: Game) {
  while (game.state.phase.name === 'favor') expect(game.dispatch({ type: 'SkipFavor', playerId: game.state.phase.activePlayerId }).ok).toBe(true)
  expect(game.dispatch({ type: 'ResolveRound', playerId: game.state.firstPlayerId }).ok).toBe(true)
}

describe('target validation, replay and round lifecycle', () => {
  it('rejects missing, duplicate, wrong-owner, non-existent and excessive targets without consuming randomness', () => {
    let calls = 0
    const game = new Game({ random: () => { calls++; return 0.5 }, loadouts: { [a]: ['friggs-sight', 'lokis-trick', 'tyrs-pledge'] } })
    ready(game); const before = game.state, used = calls
    for (const [favorId, input] of [
      ['friggs-sight', undefined], ['friggs-sight', { dieIds: ids(a, 1) }],
      ['friggs-sight', { dieIds: [ids(a, 1)[0], ids(a, 1)[0]] }],
      ['friggs-sight', { dieIds: ['missing', 'player-1/die-1'] }],
      ['lokis-trick', { dieIds: ids(a, 1) }], ['tyrs-pledge', { health: -1 }],
      ['tyrs-pledge', { health: 16 }], ['tyrs-pledge', { health: 1.5 }],
    ] as const) {
      const result = game.dispatch({ type: 'ChooseFavor', playerId: a, favorId, level: 1, input: input as FavorInput })
      expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_FAVOR_TARGET' } })
      expect(game.state).toBe(before)
    }
    expect(calls).toBe(used)
  })
  it('copies mutable target input without freezing caller-owned arrays', () => {
    const game = new Game({ random: () => 0.5, loadouts: { [a]: ['friggs-sight'] } }); ready(game)
    const input = { dieIds: ids(b, 2) }
    expect(game.dispatch({ type: 'ChooseFavor', playerId: a, favorId: 'friggs-sight', level: 1, input }).ok).toBe(true)
    input.dieIds.pop()
    const choice = game.state.players[a].favorChoice
    expect(choice.status === 'chosen' && choice.input?.dieIds).toHaveLength(2)
    expect(JSON.parse(JSON.stringify(game.state))).toEqual(game.state)
  })
  it('removes Freyja bonuses and resets per-die values, removals and targets on NextRound', () => {
    const game = new Game({ random: () => 0.5, loadouts: { [a]: ['freyjas-plenty'], [b]: ['baldrs-invulnerability'] } })
    ready(game); settleRound(game); game.dispatch({ type: 'NextRound', playerId: a }); ready(game)
    game.dispatch({ type: 'ChooseFavor', playerId: b, favorId: 'baldrs-invulnerability', level: 1 })
    game.dispatch({ type: 'ChooseFavor', playerId: a, favorId: 'freyjas-plenty', level: 1 })
    expect(game.dispatch({ type: 'ResolveRound', playerId: b }).ok).toBe(true)
    expect(game.state.players[a].dice).toHaveLength(7)
    expect(game.state.players[b].dice[0]!.value).toBe(2)
    game.dispatch({ type: 'NextRound', playerId: b })
    for (const id of PLAYER_IDS) {
      expect(game.state.players[id].dice).toHaveLength(6)
      expect(game.state.players[id].dice.every(d => d.value === 1 && !d.removed && !d.faceId)).toBe(true)
      expect(game.state.players[id].favorChoice).toEqual({ status: 'pending' })
    }
  })
  it('handles broken reroll randomness atomically without committing payment or partial faces', () => {
    let broken = false
    const game = new Game({ random: () => broken ? NaN : 0.5, loadouts: { [a]: ['friggs-sight'] } })
    ready(game); settleRound(game); game.dispatch({ type: 'NextRound', playerId: a }); ready(game)
    game.dispatch({ type: 'SkipFavor', playerId: b }); game.dispatch({ type: 'ChooseFavor', playerId: a, favorId: 'friggs-sight', level: 1, input: { dieIds: ids(b, 2) } })
    const before = game.state; broken = true
    expect(() => game.dispatch({ type: 'ResolveRound', playerId: b })).toThrow(RangeError)
    expect(game.state).toBe(before)
  })
  it.each(Object.keys(FAVOR_CATALOG) as FavorId[])('replays %s resource/dice events to the authoritative outcome and exposes meaningful explanations', favorId => {
    const s = fixture(); s.players[a].health = 5; faces(s, a, ['hand', 'hand', 'hand']); faces(s, b, ['arrow', 'arrow', 'axe-1'])
    const definition = FAVOR_CATALOG[favorId]
    const input: FavorInput | undefined = definition.target === 'any-dice' ? { dieIds: ids(b, 2) } : definition.target === 'enemy-dice' ? { dieIds: ids(b, 1) } : definition.target === 'health' ? { health: 1 } : definition.target === 'majority' ? { symbol: 'hand' } : undefined
    choose(s, a, favorId, 1, input)
    expect(validFavorInput(s, a, favorId, 1, input)).toBe(true)
    let shown = JSON.parse(JSON.stringify(s)) as Draft
    for (const [i, payload] of run(s).entries()) {
      const event = { ...payload, id: `review/${i}`, sequence: i + 1, round: 1, revision: 1 }
      if (payload.type !== 'PhaseChanged') expect(eventText(event)).not.toBe('')
      shown = applyResourceEvent(shown, event) as Draft
    }
    expect(shown.players).toEqual(s.players)
    for (const level of tiers) expect(describeFavorTier(favorId, level)).not.toMatch(/undefined|NaN/)
  })
  it('keeps a seeded extended match deterministic with valid resources and serializable immutable events', () => {
    function play(seed: number) {
      const game = new Game({ random: createSeededRandom(seed), loadouts: { [a]: ['freyjas-plenty', 'skadis-hunt', 'lokis-trick'], [b]: ['thrymrs-theft', 'friggs-sight', 'tyrs-pledge'] } })
      for (let round = 0; round < 150 && game.state.phase.name !== 'ended'; round++) {
        ready(game)
        while (game.state.phase.name === 'favor') {
          const id = game.state.phase.activePlayerId, p = game.state.players[id], favorId = p.favors[round % 3]!, def = FAVOR_CATALOG[favorId]
          const input = def.target === 'any-dice' ? { dieIds: ids(a, 2) } : def.target === 'enemy-dice' ? { dieIds: ids(b, 1) } : def.target === 'health' ? { health: 0 } : undefined
          expect(game.dispatch({ type: 'ChooseFavor', playerId: id, favorId, level: 1, input }).ok).toBe(true)
        }
        const result = game.dispatch({ type: 'ResolveRound', playerId: game.state.firstPlayerId })
        expect(result.ok).toBe(true); expect(Object.isFrozen(result.events)).toBe(true)
        expect(JSON.parse(JSON.stringify(result))).toEqual(result)
        for (const p of Object.values(game.state.players)) { expect(p.health).toBeGreaterThanOrEqual(0); expect(p.health).toBeLessThanOrEqual(15); expect(p.tokens).toBeGreaterThanOrEqual(0) }
        if (game.state.phase.name === 'round-complete') game.dispatch({ type: 'NextRound', playerId: game.state.firstPlayerId })
      }
      expect(game.state.phase.name).toBe('ended')
      return game.state
    }
    expect(play(429)).toEqual(play(429))
  })
})

describe('all favor pairings', () => {
  it.each([a, b] as const)('preserves resource bounds and exact event replay for all 400 pairings with %s first', first => {
    const catalog = Object.keys(FAVOR_CATALOG) as FavorId[]
    for (const left of catalog) for (const right of catalog) {
      const s = fixture(first)
      for (const [playerId, favorId] of [[a, left], [b, right]] as const) {
        s.players[playerId].health = 14
        faces(s, playerId, ['axe-1', 'arrow', 'helmet', 'shield', 'hand', 'hand'])
        const target = FAVOR_CATALOG[favorId].target, opponent = playerId === a ? b : a
        const input = target === 'any-dice' ? { dieIds: ids(opponent, 4) } : target === 'enemy-dice' ? { dieIds: ids(opponent, 3) } : target === 'health' ? { health: 1 } : target === 'majority' ? { symbol: 'hand' as const } : undefined
        choose(s, playerId, favorId, 3, input)
      }
      let shown = JSON.parse(JSON.stringify(s)) as Draft
      for (const [i, payload] of run(s).entries()) shown = applyResourceEvent(shown, { ...payload, id: `pair/${i}`, sequence: i + 1, round: 1, revision: 1 }) as Draft
      expect(shown.players, `${left} / ${right}`).toEqual(s.players)
      for (const p of Object.values(s.players)) {
        expect(p.health).toBeGreaterThanOrEqual(0); expect(p.health).toBeLessThanOrEqual(15)
        expect(p.tokens).toBeGreaterThanOrEqual(0)
        expect(p.dice.filter(d => !d.removed).every(d => d.value >= 1 && d.value <= 24)).toBe(true)
      }
    }
  })
  it.each(Object.keys(FAVOR_CATALOG) as FavorId[])('%s cannot apply an effect without funds', favorId => {
    const s = fixture(); s.players[a].tokens = 0
    for (const id of PLAYER_IDS) faces(s, id, Array(6).fill('axe-1'))
    const target = FAVOR_CATALOG[favorId].target
    const input = target === 'any-dice' ? { dieIds: ids(b, 2) } : target === 'enemy-dice' ? { dieIds: ids(b, 1) } : target === 'health' ? { health: 1 } : target === 'majority' ? { symbol: 'axe' as const } : undefined
    choose(s, a, favorId, 1, input)
    let calls = 0
    const events = run(s, () => { calls++; return 0.4 })
    expect(events.find(e => e.type === 'FavorFailed')).toMatchObject({ favorId, reason: 'tokens' })
    expect(events.some(e => e.type === 'FavorInvoked')).toBe(false)
    expect(calls).toBe(0)
  })
})
