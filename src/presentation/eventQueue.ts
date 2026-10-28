import type { GameEvent } from '../core'

export function createEventQueue(play: (event: GameEvent) => Promise<void>, apply: (event: GameEvent) => void, after: (event: GameEvent) => Promise<void> = async () => {}) {
  let closed = false
  let paused = false
  let resume: (() => void) | undefined
  async function visible() {
    if (paused && !closed) await new Promise<void>(resolve => { resume = resolve })
  }
  return {
    async play(events: readonly GameEvent[]) {
      for (const event of events) {
        if (paused) await visible()
        if (closed) return
        await play(event)
        if (paused) await visible()
        if (closed) return
        apply(event)
        await after(event)
        if (paused) await visible()
        if (closed) return
      }
    },
    async ready() { if (paused) await visible(); return !closed },
    setPaused(value: boolean) { paused = value; if (!value) { resume?.(); resume = undefined } },
    dispose() { closed = true; resume?.(); resume = undefined },
  }
}
