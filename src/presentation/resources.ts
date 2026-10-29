import type { GameEvent, GameState } from '../core'

export function resourceSteps(event: GameEvent): number {
  if (event.type === 'TokensGained') return event.dieIds.length > 0 ? 1 : 0
  if (event.type === 'TokensStolen') return event.amount > 0 ? 1 : 0
  if (event.type === 'DamageDealt' && event.favorId) return event.amount > 0 ? 1 : 0
  if (event.type === 'FavorInvoked') return event.cost
  if (['DamageDealt', 'HealthRestored', 'HealthSacrificed', 'TokensGranted', 'TokensDestroyed'].includes(event.type))
    return 'amount' in event ? event.amount : 0
  return 0
}

// Intermediate display values are absolute offsets from the event's final value.
// Replaying a contact cannot charge, heal or transfer a resource twice.
export function applyResourceProgress(state: GameState, event: GameEvent, step: number): GameState {
  const count = resourceSteps(event)
  if (!Number.isInteger(step) || step < 1 || step > count) return state
  const remaining = count - step
  switch (event.type) {
    case 'DamageDealt':
    case 'HealthSacrificed': return applyResourceEvent(state, { ...event, health: event.health + remaining })
    case 'HealthRestored': return applyResourceEvent(state, { ...event, health: event.health - remaining })
    case 'TokensGained':
    case 'TokensGranted': return applyResourceEvent(state, { ...event, tokens: event.tokens - remaining })
    case 'TokensDestroyed':
    case 'FavorInvoked': return applyResourceEvent(state, { ...event, tokens: event.tokens + remaining })
    case 'TokensStolen': return applyResourceEvent(state, event)
    default: return state
  }
}

export function applyResourceEvent(state: GameState, event: GameEvent): GameState {
  const players = { ...state.players }
  switch (event.type) {
    case 'DiceRecast': {
      const player = players[event.playerId]
      players[event.playerId] = { ...player, dice: event.added ? [...player.dice, ...event.dice] : player.dice.map(d => event.dice.find(next => next.id === d.id) ?? d) }
      break
    }
    case 'DiceValuesChanged':
      players[event.playerId] = { ...players[event.playerId], dice: players[event.playerId].dice.map(d => {
        const changed = event.values.find(value => value.dieId === d.id)
        return changed ? { ...d, value: changed.value } : d
      }) }
      break
    case 'DiceRemoved':
    case 'HelmetsRemoved':
      players[event.targetId] = { ...players[event.targetId], dice: players[event.targetId].dice.map(die => event.dieIds.includes(die.id) ? { ...die, removed: true, ...(event.type === 'HelmetsRemoved' ? { value: 0 } : {}) } : die) }
      break
    case 'DamageDealt': players[event.targetId] = { ...players[event.targetId], health: event.health }; break
    case 'HealthRestored': players[event.playerId] = { ...players[event.playerId], health: event.health }; break
    case 'HealthSacrificed': players[event.playerId] = { ...players[event.playerId], health: event.health }; break
    case 'TokensDestroyed': players[event.targetId] = { ...players[event.targetId], tokens: event.tokens }; break
    case 'TokensGranted':
    case 'TokensGained':
    case 'FavorInvoked': players[event.playerId] = { ...players[event.playerId], tokens: event.tokens }; break
    case 'TokensStolen':
      players[event.playerId] = { ...players[event.playerId], tokens: event.tokens }
      players[event.targetId] = { ...players[event.targetId], tokens: event.targetTokens }
      break
    default: return state
  }
  return { ...state, players }
}
