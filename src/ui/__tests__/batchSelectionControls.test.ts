// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import { createRollSession } from '../../app/rollSession'
import { createDiceSelectionDraft } from '../../app/diceSelectionDraft'
import type { DieId } from '../../core'
import SceneDiceControls from '../SceneDiceControls.vue'

const cleanups: (() => void)[] = []
beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('ResizeObserver', class {
    constructor(private callback: (entries: unknown[]) => void) {}
    observe() { this.callback([{ contentRect: { width: 390, height: 844 } }]) }
    disconnect() {}
  })
})
afterEach(() => { cleanups.splice(0).forEach(fn => fn()); document.body.innerHTML = ''; vi.useRealTimers(); vi.unstubAllGlobals() })
async function mount() {
  const session = createRollSession({ random: () => 0.4 })
  session.dispatch({ type: 'RollDice', playerId: 'player-1' })
  session.settle(session.pending.value!.id)
  const dispatch = vi.fn(session.dispatch)
  const draft = createDiceSelectionDraft(() => ({ state: session.state.value, enabled: !session.pending.value }), dispatch)
  const targets = session.state.value.players['player-1'].dice.map((die, i) => ({ id: die.id, x: 25 + i * 8, y: 55 }))
  const root = document.createElement('div'); document.body.append(root)
  const app = createApp({ render: () => h(SceneDiceControls, {
    players: Object.values(session.state.value.players), targets, disabled: !!session.pending.value,
    collected: [], viewerId: 'player-1', selectablePlayer: session.pending.value ? null : 'player-1',
    draftSelectedIds: draft.selectedIds.value, onSelect: draft.toggle,
  }) })
  app.mount(root)
  cleanups.push(() => { app.unmount(); draft.dispose() })
  await nextTick()
  const button = (i: number) => root.querySelector<HTMLButtonElement>(`[data-die-id="player-1/die-${i}"]`)!
  return { root, session, draft, dispatch, button }
}
function pointer(button: HTMLElement, type: string, x = 150) {
  button.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerType: 'touch', pointerId: 1, isPrimary: true, clientX: x, clientY: 460 }))
}
function click(button: HTMLElement) { button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 })) }

