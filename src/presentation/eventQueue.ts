import type { GameEvent } from '../core'

export function createEventQueue(play: (event: GameEvent) => Promise<void>, apply: (event: GameEvent) => void) {
  let closed = false
  return {
    async play(events: readonly GameEvent[]) {
      for (const event of events) {
        if (closed) return
        await play(event)
        if (closed) return
        apply(event)
      }
    },
    dispose() { closed = true },
  }
}
