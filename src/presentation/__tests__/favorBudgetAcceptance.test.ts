import { describe, expect, it } from 'vitest'
import { Game } from '../../core'
import type { FaceId, GameEvent, GameEventPayload, GameState } from '../../core'
import { resolveRound } from '../../core/resolution'
import { createCombatPresenter } from '../combatPresenter'
import { applyResourceEvent, applyResourceProgress } from '../resources'
import { createEventQueue } from '../eventQueue'
import { mockBoard } from './testBoard'

describe('five existing tokens plus one frame and two stolen tokens', () => {
  it.each(['freyrs-gift', 'thors-strike'] as const)('preserves the real payment window of %s in both motion modes', async favorId => {
    const state = structuredClone(new Game().state) as Parameters<typeof resolveRound>[0]
    state.phase = { name: 'resolution' }
    const source = state.players['player-1'], target = state.players['player-2']
    source.tokens = 5; target.tokens = 2
    source.favorChoice = { status: 'chosen', favorId, level: favorId === 'freyrs-gift' ? 3 : 2 }
    target.favorChoice = { status: 'skipped' }
    const faces: FaceId[] = ['hand', 'hand', 'arrow', 'arrow', 'shield', 'helmet']
    source.dice.forEach((die, i) => { die.kept = true; die.faceId = faces[i]! })
    target.dice.forEach(die => { die.kept = true; die.faceId = 'axe-1' })
    const before: GameState = structuredClone(state), payloads: GameEventPayload[] = []
    resolveRound(state, payloads)
    const events: GameEvent[] = payloads.map((event, i) => ({ ...event, id: `budget/${i}`, sequence: i + 1, revision: 1, round: 1 }))
    const gained = events.find(e => e.type === 'TokensGained' && e.playerId === source.id)!
    const stolen = events.find(e => e.type === 'TokensStolen' && e.playerId === source.id)!
    expect(gained).toMatchObject({ dieIds: ['player-1/die-3'], tokens: 6 })
    expect(stolen).toMatchObject({ amount: 2, tokens: 8 })
    if (favorId === 'freyrs-gift') {
      const failed = events.find(e => e.type === 'FavorFailed')!
      expect(failed).toMatchObject({ favorId, reason: 'tokens' })
      expect(failed.sequence).toBeLessThan(gained.sequence)
      expect(events.some(e => e.type === 'FavorInvoked')).toBe(false)
      expect(source.tokens).toBe(8)
    } else {
      const paid = events.find(e => e.type === 'FavorInvoked')!
      expect(paid).toMatchObject({ favorId, cost: 8, tokens: 0 })
      expect(paid.sequence).toBeGreaterThan(stolen.sequence)
      expect(events.find(e => e.type === 'DamageDealt' && e.favorId === favorId)).toMatchObject({ amount: 5 })
      expect(source.tokens).toBe(0)
    }
    const traces: string[][] = []
    for (const reduced of [false, true]) {
      let shown = before
      const trace: string[] = []
      const presenter = createCombatPresenter(mockBoard(before), () => {}, () => 100, () => reduced, { progress(event, step) {
        shown = applyResourceProgress(shown, event, step)
        trace.push(`${event.id}/${step}`)
      } })
      const queue = createEventQueue(presenter.play, event => { shown = applyResourceEvent(shown, event) })
      await queue.play(events)
      expect(shown.players).toEqual(state.players)
      traces.push(trace); queue.dispose(); presenter.dispose()
    }
    expect(traces[0]).toEqual(traces[1])
  })
})
