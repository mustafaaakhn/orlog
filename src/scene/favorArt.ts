import type { FavorId } from "../core";

// Order is the production atlas grid, not the core catalog's rule priority.
export const FAVOR_ART_IDS: readonly FavorId[] = [
  "thors-strike",
  "iduns-rejuvenation",
  "vidars-might",
  "baldrs-invulnerability",
  "bragis-verve",
  "brunhilds-fury",
  "freyjas-plenty",
  "freyrs-gift",
  "friggs-sight",
  "heimdalls-watch",
  "hels-grip",
  "lokis-trick",
  "mimirs-wisdom",
  "odins-sacrifice",
  "skadis-hunt",
  "skulds-claim",
  "thrymrs-theft",
  "tyrs-pledge",
  "ullrs-aim",
  "vars-bond",
];
export const FAVOR_ART_URL = "/assets/art/gods-atlas.webp";
export function favorArtIndex(id: FavorId) {
  return FAVOR_ART_IDS.indexOf(id);
}
