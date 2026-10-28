import type { PlayerId } from "../core";

// World +Z is player one's seat. Each player owns the same layout rotated 180°.
export const TABLE_HALF_WIDTH = 9.2;
export const TABLE_NARROW_HALF_WIDTH = 7.4;
export const TABLE_HALF_DEPTH = 9.1;
export const BOWL_DISTANCE = 5.15;
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
  return seatPosition(player, 3.8 + (index % 3) * 1.08, 0.5, 6.7 + Math.floor(index / 3) * 0.94)
}

export function tokenSlot(index: number): [number, number, number] {
  const visible = Math.max(0, Math.min(index, 39))
  return [((visible % 5) - 2) * 0.36, 0.1 + Math.floor(visible / 10) * 0.09, Math.floor((visible % 10) / 5) * 0.36]
}
