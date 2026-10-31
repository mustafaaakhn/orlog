// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, shallowRef } from 'vue'
import { Game } from '../../core'
import type { FaceId, PlayerId } from '../../core'
import SceneDiceControls from '../SceneDiceControls.vue'

const unmounts: (() => void)[] = []
afterEach(() => { unmounts.splice(0).forEach(fn => fn()); document.body.innerHTML = ''; vi.useRealTimers(); vi.unstubAllGlobals() })
async function mount(viewerId: PlayerId = 'player-1', width = 390, height = 844) {
  vi.stubGlobal('ResizeObserver', class {
    constructor(private callback: (entries: unknown[]) => void) {}
    observe() { this.callback([{ contentRect: { width, height } }]) }
    disconnect() {}
  })
  const initial = new Game().state
  const players = Object.values(initial.players).map(player => ({ ...player, dice: player.dice.map((die, index) => ({
    ...die, faceId: (['arrow', 'helmet', 'hand', 'shield', 'axe-1', 'axe-2'] as FaceId[])[index]!, kept: index === 1, selected: index === 2, value: index === 2 ? 3 : 1,
  })) }))
  const targets = shallowRef(players.flatMap(player => player.dice.map((d, i) => ({ id: d.id, x: 40 + i * 3, y: player.id === 'player-1' ? 55 : 45 }))))
  const disabled = shallowRef(false), selectablePlayer = shallowRef<PlayerId | null>(viewerId), select = vi.fn()
  const root = document.createElement('div')
  document.body.append(root)
  const app = createApp({ render: () => h(SceneDiceControls, { players, targets: targets.value, disabled: disabled.value,
    collected: [], viewerId, selectablePlayer: selectablePlayer.value, safeArea: { top: 200, bottom: 160, left: 12, right: 12 }, onSelect: select }) })
  app.mount(root)
  unmounts.push(() => app.unmount())
  await nextTick()
  const button = (id: string) => root.querySelector<HTMLButtonElement>(`[data-die-id="${id}"]`)!
  return { root, targets, disabled, selectablePlayer, select, button }
}
function pointer(button: HTMLElement, type: string, x = 160, y = 450) {
  button.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerType: 'touch', pointerId: 1, isPrimary: true, clientX: x, clientY: y }))
}
function click(button: HTMLElement) { button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1, clientX: 380, clientY: 700 })) }

