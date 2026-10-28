import { createSeededRandom, FAVOR_CATALOG, getDieDefinition, getDieFace, majoritySymbols, PLAYER_IDS, validFavorInput } from '../core'
import { resolveRound } from '../core/resolution'
import { deepFreeze } from '../core/immutable'
import type { DieFace, DieState, FavorChoice, FavorInput, FavorLevel, GameCommand, GameState, PlayerId } from '../core'

export type Difficulty = 'easy' | 'normal' | 'hard'
export interface OpponentOptions { mode: 'local' | 'computer'; difficulty: Difficulty }
export const DIFFICULTIES = {
  easy: { label: 'Kolay', delayMs: 450, samples: 1, description: 'Altın ve saldırıyı tercih eder; güçleri tek örnekle değerlendirir.' },
  normal: { label: 'Normal', delayMs: 350, samples: 2, description: 'Savunmayı, jetonları ve rakibin olası gücünü değerlendirir.' },
  hard: { label: 'Zor', delayMs: 250, samples: 4, description: 'Daha çok örnekle, rakibin güç kullanma ve pas olasılıklarını karşılaştırır.' },
} as const
export const MAX_CANDIDATES = 64

// This is the only entry from authoritative state. Intentions, history, revision,
// game identity and the game's random source never enter the decision engine.
export function observeGame(state: GameState): GameState {
  const players = Object.fromEntries(PLAYER_IDS.map(id => {
    const p = state.players[id]
    return [id, { id, health: p.health, tokens: p.tokens, rollsUsed: p.rollsUsed,
      dice: p.dice.map(d => ({ ...d })), favors: [...p.favors], favorChoice: { status: 'pending' } }]
  })) as unknown as GameState['players']
  return deepFreeze({ gameId: 'observation', revision: 0, eventSequence: 0, round: state.round,
    firstPlayerId: state.firstPlayerId, phase: { ...state.phase }, players })
}
const other = (id: PlayerId): PlayerId => id === 'player-1' ? 'player-2' : 'player-1'
function total(state: GameState, id: PlayerId, symbol: DieFace['symbol'], except?: DieState) {
  return state.players[id].dice.reduce((n, d) => n + (d !== except && !d.removed && d.faceId && getDieFace(d.definitionId, d.faceId).symbol === symbol ? d.value : 0), 0)
}
function utility(state: GameState, id: PlayerId, die: DieState, face: DieFace, difficulty: Difficulty): number {
  const enemy = other(id), own = state.players[id], foe = state.players[enemy]
  const gold = face.grantsToken ? (own.tokens < 12 ? 0.9 : 0.45) : 0
  if (difficulty === 'easy') return gold + (face.symbol === 'axe' || face.symbol === 'arrow' ? 0.95 : face.symbol === 'hand' ? 0.5 : 0.3)
  const symbol = face.symbol
  if (symbol === 'axe' || symbol === 'arrow') {
    const defense = total(state, enemy, symbol === 'axe' ? 'helmet' : 'shield')
    return gold + (total(state, id, symbol, die) >= defense ? (foe.health <= 3 ? 1.8 : 1.1) : 0.65)
  }
  if (symbol === 'hand') return gold + Math.min(1.2, Math.max(0, foe.tokens + foe.dice.filter(d => d.faceId && getDieFace(d.definitionId, d.faceId).grantsToken).length - total(state, id, 'hand', die)) * 0.55)
  const attack = symbol === 'helmet' ? 'axe' : 'arrow'
  const threats = total(state, enemy, attack) + (foe.rollsUsed < 3 && foe.dice.some(d => !d.kept) ? 0.5 : 0)
  return gold + (total(state, id, symbol, die) < threats ? (own.health <= 5 ? 1.9 : 1.05) : 0.05)
}
function desirability(state: GameState, id: PlayerId, die: DieState, difficulty: Difficulty) {
  const faces = getDieDefinition(die.definitionId).faces
  const expected = faces.reduce((n, f) => n + utility(state, id, die, f, difficulty), 0) / faces.length
  return die.faceId ? utility(state, id, die, getDieFace(die.definitionId, die.faceId), difficulty) - expected : 0
}

