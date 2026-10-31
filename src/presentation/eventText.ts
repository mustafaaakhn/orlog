import { t } from '../i18n'
import { FAVOR_CATALOG } from '../core'
import type { GameEvent, PlayerId } from '../core'
export const playerLabel = (id: PlayerId) => t('Oyuncu {0}', [id === 'player-1' ? 'I' : 'II'])
export function eventText(event: GameEvent | null): string {
  if (!event) return ''
  switch (event.type) {
    case 'AttackBlocked': return `${playerLabel(event.playerId)} saldırdı; ${playerLabel(event.targetId)} ${t(event.symbol === 'arrow' ? 'oku kalkanla' : 'baltayı miğferle')} engelledi.`
    case 'DamageDealt': return t('{0}{1} vurdu; {2} {3} hasar aldı.', [playerLabel(event.playerId), t(event.symbol === 'arrow' ? ' okla' : event.symbol === 'axe' ? ' baltayla' : ' güçle'), playerLabel(event.targetId), event.amount])
    case 'TokensGained': return `${playerLabel(event.playerId)} ${event.dieIds.length} altın jeton kazandı.`
    case 'TokensStolen': return `${playerLabel(event.playerId)} ${event.amount} jeton çaldı.`
    case 'FavorInvoked': return `${playerLabel(event.playerId)}: ${t(FAVOR_CATALOG[event.favorId].name)} · ${event.cost} jeton ödendi.`
    case 'FavorFailed': return event.reason === 'cancelled' ? `${playerLabel(event.playerId)}: ${t(FAVOR_CATALOG[event.favorId].name)} sıfır seviyeye indirildi; iptal edildi.` : event.reason === 'tokens' ? `${playerLabel(event.playerId)}: ${t(FAVOR_CATALOG[event.favorId].name)} için ${event.cost} jeton yok; güç uygulanmadı.` : `${playerLabel(event.playerId)}: ${t(FAVOR_CATALOG[event.favorId].name)} kullanılamadı.`
    case 'DiceRecast': return `${playerLabel(event.playerId)}: ${t(FAVOR_CATALOG[event.favorId].name)} ile ${event.dice.length} zar ${t(event.added ? 'eklendi' : 'yeniden atıldı')}.`
    case 'DiceRemoved': return `${playerLabel(event.targetId)}: ${event.dieIds.length} zar bu tur kaldırıldı.`
    case 'DiceValuesChanged': return `${playerLabel(event.playerId)}: ${t(FAVOR_CATALOG[event.favorId].name)} · ${event.values.map(v => `${v.dieId.split('/')[1]} ×${v.value}`).join(', ') || t('uygun zar yok')}.`
    case 'TokensGranted': return `${playerLabel(event.playerId)}: ${t(FAVOR_CATALOG[event.favorId].name)} ile ${event.amount} jeton kazandı.`
    case 'TokensDestroyed': return `${playerLabel(event.targetId)}: ${t(FAVOR_CATALOG[event.favorId].name)} ile ${event.amount} jeton yok edildi.`
    case 'HealthSacrificed': return `${playerLabel(event.playerId)} ${event.amount} can feda etti.`
    case 'FavorReduced': return `${playerLabel(event.targetId)}: ${t(FAVOR_CATALOG[event.favorId].name)} seviye ${event.level} oldu; ${t(event.level ? 'düşük seviye bedeli ödenecek' : 'güç iptal')}.`
    case 'FavorEffectApplied': return `${playerLabel(event.playerId)}: ${t(FAVOR_CATALOG[event.favorId].name)} · ${t(event.amount ? 'bu tur etkin' : 'uygun hedef yok')}.`
    case 'HealthRestored': return `${playerLabel(event.playerId)} ${event.amount} can iyileştirdi.`
    case 'HelmetsRemoved': return `${playerLabel(event.targetId)}: ${event.dieIds.length} miğfer kaldırıldı.`
    case 'GameEnded': return `${playerLabel(event.winnerId)} kazandı.`
    default: return ''
  }
}