describe('mobile selection draft face controls', () => {
  it('checks five bound faces immediately and preserves their nodes, positions and availability until the single batch', async () => {
    const m = await mount(), before = m.session.state.value
    const buttons = [1, 2, 3, 4, 5, 6].map(m.button)
    const positions = buttons.map(button => button.style.cssText)
    for (let i = 1; i <= 5; i++) {
      pointer(m.button(i), 'pointerdown'); pointer(m.button(i), 'pointerup'); click(m.button(i))
      await nextTick()
      expect(m.button(i).getAttribute('aria-pressed')).toBe('true')
      expect(m.button(i).querySelector('.die-target-check')).not.toBeNull()
      expect(m.button(i).getAttribute('aria-label')).toContain('bekleyen seçim')
      expect(m.root.querySelector('.die-face-preview')).toBeNull()
    }
    expect(m.session.state.value).toBe(before)
    buttons.forEach((button, i) => {
      expect(m.button(i + 1)).toBe(button)
      expect(button.style.cssText).toBe(positions[i])
      expect(button.getAttribute('aria-disabled')).toBe('false')
      expect(button.querySelector('svg path')).not.toBeNull()
    })
    await vi.advanceTimersByTimeAsync(1999)
    expect(m.dispatch).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(m.session.pending.value!.events.map(event => event.type)).toEqual(['DiceSelectionChanged'])
    expect(m.dispatch).toHaveBeenCalledTimes(1)
  })
  it('replaces the card with a projected target after selection, then restores it after undo', async () => {
    const m = await mount()
    const id = 'player-1/die-1'
    click(m.button(1)); await nextTick()
    expect(m.button(1).querySelector('svg')).not.toBeNull()
    await vi.advanceTimersByTimeAsync(2000)
    m.session.settle(m.session.pending.value!.id); await nextTick()
    expect(m.button(1).classList.contains('is-projected')).toBe(true)
    expect(m.button(1).querySelector('svg, .die-target-check')).toBeNull()
    expect(m.button(1).style.left).toBe('25%')
    click(m.button(1)); await nextTick()
    expect(m.draft.selectedIds.value).toEqual([])
    expect(m.button(1).classList.contains('is-projected')).toBe(true)
    await vi.advanceTimersByTimeAsync(2000)
    m.session.settle(m.session.pending.value!.id); await nextTick()
    expect(m.button(1).classList.contains('is-projected')).toBe(false)
    expect(m.button(1).querySelector('svg')).not.toBeNull()
    expect(m.session.state.value.players['player-1'].dice.find(die => die.id === id)!.selected).toBe(false)
    expect(m.dispatch).toHaveBeenCalledTimes(2)
  })
  it('undoes the check on a second tap without changing the authoritative face or issuing a command', async () => {
    const m = await mount(), face = m.session.state.value.players['player-1'].dice[0]!.faceId
    click(m.button(1)); await nextTick()
    expect(m.button(1).querySelector('.die-target-check')).not.toBeNull()
    click(m.button(1)); await nextTick()
    expect(m.button(1).getAttribute('aria-pressed')).toBe('false')
    expect(m.button(1).querySelector('.die-target-check')).toBeNull()
    await vi.advanceTimersByTimeAsync(2000)
    expect(m.session.state.value.players['player-1'].dice[0]!.faceId).toBe(face)
    expect(m.dispatch).not.toHaveBeenCalled()
  })
  it('consumes a long press released over a neighbour after the idle batch locks and unlocks input', async () => {
    const m = await mount()
    click(m.button(1))
    await vi.advanceTimersByTimeAsync(1350)
    pointer(m.button(2), 'pointerdown')
    await vi.advanceTimersByTimeAsync(450)
    expect(m.root.querySelector('.die-face-preview')).not.toBeNull()
    await vi.advanceTimersByTimeAsync(200)
    expect(m.session.pending.value!.events[0]!.type).toBe('DiceSelectionChanged')
    m.session.settle(m.session.pending.value!.id)
    await nextTick()
    pointer(m.button(2), 'pointerup')
    click(m.button(3)) // Native touch can retarget its click after the controls rearrange.
    await nextTick()
    expect(m.draft.selectedIds.value).toBeNull()
    expect(m.session.state.value.players['player-1'].dice.filter(die => die.selected).map(die => die.id)).toEqual(['player-1/die-1'])
    expect(m.dispatch).toHaveBeenCalledTimes(1)
    pointer(m.button(3), 'pointerdown'); pointer(m.button(3), 'pointerup'); click(m.button(3))
    expect(m.draft.selectedIds.value).toEqual(['player-1/die-1', 'player-1/die-3'])
  })
  it('uses keyboard activation for the same draft and keeps navigation from restarting its timer', async () => {
    const m = await mount()
    m.button(1).focus()
    m.button(1).click()
    await nextTick()
    await vi.advanceTimersByTimeAsync(1200)
    m.button(1).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }))
    expect(document.activeElement).toBe(m.button(2))
    await vi.advanceTimersByTimeAsync(799)
    expect(m.dispatch).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(m.dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'SetDiceSelection', playerId: 'player-1', dieIds: ['player-1/die-1'] })
  })
  it.each(['hold', 'drag'] as const)('does not extend an existing selection timer on %s', async kind => {
    const m = await mount()
    click(m.button(1))
    await vi.advanceTimersByTimeAsync(1000)
    pointer(m.button(2), 'pointerdown')
    if (kind === 'drag') pointer(m.button(2), 'pointermove', 180)
    await vi.advanceTimersByTimeAsync(450)
    pointer(m.button(2), 'pointerup'); click(m.button(2))
    await vi.advanceTimersByTimeAsync(549)
    expect(m.dispatch).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(m.dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'SetDiceSelection', playerId: 'player-1', dieIds: ['player-1/die-1'] as DieId[] })
  })
})
