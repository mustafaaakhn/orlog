import { describe, expect, it, vi } from 'vitest'
import { gsap } from 'gsap'
import { Game } from '../../core'
import type { GameEvent, GameState } from '../../core'
import { createCombatPresenter } from '../combatPresenter'
import { applyResourceProgress, resourceSteps } from '../resources'
import { mockBoard } from './testBoard'

const theft = { type: 'TokensStolen', playerId: 'player-1', targetId: 'player-2', amount: 5, tokens: 7, targetTokens: 7, dieIds: ['player-1/die-1'], id: 'theft', round: 1, sequence: 1, revision: 1 } as const

describe('one trip per actual theft event', () => {
  for (const [speed, reduced] of [[1, false], [4, false], [4, true]] as const) {
    it(`carries five plates together and updates both balances only at arrival (${speed}, ${reduced})`, async () => {
      let shown: GameState = new Game().state
      shown = { ...shown, players: { 'player-1': { ...shown.players['player-1'], tokens: 2 }, 'player-2': { ...shown.players['player-2'], tokens: 12 } } }
      const board = mockBoard(shown)
      const prepare = vi.spyOn(board.steal, 'prepare'), lift = vi.spyOn(board.steal, 'lift')
      const progress = vi.fn((event: GameEvent, step: number) => { shown = applyResourceProgress(shown, event, step) })
      const presenter = createCombatPresenter(board, () => {}, () => speed, () => reduced, { progress })
      presenter.setPaused(true)
      const playing = presenter.play(theft)
      expect(prepare).toHaveBeenCalledWith('player-2', 7, 5)
      expect(progress).not.toHaveBeenCalled()
      expect(shown.players['player-1'].tokens).toBe(2)
      expect(shown.players['player-2'].tokens).toBe(12)
      presenter.setPaused(false)
      await playing
      expect(lift).toHaveBeenCalledTimes(1)
      expect(progress).toHaveBeenCalledExactlyOnceWith(theft, 1)
      expect(shown.players['player-1'].tokens).toBe(7)
      expect(shown.players['player-2'].tokens).toBe(7)
      expect(resourceSteps(theft)).toBe(1)
      expect(applyResourceProgress(shown, theft, 1).players).toEqual(shown.players)
      expect(applyResourceProgress(shown, theft, 2)).toBe(shown)
      presenter.dispose()
    })
  }
  it('does not animate zero theft and disposal cancels an in-flight transfer', async () => {
    const board = mockBoard(new Game().state), prepare = vi.spyOn(board.steal, 'prepare'), progress = vi.fn()
    const presenter = createCombatPresenter(board, () => {}, () => 1, () => false, { progress })
    await presenter.play({ ...theft, amount: 0 })
    expect(prepare).not.toHaveBeenCalled()
    expect(resourceSteps({ ...theft, amount: 0 })).toBe(0)
    presenter.setPaused(true)
    const playing = presenter.play(theft)
    presenter.dispose()
    await playing
    expect(progress).not.toHaveBeenCalled()
  })
  it('extends combat to 1.7× while title timing, reduced motion and speed remain independent', async () => {
    for (const reduced of [false, true]) {
      const presenter = createCombatPresenter(mockBoard(new Game().state), () => {}, () => 1, () => reduced)
      presenter.setPaused(true)
      const playing = presenter.play(theft)
      const timeline = gsap.globalTimeline.getChildren(false, false, true).at(-1)!
      expect(timeline.timeScale()).toBeCloseTo(reduced ? 1 : 1 / 1.7)
      presenter.setSpeed(4)
      expect(timeline.timeScale()).toBeCloseTo(reduced ? 4 : 4 / 1.7)
      presenter.dispose(); await playing
      const other = createCombatPresenter(mockBoard(new Game().state), () => {}, () => 1, () => reduced)
      other.setPaused(true)
      const title = other.title('Tanrı gücü')
      expect(gsap.globalTimeline.getChildren(false, false, true).at(-1)!.timeScale()).toBe(1)
      other.dispose(); await title
    }
  })
})
