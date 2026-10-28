import { DICE_DEFINITIONS, rollFace } from './dice/definitions'
import { DEFAULT_FAVORS, isFavorId, isFavorLevel } from './favors/catalog'
import { deepFreeze } from './immutable'
import { resolveRound } from './resolution'
import { mathRandom } from './random'
import type { RandomSource } from './random'
import { INITIAL_HEALTH, MAX_FAVORS, MAX_ROLLS } from './rules'
import { PLAYER_IDS } from './types'
import type {
  CommandErrorCode, CommandResult, DieState, FavorId, GameCommand, GameEvent,
  GameEventPayload, GameState, PlayerId, PlayerState,
} from './types'

type Mutable<T> = T extends readonly (infer Item)[]
  ? Mutable<Item>[]
  : T extends object ? { -readonly [Key in keyof T]: Mutable<T[Key]> } : T

export interface GameOptions {
  readonly gameId?: string
  // The setup/coin-toss UI supplies this value.
  readonly firstPlayerId?: PlayerId
  readonly random?: RandomSource
  readonly loadouts?: Readonly<Partial<Record<PlayerId, readonly FavorId[]>>>
}

function otherPlayer(id: PlayerId): PlayerId {
  return id === 'player-1' ? 'player-2' : 'player-1'
}

function rollComplete(player: PlayerState): boolean {
  return player.rollsUsed === MAX_ROLLS || player.dice.every(die => die.kept)
}

function cloneState(state: GameState): Mutable<GameState> {
  const clonePlayer = (player: PlayerState): Mutable<PlayerState> => ({
    ...player,
    dice: player.dice.map(die => ({ ...die })),
    favors: [...player.favors],
    favorChoice: { ...player.favorChoice },
  })
  return {
    ...state,
    phase: { ...state.phase },
    players: {
      'player-1': clonePlayer(state.players['player-1']),
      'player-2': clonePlayer(state.players['player-2']),
    },
  }
}

function createPlayer(id: PlayerId, loadout: readonly FavorId[]): PlayerState {
  if (loadout.length > MAX_FAVORS || new Set(loadout).size !== loadout.length || !loadout.every(isFavorId)) {
    throw new RangeError('A loadout must contain up to three distinct supported favors.')
  }
  return {
    id,
    health: INITIAL_HEALTH,
    tokens: 0,
    rollsUsed: 0,
    dice: DICE_DEFINITIONS.map(definition => ({
      id: `${id}/${definition.id}`,
      definitionId: definition.id,
      faceId: null,
      kept: false,
      selected: false,
      removed: false,
    })),
    favors: [...loadout],
    favorChoice: { status: 'pending' },
  }
}

export class Game {
  #state: GameState
  readonly #random: RandomSource

