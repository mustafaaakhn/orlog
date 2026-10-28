import { gsap } from 'gsap'
import { Group, Quaternion } from 'three'
import type { DieId, GameState } from '../core'
import type { PresentationBatch } from '../app/rollSession'
import { faceUpRotation, reserveSlot, bowlSlot } from '../scene/diceGeometry'
import { recordRoll, PHYSICS_STEP } from './rollSimulation'

export function createDicePresenter(
  dice: Map<DieId, Group>,
  invalidate: () => void,
) {
  let disposed = false
  let active: gsap.core.Timeline | undefined
  let cancelTween: (() => void) | undefined
  const bowlRotations = new Map<DieId, Quaternion>()
  const bowlPositions = new Map<DieId, [number, number, number]>()
  const owners = new Map<DieId, 'recording' | 'kinematic'>()

  function animate(build: (timeline: gsap.core.Timeline) => void) {
    return new Promise<void>((resolve) => {
      if (disposed) {
        resolve()
        return
      }
      const finish = () => {
        active = undefined
        cancelTween = undefined
        resolve()
      }
      active = gsap.timeline({ onUpdate: invalidate, onComplete: finish })
      cancelTween = finish
      build(active)
      if (active.duration() === 0) {
        active.kill()
        invalidate()
        finish()
      }
    })
  }

  async function arrange(state: GameState) {
    for (const id of dice.keys()) owners.set(id, 'kinematic')
    await animate((timeline) => {
      for (const player of Object.values(state.players)) {
        player.dice.forEach((value, index) => {
          const object = dice.get(value.id)!
          object.visible = !!value.faceId
          if (!value.faceId) return
          const inBowl =
            state.phase.name === 'roll' &&
            state.phase.activePlayerId === player.id &&
            !value.kept &&
            !value.selected
          const [x, y, z] = inBowl
            ? (bowlPositions.get(value.id) ?? bowlSlot(index))
            : reserveSlot(player.id, index, value.selected)
          object.getObjectByName('selection-marker')!.visible =
            value.selected || value.kept
          const from = object.quaternion.clone(),
            to = inBowl
              ? (bowlRotations.get(value.id) ?? faceUpRotation(value.faceId))
              : faceUpRotation(value.faceId)
          const moved = object.position.distanceTo({ x, y, z }) > 0.01
          const crossesRim = moved && Math.abs(object.position.z - z) > 0.7
          const duration = crossesRim ? 0.57 : 0.28
          if (crossesRim) {
            // Clear the 1.07-high rim with the cube's full half-height.
            timeline.to(
              object.position,
              { y: 1.85, duration: 0.15, ease: 'power2.out' },
              0,
            )
            timeline.to(
              object.position,
              { x, z, duration: 0.3, ease: 'power2.inOut' },
              0.13,
            )
            timeline.to(
              object.position,
              { y, duration: 0.15, ease: 'power2.in' },
              0.42,
            )
          } else if (moved) {
            timeline.to(
              object.position,
              { x, y, z, duration, ease: 'power2.inOut' },
              0,
            )
          }
          if (Math.abs(from.dot(to)) < 0.99999) {
            const progress = { value: 0 }
            timeline.to(
              progress,
              {
                value: 1,
                duration,
                onUpdate: () =>
                  object.quaternion.slerpQuaternions(from, to, progress.value),
              },
              0,
            )
          }
          object.userData.kept = value.kept
        })
      }
    })
  }

  return {
    async play(batch: PresentationBatch) {
      for (const event of batch.events) {
        if (disposed) return
        if (event.type === 'DiceRolled') {
          const recording = await recordRoll(
            event.dice,
            event.sequence * 307 + event.rollNumber,
          )
          if (disposed) return
          event.dice.forEach((value) => {
            owners.set(value.dieId, 'recording')
            const object = dice.get(value.dieId)!
            object.visible = true
            object.getObjectByName('selection-marker')!.visible = false
          })
          const cursor = { frame: 0 }
          const render = () => {
            const index = Math.min(
              Math.floor(cursor.frame),
              recording.frames.length - 1,
            )
            const alpha = cursor.frame - index
            event.dice.forEach((value, i) => {
              const object = dice.get(value.dieId)!
              if (owners.get(value.dieId) !== 'recording') return
              const pose = recording.frames[index]![i]!,
                next =
                  recording.frames[
                    Math.min(index + 1, recording.frames.length - 1)
                  ]![i]!
              object.position.set(...pose.position).lerp(
                {
                  x: next.position[0],
                  y: next.position[1],
                  z: next.position[2],
                },
                alpha,
              )
              object.quaternion
                .set(...pose.rotation)
                .slerp(new Quaternion(...next.rotation), alpha)
            })
          }
          render()
          await animate((timeline) => {
            timeline.to(cursor, {
              frame: recording.frames.length - 1,
              duration: (recording.frames.length - 1) * PHYSICS_STEP,
              ease: 'none',
              onUpdate: render,
            })
          })
          // The offline world has already been freed. Hand recorded transforms
          // to the kinematic presenter only after playback completes.
          event.dice.forEach((value, i) => {
            owners.set(value.dieId, 'kinematic')
            bowlPositions.set(
              value.dieId,
              recording.frames.at(-1)![i]!.position,
            )
            bowlRotations.set(
              value.dieId,
              new Quaternion(...recording.frames.at(-1)![i]!.rotation),
            )
          })
        } else if (
          event.type === 'DieSelectionChanged' ||
          event.type === 'DiceKept' ||
          event.type === 'RollTurnStarted'
        ) {
          await arrange(batch.state)
        }
      }
    },
    dispose() {
      disposed = true
      active?.kill()
      cancelTween?.()
      owners.clear()
    },
  }
}
