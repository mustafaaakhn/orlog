import { randomInt, randomUUID } from 'node:crypto'
import type { Server as HttpServer } from 'node:http'
import type { Http2SecureServer } from 'node:http2'
import { Server } from 'socket.io'
import type { Socket } from 'socket.io'
import { Game, PLAYER_IDS } from '../src/core'
import { isFavorId } from '../src/core/favors/catalog'
import type { GameCommand, GameEvent, GameState, PlayerId } from '../src/core'
import type { Ack, ClientEvents, JoinedRoom, RoomPlayer, RoomSession, RoomStage, RoomView, ServerEvents } from '../src/network/protocol'

interface Seat extends RoomPlayer { token: string; socketId: string | null; disconnectedAt: number | null; visible: boolean }
interface Room {
  code: string
  stage: RoomStage
  seats: Seat[]
  firstPlayerId: PlayerId | null
  game: Game | null
  waiting: boolean
  presented: Set<PlayerId>
  updatedAt: number
  presentationTimer?: ReturnType<typeof setTimeout>
}
interface SocketData { code?: string; playerId?: PlayerId }
type GameSocket = Socket<ClientEvents, ServerEvents, Record<string, never>, SocketData>
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const failure = (error: string) => ({ ok: false as const, error })
const success = () => ({ ok: true as const, data: undefined })

