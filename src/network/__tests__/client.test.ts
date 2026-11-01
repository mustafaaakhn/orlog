// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Game } from '../../core'
import type { GameCommand } from '../../core'
import type { JoinedRoom, Reply } from '../protocol'
import { createOnlineClient } from '../client'

const holder = vi.hoisted(() => ({ socket: null as unknown }))
vi.mock('socket.io-client', () => ({ io: () => holder.socket }))
class TestSocket {
  listeners = new Map<string, ((...args: unknown[]) => void)[]>()
  on(event: string, listener: (...args: unknown[]) => void) {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener])
    return this
  }
  emit(event: string, ...args: unknown[]) { this.listeners.get(event)?.forEach(listener => listener(...args)); return true }
  removeAllListeners() { this.listeners.clear() }
  connected = true
  emitWithAck = vi.fn<(...args: unknown[]) => Promise<Reply<unknown>>>()
  timeout() { return this }
  connect() { this.connected = true; this.emit('connect'); return this }
  disconnect() { this.connected = false; this.emit('disconnect'); return this }
}
const disposers: (() => void)[] = []
beforeEach(() => { holder.socket = new TestSocket(); sessionStorage.clear() })
afterEach(() => disposers.splice(0).forEach(dispose => dispose()))
function setup() {
  const socket = holder.socket as TestSocket
  const snapshot = vi.fn(), batch = vi.fn(), closed = vi.fn()
  const client = createOnlineClient({ snapshot, batch, closed })
  socket.emit('connect')
  const joined: JoinedRoom = {
    session: { code: '1234', playerId: 'player-1', token: 'private-seat-token' },
    room: { code: '1234', stage: 'playing', preparationId: null, revision: 1, waiting: false, firstPlayerId: 'player-1', players: [
      { id: 'player-1', name: 'Eivor', connected: true, ready: true, blockedFavors: [], favors: [] },
      { id: 'player-2', name: 'Sigurd', connected: true, ready: true, blockedFavors: [], favors: [] },
    ] },
    match: { state: new Game({ gameId: 'server-match' }).state, events: [] },
  }
  client.identity.value = joined.session
  client.room.value = joined.room
  disposers.push(client.dispose)
  const command: GameCommand = { type: 'SetDiceSelection', playerId: 'player-1', dieIds: ['player-1/die-1'] }
  return { socket, client, joined, snapshot, batch, closed, command }
}

