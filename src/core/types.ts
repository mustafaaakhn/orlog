export const PLAYER_IDS = Object.freeze(['player-1', 'player-2'] as const)
export type PlayerId = (typeof PLAYER_IDS)[number]

export const DIE_DEFINITION_IDS = Object.freeze(['die-1', 'die-2', 'die-3', 'die-4', 'die-5', 'die-6'] as const)
export type DieDefinitionId = (typeof DIE_DEFINITION_IDS)[number]
export type DieId = `${PlayerId}/${DieDefinitionId}`
export type DieSymbol = 'axe' | 'arrow' | 'helmet' | 'shield' | 'hand'
export const FACE_IDS = Object.freeze(['axe-1', 'axe-2', 'arrow', 'helmet', 'shield', 'hand'] as const)
export type FaceId = (typeof FACE_IDS)[number]

export interface DieFace {
  readonly id: FaceId
  readonly symbol: DieSymbol
  readonly grantsToken: boolean
}

export interface DieDefinition {
  readonly id: DieDefinitionId
  readonly faces: readonly DieFace[]
}

export interface DieState {
  readonly id: DieId
  readonly definitionId: DieDefinitionId
  readonly faceId: FaceId | null
  readonly kept: boolean
  readonly selected: boolean
  readonly removed: boolean
}

export type FavorId = 'thors-strike' | 'iduns-rejuvenation' | 'vidars-might'
export type FavorLevel = 1 | 2 | 3
export type FavorTiming = 'before-resolution' | 'after-resolution'

export interface FavorTier {
  readonly cost: number
  readonly amount: number
}

export interface FavorDefinition {
  readonly id: FavorId
  readonly name: string
  readonly priority: number
  readonly timing: FavorTiming
  readonly effect: 'damage' | 'heal' | 'remove-helmets'
  readonly tiers: Readonly<Record<FavorLevel, FavorTier>>
}

export type FavorChoice =
  | { readonly status: 'pending' }
  | { readonly status: 'skipped' }
  | { readonly status: 'chosen'; readonly favorId: FavorId; readonly level: FavorLevel }

export interface PlayerState {
  readonly id: PlayerId
  readonly health: number
  readonly tokens: number
  readonly rollsUsed: number
  readonly dice: readonly DieState[]
  readonly favors: readonly FavorId[]
  readonly favorChoice: FavorChoice
}

export type GamePhase =
  | { readonly name: 'roll'; readonly activePlayerId: PlayerId; readonly step: 'awaiting-roll' | 'selecting-dice' }
  | { readonly name: 'favor'; readonly activePlayerId: PlayerId }
  | { readonly name: 'resolution' }
  | { readonly name: 'round-complete' }
  | { readonly name: 'ended'; readonly winnerId: PlayerId }

export interface GameState {
  readonly gameId: string
  readonly revision: number
  readonly eventSequence: number
  readonly round: number
  readonly firstPlayerId: PlayerId
  readonly phase: GamePhase
  readonly players: Readonly<Record<PlayerId, PlayerState>>
}

export type GameCommand =
  | { readonly type: 'ResolveRound'; readonly playerId: PlayerId }
  | { readonly type: 'NextRound'; readonly playerId: PlayerId }
  | { readonly type: 'RollDice'; readonly playerId: PlayerId }
  | { readonly type: 'SetDieSelection'; readonly playerId: PlayerId; readonly dieId: DieId; readonly selected: boolean }
  | { readonly type: 'ConfirmRoll'; readonly playerId: PlayerId }
  | { readonly type: 'ChooseFavor'; readonly playerId: PlayerId; readonly favorId: FavorId; readonly level: FavorLevel }
  | { readonly type: 'SkipFavor'; readonly playerId: PlayerId }

export interface RolledDie {
  readonly dieId: DieId
  readonly faceId: FaceId
}

export type GameEventPayload =
  | { readonly type: 'TokensGained'; readonly playerId: PlayerId; readonly dieIds: readonly DieId[]; readonly tokens: number }
  | { readonly type: 'AttackBlocked'; readonly playerId: PlayerId; readonly targetId: PlayerId; readonly dieId: DieId; readonly defenderDieId: DieId; readonly symbol: 'axe' | 'arrow' }
  | { readonly type: 'DamageDealt'; readonly playerId: PlayerId; readonly targetId: PlayerId; readonly amount: number; readonly health: number; readonly dieId?: DieId; readonly favorId?: FavorId }
  | { readonly type: 'TokensStolen'; readonly playerId: PlayerId; readonly targetId: PlayerId; readonly amount: number; readonly tokens: number; readonly targetTokens: number; readonly dieIds: readonly DieId[] }
  | { readonly type: 'FavorInvoked'; readonly playerId: PlayerId; readonly favorId: FavorId; readonly level: FavorLevel; readonly cost: number; readonly tokens: number }
  | { readonly type: 'FavorFailed'; readonly playerId: PlayerId; readonly favorId: FavorId; readonly cost: number }
  | { readonly type: 'HealthRestored'; readonly playerId: PlayerId; readonly amount: number; readonly health: number }
  | { readonly type: 'HelmetsRemoved'; readonly playerId: PlayerId; readonly targetId: PlayerId; readonly dieIds: readonly DieId[] }
  | { readonly type: 'GameEnded'; readonly winnerId: PlayerId; readonly loserId: PlayerId }
  | { readonly type: 'RoundStarted'; readonly firstPlayerId: PlayerId }

  | { readonly type: 'DiceRolled'; readonly playerId: PlayerId; readonly rollNumber: number; readonly dice: readonly RolledDie[] }
  | { readonly type: 'DieSelectionChanged'; readonly playerId: PlayerId; readonly dieId: DieId; readonly selected: boolean }
  | { readonly type: 'DiceKept'; readonly playerId: PlayerId; readonly dieIds: readonly DieId[]; readonly reason: 'confirmed' | 'last-roll' }
  | { readonly type: 'RollTurnStarted'; readonly playerId: PlayerId; readonly rollNumber: number }
  | { readonly type: 'PhaseChanged'; readonly phase: GamePhase }
  | { readonly type: 'FavorChosen'; readonly playerId: PlayerId; readonly favorId: FavorId; readonly level: FavorLevel }
  | { readonly type: 'FavorSkipped'; readonly playerId: PlayerId }

export type GameEvent = GameEventPayload & {
  readonly id: string
  readonly sequence: number
  readonly round: number
  readonly revision: number
}

export type CommandErrorCode =
  | 'INVALID_COMMAND'
  | 'INVALID_PLAYER'
  | 'WRONG_PLAYER'
  | 'WRONG_PHASE'
  | 'ALREADY_ROLLED'
  | 'ROLL_REQUIRED'
  | 'NO_DICE_TO_ROLL'
  | 'ROLL_LIMIT_REACHED'
  | 'DIE_NOT_OWNED'
  | 'DIE_LOCKED'
  | 'INVALID_SELECTION'
  | 'FAVOR_NOT_EQUIPPED'
  | 'INVALID_FAVOR_LEVEL'

export type CommandResult =
  | {
      readonly ok: true
      readonly previousState: GameState
      readonly state: GameState
      readonly events: readonly GameEvent[]
    }
  | {
      readonly ok: false
      readonly state: GameState
      readonly events: readonly []
      readonly error: { readonly code: CommandErrorCode; readonly message: string }
    }
