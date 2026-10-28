import type { GameEvent, GameState } from '../core'

export function applyResourceEvent(state: GameState, event: GameEvent): GameState {
  const players = { ...state.players }
  switch (event.type) {
    case 'HelmetsRemoved':
      players[event.targetId] = { ...players[event.targetId], dice: players[event.targetId].dice.map(die => event.dieIds.includes(die.id) ? { ...die, removed: true } : die) }
      break
    case 'DamageDealt': players[event.targetId] = { ...players[event.targetId], health: event.health }; break
    case 'HealthRestored': players[event.playerId] = { ...players[event.playerId], health: event.health }; break
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
