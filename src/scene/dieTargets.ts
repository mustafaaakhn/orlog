import type { DieId } from "../core";

export interface SceneDieTarget {
  id: DieId;
  combatRole?: "source" | "target";
  x: number;
  y: number;
}

// Expanded touch targets can overlap on small displays. The pointer chooses the
// closest projected die, while keyboard activation keeps the focused identity.
export function closestDieTarget<T extends { x: number; y: number }>(
  targets: readonly T[],
  x: number,
  y: number,
  width: number,
  height: number,
) {
  let result: T | undefined;
  let distance = Infinity;
  for (const target of targets) {
    const squared =
      ((target.x * width) / 100 - x) ** 2 +
      ((target.y * height) / 100 - y) ** 2;
    if (squared < distance) {
      result = target;
      distance = squared;
    }
  }
  return result;
}

export interface SceneFavorTarget {
  playerId: import('../core').PlayerId
  favorId: import('../core').FavorId
  x: number
  y: number
}
