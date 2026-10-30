import { describe, expect, it } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { Game, PLAYER_IDS } from '../../core'
import type { GameEvent, GameEventPayload, GameState, PlayerId } from '../../core'
import { resolveRound } from '../../core/resolution'
import { createRollSession } from '../../app/rollSession'
import MatchResources from '../MatchResources.vue'

const names = { 'player-1': 'Eivor', 'player-2': 'Sigurd' }

async function read(state: GameState, viewerId: PlayerId) {
  const html = await renderToString(createSSRApp(MatchResources, { state, viewerId, names }))
  const rows = [...html.matchAll(/<div[^>]*data-player-id="([^"]+)"[^>]*>([\s\S]*?)<\/div>/g)]
  return rows.map(([, id, row]) => ({
    id,
    name: row!.match(/class="mobile-resource-name"[^>]*>(.*?)<\/span>/)![1],
    health: Number(row!.match(/title="Can">[\s\S]*?<span>(\d+)<\/span>/)![1]),
    tokens: Number(row!.match(/title="Tanrı jetonu">[\s\S]*?<span>(\d+)<\/span>/)![1]),
  }))
}

function resolution() {
  const draft = structuredClone(new Game().state) as Parameters<typeof resolveRound>[0]
  draft.phase = { name: 'resolution' }
  for (const id of PLAYER_IDS) {
    draft.players[id].health = 7
    draft.players[id].tokens = 20
    draft.players[id].dice.forEach((die, index) => {
      die.faceId = id === 'player-1' ? 'hand' : index < 2 ? 'axe-1' : 'helmet'
      die.kept = true
    })
  }
  draft.players['player-1'].favorChoice = { status: 'chosen', favorId: 'iduns-rejuvenation', level: 1 }
  draft.players['player-2'].favorChoice = { status: 'chosen', favorId: 'thors-strike', level: 1 }
  const before = structuredClone(draft)
  const payloads: GameEventPayload[] = []
  resolveRound(draft, payloads)
  const events: GameEvent[] = payloads.map((event, index) => ({
    ...event, id: `hud/${index + 1}`, sequence: index + 1, revision: 1, round: 1,
  }))
  return { before, after: { ...draft, revision: 1, eventSequence: events.length }, events }
}

describe('mobile presentation resources', () => {
  it.each(PLAYER_IDS)('shows %s below its opponent, preserving zero and large token amounts', async viewerId => {
    const initial = new Game().state
    const state = { ...initial, players: {
      ...initial.players,
      'player-2': { ...initial.players['player-2'], health: 0, tokens: 123456 },
    } }
    const rows = await read(state, viewerId)
    expect(rows.map(row => row.id)).toEqual(viewerId === 'player-1' ? ['player-2', 'player-1'] : ['player-1', 'player-2'])
    expect(rows.find(row => row.id === 'player-1')).toEqual({ id: 'player-1', name: 'Eivor', health: 15, tokens: 0 })
    expect(rows.find(row => row.id === 'player-2')).toEqual({ id: 'player-2', name: 'Sigurd', health: 0, tokens: 123456 })
  })

  it.each(PLAYER_IDS)('keeps %s counts at the presented contacts through income, theft, payment, damage and healing', async viewerId => {
    const { before, after, events } = resolution()
    const session = createRollSession()
    session.startRemote(before, { dispatch: () => true, settled() {} })
    session.settle(session.pending.value!.id)
    session.receive(after, events)
    const batch = session.pending.value!
    // Expected [health, tokens] for each player at each event's final contact.
    const contacts = [
      [[7, 23], [7, 20]], [[7, 23], [7, 22]],
      [[6, 23], [7, 22]], [[5, 23], [7, 22]],
      [[5, 29], [7, 16]], [[5, 29], [7, 16]],
      [[5, 29], [7, 12]], [[3, 29], [7, 12]],
      [[3, 25], [7, 12]], [[5, 25], [7, 12]],
      [[5, 25], [7, 12]],
    ]
    const values = async () => (await read(session.state.value, viewerId))
      .sort((a, b) => a.id.localeCompare(b.id)).map(row => [row.health, row.tokens])
    expect(events.map(event => event.type)).toEqual([
      'TokensGained', 'TokensGained', 'DamageDealt', 'DamageDealt', 'TokensStolen',
      'TokensStolen', 'FavorInvoked', 'DamageDealt', 'FavorInvoked', 'HealthRestored', 'PhaseChanged',
    ])
    let shown = [[7, 20], [7, 20]]
    expect(await values()).toEqual(shown) // The completed batch already holds different values.
    for (const [index, event] of events.entries()) {
      expect(await values()).toEqual(shown)
      session.progress(batch.id + 1, event, 1)
      expect(await values()).toEqual(shown)
      session.progress(batch.id, event, 1)
      if (event.type === 'HealthRestored') {
        expect(await values()).toEqual([[4, 25], [7, 12]])
        session.progress(batch.id, event, 2)
      }
      expect(await values()).toEqual(contacts[index])
      const contacted = session.state.value
      session.progress(batch.id, event, 1)
      expect(session.state.value).toBe(contacted)
      session.present(batch.id, event)
      shown = contacts[index]!
      expect(await values()).toEqual(shown)
    }
    session.settle(batch.id)
    expect(await values()).toEqual([[5, 25], [7, 12]])
    session.restart()
    session.progress(batch.id, events[0]!, 1)
    expect(await values()).toEqual([[15, 0], [15, 0]])
  })
})
