// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import { Game, getDieFace } from '../../core'
import type { FaceId, GameEventPayload } from '../../core'
import { resolveRound } from '../../core/resolution'
import { setLocale, t } from '../../i18n'
import GameGuide from '../GameGuide.vue'
import { GUIDE_EXAMPLES } from '../guideExamples'

const cleanups: (() => void)[] = []
afterEach(() => { cleanups.splice(0).forEach(stop => stop()); document.body.innerHTML = '' })
async function mount() {
  const close = vi.fn(), root = document.createElement('div'); document.body.append(root)
  const app = createApp({ render: () => h(GameGuide, { onClose: close }) }); app.mount(root)
  cleanups.push(() => app.unmount()); await nextTick()
  const button = (text: string) => [...root.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent?.includes(text))!
  return { root, close, button }
}

describe('two-page game guide', () => {
  it('navigates both ways with fresh scroll and heading focus, and closes without a game action', async () => {
    const m = await mount(), scroll = m.root.querySelector<HTMLElement>('.guide-scroll')!
    expect(m.root.querySelector('h3')!.textContent).toContain('rakibin canını')
    expect(m.root.querySelectorAll('[aria-current="page"]')).toHaveLength(1)
    scroll.scrollTop = 320
    m.button('Örneklerle devam et').click(); await nextTick(); await nextTick()
    expect(m.root.querySelectorAll('[data-example]')).toHaveLength(4)
    expect(scroll.scrollTop).toBe(0)
    expect(document.activeElement).toBe(m.root.querySelector('h3'))
    expect(m.close).not.toHaveBeenCalled()
    m.button('Önceki sayfa').click(); await nextTick(); await nextTick()
    expect(m.root.querySelector('[data-example]')).toBeNull()
    m.button('Zarlar ve örnekler').click(); await nextTick()
    m.button('Anladım').click()
    expect(m.close).toHaveBeenCalledExactlyOnceWith()
  })
  it('translates the active example page without losing its place', async () => {
    const m = await mount()
    m.button('Zarlar ve örnekler').click(); await nextTick()
    for (const language of ['en', 'fr', 'de', 'tr'] as const) {
      setLocale(language, false); await nextTick()
      expect(m.root.querySelector('h3')!.textContent).toBe(t('Hangi zar, neyi etkiler?'))
      for (const example of GUIDE_EXAMPLES) {
        expect(m.root.querySelector(`[data-example="${example.id}"] h4`)!.textContent).toBe(t(example.title))
        expect(t(example.explanation)).not.toMatch(/\{\d+\}/)
        if (language !== 'tr') expect(t(example.explanation)).not.toBe(example.explanation)
      }
    }
    expect(m.close).not.toHaveBeenCalled()
  })
})

describe('guide examples agree with authoritative rules', () => {
  const face = (symbol: string): FaceId => symbol === 'axe' ? 'axe-1' : symbol as FaceId
  it.each(GUIDE_EXAMPLES)('$id has the illustrated block, damage and token outcome', example => {
    const state: Parameters<typeof resolveRound>[0] = JSON.parse(JSON.stringify(new Game({ firstPlayerId: 'player-1' }).state))
    state.phase = { name: 'resolution' }
    for (const player of Object.values(state.players)) {
      player.favorChoice = { status: 'skipped' }
      player.dice.forEach(die => { die.removed = true; die.kept = true })
    }
    function reveal(playerId: 'player-1' | 'player-2', symbols: readonly string[]) {
      for (const symbol of symbols) {
        const faceId = face(symbol)
        const die = state.players[playerId].dice.find(d => d.removed && !getDieFace(d.definitionId, faceId).grantsToken)
        expect(die).toBeDefined()
        Object.assign(die!, { faceId, removed: false })
      }
    }
    reveal('player-1', example.attack)
    reveal('player-2', example.defense)
    state.players['player-2'].tokens = example.targetTokens
    const events: GameEventPayload[] = []; resolveRound(state, events)
    expect(events.filter(e => e.type === 'AttackBlocked')).toHaveLength(example.blocked)
    expect(15 - state.players['player-2'].health).toBe(example.damage)
    expect(state.players['player-1'].tokens).toBe(example.stolen)
    expect(state.players['player-2'].tokens).toBe(example.targetTokens - example.stolen)
    if (example.id === 'steal') {
      expect(events.flatMap(e => e.type === 'TokensStolen' && e.playerId === 'player-1' ? [e.amount] : [])).toEqual([example.stolen])
      expect(state.players['player-1'].tokens).toBe(2)
      expect(state.players['player-2'].tokens).toBe(1)
    }
  })
  it('keeps the framed helmet’s normal defense while granting its extra token', () => {
    const state: Parameters<typeof resolveRound>[0] = JSON.parse(JSON.stringify(new Game().state))
    state.phase = { name: 'resolution' }
    for (const player of Object.values(state.players)) {
      player.favorChoice = { status: 'skipped' }
      player.dice.forEach(die => { die.removed = true; die.kept = true })
    }
    Object.assign(state.players['player-1'].dice[1]!, { faceId: 'helmet', removed: false })
    Object.assign(state.players['player-2'].dice[0]!, { faceId: 'axe-1', removed: false })
    const events: GameEventPayload[] = []; resolveRound(state, events)
    expect(state.players['player-1'].tokens).toBe(1)
    expect(state.players['player-1'].health).toBe(15)
    expect(events.filter(e => e.type === 'AttackBlocked')).toHaveLength(1)
  })
})
