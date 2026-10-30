import type { PlayerId } from '../core'
import type { SceneFavorTarget } from '../scene/dieTargets'

export interface FavorInspection {
  target: SceneFavorTarget | null
  pinned: boolean
}

export function inspectFavor(state: FavorInspection, target: SceneFavorTarget, activate: boolean, activePlayer: PlayerId | null): FavorInspection {
  activate = activate && target.playerId === activePlayer
  if (state.pinned && !activate) return state
  return { target, pinned: activate }
}

export function leaveFavor(state: FavorInspection): FavorInspection {
  return state.pinned ? state : { target: null, pinned: false }
}
