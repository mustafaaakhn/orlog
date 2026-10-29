import { describe, expect, it } from 'vitest'
import { Game, PLAYER_IDS } from '../../core'
import type { GameEvent, GameEventPayload, GameState } from '../../core'
import { resolveRound } from '../../core/resolution'
import { applyResourceEvent, applyResourceProgress, resourceSteps } from '../resources'
import { eventDice, lastContributions, phaseTitle } from '../resolutionPlan'
import { createCombatPresenter } from '../combatPresenter'
import { createEventQueue } from '../eventQueue'
import { mockBoard } from './testBoard'
import { createDicePresenter } from '../dicePresenter'
import { recordRoll } from '../rollSimulation'
import { collectionSlot, TABLE_HALF_DEPTH } from '../../scene/tableLayout'

type Draft = Parameters<typeof resolveRound>[0]
function fixture() {
  const state = structuredClone(new Game().state) as Draft
  state.phase = { name: 'resolution' }
  for (const id of PLAYER_IDS) {
    const player = state.players[id]
    player.health = 6; player.tokens = 50
    player.favorChoice = { status: 'skipped' }
    player.dice.forEach(die => { die.faceId = 'axe-1'; die.kept = true })
  }
  state.players['player-1'].favorChoice = { status: 'chosen', favorId: 'hels-grip', level: 1 }
  const defender = state.players['player-2']
  defender.favorChoice = { status: 'chosen', favorId: 'heimdalls-watch', level: 1 }
  defender.dice.forEach(die => { die.faceId = 'hand' })
  defender.dice[1]!.faceId = 'helmet'; defender.dice[1]!.value = 3
  const before = structuredClone(state)
  const payloads: GameEventPayload[] = []
  resolveRound(state, payloads)
  const events: GameEvent[] = payloads.map((event, i) => ({ ...event, id: `test/${i + 1}`, sequence: i + 1, revision: 1, round: 1 }))
  return { before, state, events }
}

