import type { PlayerId } from "../core";

// World +Z is player one's seat. Each player owns the same layout rotated 180°.
export const TABLE_HALF_WIDTH = 13.2;
export const TABLE_NARROW_HALF_WIDTH = 7.4;
export const TABLE_HALF_DEPTH = 10.4;
export const BOWL_DISTANCE = 6.7;
export const playerSide = (player: PlayerId) =>
  player === "player-1" ? 1 : -1;
export const playerAngle = (player: PlayerId) =>
  player === "player-1" ? 0 : Math.PI;
export function seatPosition(
  player: PlayerId,
  x: number,
  y: number,
  z: number,
): [number, number, number] {
  const side = playerSide(player);
  return [x * side, y, z * side];
}
export function bowlCenter(player: PlayerId): [number, number, number] {
  return seatPosition(player, 0, 0, BOWL_DISTANCE);
}
export function lifeStoneSlot(index: number): [number, number, number] {
  return [((index % 5) - 2) * 0.5, 0.17, (Math.floor(index / 5) - 1) * 0.5];
}

export function collectionSlot(player: PlayerId, index: number): [number, number, number] {
  return seatPosition(player, 4.1 + (index % 3) * 1.08, 0.5, 8.1 + Math.floor(index / 3) * 0.9)
}

export function tokenSlot(index: number): [number, number, number] {
  const stack = Math.floor(Math.max(0, index) / 5)
  const level = Math.max(0, index) % 5
  return [(stack % 5) * 0.56, 0.09 + level * 0.145, -Math.floor(stack / 5) * 0.57]
}

// Peripheral anchors share one responsive layout; all effect positions read these groups.
export function resourceLayout(narrow: boolean) {
  return narrow
    ? { lifeX: -5.2, lifeZ: 6.7, tokenX: 3.9, tokenZ: 3.6, godX: 3.75, godZ: 6.7, godGap: 1.3 }
    : { lifeX: -8.2, lifeZ: 6.7, tokenX: 6.3, tokenZ: 3.6, godX: 6.4, godZ: 6.7, godGap: 1.55 };
}
