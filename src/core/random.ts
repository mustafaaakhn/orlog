export type RandomSource = () => number

export const mathRandom: RandomSource = () => Math.random()

export function randomIndex(random: RandomSource, size: number): number {
  if (!Number.isSafeInteger(size) || size < 1) {
    throw new RangeError('Random range must be a positive safe integer.')
  }
  const value = random()
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError('Random source must return a finite value in [0, 1).')
  }
  return Math.floor(value * size)
}

// Mulberry32: reproducible local simulations/tests, not a network fairness mechanism.
export function createSeededRandom(seed: number): RandomSource {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffff_ffff) {
    throw new RangeError('Seed must be an unsigned 32-bit integer.')
  }
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = Math.imul(state ^ (state >>> 15), state | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000
  }
}
