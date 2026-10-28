import { describe, expect, it } from 'vitest'
import { Quaternion, Vector3 } from 'three'
import { FACE_IDS } from '../../core'
import type { RolledDie } from '../../core'
import { FACE_NORMALS, topFace } from '../../scene/diceGeometry'
import { recordRoll, validLanding } from '../rollSimulation'
import type { Pose } from '../rollSimulation'

const dice: RolledDie[] = FACE_IDS.map((faceId, i) => ({
  dieId: `player-1/die-${i + 1}` as RolledDie['dieId'],
  faceId,
}))
describe('physical roll recordings', () => {
  it('lands every logical face upward for each remaining dice count', async () => {
    for (let count = 1; count <= 6; count++) {
      for (const seed of [1, 942, 3260]) {
        const recording = await recordRoll(dice.slice(0, count), seed)
        const landing = recording.frames.at(-1)!
        expect(validLanding(landing)).toBe(true)
        landing.forEach((pose, i) =>
          expect(topFace(new Quaternion(...pose.rotation)).faceId).toBe(
            dice[i]!.faceId,
          ),
        )
        expect(recording.attempts).toBeLessThanOrEqual(4)
        expect(recording.frames.length).toBeLessThanOrEqual(360)
      }
    }
  }, 20000)

  it('uses a bounded controlled drop when natural recordings are unavailable', async () => {
    const recording = await recordRoll(dice, 1, 0)
    expect(recording.controlled).toBe(true)
    expect(recording.attempts).toBe(1)
    expect(validLanding(recording.frames.at(-1)!)).toBe(true)
    expect(recording.frames[0]![0]!.position[1]).toBeGreaterThan(2)
    expect(recording.frames.at(-1)![0]!.position[1]).toBeLessThan(0.8)
  })

  it('remaps the complete recording by a constant cube symmetry without changing the physical path', async () => {
    const first = await recordRoll(dice, 307)
    expect(first.controlled).toBe(false)
    const changed = dice.map((die) => ({ ...die, faceId: 'hand' as const }))
    const second = await recordRoll(changed, 307)
    const correction = first.frames[0]!.map((pose, index) =>
      new Quaternion(...pose.rotation)
        .invert()
        .multiply(new Quaternion(...second.frames[0]![index]!.rotation)),
    )
    for (let frame = 0; frame < first.frames.length; frame += 7) {
      first.frames[frame]!.forEach((pose, index) => {
        const remapped = second.frames[frame]![index]!
        expect(remapped.position).toEqual(pose.position)
        const expected = new Quaternion(...pose.rotation).multiply(
          correction[index]!,
        )
        expect(
          Math.abs(expected.dot(new Quaternion(...remapped.rotation))),
        ).toBeCloseTo(1, 5)
      })
    }
    correction.forEach((rotation) =>
      Object.values(FACE_NORMALS).forEach((normal) => {
        const rotated = new Vector3(...normal).applyQuaternion(rotation)
        expect(
          Math.max(
            Math.abs(rotated.x),
            Math.abs(rotated.y),
            Math.abs(rotated.z),
          ),
        ).toBeCloseTo(1, 5)
      }),
    )
  })

  it('rejects tilted, stacked, escaped, overlapping and invalid landings', () => {
    const safe: Pose = { position: [0, 0.765, 0], rotation: [0, 0, 0, 1] }
    expect(validLanding([safe])).toBe(true)
    expect(
      validLanding([
        {
          ...safe,
          rotation: new Quaternion()
            .setFromAxisAngle(new Vector3(1, 0, 0), 0.3)
            .toArray(),
        },
      ]),
    ).toBe(false)
    expect(validLanding([safe, { ...safe, position: [0, 1.65, 0] }])).toBe(
      false,
    )
    expect(validLanding([{ ...safe, position: [3.4, 0.765, 0] }])).toBe(false)
    expect(validLanding([safe, { ...safe, position: [0.4, 0.765, 0] }])).toBe(
      false,
    )
    expect(validLanding([{ ...safe, position: [NaN, 0, 0] }])).toBe(false)
  })
})
