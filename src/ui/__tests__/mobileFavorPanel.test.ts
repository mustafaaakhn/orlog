// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, shallowRef } from 'vue'
import MobileFavorPanel from '../MobileFavorPanel.vue'
import { Game } from '../../core'
import type { FavorId, GameState } from '../../core'

const unmounts: (() => void)[] = []
afterEach(() => { unmounts.splice(0).forEach(fn => fn()); document.body.innerHTML = ''; vi.restoreAllMocks() })
function mount(canChoose = true, favors: FavorId[] = ['thors-strike', 'friggs-sight', 'lokis-trick']) {
  const initial = new Game({ loadouts: { 'player-1': favors } }).state
  const state = shallowRef<GameState>({ ...initial, phase: { name: 'favor', activePlayerId: 'player-1' },
    players: { ...initial.players, 'player-1': { ...initial.players['player-1'],
      dice: initial.players['player-1'].dice.map(d => ({ ...d, faceId: 'axe-1', kept: true })) },
      'player-2': { ...initial.players['player-2'], dice: initial.players['player-2'].dice.map(d => ({ ...d, faceId: 'arrow', kept: true })) } } })
  const blocked = shallowRef(false), allowed = shallowRef(canChoose), choose = vi.fn(), skip = vi.fn()
  const root = document.createElement('div')
  document.body.append(root)
  const app = createApp({ render: () => h(MobileFavorPanel, { state: state.value, viewerId: 'player-1',
    names: { 'player-1': 'Eivor', 'player-2': 'Sigurd' }, blocked: blocked.value, canChoose: allowed.value,
    onChoose: choose, onSkip: skip }) })
  app.mount(root)
  unmounts.push(() => app.unmount())
  const button = (text: string) => [...root.querySelectorAll('button')].find(n => n.textContent!.includes(text))!
  const panel = root.querySelector('dialog')!
  return { root, state, blocked, allowed, choose, skip, button, panel,
    tiers: () => [...root.querySelectorAll<HTMLButtonElement>('button.favor-tier')] }
}