describe('event-driven resolution presentation', () => {
  it('keeps a framed multi-block defender and attackers through their final reactive effects', () => {
    const { events } = fixture(), last = lastContributions(events)
    const defender = 'player-2/die-2'
    const blocks = events.filter(event => event.type === 'AttackBlocked')
    expect(blocks).toHaveLength(3)
    const finalHeal = events.filter(event => event.type === 'HealthRestored' && event.dieIds?.includes(defender)).at(-1)!
    expect(last.get(defender)).toBe(finalHeal.id)
    const gold = events.find(event => event.type === 'TokensGained' && event.dieIds.includes(defender))!
    expect(gold.sequence).toBeLessThan(finalHeal.sequence)
    const axeHeal = events.find(event => event.type === 'HealthRestored' && event.favorId === 'hels-grip')!
    expect(eventDice(axeHeal)).toHaveLength(1)
    expect(last.get(eventDice(axeHeal)[0]!)).toBe(axeHeal.id)
  })

  it('records hand and arrow sources for Bragi and Skuld without changing resource outcomes', () => {
    for (const [favor, face, type] of [['bragis-verve', 'hand', 'TokensGranted'], ['skulds-claim', 'arrow', 'TokensDestroyed']] as const) {
      const s = structuredClone(new Game().state) as Draft
      s.phase = { name: 'resolution' }
      for (const player of Object.values(s.players)) {
        player.tokens = 50; player.favorChoice = { status: 'skipped' }
        player.dice.forEach(die => { die.faceId = 'helmet' })
      }
      s.players['player-1'].favorChoice = { status: 'chosen', favorId: favor, level: 1 }
      s.players['player-1'].dice[0]!.faceId = face
      const events: GameEventPayload[] = []
      resolveRound(s, events)
      expect(events.find(e => e.type === type)).toMatchObject({ amount: 2, dieIds: ['player-1/die-1'] })
    }
  })

  it('derives all multi-resource intermediate values from final event amounts, without accumulating on replay', () => {
    const { before } = fixture()
    const payloads: GameEventPayload[] = [
      { type: 'TokensGained', playerId: 'player-1', dieIds: ['player-1/die-1', 'player-1/die-2', 'player-1/die-3'], tokens: 53 },
      { type: 'TokensStolen', playerId: 'player-1', targetId: 'player-2', amount: 3, tokens: 53, targetTokens: 47, dieIds: ['player-1/die-1'] },
      { type: 'FavorInvoked', playerId: 'player-1', favorId: 'thors-strike', level: 1, cost: 4, tokens: 46 },
      { type: 'DamageDealt', playerId: 'player-1', targetId: 'player-2', amount: 3, health: 3, favorId: 'thors-strike' },
      { type: 'HealthRestored', playerId: 'player-1', amount: 3, health: 9 },
      { type: 'HealthSacrificed', playerId: 'player-1', amount: 3, health: 3, favorId: 'odins-sacrifice' },
      { type: 'TokensGranted', playerId: 'player-1', amount: 3, tokens: 53, favorId: 'odins-sacrifice' },
      { type: 'TokensDestroyed', playerId: 'player-1', targetId: 'player-2', amount: 3, tokens: 47, favorId: 'tyrs-pledge' },
    ]
    for (const [i, payload] of payloads.entries()) {
      const event = { ...payload, id: `e/${i}`, sequence: i, revision: 1, round: 1 } as GameEvent
      let state: GameState = before
      const player = event.type === 'DamageDealt' || event.type === 'TokensDestroyed' ? 'player-2' : 'player-1'
      const field = ['DamageDealt', 'HealthSacrificed', 'HealthRestored'].includes(event.type) ? 'health' : 'tokens'
      const decreasing = ['DamageDealt', 'HealthSacrificed', 'FavorInvoked', 'TokensDestroyed'].includes(event.type)
      for (let step = 1; step <= resourceSteps(event); step++) {
        const previous = state.players[player][field]
        state = applyResourceProgress(state, event, step)
        expect(state.players[player][field]).toBe(previous + (event.type === 'TokensStolen' ? event.amount : event.type === 'TokensGained' ? event.dieIds.length : decreasing ? -1 : 1))
        expect(applyResourceProgress(state, event, step).players).toEqual(state.players)
      }
      expect(state.players).toEqual(applyResourceEvent(before, event).players)
    }
  })

  it('plays actual contacts and collects at last use in normal, fast and reduced motion with identical results', async () => {
    const { before, events, state } = fixture(), last = lastContributions(events)
    const traces: string[][] = []
    for (const [speed, reduced] of [[1, false], [4, false], [4, true]] as const) {
      const board = mockBoard(before)
      const trace: string[] = []
      let shown: GameState = before
      const presenter = createCombatPresenter(board, () => {}, () => speed, () => reduced, { progress(event, step) {
        trace.push(`${event.id}/${step}`)
        shown = applyResourceProgress(shown, event, step)
      } })
      const queue = createEventQueue(presenter.play, event => { shown = applyResourceEvent(shown, event) }, async event => {
        await presenter.collect([...last].filter(([, id]) => id === event.id).map(([id]) => id))
        for (const id of eventDice(event)) {
          const future = events.some(next => next.sequence > event.sequence && eventDice(next).includes(id))
          if (future) expect(presenter.collected.has(id)).toBe(false)
        }
      })
      await queue.play(events)
      await presenter.cleanup(state)
      expect(shown.players).toEqual(state.players)
      for (const player of Object.values(before.players)) for (const [index, die] of player.dice.entries()) {
        expect(presenter.collected.has(die.id)).toBe(true)
        // Collection indices follow completion order; every die occupies its own seat's area.
        const position = board.dice.get(die.id)!.position
        expect(position.z * (player.id === 'player-1' ? 1 : -1)).toBeGreaterThan(6)
        expect(index).toBeLessThan(9)
      }
      traces.push(trace)
      queue.dispose(); presenter.dispose()
    }
    expect(traces[0]).toEqual(traces[1]); expect(traces[1]).toEqual(traces[2])
  }, 60000)

  it('holds reduced feedback while paused and suppresses contacts after disposal', async () => {
    const { before, events } = fixture(), contacts: number[] = []
    const presenter = createCombatPresenter(mockBoard(before), () => {}, () => 20, () => true, { progress: (_event, step) => contacts.push(step) })
    const hit = events.find(event => event.type === 'DamageDealt')!
    presenter.setPaused(true)
    const playing = presenter.play(hit)
    await new Promise(resolve => setTimeout(resolve, 40))
    expect(contacts).toEqual([])
    presenter.setPaused(false)
    await playing
    expect(contacts).toEqual([1])
    const cancelled = presenter.play(hit)
    presenter.dispose()
    await cancelled
    expect(contacts).toEqual([1])
  })

  it('does not return collected dice to the center when a later favor rearranges other dice', async () => {
    const { before } = fixture(), board = mockBoard(before)
    const id = 'player-1/die-1', changed = before.players['player-1'].dice[1]!
    board.dice.get(id)!.position.set(...collectionSlot('player-1', 0))
    const position = board.dice.get(id)!.position.clone()
    const presenter = createDicePresenter(board.dice, () => {}, { record: recordRoll, reduced: () => true, collected: new Set([id]) })
    await presenter.play({ id: 1, revision: 1, state: before, events: [{ type: 'DiceRecast', playerId: 'player-1', favorId: 'friggs-sight', added: false, dice: [changed], id: 'recast', sequence: 1, revision: 1, round: 1 }] })
    expect(board.dice.get(id)!.position).toEqual(position)
    presenter.dispose()
  })

  it('announces real phase changes, not each alternating player or selection step', () => {
    const e = { id: 'e', sequence: 1, round: 2, revision: 1 }
    expect(phaseTitle({ ...e, type: 'RoundStarted', firstPlayerId: 'player-2' }, 'round-complete')).toBe('Tur 2 · Zar atışı')
    expect(phaseTitle({ ...e, type: 'PhaseChanged', phase: { name: 'favor', activePlayerId: 'player-2' } }, 'favor')).toBe('')
    expect(phaseTitle({ ...e, type: 'PhaseChanged', phase: { name: 'resolution' } }, 'favor')).toBe('Çözümleme')
    expect(collectionSlot('player-1', 8)[2] + 0.44).toBeLessThan(TABLE_HALF_DEPTH)
  })
})
