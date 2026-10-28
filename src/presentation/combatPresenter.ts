import { gsap } from 'gsap'
import { Vector3 } from 'three'
import type { GameEvent } from '../core'
import type { createBoard } from '../scene/board'

export function createCombatPresenter(board: ReturnType<typeof createBoard>, invalidate: () => void, speed: () => number, reduced: () => boolean = () => false) {
  let active: gsap.core.Timeline | undefined
  let finish: (() => void) | undefined
  let closed = false
  let paused = false
  function animate(build: (timeline: gsap.core.Timeline) => void) {
    if (closed) return Promise.resolve()
    return new Promise<void>(resolve => {
      finish = () => { active = undefined; finish = undefined; resolve() }
      active = gsap.timeline({ onUpdate: invalidate, onComplete: () => finish?.() })
      build(active)
      active.timeScale(speed())
      if (reduced()) active.progress(1)
      else if (paused) active.pause()
      if (active && !active.duration()) { active.kill(); finish?.() }
    })
  }
  async function flight(from: Vector3, to: Vector3, blocked = false, token = false, color = '#ffda7b') {
    const orb = token ? board.tokenEffect : board.effect
    if (!token) { board.effect.material.color.set(color); board.effect.material.emissive.set(color) }
    orb.visible = true
    orb.position.copy(from)
    orb.scale.setScalar(blocked ? 0.8 : 1)
    await animate(t => {
      t.to(orb.position, { x: to.x, z: to.z, y: to.y + 0.4, duration: 0.4, ease: 'power2.in' })
      t.to(orb.scale, { x: blocked ? 2.8 : 1.8, y: blocked ? 0.3 : 1.8, z: blocked ? 2.8 : 1.8, duration: 0.13 })
    })
    orb.visible = false
    invalidate()
  }
  return {
    async play(event: GameEvent) {
      if (closed) return
      if (event.type === 'FavorInvoked') {
        const totem = board.totem(event.playerId, event.favorId)
        await animate(t => {
          t.to(totem.position, { y: 0.65, duration: 0.23 })
          t.to(totem.rotation, { y: Math.PI * 2, duration: 0.4 }, 0)
          t.to(totem.position, { y: 0, duration: 0.23 })
        })
      } else if (event.type === 'AttackBlocked' || event.type === 'DamageDealt') {
        const from = event.dieId ? board.dice.get(event.dieId)!.position.clone() : board.totem(event.playerId, event.type === 'DamageDealt' ? event.favorId! : '').position.clone().add(new Vector3(0, 1.5, 0))
        const to = event.type === 'AttackBlocked' ? board.dice.get(event.defenderDieId)!.position.clone() : board.resourcePosition(event.targetId)
        await flight(from, to, event.type === 'AttackBlocked', false, event.type === 'AttackBlocked' ? '#8bc7da' : event.favorId ? '#c1b8ff' : '#ffc08c')
      } else if (event.type === 'TokensGained') {
        for (const id of event.dieIds) await flight(board.dice.get(id)!.position.clone(), board.resourcePosition(event.playerId, true), false, true)
      } else if (event.type === 'TokensStolen' && event.amount) {
        await flight(board.resourcePosition(event.targetId, true), board.resourcePosition(event.playerId, true), false, true)
      } else if (event.type === 'HealthRestored') {
        await flight(board.totem(event.playerId, event.favorId ?? 'iduns-rejuvenation').position.clone().add(new Vector3(0, 1.5, 0)), board.resourcePosition(event.playerId), false, false, '#9dd68a')
      } else if (event.type === 'TokensGranted') {
        await flight(board.totem(event.playerId, event.favorId).position.clone().add(new Vector3(0, 1.5, 0)), board.resourcePosition(event.playerId, true), false, true)
      } else if (event.type === 'TokensDestroyed' && event.amount) {
        await flight(board.resourcePosition(event.targetId, true), board.totem(event.playerId, event.favorId).position.clone().add(new Vector3(0, 1.5, 0)), false, false, '#e292ae')
      } else if (event.type === 'HealthSacrificed' && event.amount) {
        await flight(board.resourcePosition(event.playerId), board.totem(event.playerId, event.favorId).position.clone().add(new Vector3(0, 1.5, 0)), false, false, '#ed8594')
      } else if (event.type === 'DiceValuesChanged') {
        for (const value of event.values) await flight(board.totem(event.playerId, event.favorId).position.clone().add(new Vector3(0, 1.5, 0)), board.dice.get(value.dieId)!.position.clone(), true, false, '#aee5c5')
      } else if (event.type === 'FavorReduced') {
        await flight(board.resourcePosition(event.playerId, true), board.totem(event.targetId, event.favorId).position.clone().add(new Vector3(0, 1.5, 0)), true, false, '#e292ae')
      } else if (event.type === 'FavorEffectApplied' || event.type === 'FavorFailed') {
        await flight(board.totem(event.playerId, event.favorId).position.clone().add(new Vector3(0, 1.5, 0)), board.resourcePosition(event.playerId), true, false, event.type === 'FavorFailed' ? '#db8494' : '#b3d8f0')
      } else if (event.type === 'HelmetsRemoved' || event.type === 'DiceRemoved') {
        for (const id of event.dieIds) {
          const die = board.dice.get(id)!
          await animate(t => { t.to(die.position, { y: 1.6, duration: 0.22 }); t.to(die.scale, { x: 0, y: 0, z: 0, duration: 0.2 }) })
          die.visible = false
          die.scale.setScalar(1)
        }
      }
    },
    setSpeed(value: number) { active?.timeScale(value) },
    setPaused(value: boolean) { paused = value; if (active) active.paused(value) },
    dispose() { closed = true; active?.kill(); finish?.(); board.effect.visible = false; board.tokenEffect.visible = false },
  }
}
