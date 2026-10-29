import type { SceneFavorTarget } from '../scene/dieTargets'

export interface FavorInspection {
  target: SceneFavorTarget | null
  pinned: boolean
}

export function inspectFavor(state: FavorInspection, target: SceneFavorTarget, activate: boolean): FavorInspection {
  if (state.pinned && !activate) return state
  return { target, pinned: activate }
}

export function leaveFavor(state: FavorInspection): FavorInspection {
  return state.pinned ? state : { target: null, pinned: false }
}