export function attachRoomServer(http: HttpServer | Http2SecureServer, options: { reconnectMs?: number; idleMs?: number; sweepMs?: number; maxRooms?: number; presentationMs?: number } = {}) {
  const io = new Server<ClientEvents, ServerEvents, Record<string, never>, SocketData>(http, {
    maxHttpBufferSize: 16_384,
    serveClient: false,
    // Explicit token + snapshot recovery also covers page reloads and missed ACKs.
  })
  const rooms = new Map<string, Room>()
  const reconnectMs = options.reconnectMs ?? 120_000
  const idleMs = options.idleMs ?? 30 * 60_000
  const channel = (code: string) => `orlog:${code}`
  const connected = (room: Room) => room.seats.length === 2 && room.seats.every(seat => seat.connected)
  function view(room: Room): RoomView {
    return {
      code: room.code, stage: room.stage, firstPlayerId: room.firstPlayerId,
      players: room.seats.map(({ id, name, connected, ready, favors }) => ({ id, name, connected, ready, favors: [...favors] })),
      revision: room.game?.state.revision ?? 0, waiting: room.waiting,
    }
  }
  function publish(room: Room) { io.to(channel(room.code)).emit('room:update', view(room)) }
  function closeRoom(room: Room, message: string) {
    clearTimeout(room.presentationTimer)
    rooms.delete(room.code)
    io.to(channel(room.code)).emit('room:closed', message)
    for (const seat of room.seats) {
      const socket = seat.socketId ? io.sockets.sockets.get(seat.socketId) : null
      if (socket) { socket.leave(channel(room.code)); socket.data = {} }
    }
  }
  function forPlayer(state: GameState, playerId: PlayerId): GameState {
    if (state.phase.name !== 'favor') return state
    const other = playerId === 'player-1' ? 'player-2' : 'player-1'
    return { ...state, players: { ...state.players, [other]: { ...state.players[other], favorChoice: { status: 'pending' } } } }
  }
  function armPresentation(room: Room) {
    if (!room.game) return
    clearTimeout(room.presentationTimer)
    const revision = room.game.state.revision
    // A frozen/crashed renderer must not own the room forever. Normal visible
    // animations retain their receipts; hidden peers are already acknowledged.
    room.presentationTimer = setTimeout(() => {
      if (!room.waiting || room.game?.state.revision !== revision || rooms.get(room.code) !== room) return
      for (const seat of room.seats) {
        if (room.presented.has(seat.id)) continue
        if (seat.socketId) io.to(seat.socketId).emit('game:snapshot', { state: forPlayer(room.game.state, seat.id), events: [] })
        room.presented.add(seat.id)
      }
      advance(room)
    }, options.presentationMs ?? 120_000)
    room.presentationTimer.unref()
  }
  function batch(room: Room, events: readonly GameEvent[]) {
    if (!room.game) return
    clearTimeout(room.presentationTimer)
    room.waiting = true
    room.presented = new Set(room.seats.filter(seat => seat.connected && !seat.visible).map(seat => seat.id))
    room.updatedAt = Date.now()
    publish(room)
    for (const seat of room.seats) {
      if (!seat.socketId) continue
      io.to(seat.socketId).emit('game:batch', {
        state: forPlayer(room.game.state, seat.id),
        events: events.filter(event => event.type !== 'FavorChosen' || event.playerId === seat.id || room.game!.state.phase.name !== 'favor'),
      })
    }
    armPresentation(room)
    queueMicrotask(() => advance(room))
  }
  function apply(room: Room, command: GameCommand) {
    const result = room.game!.dispatch(command)
    if (!result.ok) return failure(result.error.message)
    batch(room, result.events)
    return success()
  }
  function advance(room: Room) {
    if (rooms.get(room.code) !== room || !room.waiting || !connected(room) || room.presented.size !== 2 || !room.game) return
    clearTimeout(room.presentationTimer)
    const state = room.game.state
    const phase = state.phase
    // The server owns automatic commands; clients cannot advance the other player.
    if (phase.name === 'roll' && phase.step === 'selecting-dice' && state.players[phase.activePlayerId].rollsUsed === 3)
      apply(room, { type: 'ConfirmRoll', playerId: phase.activePlayerId })
    else if (phase.name === 'resolution') apply(room, { type: 'ResolveRound', playerId: state.firstPlayerId })
    else if (phase.name === 'round-complete') apply(room, { type: 'NextRound', playerId: state.firstPlayerId })
    else { room.waiting = false; publish(room) }
  }
  function membership(socket: GameSocket) {
    const room = socket.data.code ? rooms.get(socket.data.code) : undefined
    const seat = room?.seats.find(seat => seat.id === socket.data.playerId && seat.socketId === socket.id)
    return room && seat ? { room, seat } : null
  }
  function bind(socket: GameSocket, room: Room, seat: Seat): JoinedRoom {
    if (seat.socketId && seat.socketId !== socket.id) {
      const previous = io.sockets.sockets.get(seat.socketId)
      if (previous) { previous.data = {}; previous.leave(channel(room.code)); previous.emit('room:closed', 'Bu oda başka bir sekmede açıldı.'); previous.disconnect(true) }
    }
    seat.connected = true
    seat.visible = true
    seat.socketId = socket.id
    seat.disconnectedAt = null
    socket.data = { code: room.code, playerId: seat.id }
    socket.join(channel(room.code))
    room.updatedAt = Date.now()
    if (room.game) {
      if (!room.waiting) {
        room.waiting = true
        room.presented = new Set(room.seats.filter(s => s.id !== seat.id && s.connected).map(s => s.id))
      }
      room.presented.delete(seat.id)
      armPresentation(room)
    }
    publish(room)
    return {
      session: { code: room.code, token: seat.token, playerId: seat.id }, room: view(room),
      match: room.game ? { state: forPlayer(room.game.state, seat.id), events: [] } : null,
    }
  }
  io.on('connection', socket => {
    let windowStart = Date.now(), messages = 0
    socket.use((_packet, next) => {
      if (Date.now() - windowStart > 10_000) { messages = 0; windowStart = Date.now() }
      if (++messages > 150) { socket.disconnect(true); return }
      next()
    })
    function action(handler: (room: Room, seat: Seat) => ReturnType<typeof success> | ReturnType<typeof failure>) {
      return (ack: Ack) => {
        if (typeof ack !== 'function') return
        const member = membership(socket)
        if (!member) { ack(failure('Elinde açık bir oda yok.')); return }
        member.room.updatedAt = Date.now()
        ack(handler(member.room, member.seat))
      }
    }
    socket.on('room:create', ack => {
      if (typeof ack !== 'function') return
      if (membership(socket)) { ack(failure('Önce mevcut odadan ayrıl.')); return }
      if (rooms.size >= (options.maxRooms ?? 500)) { ack(failure('Odalar şu an dolu. Biraz sonra yeniden dene.')); return }
      let code: string
      do { code = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join('') } while (rooms.has(code))
      const room: Room = { code, stage: 'lobby', seats: [], firstPlayerId: null, game: null, waiting: false, presented: new Set(), updatedAt: Date.now() }
      const seat: Seat = { id: 'player-1', token: randomUUID(), name: 'Oyuncu I', connected: true, ready: false, favors: [], socketId: null, disconnectedAt: null, visible: true }
      room.seats.push(seat)
      rooms.set(code, room)
      ack({ ok: true, data: bind(socket, room, seat) })
    })
    socket.on('room:join', (code, ack) => {
      if (typeof ack !== 'function') return
      if (membership(socket)) { ack(failure('Önce mevcut odadan ayrıl.')); return }
      const room = typeof code === 'string' && /^[A-Z0-9]{6}$/.test(code.trim().toUpperCase()) ? rooms.get(code.trim().toUpperCase()) : undefined
      if (!room) { ack(failure('Bu kodla bir oda bulunamadı.')); return }
      if (room.stage !== 'lobby' || room.seats.length >= 2) { ack(failure('Bu oda dolu veya oyun başlamış.')); return }
      const seat: Seat = { id: 'player-2', token: randomUUID(), name: 'Oyuncu II', connected: true, ready: false, favors: [], socketId: null, disconnectedAt: null, visible: true }
      room.seats.push(seat)
      ack({ ok: true, data: bind(socket, room, seat) })
    })
    socket.on('room:resume', (session: RoomSession, ack) => {
      if (typeof ack !== 'function') return
      const room = session && typeof session.code === 'string' ? rooms.get(session.code) : undefined
      const seat = room?.seats.find(seat => seat.token === session.token && seat.id === session.playerId)
      const current = membership(socket)
      if (!room || !seat || (seat.disconnectedAt !== null && Date.now() - seat.disconnectedAt > reconnectMs)) { ack(failure('Oda oturumu sona erdi. Yeni bir oda kur veya katıl.')); return }
      if (current && current.room !== room) { ack(failure('Önce mevcut odadan ayrıl.')); return }
      ack({ ok: true, data: bind(socket, room, seat) })
    })
    socket.on('room:leave', action(room => { closeRoom(room, 'Oyunculardan biri odadan ayrıldı. Yeni bir oda kurabilirsiniz.'); return success() }))
    socket.on('room:start', action((room, seat) => {
      if (seat.id !== 'player-1') return failure('Oyunu yalnız oda kurucusu başlatabilir.')
      if (room.stage !== 'lobby' || !connected(room)) return failure('Başlamak için iki oyuncu da bağlı olmalı.')
      room.stage = 'gods'; publish(room); return success()
    }))
    socket.on('room:ready', (loadout, ack) => action((room, seat) => {
      if (room.stage !== 'gods' || seat.ready) return failure('Tanrı seçimi şu an değiştirilemez.')
      if (!loadout || typeof loadout.name !== 'string' || !loadout.name.trim() || loadout.name.trim().length > 28 ||
        !Array.isArray(loadout.favors) || loadout.favors.length !== 3 || new Set(loadout.favors).size !== 3 || !loadout.favors.every(isFavorId)) return failure('Bir oyuncu adı ve üç farklı tanrı seç.')
      seat.name = loadout.name.trim(); seat.favors = [...loadout.favors]; seat.ready = true
      if (room.seats.every(seat => seat.ready)) room.stage = 'coin'
      publish(room); return success()
    })(ack))
    socket.on('room:toss', action((room, seat) => {
      if (seat.id !== 'player-1' || room.stage !== 'coin' || room.firstPlayerId || !connected(room)) return failure('Yazı turayı oda kurucusu bir kez atabilir.')
      room.firstPlayerId = PLAYER_IDS[randomInt(2)]!
      publish(room); return success()
    }))
    socket.on('room:play', action((room, seat) => {
      if (seat.id !== 'player-1' || room.stage !== 'coin' || !room.firstPlayerId || !connected(room)) return failure('Masayı açmak için yazı turayı ve iki oyuncuyu bekle.')
      room.game = new Game({
        gameId: randomUUID(), firstPlayerId: room.firstPlayerId,
        random: () => randomInt(0x1_0000_0000) / 0x1_0000_0000,
        loadouts: Object.fromEntries(room.seats.map(s => [s.id, s.favors])),
      })
      room.stage = 'playing'; batch(room, []); return success()
    }))
    socket.on('game:command', (request, ack) => action((room, seat) => {
      if (!room.game || room.stage !== 'playing' || !connected(room) || room.waiting) return failure('Diğer oyuncu ve masa bekleniyor.')
      if (!request || request.revision !== room.game.state.revision) return failure('Maç durumu yenileniyor. Hamleni yeniden dene.')
      const command = request.command
      if (!command || command.playerId !== seat.id || !['RollDice', 'SetDieSelection', 'ConfirmRoll', 'ChooseFavor', 'SkipFavor'].includes(command.type)) return failure('Yalnız kendi hamleni yapabilirsin.')
      try { return apply(room, command) } catch { return failure('Geçersiz oyun komutu.') }
    })(ack))
    socket.on('game:presented', revision => {
      const member = membership(socket)
      if (!member?.room.game || member.room.game.state.revision !== revision) return
      member.room.presented.add(member.seat.id)
      advance(member.room)
    })
    socket.on('game:visibility', visible => {
      const member = membership(socket)
      if (!member || typeof visible !== 'boolean') return
      member.seat.visible = visible
      if (!visible && member.room.waiting) {
        member.room.presented.add(member.seat.id)
        advance(member.room)
      }
    })
    socket.on('disconnect', () => {
      const member = membership(socket)
      if (!member) return
      member.seat.connected = false; member.seat.socketId = null; member.seat.disconnectedAt = Date.now()
      publish(member.room)
    })
  })
  const sweep = setInterval(() => {
    const now = Date.now()
    for (const room of rooms.values()) {
      if (room.seats.some(seat => seat.disconnectedAt !== null && now - seat.disconnectedAt > reconnectMs)) closeRoom(room, 'Bağlantı süresi doldu. Yeni bir oda kurabilirsiniz.')
      else if (now - room.updatedAt > idleMs) closeRoom(room, 'Oda uzun süre kullanılmadığı için kapandı.')
    }
  }, options.sweepMs ?? 5000)
  sweep.unref()
  function clearTimers() { clearInterval(sweep); rooms.forEach(room => clearTimeout(room.presentationTimer)); rooms.clear() }
  http.once('close', clearTimers)
  return { io, close: async () => { clearTimers(); await io.close() } }
}
