// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, shallowRef } from 'vue'
import { Game } from '../../core'
import { createRollSession } from '../../app/rollSession'
import { setLocale } from '../../i18n'
import SceneTokenControls from '../SceneTokenControls.vue'

const disposers: (() => void)[] = []
afterEach(() => { disposers.splice(0).forEach(fn => fn()); document.body.innerHTML = '' })
async function mount() {
  setLocale('tr', false)
  const initial = new Game().state
  const state = { ...initial, players: { ...initial.players,
    'player-1': { ...initial.players['player-1'], tokens: 12 } } }
  const session = createRollSession()
  session.startRemote(state, { dispatch: () => true, settled() {} })
  session.settle(session.pending.value!.id)
  const viewer = shallowRef<'player-1' | 'player-2'>('player-1')
  const highlight = vi.fn()
  const root = document.createElement('div'); document.body.append(root)
  const app = createApp({ render: () => h(SceneTokenControls, {
    targets: [{ playerId: 'player-1', x: 70, y: 60, width: 70, height: 44 },
      { playerId: 'player-2', x: 30, y: 30, width: 44, height: 44 }],
    state: session.state.value, viewerId: viewer.value, onHighlight: highlight,
  }) })
  app.mount(root); disposers.push(() => app.unmount()); await nextTick()
  const button = root.querySelector<HTMLButtonElement>('[data-player-id="player-1"]')!
  return { root, button, state, session, viewer, highlight }
}
describe('desktop token inspection', () => {
  it('highlights only the hovered reserve, supports keyboard focus, and dismisses on Escape', async () => {
    const m = await mount()
    m.button.dispatchEvent(new Event('pointerenter')); await nextTick()
    expect(m.root.querySelector('[role="tooltip"]')!.textContent).toContain('12')
    expect(m.highlight).toHaveBeenLastCalledWith('player-1')
    m.button.dispatchEvent(new Event('pointerleave')); await nextTick()
    expect(m.root.querySelector('[role="tooltip"]')).toBeNull()
    expect(m.highlight).toHaveBeenLastCalledWith(null)
    m.button.focus(); await nextTick()
    expect(m.root.querySelector('[role="tooltip"]')).not.toBeNull()
    m.button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await nextTick()
    expect(m.root.querySelector('[role="tooltip"]')).toBeNull()
    expect(m.highlight).toHaveBeenLastCalledWith(null)
  })
  it('reads contact-time presentation counts, including zero, instead of the pending final snapshot', async () => {
    const m = await mount()
    m.button.focus(); await nextTick()
    const snapshot = { ...m.state, revision: 1, eventSequence: 1, players: { ...m.state.players,
      'player-1': { ...m.state.players['player-1'], tokens: 0 } } }
    const event = { type: 'TokensDestroyed' as const, id: 'count/1', sequence: 1, round: 1, revision: 1,
      playerId: 'player-2' as const, targetId: 'player-1' as const, favorId: 'skulds-claim' as const, amount: 12, tokens: 0 }
    m.session.receive(snapshot, [event]); await nextTick()
    expect(m.button.getAttribute('aria-label')).toBe('Senin jetonların: 12')
    m.session.progress(m.session.pending.value!.id, event, 1); await nextTick()
    expect(m.button.getAttribute('aria-label')).toBe('Senin jetonların: 11')
    m.session.progress(m.session.pending.value!.id, event, 12); await nextTick()
    expect(m.button.getAttribute('aria-label')).toBe('Senin jetonların: 0')
    expect(m.root.querySelector('.token-tooltip strong')!.textContent).toBe('0')
    m.viewer.value = 'player-2'; await nextTick()
    expect(m.button.getAttribute('aria-label')).toBe('Rakibin jetonları: 0')
  })
})
