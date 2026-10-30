import { describe, expect, it, vi } from 'vitest'
import { gsap } from 'gsap'
import { Game, PLAYER_IDS } from '../../core'
import type { GameEvent, PlayerId } from '../../core'
import { createCombatPresenter } from '../combatPresenter'
import { applyResourceProgress, resourceSteps } from '../resources'
import { mockBoard } from './testBoard'

function payment(playerId: PlayerId, cost: number): Extract<GameEvent, { type: 'FavorInvoked' }> {
  return { type: 'FavorInvoked', playerId, favorId: 'iduns-rejuvenation', level: 3, cost, tokens: 60 - cost, id: `${playerId}/payment`, round: 1, sequence: 1, revision: 1 }
}
function timeline() { return gsap.globalTimeline.getChildren(false, false, true).at(-1)! }
async function finishInvocation() {
  // Payment completion precedes the existing god activation pulse.
  await Promise.resolve()
  await Promise.resolve()
  timeline().progress(1)
}

describe('one group per god payment', () => {
  for (const playerId of PLAYER_IDS) for (const cost of [0, 1, 10, 18]) {
    for (const [speed, reduced] of [[1, false], [4, false], [1, true]] as const) {
      it(`${playerId}: pays ${cost} in one contact (${speed}×, reduced ${reduced})`, async () => {
        const initial = new Game().state
        let shown = { ...initial, players: { ...initial.players, [playerId]: { ...initial.players[playerId], tokens: 60 } } }
        const board = mockBoard(shown), event = payment(playerId, cost), snapshot = JSON.stringify(event)
        const prepare = vi.spyOn(board.steal, 'prepare'), cargo = vi.spyOn(board.steal, 'cargo'), lift = vi.spyOn(board.steal, 'lift')
        const progress = vi.fn((e: GameEvent, step: number) => { shown = applyResourceProgress(shown, e, step) })
        const presenter = createCombatPresenter(board, () => {}, () => speed, () => reduced, { progress })
        presenter.setPaused(true)
        const playing = presenter.play(event)
        expect(resourceSteps(event)).toBe(cost ? 1 : 0)
        expect(shown.players[playerId].tokens).toBe(60)
        expect(progress).not.toHaveBeenCalled()
        if (cost) {
          expect(prepare).toHaveBeenCalledExactlyOnceWith(playerId, event.tokens, cost)
          expect(cargo.mock.calls[0]![0]).toHaveLength(cost)
          expect(board.steal.object.visible).toBe(false)
          presenter.setPaused(false)
          timeline().pause().time(reduced ? .1 : .3)
          expect(progress).not.toHaveBeenCalled()
          expect(shown.players[playerId].tokens).toBe(60)
          expect(lift).toHaveBeenCalledTimes(reduced ? 0 : 1)
          expect(board.steal.object.visible).toBe(!reduced)
          expect(board.tokenEffect.visible).toBe(false)
          timeline().progress(1)
        } else {
          expect(prepare).not.toHaveBeenCalled()
          expect(cargo).not.toHaveBeenCalled()
        }
        await finishInvocation()
        presenter.setPaused(false)
        timeline().progress(1)
        await playing
        expect(progress).toHaveBeenCalledTimes(cost ? 1 : 0)
        if (cost) expect(progress).toHaveBeenCalledWith(event, 1)
        expect(shown.players[playerId].tokens).toBe(event.tokens)
        expect(applyResourceProgress(shown, event, 2)).toBe(shown)
        expect(board.steal.object.visible).toBe(false)
        expect(JSON.stringify(event)).toBe(snapshot)
        presenter.dispose()
      })
    }
  }

  it('has the same transfer duration for one and eighteen paid tokens', async () => {
    const durations: number[] = []
    for (const cost of [1, 18]) {
      const presenter = createCombatPresenter(mockBoard(new Game().state), () => {}, () => 1)
      presenter.setPaused(true)
      const playing = presenter.play(payment('player-1', cost))
      durations.push(timeline().duration())
      presenter.setPaused(false)
      timeline().progress(1)
      await finishInvocation()
      await playing
      presenter.dispose()
    }
    expect(durations[0]).toBe(durations[1])
  })

  for (const lifted of [false, true]) {
    it(`cleans an interrupted payment without contact (lifted ${lifted})`, async () => {
      const board = mockBoard(new Game().state), progress = vi.fn(), clear = vi.spyOn(board.steal, 'clear')
      const presenter = createCombatPresenter(board, () => {}, () => 1, () => false, { progress })
      presenter.setPaused(true)
      const playing = presenter.play(payment('player-2', 10))
      if (lifted) {
        presenter.setPaused(false)
        timeline().pause().time(.3)
        expect(board.steal.object.visible).toBe(true)
      }
      presenter.dispose()
      await playing
      expect(progress).not.toHaveBeenCalled()
      expect(clear).toHaveBeenCalled()
      expect(board.steal.object.visible).toBe(false)
    })
  }
})
