import type { FavorId, GameOptions, PlayerId } from '../core'
import type { OpponentOptions } from '../ai/computer'

export interface RematchPreparation {
  options: GameOptions
  blockedFavors: Record<PlayerId, FavorId[]>
}

export interface RematchSetup extends RematchPreparation {
  names: Record<PlayerId, string>
  opponent: OpponentOptions
}
