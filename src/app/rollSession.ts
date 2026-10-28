import { shallowRef } from 'vue'
import { Game } from '../core'
import type { DieId, GameCommand, GameEvent, GameState } from '../core'

export interface PresentationBatch {
  readonly id: number
  readonly revision: number
  readonly events: readonly GameEvent[]
  readonly state: GameState
}

// Core stays outside Vue's deep proxies. Only settled snapshots are published.
export function createRollSession() {
  let game = new Game()
  let batchSequence = 0
  const state = shallowRef(game.state)
  const pending = shallowRef<PresentationBatch | null>(null)
  const error = shallowRef('')
  function dispatch(command: GameCommand) {
    if (pending.value) return false
    const result = game.dispatch(command)
    if (!result.ok) {
      error.value = result.error.message
      return false
    }
    error.value = ''
    pending.value = {
      id: ++batchSequence,
      revision: result.state.revision,
      state: result.state,
      events: result.events,
    }
    return true
  }
  function settle(batchId: number) {
    if (pending.value?.id !== batchId) return
    state.value = pending.value.state
    pending.value = null
  }
  return {
    state,
    pending,
    error,
    dispatch,
    settle,
    select(dieId: DieId) {
      const phase = state.value.phase
      if (phase.name !== 'roll' || phase.step !== 'selecting-dice') return false
      const die = state.value.players[phase.activePlayerId].dice.find(
        (value) => value.id === dieId,
      )
      if (!die || die.kept) return false
      return dispatch({
        type: 'SetDieSelection',
        playerId: phase.activePlayerId,
        dieId,
        selected: !die.selected,
      })
    },
    recover() {
      // Context loss/unmount discards presentation, never the authoritative result.
      state.value = game.state
      pending.value = null
    },
    restart() {
      if (pending.value) return
      game = new Game()
      state.value = game.state
      error.value = ''
    },
  }
}
