// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import MatchSetup from '../MatchSetup.vue'
import { createOnlineClient } from '../../network/client'
import type { RematchSetup } from '../../app/rematchSetup'
import type { FavorId } from '../../core'
const first: FavorId[] = ['thors-strike', 'iduns-rejuvenation', 'vidars-might']
const second: FavorId[] = ['baldrs-invulnerability', 'bragis-verve', 'skadis-hunt']
const cleanups: (() => void)[] = []
afterEach(() => { cleanups.splice(0).forEach(fn => fn()); vi.restoreAllMocks(); document.body.innerHTML = '' })
async function mount(mode: 'computer' | 'local', mobile = false) {
  vi.spyOn(window, 'matchMedia').mockImplementation(query => ({ matches: mobile && query.includes('max-width: 600px'),
    addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList)
  const online = createOnlineClient({ snapshot() {}, batch() {}, closed() {} })
  const rematch: RematchSetup = { options: { firstPlayerId: 'player-2', loadouts: { 'player-1': [], 'player-2': [] } },
    blockedFavors: { 'player-1': [...first], 'player-2': [...second] },
    names: { 'player-1': 'Eivor', 'player-2': 'Sigurd' }, opponent: { mode, difficulty: 'normal' } }
  const start = vi.fn(), root = document.createElement('div'); document.body.append(root)
  const app = createApp({ render: () => h(MatchSetup, { rematch, online, reduced: true, paused: false, muted: true, volume: 0, onStart: start }) })
  app.mount(root); cleanups.push(() => { app.unmount(); online.dispose() }); await nextTick()
  const tile = (id: FavorId) => root.querySelector<HTMLButtonElement>(`.god-tile[data-favor-id="${id}"]`)!
  const next = () => root.querySelector<HTMLButtonElement>('.flow-footer .primary-action')!
  return { root, start, rematch, tile, next, equipped: () => root.querySelectorAll('.god-tile[aria-pressed="true"]') }
}
describe('rematch choices by seat', () => {
  it('requires fresh human choices, allows opponent gods and gives the computer an available loadout', async () => {
    const m = await mount('computer')
    expect(m.equipped()).toHaveLength(0)
    expect(m.next().disabled).toBe(true)
    m.tile(first[0]!).click(); await nextTick()
    expect(m.equipped()).toHaveLength(0)
    expect(m.tile(first[0]!).getAttribute('aria-disabled')).toBe('true')
    expect(m.root.querySelector('.god-description')!.textContent).toContain('tekrar seçemezsin')
    for (const id of second) m.tile(id).click()
    await nextTick(); expect(m.next().disabled).toBe(false)
    m.next().click()
    expect(m.start).toHaveBeenCalledOnce()
    const options = m.start.mock.calls[0]![0]
    expect(options.loadouts['player-1']).toEqual(second)
    expect(options.loadouts['player-2']).toHaveLength(3)
    expect(new Set(options.loadouts['player-2']).size).toBe(3)
    expect(options.loadouts['player-2'].every((id: FavorId) => !second.includes(id))).toBe(true)
    expect(m.rematch.blockedFavors).toEqual({ 'player-1': first, 'player-2': second })
  })
  it('changes restrictions with the local seat, allowing both players to swap last game’s gods', async () => {
    const m = await mount('local')
    for (const id of second) m.tile(id).click()
    await nextTick(); m.next().click(); await nextTick()
    expect(m.start).not.toHaveBeenCalled()
    expect(m.equipped()).toHaveLength(0)
    expect(m.tile(second[0]!).getAttribute('aria-disabled')).toBe('true')
    expect(m.tile(first[0]!).getAttribute('aria-disabled')).toBe('false')
    m.tile(second[0]!).click(); await nextTick()
    expect(m.equipped()).toHaveLength(0)
    for (const id of first) m.tile(id).click()
    await nextTick(); m.next().click()
    expect(m.start).toHaveBeenCalledOnce()
    expect(m.start.mock.calls[0]![0].loadouts).toEqual({ 'player-1': second, 'player-2': first })
  })
  it('lets mobile users inspect a used god without selecting it or starting a match', async () => {
    const m = await mount('computer', true)
    m.tile(first[0]!).click(); await nextTick(); await nextTick()
    const sheet = m.root.querySelector<HTMLDialogElement>('.setup-favor-sheet')!
    expect(sheet.open).toBe(true)
    expect(sheet.querySelectorAll('dl > div')).toHaveLength(3)
    expect(sheet.textContent).toContain('tekrar seçemezsin')
    expect(m.equipped()).toHaveLength(0)
    sheet.querySelector<HTMLButtonElement>('button')!.click(); await nextTick(); await nextTick()
    expect(sheet.open).toBe(false)
    expect(m.next().disabled).toBe(true)
    expect(m.start).not.toHaveBeenCalled()
  })
})
