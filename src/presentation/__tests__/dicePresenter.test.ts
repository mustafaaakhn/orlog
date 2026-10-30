import { describe, expect, it, vi } from "vitest";
import { Group, Vector3 } from "three";
import { Game, createSeededRandom } from "../../core";
import type { CommandResult, DieId, GameState } from "../../core";
import type { PresentationBatch } from "../../app/rollSession";
import {
  bowlWorldSlot,
  faceUpRotation,
  playerFaceRotation,
  reserveSlot,
} from "../../scene/diceGeometry";
import { bowlCenter, playerSide } from "../../scene/tableLayout";
import { topFace } from "../../scene/diceGeometry";
import { recordRoll } from "../rollSimulation";
import { createDicePresenter } from "../dicePresenter";

function batch(result: CommandResult): PresentationBatch {
  if (!result.ok) throw new Error(result.error.message);
  return {
    id: result.state.revision,
    revision: result.state.revision,
    events: result.events,
    state: result.state,
  };
}
function pieces(state: GameState) {
  const dice = new Map<DieId, Group>();
  for (const player of Object.values(state.players)) {
    player.dice.forEach((die, index) => {
      const object = new Group(),
        marker = new Group();
      marker.name = "selection-marker";
      object.add(marker);
      if (die.faceId)
        object.quaternion.copy(playerFaceRotation(die.faceId, player.id));
      const inBowl = !die.kept && !die.selected;
      object.position.set(
        ...(inBowl
          ? bowlWorldSlot(player.id, index)
          : reserveSlot(player.id, index, die.selected)),
      );
      dice.set(die.id, object);
    });
  }
  return dice;
}

describe("dice presentation ownership", () => {
  it("clears the rim during selection while keeping accepted dice stationary", async () => {
    const game = new Game({ random: createSeededRandom(1) });
    game.dispatch({ type: "RollDice", playerId: "player-1" });
    game.dispatch({
      type: "SetDieSelection",
      playerId: "player-1",
      dieId: "player-1/die-1",
      selected: true,
    });
    game.dispatch({ type: "ConfirmRoll", playerId: "player-1" });
    game.dispatch({ type: "RollDice", playerId: "player-2" });
    game.dispatch({ type: "ConfirmRoll", playerId: "player-2" });
    game.dispatch({ type: "RollDice", playerId: "player-1" });
    const dice = pieces(game.state),
      kept = dice.get("player-1/die-1")!,
      moving = dice.get("player-1/die-2")!;
    const position = kept.position.toArray(),
      rotation = kept.quaternion.toArray();
    const frames: {
      y: number;
      z: number;
      kept: number[];
      rotation: number[];
    }[] = [];
    const presenter = createDicePresenter(
      dice,
      () =>
        frames.push({
          y: moving.position.y,
          z: moving.position.z,
          kept: kept.position.toArray(),
          rotation: kept.quaternion.toArray(),
        }),
      { record: recordRoll },
    );
    try {
      await presenter.play(
        batch(
          game.dispatch({
            type: "SetDieSelection",
            playerId: "player-1",
            dieId: "player-1/die-2",
            selected: true,
          }),
        ),
      );
      expect(Math.max(...frames.map((frame) => frame.y))).toBeGreaterThan(1.8);
      const crossing = frames.filter((frame) => frame.z > 2.5 && frame.z < 3.3);
      expect(crossing.length).toBeGreaterThan(0);
      expect(crossing.every((frame) => frame.y > 1.8)).toBe(true);
      expect(
        frames.every(
          (frame) =>
            JSON.stringify(frame.kept) === JSON.stringify(position) &&
            JSON.stringify(frame.rotation) === JSON.stringify(rotation),
        ),
      ).toBe(true);
      expect(moving.position.toArray()).toEqual(
        reserveSlot("player-1", 1, true),
      );
    } finally {
      presenter.dispose();
    }
  });

  it("completes an already arranged batch without leaving the command lock waiting on an empty timeline", async () => {
    const game = new Game();
    game.dispatch({ type: "RollDice", playerId: "player-1" });
    const confirmed = batch(
      game.dispatch({ type: "ConfirmRoll", playerId: "player-1" }),
    );
    const presenter = createDicePresenter(pieces(confirmed.state), () => {}, {
      record: recordRoll,
    });
    try {
      await presenter.play(confirmed);
    } finally {
      presenter.dispose();
    }
  });
});

