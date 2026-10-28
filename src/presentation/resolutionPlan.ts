import type { DieId, GameEvent, GamePhase } from '../core'

// References come from the executor, never from a second battle calculation.
export function eventDice(event: GameEvent): readonly DieId[] {
  switch (event.type) {
    case 'AttackBlocked': return [event.dieId, event.defenderDieId]
    case 'DamageDealt': return event.dieId ? [event.dieId] : []
    case 'DiceRecast': return event.dice.map(die => die.id)
    case 'DiceValuesChanged': return event.values.map(value => value.dieId)
    default: return 'dieIds' in event ? event.dieIds ?? [] : []
  }
}

export function lastContributions(events: readonly GameEvent[]) {
  const last = new Map<DieId, string>()
  for (const event of events) for (const id of eventDice(event)) last.set(id, event.id)
  return last
}

export function phaseTitle(event: GameEvent, previous: GamePhase['name']): string {
  if (event.type === 'RoundStarted') return `Tur ${event.round} · Zar atışı`
  if (event.type !== 'PhaseChanged' || event.phase.name === previous) return ''
  if (event.phase.name === 'favor') return 'Tanrı gücü'
  if (event.phase.name === 'resolution') return 'Çözümleme'
  return ''
}

export function favorFailureTitle(event: GameEvent): string {
  if (event.type !== 'FavorFailed') return ''
  if (event.reason === 'tokens') return 'Yeterli jeton yok · Güç kullanılamadı'
  if (event.reason === 'cancelled') return 'Güç iptal edildi · Seviye sıfıra indirildi'
  return 'Güç kullanılamadı'
}
