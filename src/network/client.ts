import { computed, shallowRef } from 'vue'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import type { FavorId, GameCommand } from '../core'
import type { ClientEvents, JoinedRoom, MatchUpdate, Reply, RoomSession, RoomView, ServerEvents } from './protocol'

const storageKey = 'orlog-room-v1'
export function createOnlineClient(callbacks: {
  snapshot: (match: MatchUpdate) => void
  batch: (match: MatchUpdate) => void
  closed: () => void
}) {
  const room = shallowRef<RoomView | null>(null)
  const identity = shallowRef<RoomSession | null>(null)
  const connected = shallowRef(false)
  const busy = shallowRef(false)
  const error = shallowRef('')
  const socket: Socket<ServerEvents, ClientEvents> = io({ autoConnect: false, timeout: 8000 })
  let joining = false
  let generation = 0
  let visible = true
  function save(session: RoomSession | null) {
    identity.value = session
    try {
      if (session) sessionStorage.setItem(storageKey, JSON.stringify(session))
      else sessionStorage.removeItem(storageKey)
    } catch { /* Storage may be disabled; the current connection still works. */ }
  }
  function accept(joined: JoinedRoom) {
    save(joined.session)
    room.value = joined.room
    error.value = ''
    socket.emit('game:visibility', visible)
    if (joined.match) callbacks.snapshot(joined.match)
  }
  function clear(message = '') {
    generation++
    save(null)
    room.value = null
    busy.value = false
    error.value = message
    callbacks.closed()
  }
  async function connect() {
    if (socket.connected) return
    await new Promise<void>((resolve, reject) => {
      const finish = () => { socket.off('connect', ok); socket.off('connect_error', fail) }
      const ok = () => { finish(); resolve() }
      const fail = () => { finish(); reject(new Error('Oda sunucusuna ulaşılamadı. Bağlantını kontrol edip yeniden dene.')) }
      socket.once('connect', ok); socket.once('connect_error', fail); socket.connect()
    })
  }
  async function request<T>(send: () => Promise<Reply<T>>) {
    if (busy.value) return
    const current = generation
    busy.value = true
    error.value = ''
    try {
      const reply = await send()
      if (current !== generation) return
      if (!reply.ok) { error.value = reply.error; return }
      return reply.data
    } catch (reason) {
      if (current === generation) error.value = reason instanceof Error && reason.message.includes('sunucusuna') ? reason.message : 'Yanıt alınamadı. Bağlantı yenileniyor…'
      // An ACK can be lost after an accepted command. Recover an authoritative snapshot.
      if (identity.value && current === generation) { socket.disconnect(); socket.connect() }
    } finally { if (current === generation) busy.value = false }
  }
  async function resume() {
    const session = identity.value
    if (!session) return
    const current = generation
    busy.value = true
    try {
      const reply = await socket.timeout(8000).emitWithAck('room:resume', session)
      if (current !== generation) return
      if (reply.ok) accept(reply.data)
      else clear(reply.error)
    } catch { if (current === generation) error.value = 'Odaya yeniden bağlanılıyor…' }
    finally { if (current === generation) busy.value = false }
  }
  socket.on('connect', () => { connected.value = true; if (identity.value && !joining) void resume() })
  socket.on('disconnect', () => { connected.value = false })
  socket.on('connect_error', () => { connected.value = false; if (identity.value) error.value = 'Odaya yeniden bağlanılıyor…' })
  socket.on('room:update', update => {
    if (update.code === identity.value?.code) room.value = update
  })
  socket.on('room:closed', message => { clear(message); socket.disconnect() })
  socket.on('game:batch', match => {
    if (!identity.value) return
    if (room.value?.stage !== 'playing') return
    // Initial game creation uses the same event stream as subsequent commands.
    if (match.state.revision === 0) callbacks.snapshot(match)
    else callbacks.batch(match)
  })
  const bothConnected = computed(() => connected.value && room.value?.players.length === 2 && room.value.players.every(player => player.connected))
  socket.on('game:snapshot', match => {
    if (identity.value && room.value?.stage === 'playing') callbacks.snapshot(match)
  })
  async function enter(code?: string) {
    joining = true
    try {
      const joined = await request<JoinedRoom>(async () => {
        await connect()
        return code === undefined ? socket.timeout(8000).emitWithAck('room:create') : socket.timeout(8000).emitWithAck('room:join', code)
      })
      if (joined) accept(joined)
    } finally { joining = false }
  }
  return {
    room, identity, connected, bothConnected, busy, error,
    create: () => enter(), join: (code: string) => enter(code),
    start: () => request(() => socket.timeout(8000).emitWithAck('room:start')),
    ready: (name: string, favors: FavorId[]) => request(() => socket.timeout(8000).emitWithAck('room:ready', { name, favors })),
    toss: () => request(() => socket.timeout(8000).emitWithAck('room:toss')),
    play: () => request(() => socket.timeout(8000).emitWithAck('room:play')),
    rematch: (gameId: string) => request(() => socket.timeout(8000).emitWithAck('game:rematch', gameId)),
    command(command: GameCommand, revision: number, gameId: string) {
      if (!bothConnected.value || busy.value || room.value?.waiting) return false
      void request(() => socket.timeout(8000).emitWithAck('game:command', { command, revision, gameId }))
      return true
    },
    presented(revision: number, gameId: string) { if (socket.connected && identity.value) socket.emit('game:presented', revision, gameId) },
    visibility(value: boolean) {
      visible = value
      if (socket.connected && identity.value) socket.emit('game:visibility', value)
    },
    async leave() {
      // Never buffer a leave and accidentally send it after joining a different room.
      if (socket.connected && identity.value) {
        try { await socket.timeout(3000).emitWithAck('room:leave') } catch { /* The disconnected room expires server-side. */ }
      }
      clear(); socket.disconnect()
    },
    restore() {
      try {
        const stored = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null') as RoomSession | null
        if (stored && typeof stored.code === 'string' && typeof stored.token === 'string' && ['player-1', 'player-2'].includes(stored.playerId)) {
          identity.value = stored
          socket.connect()
        }
      } catch { save(null) }
    },
    dispose() { generation++; socket.removeAllListeners(); socket.disconnect() },
  }
}
export type OnlineClient = ReturnType<typeof createOnlineClient>
