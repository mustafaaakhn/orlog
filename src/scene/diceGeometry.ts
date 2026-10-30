import { Quaternion, Vector3 } from "three";
import type { FaceId, PlayerId } from "../core";
import { bowlCenter, playerAngle, playerSide } from "./tableLayout";

// Our adaptation's axes, independent of the core's logical face array order.
export const FACE_NORMALS: Record<FaceId, [number, number, number]> = {
  arrow: [0, 1, 0],
  "axe-2": [0, -1, 0],
  helmet: [1, 0, 0],
  shield: [-1, 0, 0],
  hand: [0, 0, 1],
  "axe-1": [0, 0, -1],
};
export const UP = new Vector3(0, 1, 0);
export function faceUpRotation(faceId: FaceId) {
  const normal = new Vector3(...FACE_NORMALS[faceId]);
  const rotation = new Quaternion().setFromUnitVectors(normal, UP);
  const plaque = new Quaternion().setFromUnitVectors(
    new Vector3(0, 0, 1),
    normal,
  );
  const faceUp = new Vector3(0, 1, 0)
    .applyQuaternion(plaque)
    .applyQuaternion(rotation);
  return rotation.premultiply(
    new Quaternion().setFromAxisAngle(UP, Math.atan2(faceUp.x, -faceUp.z)),
  );
}
export function topFace(rotation: Quaternion) {
  return (Object.keys(FACE_NORMALS) as FaceId[])
    .map((faceId) => ({
      faceId,
      alignment: new Vector3(...FACE_NORMALS[faceId]).applyQuaternion(rotation)
        .y,
    }))
    .sort((a, b) => b.alignment - a.alignment)[0]!;
}
export function bowlSlot(index: number): [number, number, number] {
  return [((index % 3) - 1) * 1.2, 0.77, index < 3 ? -0.68 : 0.68];
}
export function bowlWorldPosition(
  player: PlayerId,
  position: readonly number[],
): [number, number, number] {
  const center = bowlCenter(player),
    side = playerSide(player);
  return [position[0]! * side, position[1]!, center[2] + position[2]! * side];
}
export function bowlWorldSlot(player: PlayerId, index: number) {
  return bowlWorldPosition(player, bowlSlot(index));
}
export function playerFaceRotation(face: FaceId, player: PlayerId) {
  return faceUpRotation(face).premultiply(
    new Quaternion().setFromAxisAngle(UP, playerAngle(player)),
  );
}
export function reserveSlot(
  player: PlayerId,
  index: number,
  selected = false,
): [number, number, number] {
  // Six base dice face the opponent. Favor dice extend this same battle line.
  const column = index < 6 ? index - 2.5 : index === 6 ? -3.5 : index - 3.5;
  return [
    column * 1.125 * playerSide(player),
    selected ? 0.65 : 0.49,
    1.08 * playerSide(player),
  ];
}
