import { FAVOR_CATALOG } from '../core'
import type { GameEvent, PlayerId } from '../core'
export const playerLabel = (id: PlayerId) => `Oyuncu ${id === 'player-1' ? 'I' : 'II'}`
export function eventText(event: GameEvent | null): string {
  if (!event) return ''
  switch (event.type) {
    case 'AttackBlocked': return `${playerLabel(event.targetId)} ${event.symbol === 'arrow' ? 'oku kalkanla' : 'baltayı miğferle'} engelledi.`
    case 'DamageDealt': return `${playerLabel(event.targetId)} ${event.amount} hasar aldı.`
    case 'TokensGained': return `${playerLabel(event.playerId)} ${event.dieIds.length} altın jeton kazandı.`
    case 'TokensStolen': return `${playerLabel(event.playerId)} ${event.amount} jeton çaldı.`
    case 'FavorInvoked': return `${playerLabel(event.playerId)}: ${FAVOR_CATALOG[event.favorId].name} · ${event.cost} jeton ödendi.`
    case 'FavorFailed': return `${playerLabel(event.playerId)}: ${FAVOR_CATALOG[event.favorId].name} için ${event.cost} jeton yok; güç uygulanmadı.`
    case 'HealthRestored': return `${playerLabel(event.playerId)} ${event.amount} can iyileştirdi.`
    case 'HelmetsRemoved': return `${playerLabel(event.targetId)}: ${event.dieIds.length} miğfer kaldırıldı.`
    case 'GameEnded': return `${playerLabel(event.winnerId)} kazandı.`
    default: return ''
  }
}
