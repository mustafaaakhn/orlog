import { createServer } from 'node:http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import { attachRoomServer } from '../rooms'
import { DEFAULT_FAVORS } from '../../src/core'
import type { FavorId, GameCommand, PlayerId } from '../../src/core'
import type { ClientEvents, JoinedRoom, MatchUpdate, Reply, RoomView, ServerEvents } from '../../src/network/protocol'

const fixedDice = vi.hoisted(() => ({ value: false }))
vi.mock('node:crypto', async importOriginal => {
  const actual = await importOriginal<typeof import('node:crypto')>()
  return { ...actual, randomInt: (max: number) => fixedDice.value && max === 0x1_0000_0000 ? 0 : actual.randomInt(max) }
})

type Peer = Socket<ServerEvents, ClientEvents>
function data<T>(reply: Reply<T>): T {
  if (!reply.ok) throw new Error(reply.error)
  return reply.data
}
const disposers: (() => Promise<void>)[] = []
afterEach(async () => { fixedDice.value = false; for (const dispose of disposers.splice(0)) await dispose() })

async function setup(options: Parameters<typeof attachRoomServer>[1] = {}) {
  const http = createServer()
  const server = attachRoomServer(http, options)
  await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve))
  const address = http.address()
  if (!address || typeof address === 'string') throw new Error('Missing port')
  const peers: Peer[] = []
  const views = new Map<Peer, RoomView>()
  const matches = new Map<Peer, MatchUpdate>()
  const closed = new Map<Peer, string>()
  disposers.push(async () => { peers.forEach(peer => peer.disconnect()); await server.close() })
  async function peer() {
    const socket: Peer = io(`http://127.0.0.1:${(address as { port: number }).port}`, { autoConnect: false, reconnection: false, forceNew: true })
    peers.push(socket)
    socket.on('room:update', view => views.set(socket, view))
    socket.on('room:closed', message => closed.set(socket, message))
    socket.on('game:batch', batch => matches.set(socket, batch))
    await new Promise<void>((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); socket.connect() })
    return socket
  }
  const host = await peer(), guest = await peer()
  const joined = data<JoinedRoom>(await host.timeout(2000).emitWithAck('room:create'))
  const guestJoined = data<JoinedRoom>(await guest.timeout(2000).emitWithAck('room:join', joined.room.code))
  let initialPreparationId: string | null = null
  async function play(hostFavors: FavorId[] = [...DEFAULT_FAVORS], guestFavors: FavorId[] = [...DEFAULT_FAVORS]) {
    data(await host.emitWithAck('room:start'))
    initialPreparationId = views.get(host)!.preparationId
    data(await host.emitWithAck('room:ready', { preparationId: views.get(host)!.preparationId!, ready: true, name: 'Kurucu', favors: hostFavors }))
    data(await guest.emitWithAck('room:ready', { preparationId: views.get(host)!.preparationId!, ready: true, name: 'Misafir', favors: guestFavors }))
    data(await host.emitWithAck('room:toss'))
    data(await host.emitWithAck('room:play'))
    await vi.waitFor(() => expect(matches.has(guest)).toBe(true))
    await settle()
  }
  async function settle() {
    for (let index = 0; index < 5; index++) {
      const revision = views.get(host)!.revision
      host.emit('game:presented', revision, matches.get(host)!.state.gameId); guest.emit('game:presented', revision, matches.get(host)!.state.gameId)
      await vi.waitFor(() => expect(!views.get(host)!.waiting || views.get(host)!.revision !== revision).toBe(true))
      if (!views.get(host)!.waiting) return
    }
    throw new Error('Presentation did not unlock')
  }
  async function command(command: GameCommand) {
    const actor = command.playerId === 'player-1' ? host : guest
    const reply = await actor.emitWithAck('game:command', { gameId: matches.get(host)!.state.gameId, revision: views.get(host)!.revision, command })
    data(reply)
    await settle()
  }
  async function finish() {
    for (let step = 0; step < 150; step++) {
      const phase = matches.get(host)!.state.phase
      if (phase.name === 'ended') return
      if (phase.name === 'roll') await command({ type: phase.step === 'awaiting-roll' ? 'RollDice' : 'ConfirmRoll', playerId: phase.activePlayerId })
      else if (phase.name === 'favor') await command({ type: 'SkipFavor', playerId: phase.activePlayerId })
      else throw new Error('Expected an unlocked player phase')
    }
    throw new Error('Expected a completed match')
  }
  return { host, guest, peer, joined, guestJoined, views, matches, closed, play, settle, command, finish, get initialPreparationId() { return initialPreparationId } }
}

