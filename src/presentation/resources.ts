import type { GameEvent, GameState } from '../core'

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
