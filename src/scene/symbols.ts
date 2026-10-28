import type { DieSymbol } from '../core'

// Original paths on a 100 × 100 artboard, shared by the HTML guide and 3D faces.
export const SYMBOL_PATHS: Record<DieSymbol, string> = {
  axe: 'M43 82 L51 39 M36 17 Q58 11 77 27 L68 50 Q53 45 43 32 L27 41 L21 26 Z M39 79 L49 83',
  arrow:
    'M25 77 L76 23 M49 25 L78 21 L76 50 M25 60 L24 77 L41 76 M35 49 L34 66 L51 65',
  helmet:
    'M21 64 Q21 32 45 27 L45 19 L55 19 L55 27 Q79 32 79 64 Z M16 65 L84 65 M35 66 L35 81 L45 76 L45 65 M65 66 L65 81 L55 76 L55 65 M50 29 L50 59',
  shield:
    'M50 15 L78 27 L75 57 Q70 75 50 87 Q30 75 25 57 L22 27 Z M50 17 L50 85 M25 46 L76 46 M45 40 L55 40 L55 52 L45 52 Z',
  hand: 'M28 78 L23 60 L18 50 Q18 43 24 45 L34 55 L34 24 Q34 17 40 20 L42 43 L44 16 Q47 10 51 17 L52 43 L57 20 Q62 16 64 23 L62 46 L70 31 Q76 27 77 35 L70 65 L59 82 Z M29 84 L59 86',
}

export const SYMBOL_GUIDE: {
  id: DieSymbol
  name: string
  description: string
}[] = [
  { id: 'axe', name: 'Balta', description: 'Yakın dövüş saldırısı' },
  { id: 'arrow', name: 'Ok', description: 'Menzilli saldırı' },
  { id: 'helmet', name: 'Miğfer', description: 'Baltaya karşı savunma' },
  { id: 'shield', name: 'Kalkan', description: 'Oka karşı savunma' },
  { id: 'hand', name: 'El', description: 'Rakipten jeton çalma' },
]
