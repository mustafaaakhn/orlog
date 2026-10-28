import { decideCommand, DIFFICULTIES, observeGame } from '../ai/computer'
import type { Difficulty } from '../ai/computer'
import type { GameCommand, GameState, PlayerId } from '../core'

export interface ComputerTurn {
  state: GameState
  playerId: PlayerId | null
  difficulty: Difficulty
  blocked: boolean
}
// The app updates this on every scene/presentation/visibility/setup change.
// A cancelled timer cannot act on a restarted match or an unsettled snapshot.
export function createComputerDriver(dispatch: (command: GameCommand) => boolean) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let generation = 0
  function cancel() { generation++; clearTimeout(timer); timer = undefined }
  return {
    update(turn: ComputerTurn) {
      cancel()
      const { state, playerId, difficulty } = turn
      if (turn.blocked || !playerId || !('activePlayerId' in state.phase) || state.phase.activePlayerId !== playerId) return
      const ticket = generation, observation = observeGame(state)
      timer = setTimeout(() => {
        timer = undefined
        if (ticket !== generation) return
        const command = decideCommand(observation, playerId, difficulty)
        if (command) dispatch(command)
      }, DIFFICULTIES[difficulty].delayMs)
    },
    dispose: cancel,
  }
}
