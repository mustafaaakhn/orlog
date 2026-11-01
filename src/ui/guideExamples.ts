import type { DieSymbol } from '../core'

// Fixed teaching illustrations, not a second combat resolver. Tests compare
// these expected outcomes with the existing core and no god powers applied.
export interface GuideExample {
  id: string
  title: string
  explanation: string
  attack: readonly DieSymbol[]
  defense: readonly DieSymbol[]
  targetTokens: number
  blocked: number
  damage: number
  stolen: number
}
export const GUIDE_EXAMPLES: readonly GuideExample[] = [
  { id: 'axes', title: 'Miğfer baltayı durdurur.', explanation: 'Her balta 1 hasar verir; her miğfer 1 balta hasarını engeller. İki baltaya karşı bir miğfer varsa yalnız bir balta geçer.',
    attack: ['axe', 'axe'], defense: ['helmet'], targetTokens: 0, blocked: 1, damage: 1, stolen: 0 },
  { id: 'arrows', title: 'Kalkan oku durdurur.', explanation: 'Ok da 1 hasar verir, ama onu yalnız kalkan engeller. İki oka karşı bir kalkan varsa rakip 1 can kaybeder.',
    attack: ['arrow', 'arrow'], defense: ['shield'], targetTokens: 0, blocked: 1, damage: 1, stolen: 0 },
  { id: 'mismatch', title: 'Doğru savunma gerekir.', explanation: 'Kalkan baltayı, miğfer oku engelleyemez. Burada rakibin kalkanı var; senin baltan yine de 1 hasar verir.',
    attack: ['axe'], defense: ['shield'], targetTokens: 0, blocked: 0, damage: 1, stolen: 0 },
  { id: 'steal', title: 'El cana değil, jetona gider.', explanation: 'Her el rakipten 1 jeton alır. İki elin ve rakibin 3 jetonu varsa 2 jeton sana geçer, rakipte 1 kalır. Rakipte jeton yoksa çalamazsın.',
    attack: ['hand', 'hand'], defense: [], targetTokens: 3, blocked: 0, damage: 0, stolen: 2 },
]
