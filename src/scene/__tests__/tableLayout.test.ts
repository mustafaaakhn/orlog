import { describe, expect, it } from "vitest";
import { bowlCenter, lifeStoneSlot, seatPosition } from "../tableLayout";
import {
  bowlWorldSlot,
  playerFaceRotation,
  reserveSlot,
  topFace,
} from "../diceGeometry";
import { closestDieTarget } from "../dieTargets";

describe("player-facing table layout", () => {
  it("gives each player a separate bowl and opposing central battle lines", () => {
    expect(bowlCenter("player-1")[2]).toBeGreaterThan(5);
    expect(bowlCenter("player-2")[2]).toBeLessThan(-5);
    for (const player of ["player-1", "player-2"] as const) {
      const side = player === "player-1" ? 1 : -1;
      const slots = Array.from({ length: 9 }, (_, i) => reserveSlot(player, i));
      expect(new Set(slots.map((value) => value.join(","))).size).toBe(9);
      expect(
        slots.every((value) => value[2] * side > 0 && value[2] * side < 2),
      ).toBe(true);
      expect(bowlWorldSlot(player, 0)[2] * side).toBeGreaterThan(3);
      // The same layout rotated into the opposite seat: life left, gods right.
      expect(seatPosition(player, -5.7, 0, 5.15)[0] * side).toBeLessThan(0);
      expect(seatPosition(player, 5.7, 0, 5.15)[0] * side).toBeGreaterThan(0);
      expect(topFace(playerFaceRotation("helmet", player)).faceId).toBe(
        "helmet",
      );
    }
    expect(
      Math.abs(
        playerFaceRotation("helmet", "player-1").dot(
          playerFaceRotation("helmet", "player-2"),
        ),
      ),
    ).toBeCloseTo(0);
  });
  it("places fifteen life stones in five columns and three rows", () => {
    const slots = Array.from({ length: 15 }, (_, i) => lifeStoneSlot(i));
    expect(new Set(slots.map((value) => value[0])).size).toBe(5);
    expect(new Set(slots.map((value) => value[2])).size).toBe(3);
  });
  it("routes overlapping touch regions to the nearest physical die", () => {
    const targets = [
      { id: "player-1/die-1" as const, x: 40, y: 50 },
      { id: "player-1/die-2" as const, x: 45, y: 50 },
    ];
    expect(closestDieTarget(targets, 160, 200, 400, 400)?.id).toBe(
      "player-1/die-1",
    );
    expect(closestDieTarget(targets, 179, 201, 400, 400)?.id).toBe(
      "player-1/die-2",
    );
    expect(closestDieTarget([], 0, 0, 400, 400)).toBeUndefined();
  });
});

import { tokenSlot } from '../tableLayout'
describe('physical gold plate stacks', () => {
  it.each([5, 6, 10, 11, 12, 41, 127])('places all %i plates in stacks of at most five without truncation', count => {
    const stacks = new Map<string, number[]>()
    for (let i = 0; i < count; i++) {
      const [x, y, z] = tokenSlot(i), key = `${x}/${z}`
      stacks.set(key, [...stacks.get(key) ?? [], y])
    }
    expect(stacks.size).toBe(Math.ceil(count / 5))
    expect([...stacks.values()].every(levels => levels.length <= 5 && new Set(levels).size === levels.length)).toBe(true)
    expect([...stacks.values()].reduce((sum, levels) => sum + levels.length, 0)).toBe(count)
    if (count === 12) expect([...stacks.values()].map(levels => levels.length)).toEqual([5, 5, 2])
  })
})
