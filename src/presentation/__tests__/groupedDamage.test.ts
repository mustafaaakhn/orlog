import { describe, expect, it, vi } from 'vitest'
import { gsap } from 'gsap'
import { Game, PLAYER_IDS } from '../../core'
import type { GameEvent, GameState, PlayerId } from '../../core'
import { resolveRound } from '../../core/resolution'
import { createCombatPresenter } from '../combatPresenter'
import { applyResourceProgress, resourceSteps } from '../resources'
import { applyResourceEvent } from '../resources'
import { createEventQueue } from '../eventQueue'
import { mockBoard } from './testBoard'

function damage(targetId: PlayerId, amount: number, health = 15 - amount): Extract<GameEvent, { type: 'DamageDealt' }> {
  return { type: 'DamageDealt', playerId: targetId === 'player-1' ? 'player-2' : 'player-1', targetId, amount, health, favorId: 'thors-strike', id: 'hit', round: 1, sequence: 1, revision: 1 }
}
function timeline() { return gsap.globalTimeline.getChildren(false, false, true).at(-1)! }

describe('grouped favor damage', () => {
  for (const targetId of PLAYER_IDS) for (const [amount, health] of [[0, 15], [1, 14], [5, 10], [3, 0]] as const) {
    for (const [speed, reduced] of [[1, false], [4, false], [1, true], [4, true]] as const) {
      it(`${targetId}: ${amount} stones share one contact at ${speed}× (reduced ${reduced})`, async () => {
        const initial = new Game().state
        let shown = { ...initial, players: { ...initial.players, [targetId]: { ...initial.players[targetId], health: health + amount } } }
        const board = mockBoard(shown), event = damage(targetId, amount, health)
        const originals = Array.from({ length: 15 }, (_, i) => board.lifeStone(targetId, i).material.emissive.clone())
        const progress = vi.fn((e: GameEvent, step: number) => {
          shown = applyResourceProgress(shown, e, step)
          for (let i = 0; i < 15; i++) board.lifeStone(targetId, i).visible = i < shown.players[targetId].health
        })
        const presenter = createCombatPresenter(board, () => {}, () => speed, () => reduced, { progress })
        presenter.setPaused(true)
        const playing = presenter.play(event)
        expect(resourceSteps(event)).toBe(amount ? 1 : 0)
        expect(progress).not.toHaveBeenCalled()
        for (let i = 0; i < 15; i++) {
          expect(board.lifeStone(targetId, i).material.emissive.getHexString()).toBe(amount && i >= health && i < health + amount ? 'e52d46' : originals[i]!.getHexString())
        }
        if (amount) {
          expect(board.effect.visible).toBe(!reduced)
          presenter.setPaused(false)
          timeline().progress(1)
          await Promise.resolve()
          await Promise.resolve() // Flight cleanup resolves before the common stone pulse.
          expect(progress).not.toHaveBeenCalled()
          expect(shown.players[targetId].health).toBe(health + amount)
          timeline().pause().time(.05)
          expect(progress).not.toHaveBeenCalled()
          timeline().progress(1)
        }
        await playing
        expect(progress).toHaveBeenCalledTimes(amount ? 1 : 0)
        if (amount) {
          expect(progress).toHaveBeenCalledWith(event, 1)
          expect(shown.players[targetId].health).toBe(health)
          expect(applyResourceProgress(shown, event, 1).players).toEqual(shown.players)
          expect(applyResourceProgress(shown, event, 2)).toBe(shown)
          for (let i = health; i < health + amount; i++) expect(board.lifeStone(targetId, i).visible).toBe(false)
        }
        for (let i = 0; i < 15; i++) expect(board.lifeStone(targetId, i).material.emissive).toEqual(originals[i])
        expect(presenter.collected.size).toBe(0)
        presenter.dispose()
      })
    }
  }
  it('restores every highlighted material immediately when a paused group is cancelled', async () => {
    const board = mockBoard(new Game().state), progress = vi.fn()
    const presenter = createCombatPresenter(board, () => {}, () => 1, () => false, { progress })
    const stone = board.lifeStone('player-2', 10), original = stone.material.emissive.clone(), intensity = stone.material.emissiveIntensity
    presenter.setPaused(true)
    const playing = presenter.play(damage('player-2', 5))
    presenter.dispose()
    expect(stone.material.emissive).toEqual(original)
    expect(stone.material.emissiveIntensity).toBe(intensity)
    await playing
    expect(progress).not.toHaveBeenCalled()
    expect(board.effect.visible).toBe(false)
  })
  it('uses the real resolver amount when a nominal five damage kills a three-health player', () => {
    for (const targetId of PLAYER_IDS) {
      const s = structuredClone(new Game().state) as Parameters<typeof resolveRound>[0]
      const attacker = targetId === 'player-1' ? 'player-2' : 'player-1'
      s.phase = { name: 'resolution' }
      for (const p of Object.values(s.players)) { p.tokens = 20; p.favorChoice = { status: 'skipped' }; p.dice.forEach(d => { d.faceId = 'helmet'; d.kept = true }) }
      s.players[targetId].health = 3
      s.players[attacker].favorChoice = { status: 'chosen', favorId: 'thors-strike', level: 2 }
      const events: Parameters<typeof resolveRound>[1] = []
      resolveRound(s, events)
      const hit = events.find(e => e.type === 'DamageDealt')!
      expect(hit).toMatchObject({ amount: 3, health: 0, targetId })
      expect(s.phase).toMatchObject({ name: 'ended', winnerId: attacker })
      expect(events.findIndex(e => e.type === 'GameEnded')).toBeGreaterThan(events.indexOf(hit))
    }
  })
  it('finishes the shared damage contact before the real Mímir reaction, and suppresses that reaction on death', async () => {
    for (const health of [15, 3]) {
      const s = structuredClone(new Game().state) as Parameters<typeof resolveRound>[0]
      s.phase = { name: 'resolution' }
      for (const p of Object.values(s.players)) { p.tokens = 20; p.favorChoice = { status: 'skipped' }; p.dice.forEach(d => { d.faceId = 'helmet'; d.kept = true }) }
      s.players['player-1'].favorChoice = { status: 'chosen', favorId: 'thors-strike', level: 2 }
      s.players['player-2'].favorChoice = { status: 'chosen', favorId: 'mimirs-wisdom', level: 1 }
      s.players['player-2'].health = health
      let shown: GameState = structuredClone(s)
      const payloads: Parameters<typeof resolveRound>[1] = []
      resolveRound(s, payloads)
      const events = payloads.map((e, i) => ({ ...e, id: `reactive/${i}`, sequence: i + 1, revision: 1, round: 1 }))
      const hit = events.find(e => e.type === 'DamageDealt')!
      const reaction = events.find(e => e.type === 'TokensGranted' && e.favorId === 'mimirs-wisdom')
      expect(!!reaction).toBe(health > 3)
      const trace: string[] = []
      const presenter = createCombatPresenter(mockBoard(shown), () => {}, () => 100, () => true, { progress(e, step) {
        shown = applyResourceProgress(shown, e, step)
        trace.push(`${e.id}/${step}`)
        if (e === hit) expect(shown.players['player-2'].health).toBe(hit.health)
        if (e === reaction) expect(shown.players['player-2'].health).toBe(10)
      } })
      const queue = createEventQueue(presenter.play, e => { shown = applyResourceEvent(shown, e) })
      await queue.play(events)
      expect(trace.filter(t => t.startsWith(`${hit.id}/`))).toEqual([`${hit.id}/1`])
      if (reaction) expect(trace.indexOf(`${reaction.id}/1`)).toBeGreaterThan(trace.indexOf(`${hit.id}/1`))
      expect(shown.players).toEqual(s.players)
      queue.dispose(); presenter.dispose()
    }
  })
})
