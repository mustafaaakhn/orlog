export const ROOM_CODE_LENGTH = 4
export const ROOM_CODE_CAPACITY = 10 ** ROOM_CODE_LENGTH

export function isRoomCode(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}$/.test(value)
}