it.each([false, true])(
  "presents a favor recast (added=%s) without moving other kept dice or reviving removed dice",
  async (added) => {
    const state = JSON.parse(JSON.stringify(new Game().state)) as Parameters<
      typeof import("../../core/resolution").resolveRound
    >[0];
    state.phase = { name: "resolution" };
    Object.values(state.players).forEach((p) =>
      p.dice.forEach((d) => {
        d.faceId = "helmet";
        d.kept = true;
      }),
    );
    state.players["player-2"].dice[0]!.removed = true;
    const changed = added
      ? {
          ...state.players["player-1"].dice[0]!,
          id: "player-1/bonus-1" as DieId,
          faceId: "arrow" as const,
        }
      : { ...state.players["player-1"].dice[0]!, faceId: "arrow" as const };
    if (added) state.players["player-1"].dice.push(changed);
    else state.players["player-1"].dice[0] = changed;
    const dice = pieces(state),
      still = dice.get("player-1/die-2")!,
      removed = dice.get("player-2/die-1")!;
    removed.visible = false;
    const position = still.position.toArray(),
      rotation = still.quaternion.toArray();
    let movedStationary = false;
    const presenter = createDicePresenter(
      dice,
      () => {
        movedStationary ||=
          JSON.stringify(still.position.toArray()) !==
            JSON.stringify(position) ||
          JSON.stringify(still.quaternion.toArray()) !==
            JSON.stringify(rotation);
      },
      { record: recordRoll },
    );
    try {
      await presenter.play({
        id: 1,
        revision: 1,
        state,
        events: [
          {
            type: "DiceRecast",
            id: "favor/1",
            revision: 1,
            round: 1,
            sequence: 1,
            favorId: added ? "freyjas-plenty" : "friggs-sight",
            playerId: "player-1",
            added,
            dice: [changed],
          },
        ],
      });
      const object = dice.get(changed.id)!;
      expect(
        object.position.distanceTo(
          new Vector3(...reserveSlot("player-1", added ? 6 : 0)),
        ),
      ).toBeLessThan(0.00001);
      expect(
        Math.abs(object.quaternion.dot(faceUpRotation("arrow"))),
      ).toBeCloseTo(1);
      expect(removed.visible).toBe(false);
      expect(movedStationary).toBe(false);
    } finally {
      presenter.dispose();
    }
  },
  10000,
);

it.each(["player-1", "player-2"] as const)(
  "reduced motion skips physical recording and shows the same core faces for %s",
  async (playerId) => {
    const game = new Game({
      firstPlayerId: playerId,
      random: createSeededRandom(42),
    });
    const result = batch(game.dispatch({ type: "RollDice", playerId }));
    const dice = pieces(result.state);
    const presenter = createDicePresenter(dice, () => {}, {
      reduced: () => true,
      record: async () => {
        throw new Error("Reduced motion must not simulate");
      },
    });
    await presenter.play(result);
    for (const die of result.state.players[playerId].dice) {
      expect(
        Math.abs(
          dice
            .get(die.id)!
            .quaternion.dot(playerFaceRotation(die.faceId!, playerId)),
        ),
      ).toBeCloseTo(1);
    }
    presenter.dispose();
  },
);

