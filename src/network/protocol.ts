import type { FavorId, GameCommand, GameEvent, GameState, PlayerId } from '../core'

export type RoomStage = 'lobby' | 'gods' | 'coin' | 'playing'
export interface RoomPlayer {
  id: PlayerId
  name: string
  connected: boolean
  ready: boolean
  favors: readonly FavorId[]
}
export interface RoomView {
  code: string
  stage: RoomStage
  players: RoomPlayer[]
  firstPlayerId: PlayerId | null
  revision: number
  waiting: boolean
}
export interface MatchUpdate {
  state: GameState
  events: readonly GameEvent[]
}
export interface RoomSession {
  code: string
  token: string
  playerId: PlayerId
}
export type Reply<T = undefined> = { ok: true; data: T } | { ok: false; error: string }
export type Ack<T = undefined> = (reply: Reply<T>) => void
export interface JoinedRoom {
  session: RoomSession
  room: RoomView
  match: MatchUpdate | null
}
export interface ClientEvents {
  'room:create': (ack: Ack<JoinedRoom>) => void
  'room:join': (code: string, ack: Ack<JoinedRoom>) => void
  'room:resume': (session: RoomSession, ack: Ack<JoinedRoom>) => void
  'room:leave': (ack: Ack) => void
  'room:start': (ack: Ack) => void
  'room:ready': (loadout: { name: string; favors: FavorId[] }, ack: Ack) => void
  'room:toss': (ack: Ack) => void
  'room:play': (ack: Ack) => void
  'game:rematch': (gameId: string, ack: Ack) => void
  'game:command': (request: { gameId: string; revision: number; command: GameCommand }, ack: Ack) => void
  'game:presented': (revision: number, gameId: string) => void
  'game:visibility': (visible: boolean) => void
}
export interface ServerEvents {
  'room:update': (room: RoomView) => void
  'room:closed': (message: string) => void
  'game:batch': (update: MatchUpdate) => void
  'game:snapshot': (update: MatchUpdate) => void
}
