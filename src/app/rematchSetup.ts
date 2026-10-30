import type { GameOptions, PlayerId } from '../core'
import type { OpponentOptions } from '../ai/computer'

export interface RematchSetup {
  options: GameOptions
  names: Record<PlayerId, string>
  opponent: OpponentOptions
}