describe('mobile projected dice interaction', () => {
  it('selects the bound die rather than a nearby projected neighbour, and permits taking a selected die back', async () => {
    const m = await mount()
    pointer(m.button('player-1/die-1'), 'pointerdown')
    pointer(m.button('player-1/die-1'), 'pointerup')
    pointer(m.button('player-1/die-1'), 'pointerleave') // Normal touch exit precedes the synthetic click.
    click(m.button('player-1/die-1'))
    expect(m.select).toHaveBeenLastCalledWith('player-1/die-1')
    expect(m.button('player-1/die-3').querySelector('.die-target-value')!.textContent).toBe('×3')
    click(m.button('player-1/die-3'))
    expect(m.select).toHaveBeenLastCalledWith('player-1/die-3')
    expect(m.select).toHaveBeenCalledTimes(2)
  })
  it('inspects locked and opponent dice with a persistent description and an explicit close action', async () => {
    const m = await mount()
    for (const id of ['player-1/die-2', 'player-2/die-3']) {
      click(m.button(id))
      await nextTick()
      const preview = m.root.querySelector('.die-face-preview')!
      expect(preview).not.toBeNull()
      expect(preview.textContent).toContain(id.startsWith('player-2') ? 'Jeton getirir' : 'Kilitli')
      const close = preview.querySelector('button')!
      m.button(id).focus()
      close.focus()
      await nextTick()
      expect(m.root.querySelector('.die-face-preview')).not.toBeNull()
      close.click()
      await nextTick()
      expect(m.root.querySelector('.die-face-preview')).toBeNull()
    }
    expect(m.select).not.toHaveBeenCalled()
  })
  it.each([[390, 844], [844, 390]])('excludes the far bowl but keeps both center rows for either seat at %ix%i', async (width, height) => {
    for (const viewer of ['player-1', 'player-2'] as const) {
      const m = await mount(viewer, width, height)
      const opponent = viewer === 'player-1' ? 'player-2' : 'player-1'
      expect(m.button(`${opponent}/die-1`)).toBeNull()
      expect(m.button(`${viewer}/die-1`)).not.toBeNull()
      for (const owner of [viewer, opponent]) {
        for (const index of [2, 3]) expect(m.root.querySelectorAll(`[data-die-id="${owner}/die-${index}"]`)).toHaveLength(1)
      }
      click(m.button(`${opponent}/die-3`))
      await nextTick()
      expect(m.root.querySelector('.die-face-preview')!.textContent).toContain('Jeton getirir')
    }
  })
  it.each([[768, 1024], [1440, 900]])('retains inspection targets in both bowls on tablet and desktop at %ix%i', async (width, height) => {
    const m = await mount('player-1', width, height)
    expect(m.button('player-1/die-1')).not.toBeNull()
    expect(m.button('player-2/die-1')).not.toBeNull()
  })
  it('consumes a long press without selecting, then allows a fresh short tap', async () => {
    vi.useFakeTimers()
    const m = await mount(), button = m.button('player-1/die-1')
    pointer(button, 'pointerdown')
    await vi.advanceTimersByTimeAsync(410)
    pointer(button, 'pointerup')
    click(button)
    await nextTick()
    expect(m.root.querySelector('.die-face-preview')!.textContent).toContain('Jeton getirir')
    expect(m.select).not.toHaveBeenCalled()
    pointer(button, 'pointerdown')
    pointer(button, 'pointerup')
    click(button)
    expect(m.select).toHaveBeenCalledExactlyOnceWith('player-1/die-1')
  })
  it.each(['drag', 'cancel'] as const)('does not turn a %s gesture into a selection', async action => {
    vi.useFakeTimers()
    const m = await mount(), button = m.button('player-1/die-1')
    pointer(button, 'pointerdown')
    if (action === 'drag') pointer(button, 'pointermove', 190, 450)
    else pointer(button, 'pointercancel')
    await vi.advanceTimersByTimeAsync(410)
    pointer(button, 'pointerup')
    click(button)
    expect(m.select).not.toHaveBeenCalled()
  })
  it('cancels a pending press when the presentation locks and ignores a stale removed target', async () => {
    vi.useFakeTimers()
    const m = await mount(), button = m.button('player-1/die-1')
    pointer(button, 'pointerdown')
    m.disabled.value = true
    await nextTick()
    await vi.advanceTimersByTimeAsync(410)
    click(button)
    expect(m.select).not.toHaveBeenCalled()
    expect(m.root.querySelector('.die-face-preview')).toBeNull()
    m.disabled.value = false
    m.targets.value = m.targets.value.filter(t => t.id !== 'player-1/die-1')
    await nextTick()
    click(button)
    expect(m.select).not.toHaveBeenCalled()
    expect(m.button('player-1/die-1')).toBeNull()
  })
  it('does not reopen a blocking preview when focus returns after a short-tap presentation', async () => {
    const m = await mount(), button = m.button('player-1/die-1')
    pointer(button, 'pointerdown'); pointer(button, 'pointerup'); click(button)
    m.disabled.value = true
    await nextTick()
    m.disabled.value = false
    await nextTick()
    button.focus()
    await nextTick()
    expect(m.root.querySelector('.die-face-preview')).toBeNull()
  })
  it('retains keyboard navigation and focused identity for Enter/Space style activation', async () => {
    const m = await mount(), first = m.button('player-1/die-1')
    first.focus()
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }))
    expect(document.activeElement).toBe(m.button('player-1/die-2'))
    first.focus()
    first.click()
    expect(m.select).toHaveBeenCalledExactlyOnceWith('player-1/die-1')
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }))
    expect(document.activeElement).toBe(m.button('player-2/die-3'))
  })
})