describe('two-player Socket.IO rooms', () => {
  it('lets either seat retract readiness, retains choices and rejects old preparation contexts', async () => {
    for (const own of ['host', 'guest'] as const) {
      const h = await setup()
      data(await h.host.emitWithAck('room:start'))
      const actor = h[own], other = own === 'host' ? h.guest : h.host
      const id = own === 'host' ? 'player-1' : 'player-2'
      const preparationId = h.views.get(h.host)!.preparationId!
      const request = { preparationId, ready: true as const, name: 'Eivor', favors: [...DEFAULT_FAVORS] }
      data(await actor.emitWithAck('room:ready', request))
      data(await actor.emitWithAck('room:ready', request)) // Idempotent replay.
      data(await actor.emitWithAck('room:ready', { preparationId, ready: false }))
      data(await actor.emitWithAck('room:ready', { preparationId, ready: false }))
      await vi.waitFor(() => expect(h.views.get(other)!.players.find(p => p.id === id)).toMatchObject({ ready: false, name: 'Eivor', favors: DEFAULT_FAVORS }))
      expect((await actor.emitWithAck('room:ready', { preparationId: 'old-preparation', ready: false })).ok).toBe(false)
      const changed = ['baldrs-invulnerability', 'bragis-verve', 'skadis-hunt'] as const
      data(await actor.emitWithAck('room:ready', { ...request, favors: [...changed] }))
      actor.disconnect()
      await vi.waitFor(() => expect(h.views.get(other)!.players.find(p => p.id === id)?.connected).toBe(false))
      const resumed = await h.peer()
      const joined = data(await resumed.emitWithAck('room:resume', own === 'host' ? h.joined.session : h.guestJoined.session))
      expect(joined.room.players.find(p => p.id === id)).toMatchObject({ ready: true, favors: changed })
      data(await resumed.emitWithAck('room:ready', { preparationId, ready: false }))
      expect(h.views.get(other)!.stage).toBe('gods')
    }
  })
  it('serializes unready-before-ready and rejects a late withdrawal once both are ready', async () => {
    const h = await setup()
    data(await h.host.emitWithAck('room:start'))
    const preparationId = h.views.get(h.host)!.preparationId!
    const hostReady = { preparationId, ready: true as const, name: 'Host', favors: [...DEFAULT_FAVORS] }
    data(await h.host.emitWithAck('room:ready', hostReady))
    // Awaited acceptance fixes the server order; no timing-based race assertions.
    data(await h.host.emitWithAck('room:ready', { preparationId, ready: false }))
    data(await h.guest.emitWithAck('room:ready', { ...hostReady, name: 'Guest' }))
    expect(h.views.get(h.guest)!.stage).toBe('gods')
    expect(h.views.get(h.guest)!.players.map(p => p.ready)).toEqual([false, true])
    data(await h.host.emitWithAck('room:ready', hostReady))
    expect(h.views.get(h.host)!.stage).toBe('coin')
    expect((await h.guest.emitWithAck('room:ready', { preparationId, ready: false })).ok).toBe(false)
    expect(h.views.get(h.host)!.stage).toBe('coin')
  })
  it('resolves simultaneous second-ready and withdrawal as one server-ordered outcome', async () => {
    const h = await setup()
    data(await h.host.emitWithAck('room:start'))
    const preparationId = h.views.get(h.host)!.preparationId!
    const ready = { preparationId, ready: true as const, name: 'Eivor', favors: [...DEFAULT_FAVORS] }
    data(await h.host.emitWithAck('room:ready', ready))
    const [withdrawal, secondReady] = await Promise.all([
      h.host.emitWithAck('room:ready', { preparationId, ready: false }),
      h.guest.emitWithAck('room:ready', ready),
    ])
    expect(secondReady.ok).toBe(true)
    const authoritative = data(await h.host.emitWithAck('room:resume', h.joined.session)).room
    expect(authoritative.stage).toBe(withdrawal.ok ? 'gods' : 'coin')
    expect(authoritative.players.map(p => p.ready)).toEqual([!withdrawal.ok, true])
    const other = data(await h.guest.emitWithAck('room:resume', h.guestJoined.session)).room
    expect(other).toEqual(authoritative)
  })
  it('requires membership and a current gods stage, and derives the affected seat from the socket', async () => {
    const h = await setup(), outsider = await h.peer()
    expect((await h.host.emitWithAck('room:ready', { preparationId: 'none', ready: false })).ok).toBe(false)
    data(await h.host.emitWithAck('room:start'))
    const preparationId = h.views.get(h.host)!.preparationId!
    expect((await outsider.emitWithAck('room:ready', { preparationId, ready: false })).ok).toBe(false)
    data(await h.guest.emitWithAck('room:ready', { preparationId, ready: true, name: 'Guest', favors: [...DEFAULT_FAVORS] }))
    const spoofed = { preparationId, ready: false as const, playerId: 'player-2' }
    data(await h.host.emitWithAck('room:ready', spoofed))
    expect(h.views.get(h.host)!.players.map(p => p.ready)).toEqual([false, true])
  })
  it('publishes a batch selection as one shared revision/event and leaves identical selections idle', async () => {
    const h = await setup()
    await h.play()
    const first = h.matches.get(h.host)!.state.firstPlayerId
    await h.command({ type: 'RollDice', playerId: first })
    const before = h.matches.get(h.host)!.state
    const dieIds = before.players[first].dice.slice(0, 5).map(d => d.id)
    await h.command({ type: 'SetDiceSelection', playerId: first, dieIds })
    const host = h.matches.get(h.host)!, guest = h.matches.get(h.guest)!
    expect(host.state.revision).toBe(before.revision + 1)
    expect(host.events.map(e => e.type)).toEqual(['DiceSelectionChanged'])
    expect(guest.events).toEqual(host.events)
    expect(host.state.phase).toEqual(before.phase)
    expect(host.state.players[first].dice.filter(d => d.selected).map(d => d.id)).toEqual(dieIds)
    await h.command({ type: 'SetDiceSelection', playerId: first, dieIds: [...dieIds].reverse() })
    expect(h.views.get(h.host)!.revision).toBe(host.state.revision)
    expect(h.views.get(h.host)!.waiting).toBe(false)
    await h.command({ type: 'SetDiceSelection', playerId: first, dieIds: [] })
    expect(h.matches.get(h.host)!.events).toHaveLength(1)
    expect(h.matches.get(h.host)!.state.players[first].dice.every(d => !d.selected && !d.kept)).toBe(true)
  })
  it('validates batch ownership/phase/revision and never repeats a selection or confirmation packet', async () => {
    const h = await setup()
    await h.play()
    const first = h.matches.get(h.host)!.state.firstPlayerId
    const actor = first === 'player-1' ? h.host : h.guest, other = first === 'player-1' ? h.guest : h.host
    await h.command({ type: 'RollDice', playerId: first })
    const before = h.matches.get(h.host)!.state
    const selection = { type: 'SetDiceSelection' as const, playerId: first, dieIds: before.players[first].dice.slice(0, 5).map(d => d.id) }
    const request = { command: selection, revision: before.revision, gameId: before.gameId }
    expect((await other.emitWithAck('game:command', request)).ok).toBe(false)
    expect((await actor.emitWithAck('game:command', { ...request, gameId: 'old-match' })).ok).toBe(false)
    expect((await actor.emitWithAck('game:command', { ...request, revision: before.revision - 1 })).ok).toBe(false)
    const selections: MatchUpdate[] = [], confirmations: MatchUpdate[] = []
    h.host.on('game:batch', match => {
      if (match.events.some(event => event.type === 'DiceSelectionChanged')) selections.push(match)
      if (match.events.some(event => event.type === 'DiceKept')) confirmations.push(match)
    })
    const replies = await Promise.all([actor.emitWithAck('game:command', request), actor.emitWithAck('game:command', request)])
    expect(replies.filter(reply => reply.ok)).toHaveLength(1)
    // A confirm cannot overtake the accepted selection's presentation.
    expect((await actor.emitWithAck('game:command', { ...request, revision: before.revision + 1,
      command: { type: 'ConfirmRoll', playerId: first } })).ok).toBe(false)
    await h.settle()
    expect((await actor.emitWithAck('game:command', request)).ok).toBe(false)
    const confirm = { gameId: before.gameId, revision: before.revision + 1, command: { type: 'ConfirmRoll' as const, playerId: first } }
    const confirmed = await Promise.all([actor.emitWithAck('game:command', confirm), actor.emitWithAck('game:command', confirm)])
    expect(confirmed.filter(reply => reply.ok)).toHaveLength(1)
    await h.settle()
    expect((await actor.emitWithAck('game:command', confirm)).ok).toBe(false)
    expect(selections).toHaveLength(1)
    expect(confirmations).toHaveLength(1)
    const after = h.matches.get(h.host)!.state
    expect(after.revision).toBe(before.revision + 2)
    expect(after.players[first].dice.filter(die => die.kept).map(die => die.id)).toEqual(selection.dieIds)
    expect(h.matches.get(h.guest)!.state).toEqual(after)
    const next = after.phase
    if (next.name !== 'roll') throw new Error('Expected second seat roll')
    expect((await other.emitWithAck('game:command', { gameId: after.gameId, revision: after.revision,
      command: { type: 'SetDiceSelection', playerId: next.activePlayerId, dieIds: [] } })).ok).toBe(false)
  })
  it('starts exactly one fresh match in the same room, preserving seats and rejecting packets from the previous match', async () => {
    fixedDice.value = true
    const h = await setup()
    const changed: FavorId[] = ['baldrs-invulnerability', 'bragis-verve', 'skadis-hunt']
    await h.play([...DEFAULT_FAVORS], changed)
    const previousId = h.matches.get(h.host)!.state.gameId
    const previousFirst = h.matches.get(h.host)!.state.firstPlayerId
    const stranger = await h.peer()
    expect((await stranger.emitWithAck('game:rematch', previousId)).ok).toBe(false)
    expect((await h.guest.emitWithAck('game:rematch', previousId)).ok).toBe(false)
    for (let step = 0; step < 100; step++) {
      const phase = h.matches.get(h.host)!.state.phase
      if (phase.name === 'ended') break
      if (phase.name === 'roll') await h.command({ type: phase.step === 'awaiting-roll' ? 'RollDice' : 'ConfirmRoll', playerId: phase.activePlayerId })
      else if (phase.name === 'favor') await h.command({ type: 'SkipFavor', playerId: phase.activePlayerId })
      else throw new Error('Expected an unlocked player phase')
    }
    expect(h.matches.get(h.host)!.state.phase.name).toBe('ended')
    const replies = await Promise.all([
      h.guest.emitWithAck('game:rematch', previousId),
      h.host.emitWithAck('game:rematch', previousId),
    ])
    expect(replies.filter(reply => reply.ok)).toHaveLength(1)
    await vi.waitFor(() => expect(h.views.get(h.guest)!.stage).toBe('gods'))
    expect(h.matches.get(h.host)!.state.gameId).toBe(previousId)
    expect(h.views.get(h.host)!.players.every(player => !player.ready && player.favors.length === 0 && player.blockedFavors.length === 3)).toBe(true)
    const editing = data(await h.host.emitWithAck('room:resume', h.joined.session))
    expect(editing.match).toBeNull()
    expect(editing.room).toMatchObject({ stage: 'gods', waiting: false, code: h.joined.room.code })
    expect(editing.room.preparationId).not.toBe(h.initialPreparationId)
    expect((await h.host.emitWithAck('room:ready', { preparationId: h.initialPreparationId!, ready: false })).ok).toBe(false)
    expect(editing.room.players[0]!.blockedFavors).toEqual(DEFAULT_FAVORS)
    expect(editing.room.players[1]!.blockedFavors).toEqual(changed)
    const denied = await h.host.emitWithAck('room:ready', { preparationId: editing.room.preparationId!, ready: true, name: 'Kurucu', favors: [...DEFAULT_FAVORS] })
    expect(denied.ok).toBe(false)
    expect(h.views.get(h.host)!.players[0]!.ready).toBe(false)
    data(await h.host.emitWithAck('room:ready', { preparationId: h.views.get(h.host)!.preparationId!, ready: true, name: 'Kurucu', favors: [...changed] }))
    data(await h.host.emitWithAck('room:ready', { preparationId: editing.room.preparationId!, ready: false }))
    expect(h.views.get(h.host)!.players[0]).toMatchObject({ ready: false, favors: changed })
    data(await h.host.emitWithAck('room:ready', { preparationId: editing.room.preparationId!, ready: true, name: 'Kurucu', favors: [...changed] }))
    expect(h.matches.get(h.host)!.state.gameId).toBe(previousId)
    expect((await h.host.emitWithAck('room:ready', { preparationId: h.views.get(h.host)!.preparationId!, ready: true, name: 'Kurucu', favors: [...DEFAULT_FAVORS] })).ok).toBe(false)
    expect((await h.guest.emitWithAck('room:ready', { preparationId: editing.room.preparationId!, ready: true, name: 'Misafir', favors: [...changed] })).ok).toBe(false)
    data(await h.guest.emitWithAck('room:ready', { preparationId: h.views.get(h.host)!.preparationId!, ready: true, name: 'Misafir', favors: [...DEFAULT_FAVORS] }))
    await vi.waitFor(() => expect(h.matches.get(h.guest)!.state.gameId).not.toBe(previousId))
    expect((await h.host.emitWithAck('room:ready', { preparationId: editing.room.preparationId!, ready: false })).ok).toBe(false)
    const next = h.matches.get(h.host)!.state
    expect(h.matches.get(h.guest)!.state).toEqual(next)
    expect(next.revision).toBe(0)
    expect(next.round).toBe(1)
    expect(next.firstPlayerId).not.toBe(previousFirst)
    for (const player of Object.values(next.players)) {
      expect([player.health, player.tokens, player.rollsUsed]).toEqual([15, 0, 0])
      expect(player.favors).toEqual(player.id === 'player-1' ? changed : DEFAULT_FAVORS)
      expect(player.dice.every(die => !die.faceId && !die.kept && !die.selected && !die.removed)).toBe(true)
    }
    expect(h.views.get(h.host)).toMatchObject({ code: h.joined.room.code, stage: 'playing', waiting: true })
    expect(h.views.get(h.host)!.players.map(player => player.name)).toEqual(['Kurucu', 'Misafir'])
    expect(h.closed.size).toBe(0)
    // Both old revision-zero receipts are invalid for the new revision zero.
    h.host.emit('game:presented', 0, previousId)
    h.guest.emit('game:presented', 0, previousId)
    const actor = next.firstPlayerId === 'player-1' ? h.host : h.guest
    const command = { type: 'RollDice' as const, playerId: next.firstPlayerId }
    expect((await actor.emitWithAck('game:command', { gameId: next.gameId, revision: 0, command })).ok).toBe(false)
    await h.settle()
    expect((await actor.emitWithAck('game:command', { gameId: previousId, revision: 0, command })).ok).toBe(false)
    await h.command(command)
    h.guest.disconnect()
    await vi.waitFor(() => expect(h.views.get(h.host)!.players[1]!.connected).toBe(false))
    expect((await h.host.emitWithAck('game:rematch', next.gameId)).ok).toBe(false)
    const restored = await h.peer()
    const resumed = data(await restored.emitWithAck('room:resume', h.guestJoined.session))
    expect(resumed.session).toEqual(h.guestJoined.session)
    expect(resumed.room.code).toBe(h.joined.room.code)
    expect(resumed.room.players.map(p => p.blockedFavors)).toEqual([[...DEFAULT_FAVORS], changed])
    expect(resumed.match!.state.gameId).toBe(next.gameId)
  }, 30000)

  it('keeps cumulative personal bans on the server through rematches and reconnects, with a clean pool in another room', async () => {
    fixedDice.value = true
    const h = await setup()
    const other: FavorId[] = ['baldrs-invulnerability', 'bragis-verve', 'skadis-hunt']
    await h.play([...DEFAULT_FAVORS], other)
    await h.finish()
    data(await h.host.emitWithAck('game:rematch', h.matches.get(h.host)!.state.gameId))
    let preparationId = h.views.get(h.host)!.preparationId!
    data(await h.host.emitWithAck('room:ready', { preparationId, ready: true, name: 'Host', favors: other }))
    data(await h.guest.emitWithAck('room:ready', { preparationId, ready: true, name: 'Guest', favors: [...DEFAULT_FAVORS] }))
    await h.settle()
    await h.finish()
    data(await h.host.emitWithAck('game:rematch', h.matches.get(h.host)!.state.gameId))
    preparationId = h.views.get(h.host)!.preparationId!
    for (const player of h.views.get(h.host)!.players) {
      expect(new Set(player.blockedFavors)).toEqual(new Set([...DEFAULT_FAVORS, ...other]))
      expect(player.favors).toEqual([])
    }
    // Extra client fields cannot clear the authoritative ban, and older games remain locked.
    for (const favors of [[...DEFAULT_FAVORS], other]) {
      const forged = { preparationId, ready: true as const, name: 'Changed', favors, blockedFavors: [] }
      expect((await h.host.emitWithAck('room:ready', forged)).ok).toBe(false)
      expect(h.views.get(h.host)!.players[0]).toMatchObject({ name: 'Host', ready: false, favors: [] })
    }
    const restored = await h.peer()
    const resumed = data(await restored.emitWithAck('room:resume', h.joined.session))
    expect(new Set(resumed.room.players[0]!.blockedFavors)).toEqual(new Set([...DEFAULT_FAVORS, ...other]))
    expect(resumed.match).toBeNull()
    const available: FavorId[] = ['freyjas-plenty', 'freyrs-gift', 'friggs-sight']
    data(await restored.emitWithAck('room:ready', { preparationId, ready: true, name: 'Host', favors: available }))
    data(await h.guest.emitWithAck('room:ready', { preparationId, ready: true, name: 'Guest', favors: available }))
    await vi.waitFor(() => expect(h.views.get(h.guest)!.stage).toBe('playing'))
    expect(h.matches.get(h.guest)!.state.players['player-1'].favors).toEqual(available)
    const freshHost = await h.peer(), freshGuest = await h.peer()
    const fresh = data(await freshHost.emitWithAck('room:create'))
    data(await freshGuest.emitWithAck('room:join', fresh.room.code))
    data(await freshHost.emitWithAck('room:start'))
    expect(h.views.get(freshHost)!.players.every(p => p.blockedFavors.length === 0)).toBe(true)
    data(await freshHost.emitWithAck('room:ready', { preparationId: h.views.get(freshHost)!.preparationId!, ready: true, name: 'Fresh', favors: [...DEFAULT_FAVORS] }))
  }, 30000)

  it('runs automatic third-roll and battle transitions with both renderers hidden and no presentation receipts', async () => {
    const h = await setup()
    await h.play()
    h.host.emit('game:visibility', false)
    h.guest.emit('game:visibility', false)
    async function submit(command: GameCommand) {
      const revision = h.views.get(h.host)!.revision
      const actor = command.playerId === 'player-1' ? h.host : h.guest
      data(await actor.emitWithAck('game:command', { gameId: h.matches.get(h.host)!.state.gameId, revision, command }))
      await vi.waitFor(() => expect(h.views.get(h.host)!.revision > revision && !h.views.get(h.host)!.waiting).toBe(true))
    }
    while (h.matches.get(h.host)!.state.phase.name === 'roll') {
      const phase = h.matches.get(h.host)!.state.phase
      if (phase.name !== 'roll') throw new Error('roll expected')
      await submit({ type: phase.step === 'awaiting-roll' ? 'RollDice' : 'ConfirmRoll', playerId: phase.activePlayerId })
    }
    while (h.matches.get(h.host)!.state.phase.name === 'favor') {
      const phase = h.matches.get(h.host)!.state.phase
      if (phase.name !== 'favor') throw new Error('favor expected')
      await submit({ type: 'SkipFavor', playerId: phase.activePlayerId })
    }
    expect(h.matches.get(h.host)!.state.round).toBe(2)
    await vi.waitFor(() => expect(h.matches.get(h.guest)!.state).toEqual(h.matches.get(h.host)!.state))
  })

  it('does not wait for a hidden peer and restores visible presentation receipts on return', async () => {
    const h = await setup()
    await h.play()
    const phase = h.matches.get(h.host)!.state.phase
    if (phase.name !== 'roll') throw new Error('roll expected')
    const actor = phase.activePlayerId === 'player-1' ? h.host : h.guest
    const other = actor === h.host ? h.guest : h.host
    other.emit('game:visibility', false)
    data(await actor.emitWithAck('game:command', { gameId: h.matches.get(h.host)!.state.gameId, revision: 0, command: { type: 'RollDice', playerId: phase.activePlayerId } }))
    actor.emit('game:presented', 1, h.matches.get(h.host)!.state.gameId)
    await vi.waitFor(() => expect(h.views.get(actor)?.waiting).toBe(false))
    // Returning does not reopen an already completed barrier.
    other.emit('game:visibility', true)
    data(await actor.emitWithAck('game:command', { gameId: h.matches.get(h.host)!.state.gameId, revision: 1, command: { type: 'ConfirmRoll', playerId: phase.activePlayerId } }))
    actor.emit('game:presented', 2, h.matches.get(h.host)!.state.gameId)
    // A socket ACK acts as an ordered round-trip after the receipt packet.
    expect((await actor.emitWithAck('game:command', { gameId: h.matches.get(h.host)!.state.gameId, revision: 2, command: { type: 'RollDice', playerId: phase.activePlayerId } })).ok).toBe(false)
    expect(h.views.get(actor)?.waiting).toBe(true)
    other.emit('game:presented', 2, h.matches.get(h.host)!.state.gameId)
    await vi.waitFor(() => expect(h.views.get(actor)?.waiting).toBe(false))
  })

  it('releases a pending barrier immediately when the unfinished peer switches tabs', async () => {
    const h = await setup()
    await h.play()
    const phase = h.matches.get(h.host)!.state.phase
    if (phase.name !== 'roll') throw new Error('roll expected')
    const actor = phase.activePlayerId === 'player-1' ? h.host : h.guest
    const other = actor === h.host ? h.guest : h.host
    data(await actor.emitWithAck('game:command', { gameId: h.matches.get(h.host)!.state.gameId, revision: 0, command: { type: 'RollDice', playerId: phase.activePlayerId } }))
    actor.emit('game:presented', 1, h.matches.get(h.host)!.state.gameId)
    other.emit('game:visibility', false)
    await vi.waitFor(() => expect(h.views.get(actor)?.waiting).toBe(false))
    expect(h.matches.get(other)?.state).toEqual(h.matches.get(actor)?.state)
  })

  it('recovers a stalled visible renderer with a snapshot instead of an unlimited presentation wait', async () => {
    const h = await setup({ presentationMs: 150 })
    await h.play()
    const phase = h.matches.get(h.host)!.state.phase
    if (phase.name !== 'roll') throw new Error('roll expected')
    const actor = phase.activePlayerId === 'player-1' ? h.host : h.guest
    const other = actor === h.host ? h.guest : h.host
    const snapshot = new Promise<MatchUpdate>(resolve => other.once('game:snapshot', resolve))
    data(await actor.emitWithAck('game:command', { gameId: h.matches.get(h.host)!.state.gameId, revision: 0, command: { type: 'RollDice', playerId: phase.activePlayerId } }))
    actor.emit('game:presented', 1, h.matches.get(h.host)!.state.gameId)
    const recovered = await snapshot
    expect(recovered.state.revision).toBe(1)
    expect(recovered.events).toEqual([])
    await vi.waitFor(() => expect(h.views.get(actor)?.waiting).toBe(false))
    data(await actor.emitWithAck('game:command', { gameId: h.matches.get(h.host)!.state.gameId, revision: 1, command: { type: 'ConfirmRoll', playerId: phase.activePlayerId } }))
    other.emit('game:presented', 1, h.matches.get(h.host)!.state.gameId) // the old renderer cannot unlock revision 2
    expect((await actor.emitWithAck('game:command', { gameId: h.matches.get(h.host)!.state.gameId, revision: 2, command: { type: 'RollDice', playerId: phase.activePlayerId } })).ok).toBe(false)
  })

  it('creates distinct four-digit codes, rejects missing/full rooms, and only lets the creator start', async () => {
    const h = await setup()
    expect(h.joined.room.code).toMatch(/^\d{4}$/)
    expect(h.joined.session.token).toBeTruthy()
    expect(JSON.stringify(h.views.get(h.guest))).not.toContain(h.joined.session.token)
    expect((await h.guest.emitWithAck('room:start')).ok).toBe(false)
    const third = await h.peer()
    expect((await third.emitWithAck('room:join', h.joined.room.code)).ok).toBe(false)
    expect((await third.emitWithAck('room:join', 'AB12')).ok).toBe(false)
    const secondRoom = data(await third.emitWithAck('room:create'))
    expect(secondRoom.room.code).not.toBe(h.joined.room.code)
    data(await h.host.emitWithAck('room:start'))
    await vi.waitFor(() => expect(h.views.get(h.guest)?.stage).toBe('gods'))
    expect(h.views.get(third)?.stage).toBe('lobby')
  })

  it('validates each loadout, seals ready choices, and protects the shared coin toss', async () => {
    const h = await setup()
    data(await h.host.emitWithAck('room:start'))
    expect((await h.host.emitWithAck('room:ready', { preparationId: h.views.get(h.host)!.preparationId!, ready: true, name: 'A', favors: [DEFAULT_FAVORS[0], DEFAULT_FAVORS[0], DEFAULT_FAVORS[0]] })).ok).toBe(false)
    expect((await h.guest.emitWithAck('room:ready', { preparationId: h.views.get(h.host)!.preparationId!, ready: true, name: '', favors: [...DEFAULT_FAVORS] })).ok).toBe(false)
    data(await h.guest.emitWithAck('room:ready', { preparationId: h.views.get(h.host)!.preparationId!, ready: true, name: ' B ', favors: [...DEFAULT_FAVORS] }))
    expect((await h.guest.emitWithAck('room:ready', { preparationId: h.views.get(h.host)!.preparationId!, ready: true, name: 'C', favors: [...DEFAULT_FAVORS] })).ok).toBe(false)
    data(await h.host.emitWithAck('room:ready', { preparationId: h.views.get(h.host)!.preparationId!, ready: true, name: 'A', favors: [...DEFAULT_FAVORS] }))
    expect((await h.guest.emitWithAck('room:toss')).ok).toBe(false)
    data(await h.host.emitWithAck('room:toss'))
    expect((await h.host.emitWithAck('room:toss')).ok).toBe(false)
    expect((await h.guest.emitWithAck('room:play')).ok).toBe(false)
    data(await h.host.emitWithAck('room:play'))
    await vi.waitFor(() => expect(h.matches.get(h.guest)?.state.firstPlayerId).toBe(h.matches.get(h.host)?.state.firstPlayerId))
  })

  it('binds commands to a seat, checks revision, and waits for both presentation receipts', async () => {
    const h = await setup()
    await h.play()
    const phase = h.matches.get(h.host)!.state.phase
    if (phase.name !== 'roll') throw new Error('roll expected')
    const actor = phase.activePlayerId === 'player-1' ? h.host : h.guest
    const other = actor === h.host ? h.guest : h.host
    const request = { gameId: h.matches.get(h.host)!.state.gameId, revision: 0, command: { type: 'RollDice' as const, playerId: phase.activePlayerId } }
    expect((await other.emitWithAck('game:command', request)).ok).toBe(false)
    expect((await actor.emitWithAck('game:command', { ...request, revision: 50 })).ok).toBe(false)
    expect((await actor.emitWithAck('game:command', { ...request, command: { type: 'NextRound', playerId: phase.activePlayerId } })).ok).toBe(false)
    data(await actor.emitWithAck('game:command', request))
    await vi.waitFor(() => expect(h.matches.get(other)?.state.revision).toBe(1))
    expect(h.matches.get(actor)).toEqual(h.matches.get(other))
    const confirm = { gameId: h.matches.get(h.host)!.state.gameId, revision: 1, command: { type: 'ConfirmRoll' as const, playerId: phase.activePlayerId } }
    actor.emit('game:presented', 1, h.matches.get(h.host)!.state.gameId)
    expect((await actor.emitWithAck('game:command', confirm)).ok).toBe(false)
    other.emit('game:presented', 0, h.matches.get(h.host)!.state.gameId) // stale receipt cannot open the current revision
    expect((await actor.emitWithAck('game:command', confirm)).ok).toBe(false)
    await h.settle()
    data(await actor.emitWithAck('game:command', confirm))
    await h.settle()
    expect((await actor.emitWithAck('game:command', confirm)).ok).toBe(false)
  })

  it('automatically confirms third rolls, hides pending enemy intentions, and resolves the same round for both peers', async () => {
    const h = await setup()
    await h.play()
    for (let index = 0; index < 6; index++) {
      const phase = h.matches.get(h.host)!.state.phase
      if (phase.name !== 'roll') throw new Error('roll expected')
      await h.command({ type: 'RollDice', playerId: phase.activePlayerId })
      if (index < 4) await h.command({ type: 'ConfirmRoll', playerId: phase.activePlayerId })
    }
    const favorPhase = h.matches.get(h.host)!.state.phase
    if (favorPhase.name !== 'favor') throw new Error('favor expected')
    const first = favorPhase.activePlayerId, otherId: PlayerId = first === 'player-1' ? 'player-2' : 'player-1'
    await h.command({ type: 'ChooseFavor', playerId: first, favorId: DEFAULT_FAVORS[0], level: 1 })
    const actor = first === 'player-1' ? h.host : h.guest
    const other = first === 'player-1' ? h.guest : h.host
    expect(h.matches.get(actor)!.state.players[first].favorChoice.status).toBe('chosen')
    expect(h.matches.get(other)!.state.players[first].favorChoice.status).toBe('pending')
    expect(h.matches.get(other)!.events.some(event => event.type === 'FavorChosen')).toBe(false)
    await h.command({ type: 'SkipFavor', playerId: otherId })
    expect(h.matches.get(h.host)).toEqual(h.matches.get(h.guest))
    expect(h.matches.get(h.host)!.state.round).toBe(2)
    expect(h.matches.get(h.host)!.state.phase.name).toBe('roll')
  })

  it('pauses for a dropped player and resumes the same seat with a snapshot and a new presentation receipt', async () => {
    const h = await setup()
    await h.play()
    const original = h.matches.get(h.host)!.state
    const phase = original.phase
    if (phase.name !== 'roll') throw new Error('roll expected')
    const actor = phase.activePlayerId === 'player-1' ? h.host : h.guest
    data(await actor.emitWithAck('game:command', { gameId: h.matches.get(h.host)!.state.gameId, revision: 0, command: { type: 'RollDice', playerId: phase.activePlayerId } }))
    await vi.waitFor(() => expect(h.matches.get(h.host)?.state.revision).toBe(1))
    h.host.emit('game:presented', 1, h.matches.get(h.host)!.state.gameId)
    h.guest.disconnect()
    await vi.waitFor(() => expect(h.views.get(h.host)!.players[1]!.connected).toBe(false))
    expect((await h.host.emitWithAck('game:command', { gameId: h.matches.get(h.host)!.state.gameId, revision: 1, command: { type: 'ConfirmRoll', playerId: 'player-1' } })).ok).toBe(false)
    const rejoined = await h.peer()
    const resumed = data(await rejoined.emitWithAck('room:resume', h.guestJoined.session))
    expect(resumed.session.playerId).toBe('player-2')
    expect(resumed.match!.state.gameId).toBe(original.gameId)
    expect(resumed.match!.state.revision).toBe(1)
    expect(resumed.match!.events).toEqual([])
    expect(resumed.room.waiting).toBe(true)
    rejoined.emit('game:presented', 1, h.matches.get(h.host)!.state.gameId)
    await vi.waitFor(() => expect(h.views.get(h.host)!.waiting).toBe(false))
  })

  it('rejects forged resume tokens and closes both peers on explicit departure', async () => {
    const h = await setup()
    const stranger = await h.peer()
    expect((await stranger.emitWithAck('room:resume', { ...h.joined.session, token: 'fake' })).ok).toBe(false)
    data(await h.guest.emitWithAck('room:leave'))
    await vi.waitFor(() => expect(h.closed.has(h.host)).toBe(true))
    expect((await stranger.emitWithAck('room:join', h.joined.room.code)).ok).toBe(false)
  })

  it('expires disconnected seats rather than replacing them with new guests', async () => {
    const h = await setup({ reconnectMs: 40, sweepMs: 10 })
    h.guest.disconnect()
    const stranger = await h.peer()
    expect((await stranger.emitWithAck('room:join', h.joined.room.code)).ok).toBe(false)
    await vi.waitFor(() => expect(h.closed.has(h.host)).toBe(true))
  })
})
