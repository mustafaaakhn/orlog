import type { RolledDie } from '../core'
import type { RollRecording } from './rollSimulation'

// One worker belongs to one scene. Termination cancels both WASM work and pending waits.
export function createRollRecorder() {
  let worker: Worker | undefined
  let nextId = 0
  const pending = new Map<number, { resolve: (record: RollRecording) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>()
  let closed = false
  function fail(message: string) {
    pending.forEach(request => { clearTimeout(request.timer); request.reject(new Error(message)) })
    pending.clear()
    worker?.terminate()
    worker = undefined
  }
  return {
    record(dice: readonly RolledDie[], seed: number): Promise<RollRecording> {
      if (closed) return Promise.reject(new Error('Roll recorder closed'))
      if (!worker) {
        worker = new Worker(new URL('./rollWorker.ts', import.meta.url), { type: 'module' })
        worker.onmessage = ({ data }) => {
          const request = pending.get(data.id)
          if (!request) return
          clearTimeout(request.timer)
          pending.delete(data.id)
          if (data.error) request.reject(new Error(data.error))
          else request.resolve(data.record)
        }
        worker.onerror = () => fail('Dice worker failed')
        worker.onmessageerror = () => fail('Dice recording could not be read')
      }
      return new Promise((resolve, reject) => {
        const id = ++nextId
        const timer = setTimeout(() => fail('Dice recording timed out'), 20000)
        pending.set(id, { resolve, reject, timer })
        try { worker!.postMessage({ id, dice, seed }) }
        catch { fail('Dice recording request failed') }
      })
    },
    dispose() { closed = true; fail('Roll recorder closed') },
  }
}
