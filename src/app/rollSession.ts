import { shallowRef } from 'vue'
import { applyResourceEvent, applyResourceProgress, resourceSteps } from '../presentation/resources'
import { Game } from '../core'
import type { DieId, GameCommand, GameEvent, GameState, GameOptions } from '../core'

export interface PresentationBatch {
  readonly id: number
  readonly revision: number
  readonly events: readonly GameEvent[]
  readonly state: GameState
}

// Core stays outside deep proxies. Resource events publish at contact; phases
// and roll results publish only when the entire presentation batch settles.
export function createRollSession(options: GameOptions = {}) {
  let matchSequence = 0
  let game = new Game(options)
  let appliedSequence = 0
  let contactSequence = 0
  let contactStep = 0
  const history = shallowRef<readonly GameEvent[]>([])
  const lastEvent = shallowRef<GameEvent | null>(null)
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
    lastEvent,
    history,
    progress(batchId: number, event: GameEvent, step: number) {
      if (pending.value?.id !== batchId || !pending.value.events.includes(event) ||
        event.sequence <= appliedSequence || event.sequence < contactSequence ||
        !Number.isInteger(step) || step < 1 || step > resourceSteps(event) ||
        (event.sequence === contactSequence && step <= contactStep)) return
      contactStep = step
      contactSequence = event.sequence
      state.value = applyResourceProgress(state.value, event, step)
    },
    present(batchId: number, event: GameEvent) {
      if (pending.value?.id !== batchId || event.sequence <= appliedSequence || event.sequence < contactSequence || !pending.value.events.includes(event)) return
      appliedSequence = event.sequence
      state.value = applyResourceEvent(state.value, event)
      lastEvent.value = event
      history.value = [...history.value, event].slice(-120)
    },
    start(options: GameOptions) {
      if (pending.value) return false
      game = new Game({ ...options, gameId: `local-match-${++matchSequence}` })
      state.value = game.state
      appliedSequence = 0
      contactSequence = 0
      contactStep = 0
      lastEvent.value = null
      history.value = []
      error.value = ''
      return true
    },
    dispatch,
    settle,
    resume() {
      if (!pending.value && ['round-complete', 'ended'].includes(game.state.phase.name))
        pending.value = { id: ++batchSequence, revision: game.state.revision, state: game.state, events: [] }
    },
    advanceRound() {
      if (pending.value || state.value !== game.state || game.state.phase.name !== 'round-complete') return false
      return dispatch({ type: 'NextRound', playerId: game.state.firstPlayerId })
    },
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
      game = new Game({ ...options, gameId: `local-match-${++matchSequence}` })
      appliedSequence = 0
      contactSequence = 0
      contactStep = 0
      lastEvent.value = null
      history.value = []
      state.value = game.state
      error.value = ''
    },
  }
}