  constructor(options: GameOptions = {}) {
    const firstPlayerId = options.firstPlayerId ?? 'player-1'
    if (!PLAYER_IDS.includes(firstPlayerId)) throw new RangeError('Unknown first player.')
    const gameId = options.gameId ?? 'local-game'
    if (typeof gameId !== 'string' || gameId.trim().length === 0) {
      throw new RangeError('Game ID must be a non-empty string.')
    }
    this.#random = options.random ?? mathRandom
    this.#state = deepFreeze({
      gameId,
      revision: 0,
      eventSequence: 0,
      round: 1,
      firstPlayerId,
      phase: { name: 'roll', activePlayerId: firstPlayerId, step: 'awaiting-roll' },
      players: {
        'player-1': createPlayer('player-1', options.loadouts?.['player-1'] ?? DEFAULT_FAVORS),
        'player-2': createPlayer('player-2', options.loadouts?.['player-2'] ?? DEFAULT_FAVORS),
      },
    })
  }

  get state(): GameState {
    return this.#state
  }

  dispatch(command: GameCommand): CommandResult {
    const error = this.#validate(command)
    if (error) return deepFreeze({ ok: false, state: this.#state, events: [], error })

    const previousState = this.#state
    const next = cloneState(previousState)
    const events: GameEventPayload[] = []
    const player = next.players[command.playerId]

    switch (command.type) {
      case 'ResolveRound':
        resolveRound(next, events)
        break
      case 'NextRound':
        next.round++
        next.firstPlayerId = otherPlayer(next.firstPlayerId)
        for (const id of PLAYER_IDS) {
          const current = next.players[id]
          current.rollsUsed = 0
          current.favorChoice = { status: 'pending' }
          current.dice = current.dice.map(die => ({ ...die, faceId: null, kept: false, selected: false, removed: false }))
        }
        next.phase = { name: 'roll', activePlayerId: next.firstPlayerId, step: 'awaiting-roll' }
        events.push({ type: 'RoundStarted', firstPlayerId: next.firstPlayerId }, { type: 'PhaseChanged', phase: next.phase })
        break
      case 'RollDice': {
        const rolled = player.dice.filter(die => !die.kept).map(die => ({
          dieId: die.id,
          faceId: rollFace(die.definitionId, this.#random).id,
        }))
        // All random values are validated before the draft or live state changes.
        for (const result of rolled) player.dice.find(die => die.id === result.dieId)!.faceId = result.faceId
        player.rollsUsed++
        next.phase = { name: 'roll', activePlayerId: player.id, step: 'selecting-dice' }
        events.push({ type: 'DiceRolled', playerId: player.id, rollNumber: player.rollsUsed, dice: rolled })
        if (player.rollsUsed === MAX_ROLLS) {
          const newlyKept = player.dice.filter(die => !die.kept)
          for (const die of newlyKept) die.kept = true
          events.push({ type: 'DiceKept', playerId: player.id, dieIds: newlyKept.map(die => die.id), reason: 'last-roll' })
        }
        break
      }
      case 'SetDieSelection': {
        player.dice.find(die => die.id === command.dieId)!.selected = command.selected
        events.push({ type: 'DieSelectionChanged', playerId: player.id, dieId: command.dieId, selected: command.selected })
        break
      }
      case 'ConfirmRoll': {
        const selected = player.dice.filter(die => die.selected)
        for (const die of selected) {
          die.kept = true
          die.selected = false
        }
        if (selected.length > 0) {
          events.push({ type: 'DiceKept', playerId: player.id, dieIds: selected.map(die => die.id), reason: 'confirmed' })
        }
        const opponent = next.players[otherPlayer(player.id)]
        if (rollComplete(player) && rollComplete(opponent)) {
          next.phase = { name: 'favor', activePlayerId: next.firstPlayerId }
          events.push({ type: 'PhaseChanged', phase: next.phase })
        } else {
          const active = rollComplete(opponent) ? player : opponent
          next.phase = { name: 'roll', activePlayerId: active.id, step: 'awaiting-roll' }
          events.push({ type: 'RollTurnStarted', playerId: active.id, rollNumber: active.rollsUsed + 1 })
        }
        break
      }
      case 'ChooseFavor':
        player.favorChoice = { status: 'chosen', favorId: command.favorId, level: command.level }
        events.push({ type: 'FavorChosen', playerId: player.id, favorId: command.favorId, level: command.level })
        this.#advanceFavor(next, player.id, events)
        break
      case 'SkipFavor':
        player.favorChoice = { status: 'skipped' }
        events.push({ type: 'FavorSkipped', playerId: player.id })
        this.#advanceFavor(next, player.id, events)
        break
    }

    next.revision++
    const stampedEvents: GameEvent[] = events.map((event, index) => {
      const sequence = previousState.eventSequence + index + 1
      return {
        ...event,
        id: `${next.gameId}/event-${sequence}`,
        sequence,
        round: next.round,
        revision: next.revision,
      }
    })
    next.eventSequence += stampedEvents.length
    this.#state = deepFreeze(next)
    return deepFreeze({ ok: true, previousState, state: this.#state, events: stampedEvents })
  }

  #advanceFavor(state: Mutable<GameState>, actor: PlayerId, events: GameEventPayload[]): void {
    const opponent = state.players[otherPlayer(actor)]
    state.phase = opponent.favorChoice.status === 'pending'
      ? { name: 'favor', activePlayerId: opponent.id }
      : { name: 'resolution' }
    events.push({ type: 'PhaseChanged', phase: state.phase })
  }

  #validate(command: GameCommand): { code: CommandErrorCode; message: string } | null {
    const fail = (code: CommandErrorCode, message: string) => ({ code, message })
    if (!command || typeof command !== 'object' || ![
      'RollDice', 'SetDieSelection', 'ConfirmRoll', 'ChooseFavor', 'SkipFavor', 'ResolveRound', 'NextRound',
    ].includes(command.type)) return fail('INVALID_COMMAND', 'Unknown command.')
    if (!PLAYER_IDS.includes(command.playerId)) return fail('INVALID_PLAYER', 'Unknown player.')
    const phase = this.#state.phase
    if (command.type === 'ResolveRound' || command.type === 'NextRound') {
      const required = command.type === 'ResolveRound' ? 'resolution' : 'round-complete'
      if (phase.name !== required) return fail('WRONG_PHASE', 'This command is unavailable in the current phase.')
      if (command.playerId !== this.#state.firstPlayerId) return fail('WRONG_PLAYER', 'The first player advances the round.')
      return null
    }
    if (phase.name === 'resolution' || phase.name === 'round-complete' || phase.name === 'ended')
      return fail('WRONG_PHASE', 'This command is unavailable in the current phase.')
    if (command.playerId !== phase.activePlayerId) return fail('WRONG_PLAYER', 'It is not this player’s turn.')
    const player = this.#state.players[command.playerId]

    if (command.type === 'ChooseFavor' || command.type === 'SkipFavor') {
      if (phase.name !== 'favor') return fail('WRONG_PHASE', 'Favors can only be chosen in the favor phase.')
      if (command.type === 'ChooseFavor') {
        if (!isFavorId(command.favorId) || !player.favors.includes(command.favorId)) {
          return fail('FAVOR_NOT_EQUIPPED', 'The player has not equipped this favor.')
        }
        if (!isFavorLevel(command.level)) return fail('INVALID_FAVOR_LEVEL', 'Favor level must be 1, 2 or 3.')
      }
      // Selection is an intention. Cost is checked/paid on invocation, never here.
      return null
    }
    if (phase.name !== 'roll') return fail('WRONG_PHASE', 'This command requires the roll phase.')

    if (command.type === 'RollDice') {
      if (phase.step !== 'awaiting-roll') return fail('ALREADY_ROLLED', 'Confirm the current roll before rolling again.')
      if (player.rollsUsed >= MAX_ROLLS) return fail('ROLL_LIMIT_REACHED', 'The player has used all three rolls.')
      if (player.dice.every(die => die.kept)) return fail('NO_DICE_TO_ROLL', 'All dice have been kept.')
      return null
    }
    if (phase.step !== 'selecting-dice') return fail('ROLL_REQUIRED', 'Roll before selecting dice or confirming.')
    if (command.type === 'SetDieSelection') {
      const die: DieState | undefined = player.dice.find(candidate => candidate.id === command.dieId)
      if (!die) return fail('DIE_NOT_OWNED', 'This die does not belong to the player.')
      if (die.kept) return fail('DIE_LOCKED', 'A previously kept die cannot be changed.')
      if (typeof command.selected !== 'boolean') return fail('INVALID_SELECTION', 'Selection must be a boolean.')
    }
    return null
  }
}
