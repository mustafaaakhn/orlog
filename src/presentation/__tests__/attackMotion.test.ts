import { describe, expect, it, vi } from 'vitest'
import { gsap } from 'gsap'
import { Game } from '../../core'
import type { GameEvent } from '../../core'
import { createCombatPresenter } from '../combatPresenter'
import { mockBoard } from './testBoard'

const meta = { id: 'attack', round: 1, sequence: 1, revision: 1 }
const hit: Extract<GameEvent, { type: 'DamageDealt' }> = {
  ...meta, type: 'DamageDealt', playerId: 'player-1', targetId: 'player-2',
  dieId: 'player-1/die-1', symbol: 'axe', amount: 2, health: 0,
}
const block: Extract<GameEvent, { type: 'AttackBlocked' }> = {
  ...meta, type: 'AttackBlocked', playerId: 'player-1', targetId: 'player-2',
  dieId: 'player-1/die-1', defenderDieId: 'player-2/die-1', symbol: 'axe',
}
function timeline() { return gsap.globalTimeline.getChildren(false, false, true).at(-1)! }
async function flush() { for (let i = 0; i < 4; i++) await Promise.resolve() }
function setup(reduced = false) {
  const board = mockBoard(new Game().state), progress = vi.fn()
  const source = board.dice.get(hit.dieId!)!, target = board.dice.get(block.defenderDieId)!
  source.position.set(0, .5, 2); target.position.set(0, .5, -2)
  const home = source.position.clone(), targetHome = target.position.clone()
  const presenter = createCombatPresenter(board, () => {}, () => 1, () => reduced, { progress })
  return { board, progress, source, target, home, targetHome, presenter }
}
describe('event-owned attacking dice', () => {
  it('moves the actual source, reacts at the defender and returns both before collection', async () => {
    const h = setup(), playing = h.presenter.play(block), t = timeline().pause()
    t.time(.3)
    expect(h.source.position.toArray()).not.toEqual(h.home.toArray())
    expect(h.source.userData.combatRole).toBe('source')
    expect(h.target.userData.combatRole).toBe('target')
    t.time(.59)
    expect(h.target.position.toArray()).not.toEqual(h.targetHome.toArray())
    expect(h.progress).not.toHaveBeenCalled()
    t.progress(1); await playing
    expect(h.source.position.toArray()).toEqual(h.home.toArray())
    expect(h.target.position.toArray()).toEqual(h.targetHome.toArray())
    expect(h.presenter.collected.size).toBe(0)
    expect(h.source.userData.combatRole).toBeUndefined()
    h.presenter.dispose()
  })
  it.each([false, true])('contacts only the actual lost stones once per step; reduced=%s', async reduced => {
    const h = setup(reduced), playing = h.presenter.play(hit)
    for (let step = 1; step <= 2; step++) {
      const t = timeline().pause()
      t.time(reduced ? .1 : .4)
      expect(h.progress).toHaveBeenCalledTimes(step - 1)
      if (reduced) expect(h.source.position.toArray()).toEqual(h.home.toArray())
      t.time(reduced ? .15 : .55)
      expect(h.progress).toHaveBeenLastCalledWith(hit, step)
      expect(h.board.lifeStone('player-2', 2 - step).material.emissive.getHexString()).toBe('e52d46')
      t.progress(1); await flush()
    }
    await playing
    expect(h.progress.mock.calls.map(([, step]) => step)).toEqual([1, 2])
    expect(h.source.position.toArray()).toEqual(h.home.toArray())
    expect(h.presenter.collected.size).toBe(0)
    h.presenter.dispose()
  })
  it.each([hit, block])('restores transforms synchronously on cancellation of $type and never contacts afterwards', async event => {
    const h = setup(), playing = h.presenter.play(event)
    timeline().pause().time(.35)
    h.presenter.dispose()
    expect(h.source.position.toArray()).toEqual(h.home.toArray())
    expect(h.target.position.toArray()).toEqual(h.targetHome.toArray())
    expect(h.source.userData.combatRole).toBeUndefined()
    await playing
    expect(h.progress).not.toHaveBeenCalled()
  })
  it('freezes the event timeline during a pause and applies speed to that same timeline', async () => {
    const h = setup(); h.presenter.setPaused(true)
    const playing = h.presenter.play(hit)
    expect(timeline().paused()).toBe(true)
    h.presenter.setSpeed(4)
    expect(timeline().timeScale()).toBeCloseTo(4 / 1.7)
    h.presenter.dispose(); await playing
    expect(h.progress).not.toHaveBeenCalled()
  })
})
