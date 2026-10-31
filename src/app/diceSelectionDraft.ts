import { shallowRef, watch } from 'vue'
import type { DieId, GameCommand, GameState } from '../core'

export const SELECTION_IDLE_MS = 2000
interface SelectionSource {
  state: GameState
  enabled: boolean
  // Lifecycle interruptions cancel even our own accepted/in-flight operation.
  interrupted?: boolean
}
interface SelectionOperation {
  state: GameState
  ids: readonly DieId[]
  confirm: boolean
  stage: 'selection-request' | 'selection-present' | 'confirm-request'
  resolve: (accepted: boolean) => void
  result: Promise<boolean>
}

// An intention contains IDs only. Core owns accepted selections; a confirmation
// waits for both the command receipt and its settled presentation before sending.
export function createDiceSelectionDraft(
  source: () => SelectionSource,
  dispatch: (command: GameCommand) => boolean | Promise<boolean>,
) {
  const selectedIds = shallowRef<readonly DieId[] | null>(null)
  const applying = shallowRef(false)
  const confirming = shallowRef(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  let generation = 0
  let operation: SelectionOperation | null = null
  function clearTimer() {
    generation++
    clearTimeout(timer)
    timer = undefined
  }
  function finish(accepted: boolean) {
    const previous = operation
    operation = null
    applying.value = false
    confirming.value = false
    previous?.resolve(accepted)
  }
  function cancel() {
    clearTimer()
    selectedIds.value = null
    finish(false)
  }
  function sameTurn(before: GameState, after: GameState) {
    const phase = before.phase, next = after.phase
    if (phase.name !== 'roll' || next.name !== 'roll' || next.step !== 'selecting-dice' ||
      before.gameId !== after.gameId || before.round !== after.round || phase.activePlayerId !== next.activePlayerId) return false
    const player = before.players[phase.activePlayerId], latest = after.players[next.activePlayerId]
    return player.rollsUsed === latest.rollsUsed && player.dice.length === latest.dice.length && player.dice.every((die, index) => {
      const value = latest.dice[index]!
      return die.id === value.id && die.faceId === value.faceId && die.kept === value.kept && die.removed === value.removed
    })
  }
  function send(job: SelectionOperation, command: GameCommand, done: (accepted: boolean) => void) {
    const complete = (accepted: boolean) => { if (operation === job) done(accepted) }
    try {
      const result = dispatch(command)
      if (typeof result === 'boolean') complete(result)
      else void result.then(complete, () => complete(false))
    } catch { complete(false) }
  }
  function sendConfirm(job: SelectionOperation) {
    const latest = source()
    if (!latest.enabled || latest.interrupted || !sameTurn(job.state, latest.state)) { cancel(); return }
    job.stage = 'confirm-request'
    const phase = latest.state.phase
    if (phase.name !== 'roll') { cancel(); return }
    send(job, { type: 'ConfirmRoll', playerId: phase.activePlayerId }, finish)
  }
  function pump() {
    const latest = source()
    if (!operation) { cancel(); return }
    const job = operation
    if (latest.interrupted || !sameTurn(job.state, latest.state)) { cancel(); return }
    if (job.stage !== 'selection-present') return
    const expected = job.state.revision + 1
    if (latest.state.revision > expected || latest.state.revision < job.state.revision) { cancel(); return }
    if (latest.state.revision !== expected) return
    const phase = latest.state.phase
    if (phase.name !== 'roll' || !latest.state.players[phase.activePlayerId].dice.every(die => die.selected === job.ids.includes(die.id))) { cancel(); return }
    if (!latest.enabled) return // Includes the other online seat's presentation receipt.
    if (job.confirm) sendConfirm(job)
    else finish(true)
  }
  const stop = watch(() => {
    const latest = source()
    return [latest.state, latest.enabled, latest.interrupted] as const
  }, pump, { flush: 'sync' })
  function apply(confirm: boolean): Promise<boolean> {
    if (operation) {
      const job = operation
      if (confirm && !source().interrupted) { job.confirm = true; confirming.value = true; pump() }
      return job.result
    }
    const { state, enabled, interrupted } = source(), phase = state.phase
    if (!enabled || interrupted || phase.name !== 'roll' || phase.step !== 'selecting-dice' || state.players[phase.activePlayerId].rollsUsed >= 3) return Promise.resolve(false)
    const player = state.players[phase.activePlayerId]
    const ids = selectedIds.value ?? player.dice.filter(die => die.selected).map(die => die.id)
    clearTimer()
    selectedIds.value = null
    let resolve!: SelectionOperation['resolve']
    const result = new Promise<boolean>(done => { resolve = done })
    const job: SelectionOperation = { state, ids, confirm, stage: 'selection-request', resolve, result }
    operation = job
    applying.value = true
    confirming.value = confirm
    if (player.dice.every(die => die.selected === ids.includes(die.id))) {
      if (confirm) sendConfirm(job)
      else finish(true)
    } else send(job, { type: 'SetDiceSelection', playerId: player.id, dieIds: ids }, accepted => {
      if (!accepted) { cancel(); return }
      job.stage = 'selection-present'
      pump()
    })
    return result
  }
  function toggle(id: DieId) {
    const { state, enabled, interrupted } = source(), phase = state.phase
    if (operation || !enabled || interrupted || phase.name !== 'roll' || phase.step !== 'selecting-dice') return false
    const player = state.players[phase.activePlayerId]
    const die = player.dice.find(value => value.id === id)
    if (player.rollsUsed >= 3 || !die || die.kept || die.removed || !die.faceId) return false
    const ids = new Set(selectedIds.value ?? player.dice.filter(value => value.selected).map(value => value.id))
    if (ids.has(id)) ids.delete(id)
    else ids.add(id)
    selectedIds.value = [...ids]
    clearTimer()
    const current = generation
    timer = setTimeout(() => { if (current === generation) void apply(false) }, SELECTION_IDLE_MS)
    return true
  }
  return { selectedIds, applying, confirming, toggle, confirm: () => apply(true), cancel, dispose() { cancel(); stop() } }
}
