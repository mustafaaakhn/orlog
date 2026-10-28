import { getDieFace, rollFace } from './dice/definitions'
import { FAVOR_CATALOG } from './favors/catalog'
import { majoritySymbols } from './favors/targets'
import { mathRandom } from './random'
import type { RandomSource } from './random'
import { MAX_HEALTH } from './rules'
import type { DieState, GameEventPayload, GameState, PlayerId, FavorTiming, FavorId, FavorLevel, DieSymbol, DieDefinitionId } from './types'

type Mutable<T> = T extends readonly (infer I)[] ? Mutable<I>[] : T extends object ? { -readonly [K in keyof T]: Mutable<T[K]> } : T

// This executor alone computes outcomes. Presentation consumes absolute events.
export function resolveRound(state: Mutable<GameState>, events: GameEventPayload[], random: RandomSource = mathRandom) {
  const order: PlayerId[] = [state.firstPlayerId, state.firstPlayerId === 'player-1' ? 'player-2' : 'player-1']
  const other = (id: PlayerId): PlayerId => id === 'player-1' ? 'player-2' : 'player-1'
  const dice = (id: PlayerId) => state.players[id].dice.filter(die => !die.removed)
  const symbol = (die: DieState) => getDieFace(die.definitionId, die.faceId!).symbol
  const matching = (id: PlayerId, face: DieSymbol) => dice(id).filter(d => symbol(d) === face)
  const hooks = Object.fromEntries(order.map(id => [id, { block: 0, axe: 0, damage: 0, spend: 0, pierce: 0 }])) as Record<PlayerId, { block: number; axe: number; damage: number; spend: number; pierce: number }>
  const levels = new Map<PlayerId, number>()
  const invoked = new Set<PlayerId>()
  for (const id of order) {
    const choice = state.players[id].favorChoice
    if (choice.status === 'chosen') levels.set(id, choice.level)
  }
  let ended = false
  function checkDeath(loserId: PlayerId) {
    if (state.players[loserId].health !== 0) return
    ended = true
    const winnerId = other(loserId)
    state.phase = { name: 'ended', winnerId }
    events.push({ type: 'GameEnded', winnerId, loserId }, { type: 'PhaseChanged', phase: state.phase })
  }
  function heal(playerId: PlayerId, amount: number, favorId: FavorId, dieIds?: readonly DieState['id'][]) {
    if (ended) return
    const player = state.players[playerId], restored = Math.min(MAX_HEALTH - player.health, amount)
    player.health += restored
    events.push({ type: 'HealthRestored', playerId, health: player.health, amount: restored, favorId, ...(dieIds ? { dieIds } : {}) })
  }
  function grant(playerId: PlayerId, amount: number, favorId: FavorId, dieIds?: readonly DieState['id'][]) {
    state.players[playerId].tokens += amount
    events.push({ type: 'TokensGranted', playerId, favorId, amount, tokens: state.players[playerId].tokens, ...(dieIds ? { dieIds } : {}) })
  }
  function destroy(playerId: PlayerId, amount: number, favorId: FavorId, dieIds?: readonly DieState['id'][]) {
    const targetId = other(playerId), target = state.players[targetId], destroyed = Math.min(target.tokens, amount)
    target.tokens -= destroyed
    events.push({ type: 'TokensDestroyed', playerId, targetId, favorId, amount: destroyed, tokens: target.tokens, ...(dieIds ? { dieIds } : {}) })
  }
  function damage(playerId: PlayerId, amount: number, source: { dieId?: DieState['id']; favorId?: FavorId; symbol?: 'axe' | 'arrow' }) {
    const targetId = other(playerId), target = state.players[targetId], dealt = Math.min(target.health, amount)
    target.health -= dealt
    events.push({ type: 'DamageDealt', playerId, targetId, amount: dealt, health: target.health, ...source })
    checkDeath(targetId)
    if (!ended && hooks[targetId].damage) grant(targetId, dealt * hooks[targetId].damage, 'mimirs-wisdom', source.dieId ? [source.dieId] : undefined)
    return dealt
  }
  function changeValues(playerId: PlayerId, favorId: FavorId, changed: DieState[]) {
    events.push({ type: 'DiceValuesChanged', playerId, favorId, values: changed.map(d => ({ dieId: d.id, value: d.value })) })
  }
  function sacrifice(playerId: PlayerId, requested: number, favorId: FavorId) {
    const player = state.players[playerId], amount = Math.min(player.health, requested)
    player.health -= amount
    events.push({ type: 'HealthSacrificed', playerId, favorId, amount, health: player.health })
    checkDeath(playerId)
    return amount
  }
  function favors(timing: FavorTiming) {
    const choices = order.flatMap(playerId => {
      const choice = state.players[playerId].favorChoice
      return choice.status === 'chosen' && FAVOR_CATALOG[choice.favorId].timing === timing
        ? [{ playerId, choice, definition: FAVOR_CATALOG[choice.favorId] }] : []
    }).sort((a, b) => a.definition.priority - b.definition.priority || order.indexOf(a.playerId) - order.indexOf(b.playerId))
    for (const { playerId, choice, definition } of choices) {
      if (ended) return
      const level = levels.get(playerId)!, favorId = choice.favorId
      if (level <= 0) { events.push({ type: 'FavorFailed', playerId, favorId, cost: 0, reason: 'cancelled' }); continue }
      const player = state.players[playerId], targetId = other(playerId), tier = definition.tiers[level as FavorLevel]
      if (player.tokens < tier.cost) {
        events.push({ type: 'FavorFailed', playerId, favorId, cost: tier.cost, reason: 'tokens' })
        continue
      }
      player.tokens -= tier.cost
      invoked.add(playerId)
      events.push({ type: 'FavorInvoked', playerId, favorId, level: level as FavorLevel, cost: tier.cost, tokens: player.tokens })
      if (hooks[targetId].spend) heal(targetId, tier.cost * hooks[targetId].spend, 'vars-bond')
      const n = tier.amount
      switch (definition.effect) {
        case 'damage': damage(playerId, n, { favorId }); break
        case 'heal': heal(playerId, n, favorId); break
        case 'remove-helmets': {
          let remaining = n
          const removed: DieState['id'][] = [], changed: DieState[] = []
          for (const die of matching(targetId, 'helmet')) {
            if (!remaining) break
            const taken = Math.min(remaining, die.value)
            die.value -= taken; remaining -= taken
            if (!die.value) { die.removed = true; removed.push(die.id) }
            else changed.push(die)
          }
          events.push({ type: 'HelmetsRemoved', playerId, targetId, dieIds: removed })
          if (changed.length) changeValues(targetId, favorId, changed)
          break
        }
        case 'reduce-favor': {
          const target = state.players[targetId].favorChoice
          if (target.status === 'chosen' && !invoked.has(targetId)) {
            const reduced = Math.max(0, levels.get(targetId)! - n)
            levels.set(targetId, reduced)
            events.push({ type: 'FavorReduced', playerId, targetId, favorId: target.favorId, level: reduced })
          } else events.push({ type: 'FavorEffectApplied', playerId, favorId, amount: 0 })
          break
        }
        case 'extra-dice': {
          const added = Array.from({ length: n }, (_, i): Mutable<DieState> => {
            const definitionId = `die-${i + 1}` as DieDefinitionId
            return { id: `${playerId}/bonus-${i + 1}` as DieState['id'], definitionId, faceId: rollFace(definitionId, random).id, kept: true, selected: false, removed: false, value: 1 }
          })
          player.dice.push(...added)
          events.push({ type: 'DiceRecast', playerId, favorId, dice: added.map(d => ({ ...d })), added: true })
          break
        }
        case 'reroll': {
          // A downgrade retains the first N intentions; banned targets are skipped.
          const targets = (choice.input?.dieIds ?? []).slice(0, n)
          for (const owner of order) {
            const changed = dice(owner).filter(d => targets.includes(d.id))
            for (const die of changed) { die.faceId = rollFace(die.definitionId, random).id; die.value = 1 }
            if (changed.length) events.push({ type: 'DiceRecast', playerId: owner, favorId, dice: changed.map(d => ({ ...d })), added: false })
          }
          break
        }
        case 'ban-dice': {
          const changed = dice(targetId).filter(d => (choice.input?.dieIds ?? []).slice(0, n).includes(d.id))
          changed.forEach(d => { d.removed = true })
          events.push({ type: 'DiceRemoved', playerId, targetId, favorId, dieIds: changed.map(d => d.id) })
          break
        }
        case 'defense-bonus':
        case 'arrow-bonus': {
          const changed = dice(playerId).filter(d => definition.effect === 'arrow-bonus' ? symbol(d) === 'arrow' : ['helmet', 'shield'].includes(symbol(d)))
          changed.forEach(d => { d.value += n })
          changeValues(playerId, favorId, changed)
          break
        }
        case 'multiply-axes': {
          const changed = matching(playerId, 'axe'), total = changed.reduce((sum, d) => sum + d.value, 0)
          if (changed[0]) changed[0].value += Math.ceil(total * n) - total
          changeValues(playerId, favorId, changed)
          break
        }
        case 'majority-bonus': {
          const candidates = majoritySymbols(state, playerId)
          const chosen = choice.input?.symbol && candidates.includes(choice.input.symbol) ? choice.input.symbol : candidates[0]
          const die = chosen && matching(playerId, chosen)[0]
          if (die) { die.value += n; changeValues(playerId, favorId, [die]) }
          else changeValues(playerId, favorId, [])
          break
        }
        case 'hand-tokens': grant(playerId, matching(playerId, 'hand').length * n, favorId, matching(playerId, 'hand').map(d => d.id)); break
        case 'arrow-destroy': destroy(playerId, matching(playerId, 'arrow').length * n, favorId, matching(playerId, 'arrow').map(d => d.id)); break
        case 'sacrifice-tokens':
        case 'sacrifice-destroy': {
          const amount = sacrifice(playerId, choice.input?.health ?? 0, favorId)
          if (!ended) {
            if (definition.effect === 'sacrifice-tokens') grant(playerId, amount * n, favorId)
            else destroy(playerId, amount * n, favorId)
          }
          break
        }
        default: {
          const key = { 'heal-block': 'block', 'heal-axe': 'axe', 'damage-tokens': 'damage', 'heal-spend': 'spend', pierce: 'pierce' }[definition.effect] as keyof typeof hooks[PlayerId]
          hooks[playerId][key] = n
          events.push({ type: 'FavorEffectApplied', playerId, favorId, amount: n })
        }
      }
    }
  }
  favors('before-resolution')
  if (ended) return
  for (const playerId of order) {
    const dieIds = dice(playerId).filter(die => getDieFace(die.definitionId, die.faceId!).grantsToken).map(die => die.id)
    state.players[playerId].tokens += dieIds.length
    events.push({ type: 'TokensGained', playerId, dieIds, tokens: state.players[playerId].tokens })
  }
  for (const attack of ['arrow', 'axe'] as const) {
    for (const playerId of order) {
      const targetId = other(playerId)
      const defenders = matching(targetId, attack === 'arrow' ? 'shield' : 'helmet').flatMap(d => Array<DieState>(d.value).fill(d))
      const attackers = matching(playerId, attack).flatMap(d => Array<DieState>(d.value).fill(d))
      let defenseIndex = 0
      for (const die of attackers) {
        const bypass = attack === 'arrow' && hooks[playerId].pierce > 0
        if (bypass) hooks[playerId].pierce--
        const defender = bypass ? undefined : defenders[defenseIndex++]
        if (defender) {
          events.push({ type: 'AttackBlocked', playerId, targetId, dieId: die.id, defenderDieId: defender.id, symbol: attack })
          if (hooks[targetId].block) heal(targetId, hooks[targetId].block, 'heimdalls-watch', [die.id, defender.id])
        } else {
          const dealt = damage(playerId, 1, { dieId: die.id, symbol: attack })
          if (!ended && attack === 'axe' && hooks[playerId].axe) heal(playerId, dealt * hooks[playerId].axe, 'hels-grip', [die.id])
        }
        if (ended) return
      }
    }
  }
  for (const playerId of order) {
    const targetId = other(playerId), player = state.players[playerId], target = state.players[targetId], hands = matching(playerId, 'hand')
    const amount = Math.min(target.tokens, hands.reduce((sum, d) => sum + d.value, 0))
    player.tokens += amount; target.tokens -= amount
    events.push({ type: 'TokensStolen', playerId, targetId, amount, tokens: player.tokens, targetTokens: target.tokens, dieIds: hands.map(d => d.id) })
  }
  favors('after-resolution')
  if (!ended) {
    state.phase = { name: 'round-complete' }
    events.push({ type: 'PhaseChanged', phase: state.phase })
  }
}
