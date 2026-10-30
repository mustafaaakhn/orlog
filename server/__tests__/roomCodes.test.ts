import { describe, expect, it } from 'vitest'
import { createRoomCode } from '../roomCodes'
import { isRoomCode } from '../../src/network/roomCode'

describe('four-digit room codes', () => {
  it('preserves leading zeros and probes past collisions with wraparound', () => {
    expect(createRoomCode(new Map(), 7)).toBe('0007')
    expect(createRoomCode(new Map([['9999', true], ['0000', true]]), 9999)).toBe('0001')
  })

  it('returns no code when every code is occupied', () => {
    const full = new Map(Array.from({ length: 10_000 }, (_, i) => [String(i).padStart(4, '0'), true]))
    expect(createRoomCode(full, 9999)).toBeNull()
  })

  it('accepts only four ASCII digits, including zero-prefixed strings', () => {
    expect(isRoomCode('0007')).toBe(true)
    for (const invalid of ['123', '12345', 'ABC123', 'AB12', '１２３４', ' 1234 ', 1234, null]) {
      expect(isRoomCode(invalid)).toBe(false)
    }
  })
})
