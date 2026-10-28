import { getDieFace } from './dice/definitions'
import { FAVOR_CATALOG } from './favors/catalog'
import { MAX_HEALTH } from './rules'
import type { DieState, GameEventPayload, GameState, PlayerId, FavorTiming } from './types'

type Mutable<T> = T extends readonly (infer I)[] ? Mutable<I>[] : T extends object ? { -readonly [K in keyof T]: Mutable<T[K]> } : T

// Only this rule executor computes resources and outcomes. Events carry absolute
// values so presentation can replay them without reproducing any game rules.
export function resolveRound(state: Mutable<GameState>, events: GameEventPayload[]) {
  const order: PlayerId[] = [state.firstPlayerId, state.firstPlayerId === 'player-1' ? 'player-2' : 'player-1']
  const other = (id: PlayerId): PlayerId => id === 'player-1' ? 'player-2' : 'player-1'
  const removed = new Set<string>()
  const face = (die: DieState) => getDieFace(die.definitionId, die.faceId!)
  const dice = (id: PlayerId) => state.players[id].dice.filter(die => !removed.has(die.id))
  let ended = false
  function damage(playerId: PlayerId, amount: number, source: { dieId?: DieState['id']; favorId?: 'thors-strike' }) {
    const targetId = other(playerId), target = state.players[targetId]
    const dealt = Math.min(target.health, amount)
    target.health -= dealt
    events.push({ type: 'DamageDealt', playerId, targetId, amount: dealt, health: target.health, ...source })
    if (target.health === 0) {
      ended = true
      state.phase = { name: 'ended', winnerId: playerId }
      events.push({ type: 'GameEnded', winnerId: playerId, loserId: targetId }, { type: 'PhaseChanged', phase: state.phase })
    }
  }
  function favors(timing: FavorTiming) {
    const choices = order.flatMap(playerId => {
      const choice = state.players[playerId].favorChoice
      return choice.status === 'chosen' && FAVOR_CATALOG[choice.favorId].timing === timing
        ? [{ playerId, choice, definition: FAVOR_CATALOG[choice.favorId] }] : []
    }).sort((a, b) => a.definition.priority - b.definition.priority || order.indexOf(a.playerId) - order.indexOf(b.playerId))
    for (const { playerId, choice, definition } of choices) {
      if (ended) return
      const player = state.players[playerId], tier = definition.tiers[choice.level]
      if (player.tokens < tier.cost) {
        events.push({ type: 'FavorFailed', playerId, favorId: choice.favorId, cost: tier.cost })
        continue
      }
      player.tokens -= tier.cost
      events.push({ type: 'FavorInvoked', playerId, favorId: choice.favorId, level: choice.level, cost: tier.cost, tokens: player.tokens })
      if (definition.effect === 'damage') damage(playerId, tier.amount, { favorId: 'thors-strike' })
      else if (definition.effect === 'heal') {
        const health = Math.min(MAX_HEALTH, player.health + tier.amount), amount = health - player.health
        player.health = health
        events.push({ type: 'HealthRestored', playerId, health, amount })
      } else {
        const targetId = other(playerId)
        const dieIds = dice(targetId).filter(die => face(die).symbol === 'helmet').slice(0, tier.amount).map(die => die.id)
        dieIds.forEach(id => { removed.add(id); state.players[targetId].dice.find(die => die.id === id)!.removed = true })
        events.push({ type: 'HelmetsRemoved', playerId, targetId, dieIds })
      }
    }
  }
  favors('before-resolution')
  for (const playerId of order) {
    const dieIds = dice(playerId).filter(die => face(die).grantsToken).map(die => die.id)
    state.players[playerId].tokens += dieIds.length
    events.push({ type: 'TokensGained', playerId, dieIds, tokens: state.players[playerId].tokens })
  }
  for (const symbol of ['arrow', 'axe'] as const) {
    for (const playerId of order) {
      const targetId = other(playerId)
      const defenders = dice(targetId).filter(die => face(die).symbol === (symbol === 'arrow' ? 'shield' : 'helmet'))
      const attackers = dice(playerId).filter(die => face(die).symbol === symbol)
      for (const [index, die] of attackers.entries()) {
        const defender = defenders[index]
        if (defender) events.push({ type: 'AttackBlocked', playerId, targetId, dieId: die.id, defenderDieId: defender.id, symbol })
        else damage(playerId, 1, { dieId: die.id })
        if (ended) return
      }
    }
  }
  for (const playerId of order) {
    const targetId = other(playerId), player = state.players[playerId], target = state.players[targetId]
    const dieIds = dice(playerId).filter(die => face(die).symbol === 'hand').map(die => die.id)
    const amount = Math.min(target.tokens, dieIds.length)
    player.tokens += amount
    target.tokens -= amount
    events.push({ type: 'TokensStolen', playerId, targetId, amount, tokens: player.tokens, targetTokens: target.tokens, dieIds })
  }
  favors('after-resolution')
  if (!ended) {
    state.phase = { name: 'round-complete' }
    events.push({ type: 'PhaseChanged', phase: state.phase })
  }
}
