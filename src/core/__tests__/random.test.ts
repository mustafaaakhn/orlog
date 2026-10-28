import { describe, expect, it } from 'vitest'
import { createSeededRandom, randomIndex } from '../index'

describe('injected randomness', () => {
  it('repeats a simulation for the same seed without shared generator state', () => {
    const first = createSeededRandom(42)
    const second = createSeededRandom(42)
    const different = createSeededRandom(43)
    const values = Array.from({ length: 100 }, () => first())
    expect(values).toEqual(Array.from({ length: 100 }, () => second()))
    expect(values).not.toEqual(Array.from({ length: 100 }, () => different()))
    expect(values.every(value => value >= 0 && value < 1)).toBe(true)
  })

  it.each([-1, 1, NaN, Infinity, -Infinity])('rejects invalid random output %s', value => {
    expect(() => randomIndex(() => value, 6)).toThrow(RangeError)
  })

  it.each([0, -1, 1.5, NaN, Infinity])('rejects invalid random range %s', size => {
    expect(() => randomIndex(() => 0, size)).toThrow(RangeError)
  })

  it.each([-1, 1.5, 0x1_0000_0000, NaN])('rejects invalid seed %s', seed => {
    expect(() => createSeededRandom(seed)).toThrow(RangeError)
  })

  it('accepts both ends of the unsigned 32-bit seed range', () => {
    expect(createSeededRandom(0)()).toBeGreaterThanOrEqual(0)
    expect(createSeededRandom(0xffff_ffff)()).toBeLessThan(1)
  })
})
