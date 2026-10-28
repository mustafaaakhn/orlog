import type { DieSymbol } from "../core";

// Original paths on a 100 × 100 artboard, shared by the HTML guide and 3D faces.
export const SYMBOL_PATHS: Record<DieSymbol, string> = {
  axe: "M26 88 48 42 35 36 42 14Q60 9 79 24L72 47Q62 44 55 39L34 91Z",
  arrow:
    "M17 77 65 29 53 27 85 13 72 46 70 34 24 81Z M15 65 23 73 34 74 23 85 12 86 13 75Z",
  helmet:
    "M46 13H54V23C72 25 82 42 82 60H87V67H76V85L60 78V65H54V88H46V65H40V78L24 85V67H13V60H18C18 42 28 25 46 23Z M28 51H43V58H28Z M57 51H72V58H57Z",
  shield:
    "M50 12A38 38 0 1 1 50 88A38 38 0 1 1 50 12Z M50 21A29 29 0 1 0 50 79A29 29 0 1 0 50 21Z M50 37A13 13 0 1 1 50 63A13 13 0 1 1 50 37Z",
  hand: "M30 79 21 59 15 49Q13 42 20 41L32 51V24Q32 16 40 18L43 43V16Q46 8 52 15L53 43 58 20Q63 13 68 21L64 46 72 31Q78 25 82 33L74 62 62 80V89H31Z",
};

export const SYMBOL_GUIDE: {
  id: DieSymbol;
  name: string;
  description: string;
}[] = [
  { id: "axe", name: "Balta", description: "Yakın dövüş saldırısı" },
  { id: "arrow", name: "Ok", description: "Menzilli saldırı" },
  { id: "helmet", name: "Miğfer", description: "Baltaya karşı savunma" },
  { id: "shield", name: "Kalkan", description: "Oka karşı savunma" },
  { id: "hand", name: "El", description: "Rakipten jeton çalma" },
];
