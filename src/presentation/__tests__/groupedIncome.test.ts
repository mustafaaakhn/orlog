import { describe, expect, it, vi } from 'vitest'
import { gsap } from 'gsap'
import { Group } from 'three'
import { Game, PLAYER_IDS } from '../../core'
import type { GameEvent, GameState, PlayerId } from '../../core'
import { createCombatPresenter } from '../combatPresenter'
import { applyResourceProgress, resourceSteps } from '../resources'
import { mockBoard } from './testBoard'

function income(playerId: PlayerId, count: number): Extract<GameEvent, { type: 'TokensGained' }> {
  return { type: 'TokensGained', playerId, dieIds: Array.from({ length: count }, (_, i) => `${playerId}/${(['die-1', 'die-2', 'die-3', 'die-4', 'die-5', 'die-6', 'bonus-1', 'bonus-2', 'bonus-3'] as const)[i]!}` as const), tokens: 12 + count, id: `${playerId}/income`, round: 1, sequence: 1, revision: 1 }
}
function timeline() { return gsap.globalTimeline.getChildren(false, false, true).at(-1)! }

describe('grouped dice income', () => {
  for (const playerId of PLAYER_IDS) for (const count of [0, 1, 5, 6, 9]) {
    for (const [speed, reduced] of [[1, false], [4, false], [4, true]] as const) {
      it(`${playerId}: ${count} sources share one arrival (${speed}×, reduced ${reduced})`, async () => {
        let shown: GameState = new Game().state
        shown = { ...shown, players: { ...shown.players, [playerId]: { ...shown.players[playerId], tokens: 12 } } }
        const event = income(playerId, count), board = mockBoard(shown)
        for (const [i, id] of event.dieIds.entries()) {
          const die = board.dice.get(id) ?? new Group()
          if (!die.getObjectByName('activity-marker')) die.add(Object.assign(new Group(), { name: 'activity-marker', visible: false }))
          die.position.set(i, 1, 0); board.dice.set(id, die)
        }
        const prepare = vi.spyOn(board.gain, 'prepare'), move = vi.spyOn(board.gain, 'move'), landing = vi.spyOn(board.steal, 'prepare')
        const progress = vi.fn((e: GameEvent, step: number) => { shown = applyResourceProgress(shown, e, step) })
        const presenter = createCombatPresenter(board, () => {}, () => speed, () => reduced, { progress })
        presenter.setPaused(true)
        const playing = presenter.play(event)
        expect(shown.players[playerId].tokens).toBe(12)
        expect(progress).not.toHaveBeenCalled()
        expect(resourceSteps(event)).toBe(count ? 1 : 0)
        if (count) {
          expect(prepare.mock.calls[0]![0]).toHaveLength(count)
          expect(event.dieIds.every(id => board.dice.get(id)!.getObjectByName('activity-marker')!.visible)).toBe(true)
          // Seek within the flight: every source is carried in one instance update;
          // the permanent pile still holds its old balance.
          presenter.setPaused(false)
          timeline().pause().time(reduced ? .2 : .5)
          expect(progress).not.toHaveBeenCalled()
          expect(shown.players[playerId].tokens).toBe(12)
          if (!reduced) expect(move.mock.calls.at(-1)![0]).toHaveLength(count)
          timeline().progress(1)
        }
        await playing
        expect(progress).toHaveBeenCalledTimes(count ? 1 : 0)
        if (count) {
          expect(progress).toHaveBeenCalledWith(event, 1)
          expect(landing).toHaveBeenCalledExactlyOnceWith(playerId, 12, count)
          expect(shown.players[playerId].tokens).toBe(event.tokens)
          expect(applyResourceProgress(shown, event, 1).players).toEqual(shown.players)
          expect(applyResourceProgress(shown, event, 2)).toBe(shown)
          expect(event.dieIds.every(id => !board.dice.get(id)!.getObjectByName('activity-marker')!.visible)).toBe(true)
          expect(presenter.collected.size).toBe(0)
        } else { expect(prepare).not.toHaveBeenCalled(); expect(landing).not.toHaveBeenCalled() }
        if (reduced || !count) expect(move).not.toHaveBeenCalled()
        presenter.dispose()
      })
    }
  }
  it('cancels a paused transfer without contact and cleans the cargo and all source markers', async () => {
    const board = mockBoard(new Game().state), progress = vi.fn(), clear = vi.spyOn(board.gain, 'clear')
    const presenter = createCombatPresenter(board, () => {}, () => 1, () => false, { progress })
    presenter.setPaused(true)
    const event = income('player-2', 5), playing = presenter.play(event)
    presenter.dispose(); await playing
    expect(progress).not.toHaveBeenCalled()
    expect(clear).toHaveBeenCalled()
    expect(event.dieIds.every(id => !board.dice.get(id)!.getObjectByName('activity-marker')!.visible)).toBe(true)
  })
})
