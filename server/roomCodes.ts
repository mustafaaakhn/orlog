import { randomInt } from 'node:crypto'
import { ROOM_CODE_CAPACITY, ROOM_CODE_LENGTH } from '../src/network/roomCode'

export function createRoomCode(occupied: ReadonlyMap<string, unknown>, start = randomInt(ROOM_CODE_CAPACITY)): string | null {
  // Bound the search even when the entire four-digit namespace is occupied.
  for (let offset = 0; offset < ROOM_CODE_CAPACITY; offset++) {
    const code = String((start + offset) % ROOM_CODE_CAPACITY).padStart(ROOM_CODE_LENGTH, '0')
    if (!occupied.has(code)) return code
  }
  return null
}
