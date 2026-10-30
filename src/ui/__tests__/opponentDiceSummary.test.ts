import { effectScope, nextTick, shallowRef, createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'
import { Game } from '../../core'
import type { GameEvent, GameState } from '../../core'
import type { PresentationBatch } from '../../app/rollSession'
import { useVisibleDice } from '../../presentation/visibleDice'
import OpponentDiceSummary from '../OpponentDiceSummary.vue'

const render = (state: GameState, rolling: readonly string[] = [], viewerId: 'player-1' | 'player-2' = 'player-1') => renderToString(createSSRApp(OpponentDiceSummary, { state, viewerId, rolling, collected: [] }))

describe('opponent bowl presentation', () => {
  it('withholds new faces until the exact roll presentation completes, without resetting them at later resource publications', async () => {
    const game = new Game({ firstPlayerId: 'player-2', random: () => .6 })
    const source = shallowRef(game.state), before = game.state
    const rolled = game.dispatch({ type: 'RollDice', playerId: 'player-2' })
    if (!rolled.ok) throw new Error('Expected roll')
    const batch = shallowRef<PresentationBatch | null>(null), scope = effectScope()
    const view = scope.run(() => useVisibleDice(() => source.value, () => batch.value))!
    batch.value = { id: 1, revision: rolled.state.revision, state: rolled.state, events: rolled.events }
    await nextTick()
    expect(view.state.value).toBe(before)
    const html = await render(view.state.value, view.rolling('player-2'))
    expect(html.match(/aria-label="Atılıyor"/g)).toHaveLength(6)
    expect(html).not.toContain('<svg')
    const roll = rolled.events.find(event => event.type === 'DiceRolled')!
    view.presented(99, roll)
    expect(view.state.value).toBe(before)
    for (const event of rolled.events) view.presented(1, event)
    expect(view.rolling('player-2')).toEqual([])
    expect(await render(view.state.value)).toContain('Miğfer')
    expect(view.state.value.players['player-2'].dice.map(die => die.faceId)).toEqual(rolled.state.players['player-2'].dice.map(die => die.faceId))
    source.value = { ...before, players: { ...before.players, 'player-1': { ...before.players['player-1'], health: 12 } } }
    await nextTick()
    expect(await render(view.state.value)).toContain('Miğfer')
    source.value = rolled.state; batch.value = null; await nextTick()
    expect(view.state.value).toBe(rolled.state)
    const shown = view.state.value
    view.presented(1, roll)
    expect(view.state.value).toBe(shown)
    scope.stop()
  })

  it('shows only the other seat’s unkept, unselected, present dice and preserves gold markers and values', async () => {
    const base = new Game().state
    const opponent = base.players['player-2']
    const state = { ...base, players: { ...base.players, 'player-2': { ...opponent, dice: opponent.dice.map((die, i) => ({ ...die, faceId: 'arrow' as const, kept: i === 1, selected: i === 2, removed: i === 3, value: i === 0 ? 3 : 1 })) } } }
    const html = await render(state)
    expect(html).toContain('player-2/die-1')
    expect(html).toContain('Ok, jeton getirir, etki 3')
    expect(html).toContain('token-icon')
    for (const id of ['player-2/die-2', 'player-2/die-3', 'player-2/die-4', 'player-1/die-1']) expect(html).not.toContain(`data-die-id="${id}"`)
    const otherSeat = await render(state, [], 'player-2')
    expect(otherSeat).toContain('player-1/die-1')
    expect(otherSeat).not.toContain('player-2/die-1')
  })

  it('applies recast, removal and new-round events at completion and rejects superseded callbacks', async () => {
    const source = shallowRef(new Game().state), scope = effectScope()
    const batch = shallowRef<PresentationBatch | null>(null)
    const view = scope.run(() => useVisibleDice(() => source.value, () => batch.value))!
    const die = { ...source.value.players['player-2'].dice[0]!, faceId: 'hand' as const }
    const recast: GameEvent = { type: 'DiceRecast', playerId: 'player-2', favorId: 'friggs-sight', added: false, dice: [die], id: 'recast', sequence: 1, revision: 1, round: 1 }
    const removed: GameEvent = { type: 'DiceRemoved', playerId: 'player-1', targetId: 'player-2', favorId: 'lokis-trick', dieIds: [die.id], id: 'remove', sequence: 2, revision: 1, round: 1 }
    batch.value = { id: 1, revision: 1, state: source.value, events: [recast, removed] }; await nextTick()
    expect(await render(view.state.value, view.rolling('player-2'))).not.toContain('El')
    view.presented(1, recast)
    expect(await render(view.state.value)).toContain('aria-label="El"')
    view.presented(1, removed)
    expect(await render(view.state.value)).not.toContain(`data-die-id="${die.id}"`)
    const afterRemoval = view.state.value
    view.presented(1, recast)
    expect(view.state.value).toBe(afterRemoval)
    const fresh = new Game({ gameId: 'next-match' }).state
    source.value = fresh; batch.value = null; await nextTick()
    view.presented(1, removed)
    expect(view.state.value).toBe(fresh)
    scope.stop()
  })
})
