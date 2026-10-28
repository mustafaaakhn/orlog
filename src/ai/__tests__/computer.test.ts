import { describe, expect, it, vi } from 'vitest'
import { Game, createSeededRandom, FAVOR_CATALOG, PLAYER_IDS, validFavorInput } from '../../core'
import type { Difficulty } from '../computer'
import { decideCommand, MAX_CANDIDATES, observeGame } from '../computer'
import type { FavorId, GameCommand, PlayerId } from '../../core'
import * as resolution from '../../core/resolution'

type Draft = Parameters<typeof resolution.resolveRound>[0]
function board(): Draft {
  const state = structuredClone(new Game().state) as Draft
  state.phase = { name: 'favor', activePlayerId: 'player-2' }
  for (const id of PLAYER_IDS) {
    state.players[id].rollsUsed = 3
    state.players[id].dice.forEach(d => { d.faceId = 'axe-1'; d.kept = true })
  }
  return state
}

describe('computer information boundary and decisions', () => {
  it('copies only public information and never reads an opponent intention', () => {
    const state = board()
    Object.defineProperty(state.players['player-1'], 'favorChoice', { get() { throw new Error('private intention accessed') } })
    const view = observeGame(state)
    expect(view.gameId).toBe('observation')
    expect(view.players['player-1'].favorChoice).toEqual({ status: 'pending' })
    expect(Object.isFrozen(view.players['player-2'].dice)).toBe(true)
    expect(() => decideCommand(view, 'player-2', 'hard')).not.toThrow()
  })
  it('has identical decisions for different hidden choices, identities and event counters', () => {
    const a = board(), b = board()
    b.gameId = 'secret'; b.revision = 900; b.eventSequence = 999
    b.players['player-1'].favorChoice = { status: 'chosen', favorId: 'thors-strike', level: 3 }
    for (const difficulty of ['easy', 'normal', 'hard'] as const)
      expect(decideCommand(a, 'player-2', difficulty)).toEqual(decideCommand(b, 'player-2', difficulty))
  })
  it('never consumes the authoritative random stream or mutates the input', () => {
    const random = vi.fn(createSeededRandom(91)), game = new Game({ random })
    const frozen = game.state, before = JSON.stringify(frozen)
    for (let i = 0; i < 10; i++) decideCommand(frozen, 'player-1', 'hard')
    expect(random).not.toHaveBeenCalled()
    expect(JSON.stringify(frozen)).toBe(before)
    const command: GameCommand = { type: 'RollDice', playerId: 'player-1' }
    const twin = new Game({ random: createSeededRandom(91) })
    expect(game.dispatch(command).state.players).toEqual(twin.dispatch(command).state.players)
  })
  it('only acts during its own roll or favor turn', () => {
    const state = board()
    expect(decideCommand(state, 'player-1', 'normal')).toBeNull()
    for (const phase of [{ name: 'resolution' }, { name: 'round-complete' }, { name: 'ended', winnerId: 'player-1' }] as const) {
      state.phase = phase
      expect(decideCommand(state, 'player-2', 'hard')).toBeNull()
    }
  })
  it('keeps useful defense at low health, rejects excess defense and values gold', () => {
    const state = board(), player = state.players['player-2']
    state.phase = { name: 'roll', activePlayerId: 'player-2', step: 'selecting-dice' }
    player.health = 3; player.rollsUsed = 1
    const die = player.dice[0]!
    die.kept = false; die.faceId = 'helmet'
    expect(decideCommand(state, 'player-2', 'normal')).toMatchObject({ type: 'SetDieSelection', dieId: die.id, selected: true })
    state.players['player-1'].dice.forEach(d => { d.faceId = 'hand' })
    expect(decideCommand(state, 'player-2', 'normal')).toMatchObject({ type: 'ConfirmRoll' })
    die.faceId = 'arrow' // die-1 has a framed arrow.
    expect(decideCommand(state, 'player-2', 'normal')).toMatchObject({ type: 'SetDieSelection', selected: true })
  })
  it('uses this round’s gold to select a lethal post-combat favor', () => {
    const state = board()
    state.firstPlayerId = 'player-2'
    state.players['player-2'].tokens = 3
    state.players['player-2'].dice[0]!.faceId = 'arrow'
    state.players['player-1'].health = 3
    state.players['player-1'].dice.forEach(d => { d.faceId = 'helmet' })
    state.players['player-1'].favors = []
    expect(decideCommand(state, 'player-2', 'normal')).toMatchObject({ type: 'ChooseFavor', favorId: 'thors-strike', level: 1 })
  })
  it('preserves tokens when no favor has benefit or can be funded', () => {
    const state = board()
    state.players['player-2'].favors = ['iduns-rejuvenation']
    state.players['player-2'].tokens = 10
    state.players['player-1'].dice.forEach(d => { d.faceId = 'helmet' })
    expect(decideCommand(state, 'player-2', 'hard')).toMatchObject({ type: 'SkipFavor' })
    state.players['player-2'].tokens = 0
    expect(decideCommand(state, 'player-2', 'hard')).toMatchObject({ type: 'SkipFavor' })
  })
  it('returns legal targeted intentions for every favor and bounds hypothetical resolutions', () => {
    for (const favor of Object.keys(FAVOR_CATALOG) as FavorId[]) {
      const state = board()
      state.players['player-2'].favors = [favor]
      state.players['player-2'].tokens = 30
      state.players['player-2'].health = 10
      const command = decideCommand(state, 'player-2', 'hard')!
      expect(['SkipFavor', 'ChooseFavor']).toContain(command.type)
      if (command.type === 'ChooseFavor') expect(validFavorInput(state, command.playerId, command.favorId, command.level, command.input)).toBe(true)
    }
    const spy = vi.spyOn(resolution, 'resolveRound'), state = board()
    state.players['player-2'].favors = ['odins-sacrifice', 'tyrs-pledge', 'friggs-sight']
    state.players['player-2'].tokens = 30
    decideCommand(state, 'player-2', 'hard')
    expect(spy.mock.calls.length).toBeLessThanOrEqual(MAX_CANDIDATES * 9)
    spy.mockRestore()
  })
})

