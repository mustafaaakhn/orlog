import { describe, expect, it, vi } from 'vitest'
import { createSeededRandom, Game, MAX_HEALTH, PLAYER_IDS } from '../index'
import type { CommandErrorCode, CommandResult, FavorId, GameCommand, PlayerId } from '../index'

function success(result: CommandResult): Extract<CommandResult, { ok: true }> {
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.error.message)
  return result
}

function rejected(game: Game, command: GameCommand, code: CommandErrorCode): void {
  const before = game.state
  const result = game.dispatch(command)
  expect(result).toMatchObject({ ok: false, error: { code }, events: [] })
  expect(result.state).toBe(before)
  expect(game.state).toBe(before)
}

function keepAll(game: Game, playerId: PlayerId): void {
  success(game.dispatch({ type: 'RollDice', playerId }))
  for (const die of game.state.players[playerId].dice) {
    success(game.dispatch({ type: 'SetDieSelection', playerId, dieId: die.id, selected: true }))
  }
  success(game.dispatch({ type: 'ConfirmRoll', playerId }))
}

function reachFavor(game: Game): void {
  const first = game.state.firstPlayerId
  keepAll(game, first)
  keepAll(game, first === 'player-1' ? 'player-2' : 'player-1')
  expect(game.state.phase).toEqual({ name: 'favor', activePlayerId: first })
}

describe('game setup and immutable state', () => {
  it('starts with two independent six-die sets, 15 health and no tokens', () => {
    const random = vi.fn(() => 0)
    const game = new Game({ firstPlayerId: 'player-2', random })
    expect(game.state.phase).toEqual({ name: 'roll', activePlayerId: 'player-2', step: 'awaiting-roll' })
    expect(game.state.round).toBe(1)
    expect(MAX_HEALTH).toBe(15)
    const ids = PLAYER_IDS.flatMap(id => {
      const player = game.state.players[id]
      expect(player).toMatchObject({ health: 15, tokens: 0, rollsUsed: 0, favorChoice: { status: 'pending' } })
      expect(player.dice).toHaveLength(6)
      expect(player.dice.every(die => die.faceId === null && !die.kept && !die.selected)).toBe(true)
      return player.dice.map(die => die.id)
    })
    expect(new Set(ids).size).toBe(12)
    expect(random).not.toHaveBeenCalled()
  })

  it('detaches constructor inputs and freezes every exposed snapshot', () => {
    const loadout: FavorId[] = ['thors-strike']
    const game = new Game({ loadouts: { 'player-1': loadout } })
    loadout.push('vidars-might')
    expect(game.state.players['player-1'].favors).toEqual(['thors-strike'])
    expect(Object.isFrozen(game.state.players['player-1'].dice[0])).toBe(true)
    const before = game.state
    success(game.dispatch({ type: 'RollDice', playerId: 'player-1' }))
    expect(before.players['player-1'].dice.every(die => die.faceId === null)).toBe(true)
    expect(game.state).not.toBe(before)
    expect(Reflect.set(game.state.players['player-1'], 'health', 99)).toBe(false)
    expect(game.state.players['player-1'].health).toBe(15)
  })

  it('rejects invalid setup values rather than creating ambiguous state', () => {
    expect(() => new Game({ gameId: ' ' })).toThrow(RangeError)
    expect(() => new Game({ firstPlayerId: 'other' as PlayerId })).toThrow(RangeError)
    expect(() => new Game({ loadouts: { 'player-1': ['thors-strike', 'thors-strike'] } })).toThrow(RangeError)
    expect(() => new Game({ loadouts: { 'player-1': ['unknown' as FavorId] } })).toThrow(RangeError)
    expect(() => new Game({ loadouts: { 'player-1': [
      'thors-strike', 'iduns-rejuvenation', 'vidars-might', 'thors-strike',
    ] } })).toThrow(RangeError)
  })
})

