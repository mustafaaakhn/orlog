// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, shallowRef } from 'vue'
import { Game } from '../../core'
import type { FaceId, PlayerId } from '../../core'
import type { SceneDieTarget } from '../../scene/dieTargets'
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
  const players = shallowRef(Object.values(initial.players).map(player => ({ ...player, dice: player.dice.map((die, index) => ({
    ...die, faceId: (['arrow', 'helmet', 'hand', 'shield', 'axe-1', 'axe-2'] as FaceId[])[index]!, kept: index === 1, selected: index === 2, value: index === 2 ? 3 : 1,
  })) })))
  const targets = shallowRef<SceneDieTarget[]>(players.value.flatMap(player => player.dice.map((d, i) => ({ id: d.id, x: 40 + i * 3, y: player.id === 'player-1' ? 55 : 45 }))))
  const collected = shallowRef<import('../../core').DieId[]>([])
  const disabled = shallowRef(false), selectablePlayer = shallowRef<PlayerId | null>(viewerId), select = vi.fn()
  const root = document.createElement('div')
  document.body.append(root)
  const app = createApp({ render: () => h(SceneDiceControls, { players: players.value, targets: targets.value, disabled: disabled.value,
    collected: collected.value, viewerId, selectablePlayer: selectablePlayer.value, safeArea: { top: 200, bottom: 160, left: 12, right: 12 }, onSelect: select }) })
  app.mount(root)
  unmounts.push(() => app.unmount())
  await nextTick()
  vi.spyOn(root.querySelector('.scene-die-controls')!, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, top: 0, left: 0, right: width, bottom: height, width, height, toJSON() {} })
  root.querySelector('.scene-die-controls')!.setAttribute('data-test-width', String(width))
  root.querySelector('.scene-die-controls')!.setAttribute('data-test-height', String(height))
  const button = (id: string) => root.querySelector<HTMLButtonElement>(`[data-die-id="${id}"]`)!
  return { root, targets, players, collected, disabled, selectablePlayer, select, button }
}
function pointer(button: HTMLElement, type: string, x = 160, y = 450) {
  button.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerType: 'touch', pointerId: 1, isPrimary: true, clientX: x, clientY: y }))
}
function click(button: HTMLElement) {
  const projected = button.classList.contains('is-projected')
  const root = button.closest('.scene-die-controls')!
  const width = Number(root?.getAttribute('data-test-width') ?? 390), height = Number(root?.getAttribute('data-test-height') ?? 844)
  button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1,
    clientX: projected ? parseFloat(button.style.left) * width / 100 : 380,
    clientY: projected ? parseFloat(button.style.top) * height / 100 : 700 }))
}