it.each(["player-1", "player-2"] as const)(
  "keeps the %s physics trace in its own bowl, then moves only selected dice to the central battle line",
  async (playerId) => {
    const game = new Game({
      firstPlayerId: playerId,
      random: createSeededRandom(71),
    });
    const dice = pieces(game.state);
    let localSnapshot = "";
    let original: Awaited<ReturnType<typeof recordRoll>> | undefined;
    const presenter = createDicePresenter(dice, () => {}, {
      speed: () => 20,
      record: async (rolled, seed) => {
        original = await recordRoll(rolled, seed);
        localSnapshot = JSON.stringify(original);
        return original;
      },
    });
    try {
      await presenter.play(
        batch(game.dispatch({ type: "RollDice", playerId })),
      );
      expect(JSON.stringify(original)).toBe(localSnapshot);
      const center = bowlCenter(playerId);
      const still = dice.get(`${playerId}/die-2`)!;
      const restingPosition = still.position.toArray();
      for (const value of game.state.players[playerId].dice) {
        const object = dice.get(value.id)!;
        expect(
          Math.hypot(
            object.position.x - center[0],
            object.position.z - center[2],
          ),
        ).toBeLessThan(2.12);
        expect(topFace(object.quaternion).faceId).toBe(value.faceId);
      }
      const dieId = `${playerId}/die-1` as DieId;
      await presenter.play(
        batch(
          game.dispatch({
            type: "SetDieSelection",
            playerId,
            dieId,
            selected: true,
          }),
        ),
      );
      expect(dice.get(dieId)!.position.toArray()).toEqual(
        reserveSlot(playerId, 0, true),
      );
      expect(still.position.toArray()).toEqual(restingPosition);
      await presenter.play(
        batch(game.dispatch({ type: "ConfirmRoll", playerId })),
      );
      expect(still.position.toArray()).toEqual(restingPosition);
      expect(still.position.z * playerSide(playerId)).toBeGreaterThan(3);
      expect(dice.get(dieId)!.position.toArray()).toEqual(
        reserveSlot(playerId, 0),
      );
    } finally {
      presenter.dispose();
    }
  },
  10000,
);


it.each(['finish', 'pause', 'dispose', 'reduced'] as const)('owns the roll bed through %s without sounding during physics preparation', async mode => {
  const game = new Game({ random: () => .35 })
  const result = batch(game.dispatch({ type: 'RollDice', playerId: 'player-1' }))
  const event = result.events.find(event => event.type === 'DiceRolled')!
  if (event.type !== 'DiceRolled') throw new Error('Expected a real roll')
  const stop = vi.fn(), roll = vi.fn(() => stop)
  const recording: Awaited<ReturnType<typeof recordRoll>> = {
    dice: event.dice, attempts: 1, controlled: false, impacts: [],
    frames: [0, 1].map(() => event.dice.map((die, i) => ({ position: [i, .765, 0], rotation: faceUpRotation(die.faceId).toArray() }))),
  }
  let release!: (value: typeof recording) => void
  const presenter = createDicePresenter(pieces(result.state), () => {}, {
    record: () => new Promise(resolve => { release = resolve }),
    reduced: () => mode === 'reduced',
    audio: { event() {}, impact() {}, roll },
  })
  try {
    const pending = presenter.play(result)
    expect(roll).not.toHaveBeenCalled()
    if (mode !== 'reduced') {
      release(recording)
      await Promise.resolve()
      expect(roll).toHaveBeenCalledTimes(1)
      if (mode === 'pause') { presenter.setPaused(true); expect(stop).toHaveBeenCalledTimes(1); presenter.setPaused(false) }
      if (mode === 'dispose') presenter.dispose()
    }
    await pending
    expect(stop).toHaveBeenCalledTimes(mode === 'reduced' ? 0 : 1)
  } finally { presenter.dispose() }
})

it("leaves the current board under snapshot ownership when a cancelled recording arrives late", async () => {
  const game = new Game({ random: createSeededRandom(71) });
  const dice = pieces(game.state);
  const rolled = batch(game.dispatch({ type: "RollDice", playerId: "player-1" }));
  let release!: (value: Awaited<ReturnType<typeof recordRoll>>) => void;
  const presenter = createDicePresenter(dice, () => {}, {
    record: () => new Promise(resolve => { release = resolve; }),
  });
  const pending = presenter.play(rolled);
  presenter.dispose();
  for (const die of dice.values()) die.position.set(7, 1, 4);
  const recording = await recordRoll(
    rolled.events.flatMap(event => event.type === "DiceRolled" ? event.dice : []), 71,
  );
  release(recording);
  await pending;
  expect([...dice.values()].every(die => die.position.equals(new Vector3(7, 1, 4)))).toBe(true);
});