describe('rolling and keeping dice', () => {
  it('rejects wrong player, pre-roll confirmation and pre-roll selection without consuming randomness', () => {
    const random = vi.fn(() => 0)
    const game = new Game({ random })
    rejected(game, { type: 'RollDice', playerId: 'player-2' }, 'WRONG_PLAYER')
    rejected(game, { type: 'ConfirmRoll', playerId: 'player-1' }, 'ROLL_REQUIRED')
    rejected(game, { type: 'SetDieSelection', playerId: 'player-1', dieId: 'player-1/die-1', selected: true }, 'ROLL_REQUIRED')
    rejected(game, { type: 'ChooseFavor', playerId: 'player-1', favorId: 'thors-strike', level: 1 }, 'WRONG_PHASE')
    expect(random).not.toHaveBeenCalled()
  })

  it('allows changing tentative selection until confirmation, then locks only kept dice', () => {
    const random = vi.fn(() => 0.4)
    const game = new Game({ random })
    success(game.dispatch({ type: 'RollDice', playerId: 'player-1' }))
    rejected(game, { type: 'RollDice', playerId: 'player-1' }, 'ALREADY_ROLLED')
    const select = (dieId: 'player-1/die-1' | 'player-1/die-2', selected: boolean) =>
      success(game.dispatch({ type: 'SetDieSelection', playerId: 'player-1', dieId, selected }))
    select('player-1/die-1', true)
    select('player-1/die-2', true)
    select('player-1/die-2', false)
    expect(game.state.players['player-1'].dice[0]).toMatchObject({ selected: true, kept: false })
    const confirmed = success(game.dispatch({ type: 'ConfirmRoll', playerId: 'player-1' }))
    expect(confirmed.events[0]).toMatchObject({ type: 'DiceKept', dieIds: ['player-1/die-1'] })
    expect(game.state.players['player-1'].dice[0]).toMatchObject({ selected: false, kept: true, faceId: 'arrow' })
    success(game.dispatch({ type: 'RollDice', playerId: 'player-2' }))
    success(game.dispatch({ type: 'ConfirmRoll', playerId: 'player-2' }))
    random.mockReturnValue(0.99)
    const rerolled = success(game.dispatch({ type: 'RollDice', playerId: 'player-1' }))
    expect(random).toHaveBeenCalledTimes(17)
    expect(rerolled.events[0]).toMatchObject({ type: 'DiceRolled', rollNumber: 2 })
    expect(game.state.players['player-1'].dice[0]!.faceId).toBe('arrow')
    expect(game.state.players['player-1'].dice.slice(1).every(die => die.faceId === 'hand')).toBe(true)
    rejected(game, { type: 'SetDieSelection', playerId: 'player-1', dieId: 'player-1/die-1', selected: false }, 'DIE_LOCKED')
  })

  it('cannot select an opponent’s die, a missing die or an invalid selection value', () => {
    const game = new Game()
    success(game.dispatch({ type: 'RollDice', playerId: 'player-1' }))
    rejected(game, { type: 'SetDieSelection', playerId: 'player-1', dieId: 'player-2/die-1', selected: true }, 'DIE_NOT_OWNED')
    rejected(game, { type: 'SetDieSelection', playerId: 'player-1', dieId: 'player-1/missing', selected: true } as unknown as GameCommand, 'DIE_NOT_OWNED')
    rejected(game, { type: 'SetDieSelection', playerId: 'player-1', dieId: 'player-1/die-1', selected: 1 } as unknown as GameCommand, 'INVALID_SELECTION')
  })

  it('alternates three rolls, automatically keeps the third roll and never allows a fourth', () => {
    const game = new Game({ random: createSeededRandom(7) })
    for (let roll = 1; roll <= 3; roll++) {
      for (const playerId of PLAYER_IDS) {
        const result = success(game.dispatch({ type: 'RollDice', playerId }))
        expect(game.state.players[playerId].rollsUsed).toBe(roll)
        expect(game.state.players[playerId].dice.every(die => die.kept)).toBe(roll === 3)
        if (roll === 3) {
          expect(result.events.map(event => event.type)).toEqual(['DiceRolled', 'DiceKept'])
          rejected(game, { type: 'SetDieSelection', playerId, dieId: `${playerId}/die-1`, selected: false }, 'DIE_LOCKED')
          rejected(game, { type: 'RollDice', playerId }, 'ALREADY_ROLLED')
        }
        success(game.dispatch({ type: 'ConfirmRoll', playerId }))
      }
    }
    expect(game.state.phase).toEqual({ name: 'favor', activePlayerId: 'player-1' })
    rejected(game, { type: 'RollDice', playerId: 'player-1' }, 'WRONG_PHASE')
  })

  it('skips a player who kept all dice early, without empty rolls or fake roll counts', () => {
    const random = vi.fn(() => 0)
    const game = new Game({ random })
    keepAll(game, 'player-1')
    expect(game.state.players['player-1'].rollsUsed).toBe(1)
    for (let roll = 1; roll <= 3; roll++) {
      expect(game.state.phase).toEqual({ name: 'roll', activePlayerId: 'player-2', step: 'awaiting-roll' })
      success(game.dispatch({ type: 'RollDice', playerId: 'player-2' }))
      success(game.dispatch({ type: 'ConfirmRoll', playerId: 'player-2' }))
    }
    expect(random).toHaveBeenCalledTimes(24)
    expect(game.state.phase).toEqual({ name: 'favor', activePlayerId: 'player-1' })
  })

  it.each(PLAYER_IDS)('enters the favor phase immediately when both keep all dice; first player is %s', firstPlayerId => {
    const game = new Game({ firstPlayerId })
    reachFavor(game)
    expect(PLAYER_IDS.map(id => game.state.players[id].rollsUsed)).toEqual([1, 1])
  })

  it('keeps the live state unchanged if a random source fails midway through a roll', () => {
    const random = vi.fn().mockReturnValueOnce(0.1).mockReturnValueOnce(0.2).mockReturnValueOnce(1)
    const game = new Game({ random })
    const before = game.state
    expect(() => game.dispatch({ type: 'RollDice', playerId: 'player-1' })).toThrow(RangeError)
    expect(game.state).toBe(before)
    expect(game.state.revision).toBe(0)
  })
})

