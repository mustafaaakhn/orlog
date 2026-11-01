// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, shallowRef } from 'vue'
import MatchSetup from '../MatchSetup.vue'
import { DEFAULT_FAVORS } from '../../core'
import type { OnlineClient } from '../../network/client'
import type { RoomView } from '../../network/protocol'

const cleanups: (() => void)[] = []
afterEach(() => { cleanups.splice(0).forEach(fn => fn()); vi.restoreAllMocks(); document.body.innerHTML = '' })
async function mount() {
  const media = new EventTarget() as MediaQueryList
  Object.assign(media, { matches: true, media: '', onchange: null })
  const desktop = window.matchMedia('(min-width: 1024px)')
  vi.spyOn(window, 'matchMedia').mockImplementation(query => query.includes('max-width: 600px') ? media : desktop)
  const room = shallowRef<RoomView>({ code: '1234', stage: 'gods', preparationId: 'setup-1', firstPlayerId: null, revision: 0, waiting: false,
    players: ['player-1', 'player-2'].map((id, i) => ({ id: id as 'player-1' | 'player-2', ready: false, connected: true, name: i ? 'Sigurd' : 'Eivor', blockedFavors: [], favors: [...DEFAULT_FAVORS] })) })
  const ready = vi.fn(), busy = shallowRef(false)
  const online = { room, busy, connected: shallowRef(true), error: shallowRef(''), bothConnected: shallowRef(true),
    identity: shallowRef({ code: '1234', playerId: 'player-1', token: 'seat' }), ready } as unknown as OnlineClient
  const root = document.createElement('div'); document.body.append(root)
  const app = createApp({ render: () => h(MatchSetup, { online, reduced: true, paused: false, muted: true, volume: 0 }) })
  app.mount(root); cleanups.push(() => app.unmount()); await nextTick()
  const sheet = root.querySelector<HTMLDialogElement>('.setup-favor-sheet')!
  const equipped = () => root.querySelectorAll('.god-tile[aria-pressed="true"]').length
  return { root, sheet, ready, busy, media, equipped }
}
describe('mobile catalog detail sheet', () => {
  it('shows all three tiers beside the current choice and closing never changes the loadout or submits readiness', async () => {
    const m = await mount()
    expect(m.root.querySelector('.god-description')).toBeNull()
    m.root.querySelector<HTMLButtonElement>('.god-tile[aria-pressed="true"]')!.click()
    await nextTick(); await nextTick()
    expect(m.sheet.open).toBe(true)
    expect(m.equipped()).toBe(2)
    expect(m.sheet.querySelectorAll('dl > div')).toHaveLength(3)
    m.sheet.querySelector<HTMLButtonElement>('button')!.click()
    await nextTick(); await nextTick()
    expect(m.sheet.open).toBe(false)
    expect(m.equipped()).toBe(2)
    expect(m.ready).not.toHaveBeenCalled()
  })
  it('opens details at the three-god limit without adding a fourth god, and closes on desktop transition', async () => {
    const m = await mount()
    m.root.querySelector<HTMLButtonElement>('.god-tile[aria-pressed="false"]')!.click()
    await nextTick(); await nextTick()
    expect(m.sheet.open).toBe(true)
    expect(m.equipped()).toBe(3)
    expect(m.sheet.textContent).toContain('En fazla 3 tanrı')
    Object.assign(m.media, { matches: false }); m.media.dispatchEvent(new Event('change'))
    await nextTick(); await nextTick()
    expect(m.sheet.open).toBe(false)
    expect(m.root.querySelector('.god-description')).not.toBeNull()
    expect(m.equipped()).toBe(3)
  })
  it('permits inspection during a locked request without changing the chosen gods', async () => {
    const m = await mount(); m.busy.value = true; await nextTick()
    m.root.querySelector<HTMLButtonElement>('.god-tile[aria-pressed="false"]')!.click()
    await nextTick(); await nextTick()
    expect(m.sheet.open).toBe(true)
    expect(m.equipped()).toBe(3)
    expect(m.ready).not.toHaveBeenCalled()
    m.sheet.dispatchEvent(new Event('cancel'))
    await nextTick(); await nextTick()
    expect(m.sheet.open).toBe(false)
  })
})
