import type { FavorId, GameCommand, GameEvent, GameState, PlayerId } from '../core'

export type RoomStage = 'lobby' | 'gods' | 'coin' | 'playing'
export interface RoomPlayer {
  id: PlayerId
  name: string
  connected: boolean
  ready: boolean
  favors: readonly FavorId[]
  blockedFavors: readonly FavorId[]
}
export interface RoomView {
  code: string
  stage: RoomStage
  preparationId: string | null
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
export type ReadinessRequest = { preparationId: string } & (
  | { ready: false }
  | { ready: true; name: string; favors: FavorId[] }
)
export interface ClientEvents {
  'room:create': (ack: Ack<JoinedRoom>) => void
  'room:join': (code: string, ack: Ack<JoinedRoom>) => void
  'room:resume': (session: RoomSession, ack: Ack<JoinedRoom>) => void
  'room:leave': (ack: Ack) => void
  'room:start': (ack: Ack) => void
  'room:ready': (request: ReadinessRequest, ack: Ack) => void
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
