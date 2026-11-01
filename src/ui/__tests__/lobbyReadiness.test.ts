// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, shallowRef } from 'vue'
import MatchSetup from '../MatchSetup.vue'
import type { OnlineClient } from '../../network/client'
import type { RoomView } from '../../network/protocol'
import { DEFAULT_FAVORS } from '../../core'

const cleanups: (() => void)[] = []
afterEach(() => { cleanups.splice(0).forEach(fn => fn()); document.body.innerHTML = '' })
async function mount(ready = true) {
  const room = shallowRef<RoomView>({ code: '1234', stage: 'gods', preparationId: 'setup-1', firstPlayerId: null, revision: 0, waiting: false,
    players: ['player-1', 'player-2'].map((id, i) => ({ id: id as 'player-1' | 'player-2', ready: i === 0 && ready, connected: true, name: i ? 'Sigurd' : 'Eivor', blockedFavors: [], favors: [...DEFAULT_FAVORS] })) })
  const busy = shallowRef(false), connected = shallowRef(true), error = shallowRef('')
  const unready = vi.fn(() => { busy.value = true }), submit = vi.fn(() => { busy.value = true })
  const online = { room, busy, connected, error, bothConnected: shallowRef(true), identity: shallowRef({ code: '1234', playerId: 'player-1', token: 'seat' }), ready: submit, unready } as unknown as OnlineClient
  const root = document.createElement('div'); document.body.append(root)
  const app = createApp({ render: () => h(MatchSetup, { online, reduced: true, paused: false, muted: true, volume: 0 }) })
  app.mount(root); cleanups.push(() => app.unmount()); await nextTick()
  return { root, room, busy, connected, error, unready, submit, action: () => root.querySelector<HTMLButtonElement>('.flow-footer .primary-action')!, name: () => root.querySelector<HTMLInputElement>('.name-field input')! }
}
describe('authoritative lobby readiness UI', () => {
  it('keeps withdrawal available while ready, locks pending requests, and preserves choices when acknowledged', async () => {
    const m = await mount()
    expect(m.action().textContent).toContain('Hazır değilim')
    expect(m.action().disabled).toBe(false)
    expect(m.name().disabled).toBe(true)
    const equipped = m.root.querySelectorAll('.god-tile[aria-pressed="true"]').length
    m.action().click(); await nextTick()
    expect(m.unready).toHaveBeenCalledOnce()
    expect(m.action().disabled).toBe(true)
    expect(m.action().textContent).toContain('Hazır değilim')
    expect(m.name().disabled).toBe(true)
    m.room.value = { ...m.room.value, players: m.room.value.players.map(p => ({ ...p, ready: false })) }; m.busy.value = false
    await nextTick()
    expect(m.action().textContent).toContain('Hazırım')
    expect(m.name().disabled).toBe(false)
    expect(m.name().value).toBe('Eivor')
    expect(m.root.querySelectorAll('.god-tile[aria-pressed="true"]')).toHaveLength(equipped)
    m.root.querySelector<HTMLButtonElement>('.god-tile[aria-pressed="true"]')!.click(); await nextTick()
    expect(m.action().disabled).toBe(true)
  })
  it('shows rejection even while ready and blocks editing/retry during disconnection', async () => {
    const m = await mount()
    m.error.value = 'Hazırlık değişti'; m.connected.value = false; await nextTick()
    expect(m.root.querySelector('[role="alert"]')?.textContent).toContain('Hazırlık değişti')
    expect(m.action().disabled).toBe(true)
    expect(m.name().disabled).toBe(true)
    m.action().click(); expect(m.unready).not.toHaveBeenCalled()
  })
  it('does not show ready optimistically before the server update', async () => {
    const m = await mount(false)
    m.action().click(); await nextTick()
    expect(m.submit).toHaveBeenCalledExactlyOnceWith('Eivor', [...DEFAULT_FAVORS])
    expect(m.action().textContent).toContain('Hazırım')
    expect(m.name().disabled).toBe(true)
  })
})
