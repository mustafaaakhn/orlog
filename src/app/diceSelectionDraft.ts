import { shallowRef, watch } from 'vue'
import type { DieId, GameCommand, GameState } from '../core'

export const SELECTION_IDLE_MS = 2000

// This is an intention containing IDs only. Faces and physical positions always
// come from the session; core owns the accepted selection and its single event.
export function createDiceSelectionDraft(
  source: () => { state: GameState; enabled: boolean },
  dispatch: (command: GameCommand) => boolean,
) {
  const selectedIds = shallowRef<readonly DieId[] | null>(null)
  let timer: ReturnType<typeof setTimeout> | undefined
  let generation = 0
  function cancel() {
    generation++
    clearTimeout(timer)
    timer = undefined
    selectedIds.value = null
  }
  const stop = watch(() => [source().state, source().enabled] as const, cancel, { flush: 'sync' })
  function toggle(id: DieId) {
    const { state, enabled } = source()
    const phase = state.phase
    if (!enabled || phase.name !== 'roll' || phase.step !== 'selecting-dice') return false
    const player = state.players[phase.activePlayerId]
    const die = player.dice.find(value => value.id === id)
    if (!die || die.kept || die.removed || !die.faceId) return false
    const ids = new Set(selectedIds.value ?? player.dice.filter(value => value.selected).map(value => value.id))
    if (ids.has(id)) ids.delete(id)
    else ids.add(id)
    selectedIds.value = [...ids]
    clearTimeout(timer)
    const current = ++generation
    timer = setTimeout(() => {
      if (current !== generation) return
      const latest = source()
      const selection = selectedIds.value
      cancel()
      if (!latest.enabled || latest.state !== state || !selection) return
      if (player.dice.every(value => value.selected === selection.includes(value.id))) return
      dispatch({ type: 'SetDiceSelection', playerId: player.id, dieIds: selection })
    }, SELECTION_IDLE_MS)
    return true
  }
  return { selectedIds, toggle, cancel, dispose() { cancel(); stop() } }
}
