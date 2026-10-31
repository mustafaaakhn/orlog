import { Vector3 } from 'three'
import type { DieId, GameEvent } from '../core'
import { eventDice } from '../presentation/resolutionPlan'
import { reserveSlot } from './diceGeometry'
import { bowlCenter, collectionSlot } from './tableLayout'
import type { createBoard } from './board'

type FocusBoard = Pick<ReturnType<typeof createBoard>, 'dice' | 'lifePosition' | 'tokenPosition' | 'totem'>
export function eventDieRole(event: GameEvent | null, id: DieId): 'source' | 'target' | undefined {
  if (!event || !eventDice(event).includes(id)) return
  if (event.type === 'AttackBlocked') return id === event.dieId ? 'source' : 'target'
  return ['DiceRemoved', 'HelmetsRemoved', 'DiceRecast', 'DiceValuesChanged'].includes(event.type) ? 'target' : 'source'
}
// Read current pieces and authoritative event references. No battle matching,
// future batch state, resource mutation or camera/transform writes live here.
export function eventFocusPoints(event: GameEvent, board: FocusBoard): Vector3[] {
  const points = eventDice(event).flatMap(id => {
    const die = board.dice.get(id)
    return die?.visible ? [die.position.clone()] : []
  })
  if (event.type === 'DiceRecast') {
    // New bonus dice have no visible pose yet. Fit their actual bowl recording
    // envelope and stable reserve destinations without exposing their new faces.
    const center = new Vector3(...bowlCenter(event.playerId))
    for (const x of [-2.5, 2.5]) for (const z of [-2.5, 2.5]) for (const y of [0, 4.1])
      points.push(center.clone().add(new Vector3(x, y, z)))
    for (const die of event.dice) {
      const [kind, number] = die.id.split('/')[1]!.split('-')
      points.push(new Vector3(...reserveSlot(event.playerId, Number(number) - 1 + (kind === 'bonus' ? 6 : 0))))
    }
  }
  if ('favorId' in event && event.favorId && 'playerId' in event)
    points.push(board.totem(event.playerId, event.favorId).position.clone().add(new Vector3(0, .65, 0)))
  switch (event.type) {
    case 'DamageDealt':
      for (let i = 0; i < event.amount; i++) points.push(board.lifePosition(event.targetId, event.health + i))
      break
    case 'HealthRestored':
    case 'HealthSacrificed':
      for (let i = 0; i < event.amount; i++) points.push(board.lifePosition(event.playerId, event.type === 'HealthRestored' ? event.health - event.amount + i : event.health + i))
      break
    case 'TokensGained':
      event.dieIds.forEach((_, i) => points.push(board.tokenPosition(event.playerId, event.tokens - event.dieIds.length + i, event.tokens)))
      break
    case 'TokensStolen':
      for (let i = 0; i < event.amount; i++) {
        points.push(board.tokenPosition(event.targetId, event.targetTokens + i))
        points.push(board.tokenPosition(event.playerId, event.tokens - event.amount + i, event.tokens))
      }
      break
    case 'FavorInvoked':
      for (let i = 0; i < event.cost; i++) points.push(board.tokenPosition(event.playerId, event.tokens + i))
      break
    case 'TokensGranted':
    case 'TokensDestroyed':
      for (let i = 0; i < event.amount; i++) points.push(event.type === 'TokensGranted'
        ? board.tokenPosition(event.playerId, event.tokens - event.amount + i, event.tokens)
        : board.tokenPosition(event.targetId, event.tokens + i))
      break
    case 'FavorReduced': points.push(board.totem(event.targetId, event.favorId).position.clone()); break
  }
  return points
}
export function collectionFocusPoints(ids: readonly DieId[], board: FocusBoard) {
  return ids.flatMap(id => {
    const die = board.dice.get(id)
    const owner = id.startsWith('player-1/') ? 'player-1' : 'player-2'
    return die?.visible ? [die.position.clone(), ...[0, 8].map(index => new Vector3(...collectionSlot(owner, index)))] : []
  })
}