type Choice = Extract<FavorChoice, { status: 'chosen' }> | { status: 'skipped' }
function candidates(state: GameState, id: PlayerId, difficulty: Difficulty): Choice[] {
  const result: Choice[] = [{ status: 'skipped' }]
  for (const favorId of state.players[id].favors) {
    const definition = FAVOR_CATALOG[favorId]
    for (const level of [1, 2, 3] as FavorLevel[]) {
      const inputs: (FavorInput | undefined)[] = []
      switch (definition.target) {
        case 'none': inputs.push(undefined); break
        case 'health':
          // Never deliberately sacrifice the last health stone.
          for (let health = 1; health < state.players[id].health; health++) inputs.push({ health })
          break
        case 'majority': inputs.push(...majoritySymbols(state, id).map(symbol => ({ symbol }))); break
        default: {
          const ranked = PLAYER_IDS.flatMap(owner => state.players[owner].dice
            .filter(d => d.faceId && !d.removed && (definition.target === 'any-dice' || owner !== id))
            .map(d => ({ die: d, score: definition.target === 'enemy-dice'
              ? utility(state, owner, d, getDieFace(d.definitionId, d.faceId!), difficulty)
              : desirability(state, owner, d, difficulty) * (owner === id ? -1 : 1) })))
            .sort((a, b) => b.score - a.score || a.die.id.localeCompare(b.die.id))
          inputs.push({ dieIds: ranked.slice(0, definition.tiers[level].amount).map(x => x.die.id) })
        }
      }
      for (const input of inputs) if (validFavorInput(state, id, favorId, level, input))
        result.push({ status: 'chosen', favorId, level, ...(input ? { input } : {}) })
    }
  }
  // Current catalog has at most two health-target favors: 88 candidates at
  // 15 HP. Distribute the finite budget across all equipped favors/tiers.
  if (result.length <= MAX_CANDIDATES) return result
  return [result[0]!, ...Array.from({ length: MAX_CANDIDATES - 1 }, (_, i) => result[1 + Math.floor(i * (result.length - 1) / (MAX_CANDIDATES - 1))]!)]
}
function value(state: GameState, id: PlayerId) {
  if (state.phase.name === 'ended') return state.phase.winnerId === id ? 10000 : -10000
  const own = state.players[id], foe = state.players[other(id)]
  const healthValue = (n: number) => n * 2.5 - (n <= 4 ? (5 - n) * 2 : 0)
  return healthValue(own.health) - healthValue(foe.health) + Math.sqrt(own.tokens + 1) * 1.8 - Math.sqrt(foe.tokens + 1) * 1.8
}
function outcome(state: GameState, id: PlayerId, choice: Choice, enemy: Choice, sample: number) {
  // Hypothetical resolution uses the real rules on a disposable copy. This
  // private, fixed seed is unrelated to the authoritative random stream.
  const draft = structuredClone(state) as Parameters<typeof resolveRound>[0]
  draft.phase = { name: 'resolution' }
  draft.players[id].favorChoice = structuredClone(choice) as typeof draft.players[PlayerId]['favorChoice']
  draft.players[other(id)].favorChoice = structuredClone(enemy) as typeof draft.players[PlayerId]['favorChoice']
  resolveRound(draft, [], createSeededRandom(0x51f15e + sample * 7919))
  return value(draft, id)
}
function bestChoice(state: GameState, id: PlayerId, difficulty: Difficulty): Choice {
  const skip: Choice = { status: 'skipped' }
  let predicted: Choice = skip
  if (difficulty !== 'easy') {
    let best = outcome(state, other(id), skip, skip, 0)
    for (const candidate of candidates(state, other(id), difficulty).slice(1)) {
      const score = outcome(state, other(id), candidate, skip, 0)
      if (score > best + 0.01) { best = score; predicted = candidate }
    }
  }
  const samples = DIFFICULTIES[difficulty].samples
  let best = -Infinity, chosen: Choice = skip
  for (const candidate of candidates(state, id, difficulty)) {
    let score = 0
    for (let sample = 0; sample < samples; sample++) {
      score += outcome(state, id, candidate, predicted, sample)
      if (difficulty === 'hard') score += outcome(state, id, candidate, skip, sample)
    }
    // Skip/lower tiers win exact ties, retaining tokens for later rounds.
    if (score > best + 0.01) { best = score; chosen = candidate }
  }
  return chosen
}

// One ordinary command per settled snapshot, without DOM, Vue, timers or Game.
export function decideCommand(observation: GameState, id: PlayerId, difficulty: Difficulty): GameCommand | null {
  const state = observeGame(observation), phase = state.phase
  if (phase.name !== 'roll' && phase.name !== 'favor' || !('activePlayerId' in phase) || phase.activePlayerId !== id) return null
  if (phase.name === 'favor') {
    const choice = bestChoice(state, id, difficulty)
    return choice.status === 'skipped' ? { type: 'SkipFavor', playerId: id } : { type: 'ChooseFavor', playerId: id, favorId: choice.favorId, level: choice.level, ...(choice.input ? { input: choice.input } : {}) }
  }
  if (phase.step === 'awaiting-roll') return { type: 'RollDice', playerId: id }
  for (const die of state.players[id].dice) {
    if (die.kept || !die.faceId) continue
    const selected = desirability(state, id, die, difficulty) >= -0.02
    if (die.selected !== selected) return { type: 'SetDieSelection', playerId: id, dieId: die.id, selected }
  }
  return { type: 'ConfirmRoll', playerId: id }
}
