import { deepFreeze } from '../immutable'
import type { FavorDefinition, FavorId, FavorLevel } from '../types'

// Shared data for rule execution and the favor picker.
export const FAVOR_CATALOG: Readonly<Record<FavorId, FavorDefinition>> = deepFreeze({
  'thors-strike': {
    id: 'thors-strike',
    name: "Thor's Strike",
    priority: 6,
    timing: 'after-resolution',
    effect: 'damage', target: 'none',
    tiers: {
      1: { cost: 4, amount: 2 },
      2: { cost: 8, amount: 5 },
      3: { cost: 12, amount: 8 },
    },
  },
  'iduns-rejuvenation': {
    id: 'iduns-rejuvenation',
    name: "Iðunn's Rejuvenation",
    priority: 7,
    timing: 'after-resolution',
    effect: 'heal', target: 'none',
    tiers: {
      1: { cost: 4, amount: 2 },
      2: { cost: 7, amount: 4 },
      3: { cost: 10, amount: 6 },
    },
  },
  'vidars-might': {
    id: 'vidars-might',
    name: "Víðarr's Might",
    priority: 4,
    timing: 'before-resolution',
    effect: 'remove-helmets', target: 'none',
    tiers: {
      1: { cost: 2, amount: 2 },
      2: { cost: 4, amount: 4 },
      3: { cost: 6, amount: 6 },
    },
  },
  'baldrs-invulnerability': {
    id: 'baldrs-invulnerability', name: "Baldr's Invulnerability", priority: 4,
    timing: 'before-resolution', effect: 'defense-bonus', target: 'none',
    tiers: {
      1: { cost: 3, amount: 1 },
      2: { cost: 6, amount: 2 },
      3: { cost: 9, amount: 3 },
    },
  },
  'bragis-verve': {
    id: 'bragis-verve', name: "Bragi's Verve", priority: 4,
    timing: 'before-resolution', effect: 'hand-tokens', target: 'none',
    tiers: {
      1: { cost: 4, amount: 2 },
      2: { cost: 8, amount: 3 },
      3: { cost: 12, amount: 4 },
    },
  },
  'brunhilds-fury': {
    id: 'brunhilds-fury', name: "Brunhild's Fury", priority: 4,
    timing: 'before-resolution', effect: 'multiply-axes', target: 'none',
    tiers: {
      1: { cost: 6, amount: 1.5 },
      2: { cost: 10, amount: 2 },
      3: { cost: 18, amount: 3 },
    },
  },
  'freyjas-plenty': {
    id: 'freyjas-plenty', name: "Freyja's Plenty", priority: 2,
    timing: 'before-resolution', effect: 'extra-dice', target: 'none',
    tiers: {
      1: { cost: 2, amount: 1 },
      2: { cost: 4, amount: 2 },
      3: { cost: 6, amount: 3 },
    },
  },
  'freyrs-gift': {
    id: 'freyrs-gift', name: "Freyr's Gift", priority: 4,
    timing: 'before-resolution', effect: 'majority-bonus', target: 'majority',
    tiers: {
      1: { cost: 4, amount: 2 },
      2: { cost: 6, amount: 3 },
      3: { cost: 8, amount: 4 },
    },
  },
  'friggs-sight': {
    id: 'friggs-sight', name: "Frigg's Sight", priority: 2,
    timing: 'before-resolution', effect: 'reroll', target: 'any-dice',
    tiers: {
      1: { cost: 2, amount: 2 },
      2: { cost: 3, amount: 3 },
      3: { cost: 4, amount: 4 },
    },
  },
  'heimdalls-watch': {
    id: 'heimdalls-watch', name: "Heimdall's Watch", priority: 4,
    timing: 'before-resolution', effect: 'heal-block', target: 'none',
    tiers: {
      1: { cost: 4, amount: 1 },
      2: { cost: 7, amount: 2 },
      3: { cost: 10, amount: 3 },
    },
  },
  'hels-grip': {
    id: 'hels-grip', name: "Hel's Grip", priority: 4,
    timing: 'before-resolution', effect: 'heal-axe', target: 'none',
    tiers: {
      1: { cost: 6, amount: 1 },
      2: { cost: 12, amount: 2 },
      3: { cost: 18, amount: 3 },
    },
  },
  'lokis-trick': {
    id: 'lokis-trick', name: "Loki's Trick", priority: 2,
    timing: 'before-resolution', effect: 'ban-dice', target: 'enemy-dice',
    tiers: {
      1: { cost: 3, amount: 1 },
      2: { cost: 6, amount: 2 },
      3: { cost: 9, amount: 3 },
    },
  },
  'mimirs-wisdom': {
    id: 'mimirs-wisdom', name: "Mímir's Wisdom", priority: 4,
    timing: 'before-resolution', effect: 'damage-tokens', target: 'none',
    tiers: {
      1: { cost: 3, amount: 1 },
      2: { cost: 5, amount: 2 },
      3: { cost: 7, amount: 3 },
    },
  },
  'odins-sacrifice': {
    id: 'odins-sacrifice', name: "Odin's Sacrifice", priority: 7,
    timing: 'after-resolution', effect: 'sacrifice-tokens', target: 'health',
    tiers: {
      1: { cost: 6, amount: 3 },
      2: { cost: 8, amount: 4 },
      3: { cost: 10, amount: 5 },
    },
  },
  'skadis-hunt': {
    id: 'skadis-hunt', name: "Skaði's Hunt", priority: 4,
    timing: 'before-resolution', effect: 'arrow-bonus', target: 'none',
    tiers: {
      1: { cost: 6, amount: 1 },
      2: { cost: 10, amount: 2 },
      3: { cost: 14, amount: 3 },
    },
  },
  'skulds-claim': {
    id: 'skulds-claim', name: "Skuld's Claim", priority: 3,
    timing: 'before-resolution', effect: 'arrow-destroy', target: 'none',
    tiers: {
      1: { cost: 4, amount: 2 },
      2: { cost: 6, amount: 3 },
      3: { cost: 8, amount: 4 },
    },
  },
  'thrymrs-theft': {
    id: 'thrymrs-theft', name: "Thrymr's Theft", priority: 1,
    timing: 'before-resolution', effect: 'reduce-favor', target: 'none',
    tiers: {
      1: { cost: 3, amount: 1 },
      2: { cost: 6, amount: 2 },
      3: { cost: 9, amount: 3 },
    },
  },
  'tyrs-pledge': {
    id: 'tyrs-pledge', name: "Tyr's Pledge", priority: 3,
    timing: 'before-resolution', effect: 'sacrifice-destroy', target: 'health',
    tiers: {
      1: { cost: 4, amount: 2 },
      2: { cost: 6, amount: 3 },
      3: { cost: 8, amount: 4 },
    },
  },
  'ullrs-aim': {
    id: 'ullrs-aim', name: "Ullr's Aim", priority: 4,
    timing: 'before-resolution', effect: 'pierce', target: 'none',
    tiers: {
      1: { cost: 2, amount: 2 },
      2: { cost: 3, amount: 3 },
      3: { cost: 4, amount: 6 },
    },
  },
  'vars-bond': {
    id: 'vars-bond', name: "Vár's Bond", priority: 1,
    timing: 'before-resolution', effect: 'heal-spend', target: 'none',
    tiers: {
      1: { cost: 10, amount: 1 },
      2: { cost: 14, amount: 2 },
      3: { cost: 18, amount: 3 },
    },
  },
})

