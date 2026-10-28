import RAPIER from '@dimforge/rapier3d-compat'
import { Quaternion, Vector3 } from 'three'
import { createSeededRandom } from '../core'
import type { RolledDie } from '../core'
import { bowlSlot, FACE_NORMALS, topFace } from '../scene/diceGeometry'

import { PHYSICS_STEP } from './physicsTiming'
export { PHYSICS_STEP } from './physicsTiming'
export interface Pose {
  position: [number, number, number]
  rotation: [number, number, number, number]
}
export interface RollRecording {
  frames: Pose[][]
  impacts: { frame: number; strength: number }[]
  dice: readonly RolledDie[]
  attempts: number
  controlled: boolean
}
let initialized: Promise<void> | undefined
export function initializePhysics() {
  return (initialized ??= RAPIER.init().catch((error) => {
    initialized = undefined
    throw error
  }))
}

function addBowl(world: RAPIER.World) {
  world.createCollider(
    RAPIER.ColliderDesc.cylinder(0.16, 2.35)
      .setTranslation(0, 0.165, 0)
      .setFriction(0.8),
  )
  // Inner lathe surface, sharing the visible bowl's measured radii/heights.
  const profile = [
    [2.35, 0.31],
    [2.63, 0.5],
    [2.86, 0.78],
    [2.96, 1.04],
    [3.05, 1.07],
  ]
  const vertices: number[] = [],
    indices: number[] = []
  profile.forEach(([radius, y]) => {
    for (let i = 0; i < 64; i++) {
      const angle = (i * Math.PI) / 32
      vertices.push(Math.sin(angle) * radius!, y!, Math.cos(angle) * radius!)
    }
  })
  for (let ring = 0; ring < profile.length - 1; ring++) {
    for (let i = 0; i < 64; i++) {
      const a = ring * 64 + i,
        b = ring * 64 + ((i + 1) % 64)
      indices.push(a, a + 64, b, b, a + 64, b + 64)
    }
  }
  world.createCollider(
    RAPIER.ColliderDesc.trimesh(
      new Float32Array(vertices),
      new Uint32Array(indices),
    ).setFriction(0.8),
  )
}

export function validLanding(poses: readonly Pose[]) {
  return poses.every((pose, index) => {
    const [x, y, z] = pose.position
    return (
      Number.isFinite(x + y + z) &&
      Math.hypot(x, z) < 2.12 &&
      Math.abs(y - 0.765) < 0.045 &&
      topFace(new Quaternion(...pose.rotation)).alignment > 0.999 &&
      poses.every(
        (other, j) =>
          j === index ||
          Math.hypot(x - other.position[0], z - other.position[2]) > 0.86,
      )
    )
  })
}

function simulate(count: number, seed: number, controlled: boolean) {
  const random = createSeededRandom(seed)
  const world = new RAPIER.World({ x: 0, y: -18, z: 0 })
  const contacts = new RAPIER.EventQueue(true)
  world.timestep = PHYSICS_STEP
  try {
    addBowl(world)
    const bodies = Array.from({ length: count }, (_, index) => {
      const [x, , z] = bowlSlot(index)
      const rotation = new Quaternion()
      if (!controlled)
        rotation.setFromAxisAngle(
          new Vector3(
            random() + 0.1,
            random() + 0.1,
            random() + 0.1,
          ).normalize(),
          random() * Math.PI * 2,
        )
      const body = world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(x, 2.5 + index * 0.22, z)
          .setRotation(rotation)
          .setLinvel(
            controlled ? 0 : (random() - 0.5) * 2,
            -1,
            controlled ? 0 : (random() - 0.5) * 2,
          )
          .setAngvel(
            controlled
              ? { x: 0, y: 0, z: 0 }
              : {
                  x: random() * 12 - 6,
                  y: random() * 10 - 5,
                  z: random() * 12 - 6,
                },
          )
          .setLinearDamping(0.65)
          .setAngularDamping(0.8)
          .setCcdEnabled(true),
      )
      // Same rounded cube under every 90-degree cube symmetry used for face remapping.
      world.createCollider(
        RAPIER.ColliderDesc.roundCuboid(0.365, 0.365, 0.365, 0.075)
          .setRestitution(controlled ? 0.12 : 0.32)
          .setFriction(0.85)
          .setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS)
          .setContactForceEventThreshold(8),
        body,
      )
      return body
    })
    const frames: Pose[][] = []
    const impacts: RollRecording['impacts'] = []
    let lastImpact = -10
    let stableSteps = 0
    for (let step = 0; step < 360; step++) {
      frames.push(
        bodies.map((body) => {
          const p = body.translation(),
            q = body.rotation()
          return { position: [p.x, p.y, p.z], rotation: [q.x, q.y, q.z, q.w] }
        }),
      )
      const resting = bodies.every((body) => {
        const v = body.linvel(),
          w = body.angvel()
        return (
          Math.hypot(v.x, v.y, v.z) < 0.025 && Math.hypot(w.x, w.y, w.z) < 0.025
        )
      })
      stableSteps = resting ? stableSteps + 1 : 0
      if (step > 90 && stableSteps >= 18) break
      world.step(contacts)
      let force = 0
      contacts.drainContactForceEvents(event => { force = Math.max(force, event.totalForceMagnitude()) })
      // Suppress resting contact noise and limit the whole bowl to 10 contacts/s.
      if (force > 8 && step - lastImpact >= 6 && bodies.some(body => Math.hypot(body.linvel().x, body.linvel().y, body.linvel().z) > .25)) {
        impacts.push({ frame: step + 1, strength: Math.min(1, force / 100) })
        lastImpact = step
      }
    }
    return { frames, impacts, settled: stableSteps >= 18 }
  } finally {
    contacts.free()
    world.free()
  }
}

// A CONSTANT cube symmetry right-multiplied across EVERY sample preserves the
// physical hull and continuity. No face is swapped or snapped at the last frame.
export async function recordRoll(
  dice: readonly RolledDie[],
  seed: number,
  naturalAttempts = 3,
): Promise<RollRecording> {
  await initializePhysics()
  if (dice.length < 1 || dice.length > 6)
    throw new RangeError('A roll needs one to six dice.')
  if (
    !Number.isInteger(naturalAttempts) ||
    naturalAttempts < 0 ||
    naturalAttempts > 3
  )
    throw new RangeError('Retry budget must be between zero and three.')
  let frames: Pose[][] = [],
    impacts: RollRecording['impacts'] = [],
    attempts = 0,
    controlled = false,
    settled = false
  for (; attempts <= naturalAttempts; attempts++) {
    controlled = attempts === naturalAttempts
    const simulation = simulate(dice.length, seed + attempts * 997, controlled)
    frames = simulation.frames
    impacts = simulation.impacts
    settled = simulation.settled
    if (settled && validLanding(frames.at(-1)!)) break
  }
  if (!settled || !validLanding(frames.at(-1)!))
    throw new Error('No safe dice landing could be recorded.')
  dice.forEach((die, index) => {
    const final = new Quaternion(...frames.at(-1)![index]!.rotation)
    const physicalFace = topFace(final).faceId
    const correction = new Quaternion().setFromUnitVectors(
      new Vector3(...FACE_NORMALS[die.faceId]),
      new Vector3(...FACE_NORMALS[physicalFace]),
    )
    frames.forEach((frame) => {
      frame[index]!.rotation = new Quaternion(...frame[index]!.rotation)
        .multiply(correction)
        .toArray()
    })
  })
  return { frames, impacts, dice, attempts: attempts + 1, controlled }
}
