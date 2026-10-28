import { Quaternion, Vector3 } from 'three'
import type { FaceId } from '../core'

// Our adaptation's axes, independent of the core's logical face array order.
export const FACE_NORMALS: Record<FaceId, [number, number, number]> = {
  arrow: [0, 1, 0],
  'axe-2': [0, -1, 0],
  helmet: [1, 0, 0],
  shield: [-1, 0, 0],
  hand: [0, 0, 1],
  'axe-1': [0, 0, -1],
}
export const UP = new Vector3(0, 1, 0)
export function faceUpRotation(faceId: FaceId) {
  const normal = new Vector3(...FACE_NORMALS[faceId])
  const rotation = new Quaternion().setFromUnitVectors(normal, UP)
  const plaque = new Quaternion().setFromUnitVectors(
    new Vector3(0, 0, 1),
    normal,
  )
  const faceUp = new Vector3(0, 1, 0)
    .applyQuaternion(plaque)
    .applyQuaternion(rotation)
  return rotation.premultiply(
    new Quaternion().setFromAxisAngle(UP, Math.atan2(faceUp.x, -faceUp.z)),
  )
}
export function topFace(rotation: Quaternion) {
  return (Object.keys(FACE_NORMALS) as FaceId[])
    .map((faceId) => ({
      faceId,
      alignment: new Vector3(...FACE_NORMALS[faceId]).applyQuaternion(rotation)
        .y,
    }))
    .sort((a, b) => b.alignment - a.alignment)[0]!
}
export function bowlSlot(index: number): [number, number, number] {
  return [((index % 3) - 1) * 1.2, 0.77, index < 3 ? -0.68 : 0.68]
}
export function reserveSlot(
  player: string,
  index: number,
  selected = false,
): [number, number, number] {
  return [
    (index - 2.5) * 0.98,
    selected ? 0.76 : 0.49,
    player === 'player-1' ? 3.9 : -3.9,
  ]
}