it('completes 180 seeded full games with every catalog favor, both first players and all difficulties', () => {
  const favors = Object.keys(FAVOR_CATALOG) as FavorId[]
  let commands = 0, maxRounds = 0, maxDecisionMs = 0
  const durations: number[] = []
  for (let seed = 1; seed <= 180; seed++) {
    const difficulty: Difficulty = (['easy', 'normal', 'hard'] as const)[seed % 3]!
    const loadout = (offset: number) => [0, 1, 2].map(i => favors[(seed + offset + i * 7) % favors.length]!)
    const game = new Game({ random: createSeededRandom(seed), firstPlayerId: seed % 2 ? 'player-1' : 'player-2', loadouts: { 'player-1': loadout(0), 'player-2': loadout(3) } })
    let steps = 0
    while (game.state.phase.name !== 'ended' && steps++ < 12000) {
      const state = game.state, phase = state.phase
      let command: GameCommand | null
      if (phase.name === 'resolution' || phase.name === 'round-complete') command = { type: phase.name === 'resolution' ? 'ResolveRound' : 'NextRound', playerId: state.firstPlayerId }
      else {
        const start = performance.now()
        command = decideCommand(observeGame(state), (phase as { activePlayerId: PlayerId }).activePlayerId, difficulty)
        const elapsed = performance.now() - start
        if (phase.name === 'favor') durations.push(elapsed)
        maxDecisionMs = Math.max(maxDecisionMs, elapsed)
      }
      expect(command).not.toBeNull()
      const result = game.dispatch(command!)
      expect(result.ok, JSON.stringify(command)).toBe(true)
      commands++
      for (const id of PLAYER_IDS) {
        expect(game.state.players[id].health).toBeGreaterThanOrEqual(0)
        expect(game.state.players[id].tokens).toBeGreaterThanOrEqual(0)
      }
    }
    expect(game.state.phase.name, `seed ${seed}, round ${game.state.round}`).toBe('ended')
    maxRounds = Math.max(maxRounds, game.state.round)
  }
  durations.sort((a, b) => a - b)
  console.info('Computer simulation', { games: 180, commands, maxRounds, maxDecisionMs, favorP95Ms: durations[Math.floor(durations.length * .95)] })
}, 120000)
