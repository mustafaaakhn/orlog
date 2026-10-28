import { recordRoll } from './rollSimulation'
import type { RolledDie } from '../core'

self.onmessage = async ({ data }: MessageEvent<{ id: number; dice: RolledDie[]; seed: number }>) => {
  try {
    const record = await recordRoll(data.dice, data.seed)
    self.postMessage({ id: data.id, record })
  } catch (error) {
    self.postMessage({ id: data.id, error: error instanceof Error ? error.message : 'Roll recording failed' })
  }
}