describe('online command acceptance and reconciliation', () => {
  it('sends explicit preparation-scoped readiness without optimistic state and suppresses repeat clicks', async () => {
    const h = setup()
    h.client.room.value = { ...h.joined.room, stage: 'gods', preparationId: 'setup-1' }
    let receipt!: (reply: Reply) => void
    h.socket.emitWithAck.mockImplementationOnce(() => new Promise(resolve => { receipt = resolve }))
    const request = h.client.unready()
    expect(h.client.room.value.players[0]!.ready).toBe(true)
    expect(h.client.busy.value).toBe(true)
    await h.client.unready()
    expect(h.socket.emitWithAck).toHaveBeenCalledExactlyOnceWith('room:ready', { preparationId: 'setup-1', ready: false })
    receipt({ ok: true, data: undefined }); await request
    // Only room:update/snapshot may change the displayed readiness.
    expect(h.client.room.value.players[0]!.ready).toBe(true)
    h.socket.emit('room:update', { ...h.client.room.value, players: h.client.room.value.players.map(p => ({ ...p, ready: false })) })
    expect(h.client.room.value.players[0]!.ready).toBe(false)
  })
  it('reconciles a rejected withdrawal with the authoritative later stage', async () => {
    const h = setup()
    h.client.room.value = { ...h.joined.room, stage: 'gods', preparationId: 'setup-1' }
    const authoritative = { ...h.joined, room: { ...h.joined.room, stage: 'coin' as const } }
    h.socket.emitWithAck.mockResolvedValueOnce({ ok: false, error: 'Preparation ended' }).mockResolvedValueOnce({ ok: true, data: authoritative })
    await h.client.unready()
    expect(h.client.room.value?.stage).toBe('coin')
    expect(h.client.error.value).toBe('Preparation ended')
    expect(h.socket.emitWithAck.mock.calls.map(([event]) => event)).toEqual(['room:ready', 'room:resume'])
  })
  it('recovers a lost readiness ACK without resending or toggling the target state', async () => {
    const h = setup()
    h.client.room.value = { ...h.joined.room, stage: 'gods', preparationId: 'setup-1' }
    const authoritative = { ...h.joined, room: { ...h.client.room.value, players: h.joined.room.players.map(p => ({ ...p, ready: false })) } }
    h.socket.emitWithAck.mockRejectedValueOnce(new Error('ACK timeout')).mockResolvedValueOnce({ ok: true, data: authoritative })
    await h.client.unready()
    await vi.waitFor(() => expect(h.client.room.value?.players[0]!.ready).toBe(false))
    expect(h.socket.emitWithAck.mock.calls.map(([event]) => event)).toEqual(['room:ready', 'room:resume'])
    expect(h.client.busy.value).toBe(false)
  })
  it('does not buffer readiness while disconnected or after preparation ended', async () => {
    const h = setup()
    await h.client.unready()
    h.client.room.value = { ...h.joined.room, stage: 'gods', preparationId: 'setup-1' }
    h.socket.disconnect()
    await h.client.ready('Eivor', []); await h.client.unready()
    expect(h.socket.emitWithAck).not.toHaveBeenCalled()
  })
  it('reports acceptance only after the ACK and prevents another request during the wait', async () => {
    const h = setup()
    let receipt!: (reply: Reply) => void
    h.socket.emitWithAck.mockImplementationOnce(() => new Promise(resolve => { receipt = resolve }))
    const accepted = h.client.commandAsync(h.command, 1, 'server-match')
    expect(h.client.busy.value).toBe(true)
    expect(await h.client.commandAsync({ type: 'ConfirmRoll', playerId: 'player-1' }, 1, 'server-match')).toBe(false)
    expect(h.socket.emitWithAck).toHaveBeenCalledExactlyOnceWith('game:command', { command: h.command, revision: 1, gameId: 'server-match' })
    receipt({ ok: true, data: undefined })
    expect(await accepted).toBe(true)
    expect(h.client.busy.value).toBe(false)
  })
  it('obtains an authoritative snapshot after rejection before releasing the command lock', async () => {
    const h = setup()
    let synchronize!: (reply: Reply<JoinedRoom>) => void
    h.socket.emitWithAck.mockResolvedValueOnce({ ok: false, error: 'Stale revision' })
      .mockImplementationOnce(() => new Promise(resolve => { synchronize = resolve }))
    const accepted = h.client.commandAsync(h.command, 0, 'server-match')
    await vi.waitFor(() => expect(h.socket.emitWithAck).toHaveBeenCalledWith('room:resume', h.joined.session))
    expect(h.client.busy.value).toBe(true)
    expect(h.snapshot).not.toHaveBeenCalled()
    synchronize({ ok: true, data: h.joined })
    expect(await accepted).toBe(false)
    expect(h.snapshot).toHaveBeenCalledExactlyOnceWith(h.joined.match)
    expect(h.client.error.value).toBe('Stale revision')
    expect(h.client.busy.value).toBe(false)
  })
  it('ignores a lost old receipt after disconnect and does not release the resumed request lock', async () => {
    const h = setup()
    let oldReceipt!: (reply: Reply) => void, nextReceipt!: (reply: Reply) => void
    h.socket.emitWithAck.mockImplementationOnce(() => new Promise(resolve => { oldReceipt = resolve }))
      .mockResolvedValueOnce({ ok: true, data: h.joined })
      .mockImplementationOnce(() => new Promise(resolve => { nextReceipt = resolve }))
    const previous = h.client.commandAsync(h.command, 1, 'server-match')
    h.socket.disconnect(); expect(h.client.connected.value).toBe(false)
    h.socket.connect()
    await vi.waitFor(() => expect(h.snapshot).toHaveBeenCalledOnce())
    const next = h.client.commandAsync(h.command, 1, 'server-match')
    oldReceipt({ ok: true, data: undefined })
    expect(await previous).toBe(false)
    expect(h.client.busy.value).toBe(true)
    nextReceipt({ ok: true, data: undefined })
    expect(await next).toBe(true)
  })
  it('recovers an uncertain accepted command by snapshot after a lost ACK without retrying it', async () => {
    const h = setup()
    h.socket.emitWithAck.mockRejectedValueOnce(new Error('ACK timeout')).mockResolvedValueOnce({ ok: true, data: h.joined })
    expect(await h.client.commandAsync(h.command, 1, 'server-match')).toBe(false)
    await vi.waitFor(() => expect(h.snapshot).toHaveBeenCalledOnce())
    expect(h.socket.emitWithAck.mock.calls.map(([event]) => event)).toEqual(['game:command', 'room:resume'])
  })
  it('disconnects immediately on a device offline event and resumes authoritatively when online returns', async () => {
    const h = setup()
    h.socket.emitWithAck.mockResolvedValueOnce({ ok: true, data: h.joined })
    window.dispatchEvent(new Event('offline'))
    expect(h.client.connected.value).toBe(false)
    expect(await h.client.commandAsync(h.command, 1, 'server-match')).toBe(false)
    window.dispatchEvent(new Event('online'))
    await vi.waitFor(() => expect(h.snapshot).toHaveBeenCalledOnce())
    expect(h.socket.emitWithAck).toHaveBeenCalledExactlyOnceWith('room:resume', h.joined.session)
    expect(h.client.connected.value).toBe(true)
  })
  it('rejects outgoing commands while the peer is disconnected or presentation is waiting', async () => {
    const h = setup()
    h.client.room.value = { ...h.joined.room, waiting: true }
    expect(await h.client.commandAsync(h.command, 1, 'server-match')).toBe(false)
    h.client.room.value = { ...h.joined.room, players: h.joined.room.players.map(p => ({ ...p, connected: p.id === 'player-1' })) }
    expect(h.client.command(h.command, 1, 'server-match')).toBe(false)
    expect(h.socket.emitWithAck).not.toHaveBeenCalled()
  })
})