export const DEFAULT_FAVORS: readonly FavorId[] = deepFreeze([
  'thors-strike', 'iduns-rejuvenation', 'vidars-might',
])

export function isFavorId(value: unknown): value is FavorId {
  return typeof value === 'string' && Object.hasOwn(FAVOR_CATALOG, value)
}

export function isFavorLevel(value: unknown): value is FavorLevel {
  return value === 1 || value === 2 || value === 3
}

// The same catalog drives setup, selection and rule explanations.
export function describeFavorTier(id: FavorId, level: FavorLevel): string {
  const { effect, tiers } = FAVOR_CATALOG[id], n = tiers[level].amount
  switch (effect) {
    case 'damage': return `${n} hasar ver.`
    case 'heal': return `${n} can iyileştir.`
    case 'remove-helmets': return `Rakibin ${n} miğfer zarını kaldır.`
    case 'defense-bonus': return `Her miğfer ve kalkan zarına +${n} savunma.`
    case 'hand-tokens': return `Her el zarı için ${n} ek jeton kazan.`
    case 'multiply-axes': return `Toplam baltayı ${n} ile çarp; yukarı yuvarla.`
    case 'extra-dice': return `Bu tur ${n} ek zar at.`
    case 'majority-bonus': return `En çok gelen simgenin toplamına +${n}; eşitlikte seçimin geçerli.`
    case 'reroll': return `Kendi veya rakibinin ${n} zarını yeniden at; seçim sırası korunur.`
    case 'heal-block': return `Engellediğin her saldırı için ${n} can iyileştir.`
    case 'heal-axe': return `Verdiğin her balta hasarı için ${n} can iyileştir.`
    case 'ban-dice': return `Rakibin seçtiğin ${n} zarını bu tur kaldır.`
    case 'damage-tokens': return `Aldığın her hasar için ${n} jeton kazan.`
    case 'sacrifice-tokens': return `Feda ettiğin her can için ${n} jeton kazan.`
    case 'arrow-bonus': return `Her ok zarına +${n} ok.`
    case 'arrow-destroy': return `Her ok zarı için rakibin ${n} jetonunu yok et.`
    case 'reduce-favor': return `Rakibin henüz çağrılmamış gücünü ${n} seviye düşür; sıfırda iptal.`
    case 'sacrifice-destroy': return `Feda ettiğin her can için rakibin ${n} jetonunu yok et.`
    case 'pierce': return `İlk ${n} okun kalkanları aşar.`
    case 'heal-spend': return `Rakibin bundan sonra ödediği her jeton için ${n} can iyileştir.`
  }
}
