import { getDieFace } from '../dice/definitions'
import { FAVOR_CATALOG } from './catalog'
import type { DieSymbol, FavorId, FavorInput, FavorLevel, GameState, PlayerId } from '../types'

export const SYMBOL_ORDER: readonly DieSymbol[] = ['axe', 'arrow', 'helmet', 'shield', 'hand']

export function majoritySymbols(state: GameState, playerId: PlayerId): DieSymbol[] {
  const totals = SYMBOL_ORDER.map(symbol => state.players[playerId].dice
    .filter(d => !d.removed && d.faceId && getDieFace(d.definitionId, d.faceId).symbol === symbol)
    .reduce((sum, d) => sum + d.value, 0))
  const max = Math.max(...totals)
  return SYMBOL_ORDER.filter((_, i) => max > 0 && totals[i] === max)
}

// Validate intentions without spending resources or consuming randomness.
export function validFavorInput(state: GameState, playerId: PlayerId, id: FavorId, level: FavorLevel, input?: FavorInput): boolean {
  if (input !== undefined && (!input || typeof input !== 'object' || Array.isArray(input))) return false
  const definition = FAVOR_CATALOG[id]
  if (input && Object.keys(input).some(key => !['dieIds', 'symbol', 'health'].includes(key))) return false
  if (definition.target === 'any-dice' || definition.target === 'enemy-dice') {
    const ids = input?.dieIds
    if (!Array.isArray(ids) || new Set(ids).size !== ids.length || ids.length !== definition.tiers[level].amount) return false
    if (input?.health !== undefined || input?.symbol !== undefined) return false
    const candidates = Object.values(state.players).flatMap(p => p.dice)
      .filter(d => !d.removed && d.faceId && (definition.target === 'any-dice' || !state.players[playerId].dice.some(own => own.id === d.id)))
    return ids.every(id => candidates.some(d => d.id === id))
  }
  if (definition.target === 'health') return Number.isInteger(input?.health) && input!.health! >= 0 && input!.health! <= state.players[playerId].health && input?.dieIds === undefined && input?.symbol === undefined
  if (definition.target === 'majority') return !!input?.symbol && majoritySymbols(state, playerId).includes(input.symbol) && input.dieIds === undefined && input.health === undefined
  return input === undefined || Object.keys(input).length === 0
}