describe('favor selection and the Stage 1 resolution boundary', () => {
  it('records an intention without spending or granting tokens or executing damage', () => {
    const game = new Game()
    reachFavor(game)
    success(game.dispatch({ type: 'ChooseFavor', playerId: 'player-1', favorId: 'thors-strike', level: 3 }))
    expect(game.state.players['player-1'].favorChoice).toEqual({ status: 'chosen', favorId: 'thors-strike', level: 3 })
    expect(game.state.players['player-1'].tokens).toBe(0)
    expect(game.state.players['player-2'].health).toBe(15)
    rejected(game, { type: 'SkipFavor', playerId: 'player-1' }, 'WRONG_PLAYER')
    const result = success(game.dispatch({ type: 'SkipFavor', playerId: 'player-2' }))
    expect(result.events.map(event => event.type)).toEqual(['FavorSkipped', 'PhaseChanged'])
    expect(game.state.phase).toEqual({ name: 'resolution' })
    rejected(game, { type: 'RollDice', playerId: 'player-1' }, 'WRONG_PHASE')
    rejected(game, { type: 'ChooseFavor', playerId: 'player-2', favorId: 'thors-strike', level: 1 }, 'WRONG_PHASE')
  })

  it('rejects unavailable powers and invalid levels without changing the active player', () => {
    const game = new Game({ loadouts: { 'player-1': ['vidars-might'] } })
    reachFavor(game)
    rejected(game, { type: 'ChooseFavor', playerId: 'player-1', favorId: 'thors-strike', level: 1 }, 'FAVOR_NOT_EQUIPPED')
    rejected(game, { type: 'ChooseFavor', playerId: 'player-1', favorId: 'unknown', level: 1 } as unknown as GameCommand, 'FAVOR_NOT_EQUIPPED')
    for (const level of [0, 4, 1.5, NaN]) {
      rejected(game, { type: 'ChooseFavor', playerId: 'player-1', favorId: 'vidars-might', level } as GameCommand, 'INVALID_FAVOR_LEVEL')
    }
  })

  it('allows both players to skip even with an empty loadout', () => {
    const game = new Game({ loadouts: { 'player-1': [], 'player-2': [] } })
    reachFavor(game)
    success(game.dispatch({ type: 'SkipFavor', playerId: 'player-1' }))
    success(game.dispatch({ type: 'SkipFavor', playerId: 'player-2' }))
    expect(game.state.phase.name).toBe('resolution')
  })
})

describe('commands and ordered presentation events', () => {
  it('rejects malformed command types and unknown actors at the public boundary', () => {
    const game = new Game()
    for (const command of [null, {}, { type: 'UnknownCommand', playerId: 'player-1' }]) {
      rejected(game, command as GameCommand, 'INVALID_COMMAND')
    }
    rejected(game, { type: 'RollDice', playerId: 'unknown' } as unknown as GameCommand, 'INVALID_PLAYER')
  })

  it('returns immutable previous/next states and stable, contiguous event IDs', () => {
    const game = new Game({ gameId: 'match-42', random: createSeededRandom(1) })
    const first = success(game.dispatch({ type: 'RollDice', playerId: 'player-1' }))
    const second = success(game.dispatch({ type: 'ConfirmRoll', playerId: 'player-1' }))
    expect(first.previousState.revision).toBe(0)
    expect(first.state.revision).toBe(1)
    expect(second.previousState).toBe(first.state)
    const events = [...first.events, ...second.events]
    expect(events.map(event => event.sequence)).toEqual([1, 2])
    expect(events.map(event => event.id)).toEqual(['match-42/event-1', 'match-42/event-2'])
    expect(events.map(event => event.revision)).toEqual([1, 2])
    expect(events.every(event => event.round === 1)).toBe(true)
    expect(Object.isFrozen(first.events[0])).toBe(true)
    expect(first.events[0]).toMatchObject({
      type: 'DiceRolled',
      dice: expect.arrayContaining([{ dieId: 'player-1/die-1', faceId: expect.any(String) }]),
    })
  })

  it('serializes cleanly and reproduces a complete roll/favor sequence from the same seed and commands', () => {
    const first = new Game({ random: createSeededRandom(123) })
    const second = new Game({ random: createSeededRandom(123) })
    const commands: GameCommand[] = []
    for (let roll = 0; roll < 3; roll++) {
      for (const playerId of PLAYER_IDS) commands.push({ type: 'RollDice', playerId }, { type: 'ConfirmRoll', playerId })
    }
    commands.push(
      { type: 'ChooseFavor', playerId: 'player-1', favorId: 'vidars-might', level: 2 },
      { type: 'SkipFavor', playerId: 'player-2' },
    )
    for (const command of commands) {
      const result = success(first.dispatch(command))
      expect(result).toEqual(success(second.dispatch(command)))
      expect(JSON.parse(JSON.stringify(result))).toEqual(result)
    }
    expect(first.state.phase.name).toBe('resolution')
  })
})