describe('mobile projected dice interaction', () => {
  it('preserves the desktop button node and keyboard focus across a presentation lock', async () => {
    const m = await mount('player-1', 1440, 900), button = m.button('player-1/die-1')
    button.focus()
    m.disabled.value = true; await nextTick()
    expect(m.button('player-1/die-1')).toBe(button)
    expect(button.tagName).toBe('BUTTON')
    m.disabled.value = false; await nextTick()
    expect(document.activeElement).toBe(button)
  })
  it('tracks active combat faces as decorative spans without opening interaction or moving idle slots', async () => {
    const m = await mount()
    m.disabled.value = true
    m.targets.value = m.targets.value.map(target => ({ ...target, combatRole: target.id === 'player-1/die-1' ? 'source' : undefined }))
    await nextTick()
    const face = m.button('player-1/die-1')
    expect(face.tagName).toBe('SPAN')
    expect(face.getAttribute('aria-hidden')).toBe('true')
    expect(face.hasAttribute('tabindex')).toBe(false)
    const before = face.style.top
    m.targets.value = m.targets.value.map(target => ({ ...target, y: target.y + 10 }))
    await nextTick()
    expect(m.button('player-1/die-1')).toBe(face)
    expect(face.style.top).not.toBe(before)
    click(face)
    expect(m.select).not.toHaveBeenCalled()
    m.targets.value = []
    await nextTick()
    expect(m.root.querySelector('.is-combat')).toBeNull()
  })
  it('keeps every visible mobile face decorative under lock, highlights only this event, and removes faces at collection', async () => {
    const m = await mount(), count = m.root.querySelectorAll('.scene-die-target').length
    const before = m.button('player-1/die-3').style.cssText
    m.disabled.value = true
    m.targets.value = m.targets.value.map(t => ({ ...t, eventRole: t.id === 'player-2/die-3' ? 'source' : undefined }))
    await nextTick()
    const faces = [...m.root.querySelectorAll<HTMLElement>('.scene-die-target')]
    expect(faces).toHaveLength(count)
    expect(faces.every(el => el.tagName === 'SPAN' && !el.hasAttribute('tabindex'))).toBe(true)
    expect(m.root.querySelectorAll('.is-active-event')).toHaveLength(1)
    expect(m.root.querySelectorAll('.is-muted')).toHaveLength(count - 1)
    expect(m.button('player-1/die-3').style.cssText).toBe(before)
    faces.forEach(click)
    expect(m.select).not.toHaveBeenCalled()
    m.collected.value = ['player-1/die-3']
    await nextTick()
    expect(m.button('player-1/die-3')).toBeNull()
    m.targets.value = m.targets.value.map(t => ({ ...t, eventRole: undefined }))
    m.disabled.value = false
    await nextTick()
    expect(m.root.querySelector('.is-active-event')).toBeNull()
    expect(m.root.querySelectorAll('.scene-die-target')).toHaveLength(count - 1)
  })
  it('selects the bound die rather than a nearby projected neighbour, and permits taking a selected die back', async () => {
    const m = await mount()
    pointer(m.button('player-1/die-1'), 'pointerdown')
    pointer(m.button('player-1/die-1'), 'pointerup')
    pointer(m.button('player-1/die-1'), 'pointerleave') // Normal touch exit precedes the synthetic click.
    click(m.button('player-1/die-1'))
    expect(m.select).toHaveBeenLastCalledWith('player-1/die-1')
    expect(m.button('player-1/die-3').querySelector('.die-target-value')).toBeNull()
    expect(m.button('player-1/die-3').getAttribute('aria-label')).toContain('etki 3')
    click(m.button('player-1/die-3'))
    expect(m.select).toHaveBeenLastCalledWith('player-1/die-3')
    expect(m.select).toHaveBeenCalledTimes(2)
  })
  it('resolves overlapping center targets at pointerdown and keeps that identity through release', async () => {
    vi.useFakeTimers()
    const m = await mount()
    const overlapping = m.button('player-1/die-2')
    // The kept neighbour receives the DOM hit, but the selected die is nearer.
    pointer(overlapping, 'pointerdown', 46 * 390 / 100, 55 * 844 / 100)
    pointer(overlapping, 'pointerup', 46 * 390 / 100, 55 * 844 / 100)
    click(overlapping)
    expect(m.select).toHaveBeenCalledExactlyOnceWith('player-1/die-3')
    pointer(overlapping, 'pointerdown', 46 * 390 / 100, 55 * 844 / 100)
    await vi.advanceTimersByTimeAsync(410)
    pointer(overlapping, 'pointerup'); click(overlapping); await nextTick()
    expect(m.root.querySelector('.die-face-preview')!.textContent).toContain('El')
    expect(m.select).toHaveBeenCalledTimes(1)
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
  it.each([[390, 844], [844, 390]])('exposes cards only in the near bowl and projected targets in both centers for either seat at %ix%i', async (width, height) => {
    for (const viewer of ['player-1', 'player-2'] as const) {
      const m = await mount(viewer, width, height)
      const opponent = viewer === 'player-1' ? 'player-2' : 'player-1'
      expect(m.button(`${opponent}/die-1`)).toBeNull()
      expect(m.button(`${viewer}/die-1`).querySelector('svg')).not.toBeNull()
      expect([...m.root.querySelectorAll('.die-lane-label')].map(el => el.textContent)).toEqual(['Sen · Hazne'])
      for (const owner of [viewer, opponent]) {
        for (const index of [2, 3]) {
          const target = m.button(`${owner}/die-${index}`)
          expect(m.root.querySelectorAll(`[data-die-id="${owner}/die-${index}"]`)).toHaveLength(1)
          expect(target.classList.contains('is-projected')).toBe(true)
          expect(target.querySelector('svg, .die-target-check, .die-target-value')).toBeNull()
          expect(target.style.left).toBe(`${m.targets.value.find(t => t.id === `${owner}/die-${index}`)!.x}%`)
        }
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
    expect(document.activeElement).toBe(m.button('player-1/die-4'))
    first.focus()
    first.click()
    expect(m.select).toHaveBeenCalledExactlyOnceWith('player-1/die-1')
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }))
    expect(document.activeElement).toBe(m.button('player-2/die-3'))
  })
})
