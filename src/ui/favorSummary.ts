import { FAVOR_CATALOG } from '../core'
import type { FavorDefinition, FavorId } from '../core'

// Qualitative hints only. Tier amounts, targets and timing stay in the core catalog.
const summaries = {
  damage: { icon: 'heart-minus', label: 'Doğrudan hasar', tone: 'damage' },
  heal: { icon: 'heart-plus', label: 'Can iyileştir', tone: 'heal' },
  'remove-helmets': { icon: 'ban', label: 'Miğfer kaldır', tone: 'damage' },
  'defense-bonus': { icon: 'shield', label: 'Savunmayı artır', tone: 'defense' },
  'hand-tokens': { icon: 'coins', label: 'Ellerden ek jeton', tone: 'tokens' },
  'multiply-axes': { icon: 'bolt', label: 'Baltaları katla', tone: 'damage' },
  'extra-dice': { icon: 'dice', label: 'Ek zar at', tone: 'dice' },
  'majority-bonus': { icon: 'arrow-up', label: 'Çoğunluğu güçlendir', tone: 'dice' },
  reroll: { icon: 'reroll', label: 'Yeniden zar at', tone: 'dice' },
  'heal-block': { icon: 'heart-plus', label: 'Savunmadan can', tone: 'heal' },
  'heal-axe': { icon: 'heart-plus', label: 'Balta hasarından can', tone: 'heal' },
  'ban-dice': { icon: 'ban', label: 'Rakibin zarını kaldır', tone: 'damage' },
  'damage-tokens': { icon: 'coins', label: 'Aldığın hasardan jeton', tone: 'tokens' },
  'sacrifice-tokens': { icon: 'heart-minus', label: 'Can feda et, jeton kazan', tone: 'tokens' },
  'arrow-bonus': { icon: 'arrow-up', label: 'Okları güçlendir', tone: 'damage' },
  'arrow-destroy': { icon: 'coins', label: 'Oklarla jeton yok et', tone: 'damage' },
  'reduce-favor': { icon: 'arrow-down', label: 'Rakibin gücünü düşür', tone: 'defense' },
  'sacrifice-destroy': { icon: 'heart-minus', label: 'Can feda et, jeton yok et', tone: 'damage' },
  pierce: { icon: 'pierce', label: 'Kalkanı aş', tone: 'damage' },
  'heal-spend': { icon: 'heart-plus', label: 'Rakibin bedelinden can', tone: 'heal' },
} as const satisfies Record<FavorDefinition['effect'], { icon: string; label: string; tone: string }>

export function favorSummary(id: FavorId) {
  return summaries[FAVOR_CATALOG[id].effect]
}
