import { expect, it, vi } from 'vitest'
import { createRollRecorder } from '../rollRecorder'

it('owns a single worker, matches replies, and rejects pending recording on scene disposal', async () => {
  const workers: any[] = []
  class WorkerMock {
    onmessage: any
    postMessage = vi.fn()
    terminate = vi.fn()
    constructor() { workers.push(this) }
  }
  vi.stubGlobal('Worker', WorkerMock)
  const recorder = createRollRecorder()
  try {
    const first = recorder.record([{ dieId: 'player-1/die-1', faceId: 'arrow' }], 2)
    expect(workers).toHaveLength(1)
    const record = { frames: [], impacts: [], dice: [], attempts: 1, controlled: false }
    workers[0].onmessage({ data: { id: 999, record } })
    workers[0].onmessage({ data: { id: 1, record } })
    expect(await first).toBe(record)
    const pending = recorder.record([{ dieId: 'player-1/die-1', faceId: 'shield' }], 3)
    const rejected = expect(pending).rejects.toThrow('closed')
    recorder.dispose()
    await rejected
    expect(workers[0].terminate).toHaveBeenCalledOnce()
    await expect(recorder.record([], 0)).rejects.toThrow('closed')
  } finally { recorder.dispose(); vi.unstubAllGlobals() }
})

it('times out a stalled worker and releases the command wait without retaining its worker', async () => {
  const terminate = vi.fn()
  vi.useFakeTimers()
  vi.stubGlobal('Worker', class { postMessage() {} terminate = terminate })
  const recorder = createRollRecorder()
  try {
    const pending = recorder.record([{ dieId: 'player-1/die-1', faceId: 'arrow' }], 1)
    const rejected = expect(pending).rejects.toThrow('timed out')
    await vi.advanceTimersByTimeAsync(20000)
    await rejected
    expect(terminate).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  } finally { recorder.dispose(); vi.unstubAllGlobals(); vi.useRealTimers() }
})
