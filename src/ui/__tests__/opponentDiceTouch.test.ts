// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { createApp, h, nextTick, shallowRef } from 'vue'
import { Game } from '../../core'
import type { DieId, GameState } from '../../core'
import OpponentDiceSummary from '../OpponentDiceSummary.vue'

const unmounts: (() => void)[] = []
afterEach(() => { unmounts.splice(0).forEach(fn => fn()); document.body.innerHTML = '' })
async function mount() {
  const base = new Game().state
  const state = shallowRef<GameState>({ ...base, players: { ...base.players, 'player-2': {
    ...base.players['player-2'], dice: base.players['player-2'].dice.map((die, i) => ({ ...die, faceId: i === 0 ? 'arrow' : null })) } } })
  const rolling = shallowRef<readonly DieId[]>([])
  const root = document.createElement('div')
  document.body.append(root)
  const app = createApp({ render: () => h(OpponentDiceSummary, { state: state.value, viewerId: 'player-1', rolling: rolling.value, collected: [] }) })
  app.mount(root); unmounts.push(() => app.unmount()); await nextTick()
  return { root, state, rolling, button: root.querySelector<HTMLButtonElement>('.opponent-summary-die')! }
}
describe('touchable opponent bowl inspection', () => {
  it('shows the presented symbol and token description on tap, then closes without changing state', async () => {
    const m = await mount(), before = m.state.value
    m.button.click(); await nextTick()
    expect(m.root.querySelector('.opponent-die-info')!.textContent).toContain('Jeton getirir')
    expect(m.root.querySelector('.opponent-die-info')!.textContent).toContain('Menzilli saldırı')
    m.root.querySelector<HTMLButtonElement>('.opponent-die-info button')!.click(); await nextTick()
    expect(m.root.querySelector('.opponent-die-info')).toBeNull()
    expect(document.activeElement).toBe(m.button)
    expect(m.state.value).toBe(before)
  })
  it('cannot inspect an unrolled or currently rolling face and drops an open stale inspection', async () => {
    const m = await mount()
    expect(m.root.querySelectorAll('button:disabled')).toHaveLength(5)
    m.button.click(); await nextTick()
    m.rolling.value = ['player-2/die-1']; await nextTick()
    expect(m.button.disabled).toBe(true)
    expect(m.root.querySelector('.opponent-die-info')).toBeNull()
    expect(m.root.textContent).not.toContain('Jeton getirir')
    m.rolling.value = []; await nextTick()
    expect(m.root.querySelector('.opponent-die-info')).toBeNull()
  })
})
