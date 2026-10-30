import { shallowRef, watch } from 'vue'
import type { GameEvent, GameState, PlayerId } from '../core'
import type { PresentationBatch } from '../app/rollSession'
import { applyResourceEvent } from './resources'

// An event may carry future faces; only its completed presentation publishes them.
export function applyVisibleDice(state: GameState, event: GameEvent): GameState {
  if (event.type === 'DiceRolled' || event.type === 'DieSelectionChanged' || event.type === 'DiceKept') {
    const player = state.players[event.playerId]
    const dice = player.dice.map(die => {
      if (event.type === 'DiceRolled') {
        const rolled = event.dice.find(value => value.dieId === die.id)
        return rolled ? { ...die, faceId: rolled.faceId } : die
      }
      if (event.type === 'DieSelectionChanged') return die.id === event.dieId ? { ...die, selected: event.selected } : die
      return event.dieIds.includes(die.id) ? { ...die, kept: true, selected: false } : die
    })
    return { ...state, players: { ...state.players, [player.id]: { ...player, dice } } }
  }
  return applyResourceEvent(state, event)
}

export function useVisibleDice(source: () => GameState, batch: () => PresentationBatch | null) {
  const state = shallowRef(source())
  const sequence = shallowRef(source().eventSequence)
  watch([source, () => batch()?.id], () => {
    if (!batch() || batch()!.id !== currentBatch) {
      state.value = source()
      sequence.value = source().eventSequence
    }
    currentBatch = batch()?.id
  })
  let currentBatch = batch()?.id
  return {
    state,
    presented(id: number, event: GameEvent) {
      const pending = batch()
      if (pending?.id !== id || !pending.events.includes(event) || event.sequence <= sequence.value) return
      state.value = event.type === 'RoundStarted' ? pending.state : applyVisibleDice(state.value, event)
      sequence.value = event.sequence
    },
    rolling(playerId: PlayerId) {
      return batch()?.events.filter(event => event.sequence > sequence.value &&
        (event.type === 'DiceRolled' || event.type === 'DiceRecast') && event.playerId === playerId).flatMap(event =>
        event.type === 'DiceRolled' ? event.dice.map(die => die.dieId) : event.type === 'DiceRecast' ? event.dice.map(die => die.id) : []) ?? []
    },
  }
}
