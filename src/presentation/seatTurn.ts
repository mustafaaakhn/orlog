import { gsap } from 'gsap'
import type { PlayerId } from '../core'
import { playerAngle } from '../scene/tableLayout'

export function createSeatTurn(initialPlayer: PlayerId, feedback: {
  frame(angle: number): void
  active(player: PlayerId | null): void
}) {
  const view = { angle: playerAngle(initialPlayer) }
  let player = initialPlayer
  let tween: gsap.core.Tween | null = null
  let closed = false

  function snap(target: PlayerId) {
    tween?.kill()
    tween = null
    player = target
    view.angle = playerAngle(target)
    feedback.frame(view.angle)
    feedback.active(null)
  }
  return {
    get angle() { return view.angle },
    turn(target: PlayerId, reduced: boolean, instant = false) {
      if (closed) return
      if (instant) { snap(target); return }
      if (target === player) return
      tween?.kill()
      player = target
      // Keep clockwise continuity even if the previous turn was interrupted.
      const full = Math.PI * 2
      const delta = ((playerAngle(target) - view.angle) % full + full) % full
      const end = view.angle + delta
      feedback.active(target)
      if (reduced) { view.angle = end; feedback.frame(end) }
      tween = gsap.to(reduced ? {} : view, {
        ...(reduced ? {} : { angle: end }),
        duration: reduced ? 0.45 : 1.15,
        ease: reduced ? 'none' : 'power2.inOut',
        onUpdate: () => { if (!reduced) feedback.frame(view.angle) },
        onComplete: () => { snap(target) },
      })
    },
    snap(target: PlayerId) { if (!closed) snap(target) },
    dispose() {
      if (closed) return
      closed = true
      tween?.kill()
      tween = null
      feedback.active(null)
    },
  }
}