describe('mobile favor panel commands and drafts', () => {
  it('opens, inspects and closes without choosing or skipping, returning focus to its trigger', async () => {
    const m = mount(), trigger = m.button('Tanrı gücü')
    trigger.click()
    await nextTick()
    expect(m.panel.open).toBe(true)
    expect(m.tiers()).toHaveLength(9)
    m.button('Rakibin tanrıları').click()
    await nextTick()
    expect(m.tiers()).toHaveLength(0)
    expect(m.root.textContent).toContain('Sigurd')
    m.button('Kapat').click()
    await nextTick()
    expect(m.panel.open).toBe(false)
    expect(document.activeElement).toBe(trigger)
    expect(m.choose).not.toHaveBeenCalled()
    expect(m.skip).not.toHaveBeenCalled()
  })
  it('allows an unaffordable tier at zero tokens and only confirms on the explicit action', async () => {
    const m = mount()
    m.button('Tanrı gücü').click()
    await nextTick()
    expect(m.tiers()[2]!.disabled).toBe(false)
    m.tiers()[2]!.click()
    await nextTick()
    expect(m.choose).not.toHaveBeenCalled()
    m.button('Gücü onayla').click()
    expect(m.choose).toHaveBeenCalledExactlyOnceWith('thors-strike', 3, undefined)
    expect(m.skip).not.toHaveBeenCalled()
    expect(m.panel.open).toBe(false)
  })
  it('requires Frigg targets from either side and keeps only one active god draft', async () => {
    const m = mount()
    m.button('Tanrı gücü').click()
    await nextTick()
    m.tiers()[3]!.click()
    await nextTick()
    expect(m.button('Gücü onayla').disabled).toBe(true)
    const targets = [...m.root.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')]
    expect(targets).toHaveLength(12)
    targets[0]!.click()
    await nextTick()
    targets[6]!.click()
    await nextTick()
    expect(m.button('Gücü onayla').disabled).toBe(false)
    m.button('Gücü onayla').click()
    expect(m.choose).toHaveBeenCalledExactlyOnceWith('friggs-sight', 1, { dieIds: ['player-1/die-1', 'player-2/die-1'] })
    m.button('Tanrı gücü').click()
    await nextTick()
    m.tiers()[3]!.click()
    await nextTick()
    m.tiers()[0]!.click()
    await nextTick()
    expect(m.root.querySelectorAll('fieldset')).toHaveLength(1)
  })
  it('limits Loki to enemy dice and forwards the exact chosen targets', async () => {
    const m = mount()
    m.button('Tanrı gücü').click()
    await nextTick()
    m.tiers()[6]!.click()
    await nextTick()
    const targets = [...m.root.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')]
    expect(targets).toHaveLength(6)
    targets[2]!.click()
    await nextTick()
    m.button('Gücü onayla').click()
    expect(m.choose).toHaveBeenCalledExactlyOnceWith('lokis-trick', 1, { dieIds: ['player-2/die-3'] })
  })
  it('keeps own powers read-only out of turn and blocks a stale confirmation when locked', async () => {
    const m = mount(false)
    m.button('Tanrı gücü').click()
    await nextTick()
    expect(m.tiers()).toHaveLength(0)
    expect(m.button('Güç kullanmadan devam et')).toBeUndefined()
    m.allowed.value = true
    await nextTick()
    m.tiers()[0]!.click()
    await nextTick()
    const staleConfirm = m.button('Gücü onayla')
    m.blocked.value = true
    await nextTick()
    staleConfirm.click()
    expect(m.choose).not.toHaveBeenCalled()
    expect(m.skip).not.toHaveBeenCalled()
  })
  it('preserves health sacrifice and majority inputs from the shared picker', async () => {
    const m = mount(true, ['odins-sacrifice', 'freyrs-gift', 'thors-strike'])
    m.button('Tanrı gücü').click()
    await nextTick()
    m.tiers()[0]!.click()
    await nextTick()
    const health = m.root.querySelector<HTMLInputElement>('input[type="number"]')!
    health.value = '3'
    health.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
    m.button('Gücü onayla').click()
    expect(m.choose).toHaveBeenCalledExactlyOnceWith('odins-sacrifice', 1, { health: 3 })
    m.choose.mockClear()
    m.button('Tanrı gücü').click()
    await nextTick()
    m.tiers()[3]!.click()
    await nextTick()
    expect(m.root.querySelector('select')!.value).toBe('axe')
    m.button('Gücü onayla').click()
    expect(m.choose).toHaveBeenCalledExactlyOnceWith('freyrs-gift', 1, { symbol: 'axe' })
  })
  it('keeps a resource update open and displays the presented token balance', async () => {
    const m = mount(false)
    m.button('Tanrı gücü').click()
    await nextTick()
    m.state.value = { ...m.state.value, players: { ...m.state.value.players,
      'player-1': { ...m.state.value.players['player-1'], tokens: 7 } } }
    await nextTick()
    expect(m.panel.open).toBe(true)
    expect(m.root.querySelector('.mobile-favor-balance')!.textContent).toContain('7')
  })
  it('only skips via the explicit continue action; Escape and outside pointer just close', async () => {
    const m = mount(), trigger = m.button('Tanrı gücü')
    trigger.click()
    await nextTick()
    m.panel.dispatchEvent(new Event('cancel', { cancelable: true }))
    expect(m.panel.open).toBe(false)
    expect(m.skip).not.toHaveBeenCalled()
    trigger.click()
    await nextTick()
    vi.spyOn(m.panel, 'getBoundingClientRect').mockReturnValue({ left: 0, right: 390, top: 100, bottom: 844 } as DOMRect)
    m.panel.dispatchEvent(new PointerEvent('pointerdown', { clientX: 20, clientY: 20 }))
    m.panel.dispatchEvent(new PointerEvent('pointerup', { clientX: 20, clientY: 20 }))
    expect(m.panel.open).toBe(false)
    expect(m.skip).not.toHaveBeenCalled()
    trigger.click()
    await nextTick()
    m.button('Güç kullanmadan devam et').click()
    expect(m.skip).toHaveBeenCalledOnce()
    expect(m.choose).not.toHaveBeenCalled()
  })
})
