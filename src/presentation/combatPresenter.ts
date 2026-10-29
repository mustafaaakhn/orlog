import { gsap } from 'gsap'
import { Vector3 } from 'three'
import type { GameEvent, DieId, DieSymbol, GameState, PlayerId } from '../core'
import type { createBoard } from '../scene/board'
import { collectionSlot } from '../scene/tableLayout'
import { eventDice, favorFailureTitle } from './resolutionPlan'
import { eventText } from './eventText'
import { resourceSteps } from './resources'

export interface PresentationCue {
  title?: string
  text?: string
  symbol?: DieSymbol
  targetSymbol?: DieSymbol
  progress?: string
}

export const COMBAT_DURATION_SCALE = 1.7

type Board = ReturnType<typeof createBoard>
export function createCombatPresenter(
  board: Board,
  invalidate: () => void,
  speed: () => number,
  reduced: () => boolean = () => false,
  feedback: {
    progress?: (event: GameEvent, step: number) => void
    cue?: (cue: PresentationCue | null) => void
  } = {},
) {
  let active: gsap.core.Timeline | undefined
  let finish: (() => void) | undefined
  let closed = false
  let paused = false
  const collected = new Set<DieId>()
  const counts: Record<PlayerId, number> = { 'player-1': 0, 'player-2': 0 }
  let durationScale = 1
  function animate(build: (timeline: gsap.core.Timeline) => void, combat = true) {
    if (closed) return Promise.resolve()
    return new Promise<void>(resolve => {
      const done = () => { active = undefined; finish = undefined; resolve() }
      finish = done
      active = gsap.timeline({ onUpdate: invalidate, onComplete: done })
      build(active)
      durationScale = combat && !reduced() ? COMBAT_DURATION_SCALE : 1
      active.timeScale(speed() / durationScale)
      if (paused) active.pause()
      if (active && !active.duration()) { active.kill(); done() }
    })
  }
  function wait(t: gsap.core.Timeline, duration: number) { t.to({}, { duration }) }
  function contact(event: GameEvent, step: number) {
    if (!closed && !paused) feedback.progress?.(event, step)
  }
  function markers(ids: readonly DieId[], visible: boolean) {
    for (const id of ids) {
      const marker = board.dice.get(id)?.getObjectByName('activity-marker')
      if (marker) marker.visible = visible
    }
    invalidate()
  }
  async function flight(from: Vector3, to: Vector3, options: {
    token?: boolean; blocked?: boolean; color?: string; symbol?: 'axe' | 'arrow'; contact?: () => void
  } = {}) {
    if (closed) return
    const orb = options.token ? board.tokenEffect : options.symbol ? board.attackEffects[options.symbol] : board.effect
    if (!options.token && !options.symbol) {
      board.effect.material.color.set(options.color ?? '#ffc08c')
      board.effect.material.emissive.set(options.color ?? '#ffc08c')
    }
    orb.visible = !reduced()
    if (options.symbol) orb.rotation.z = Math.atan2(-(to.z - from.z), to.x - from.x) - Math.PI / 4
    orb.position.copy(from).add(new Vector3(0, 0.55, 0))
    orb.scale.setScalar(options.token ? 1.4 : 1)
    await animate(t => {
      if (reduced()) wait(t, 0.14)
      else t.to(orb.position, { x: to.x, z: to.z, y: to.y + (options.blocked ? 0.5 : 0.1), duration: 0.34, ease: 'power2.in' })
      t.call(() => { if (!closed && !paused) options.contact?.() })
      if (reduced()) wait(t, 0.08)
      else t.to(orb.scale, { x: options.blocked ? 1.8 : 0.2, y: 0.2, z: options.blocked ? 1.8 : 0.2, duration: 0.12 })
    })
    orb.visible = false
    invalidate()
  }
  async function stealGold(event: Extract<GameEvent, { type: 'TokensStolen' }>) {
    if (closed || event.amount <= 0) return
    const effect = board.steal.object
    const points = board.steal.prepare(event.targetId, event.targetTokens, event.amount)
    const pickup = points.reduce((sum, point) => sum.add(point), new Vector3()).multiplyScalar(1 / points.length)
    const destinations = points.map((_, i) => board.tokenPosition(event.playerId, event.tokens - event.amount + i, event.tokens))
    const arrival = destinations.reduce((sum, point) => sum.add(point), new Vector3()).multiplyScalar(1 / destinations.length)
    const offsets = points.map(point => point.clone().sub(pickup))
    const finalOffsets = destinations.map(point => point.clone().sub(arrival))
    const startScale = board.tokenScale(event.targetId), endScale = board.tokenScale(event.playerId, event.tokens)
    board.steal.cargo(offsets, startScale)
    effect.position.copy(pickup)
    effect.visible = true
    try {
      await animate(t => {
        wait(t, reduced() ? 0.16 : 0.34)
        t.call(() => { if (!closed && !paused && !reduced()) board.steal.lift() })
        if (reduced()) wait(t, 0.12)
        else {
          t.to(effect.position, { y: Math.max(pickup.y, arrival.y) + 1.5, duration: 0.18, ease: 'power2.out' })
          t.to(effect.position, { x: arrival.x, z: arrival.z, duration: 0.52, ease: 'power2.inOut' })
          t.to(effect.position, { y: arrival.y, duration: 0.18, ease: 'power2.in' })
          // Settle every real plate into its destination slot in the same trip.
          const morph = { value: 0 }
          t.to(morph, { value: 1, duration: 0.16, onUpdate: () => board.steal.cargo(offsets.map((point, i) => point.clone().lerp(finalOffsets[i]!, morph.value)), startScale + (endScale - startScale) * morph.value) })
        }
        t.call(() => {
          if (closed || paused) return
          effect.visible = false
          contact(event, 1)
          board.steal.prepare(event.playerId, event.tokens - event.amount, event.amount)
        })
        wait(t, reduced() ? 0.08 : 0.12)
      })
    } finally { board.steal.clear() }
  }
  async function stoneContact(event: GameEvent, player: PlayerId, index: number, step: number, from: Vector3, healing = false, symbol?: 'axe' | 'arrow') {
    const stone = board.lifeStone(player, index)
    const original = stone.material.emissive.clone()
    const intensity = stone.material.emissiveIntensity
    const to = board.lifePosition(player, index)
    await flight(from, to, { symbol, color: healing ? '#9dd68a' : '#ef6472', contact: () => {
      stone.visible = true
      if (healing) contact(event, step)
      stone.material.emissive.set(healing ? '#9dd68a' : '#e52d46')
      stone.material.emissiveIntensity = 1.7
      invalidate()
    } })
    if (closed) return
    await animate(t => {
      wait(t, reduced() ? 0.1 : 0.16)
      t.call(() => { if (!healing) contact(event, step) })
      t.to(stone.material, { emissiveIntensity: intensity, duration: reduced() ? 0.04 : 0.1 })
    })
    stone.material.emissive.copy(original)
    stone.material.emissiveIntensity = intensity
    invalidate()
  }
  function source(event: GameEvent) {
    if ('dieId' in event && event.dieId) return board.dice.get(event.dieId)!.position.clone()
    if ('playerId' in event) return board.totem(event.playerId, 'favorId' in event ? event.favorId ?? '' : '').position.clone().add(new Vector3(0, 0.65, 0))
    return new Vector3()
  }
  async function collect(ids: readonly DieId[]) {
    if (closed || !ids.length) return
    const moves = ids.filter(id => !collected.has(id) && board.dice.get(id)?.visible).map(id => {
      collected.add(id)
      const player = id.startsWith('player-1/') ? 'player-1' : 'player-2'
      return { object: board.dice.get(id)!, slot: collectionSlot(player, counts[player]++) }
    })
    if (!moves.length) return
    await animate(t => {
      moves.forEach(({ object, slot }, i) => {
        const [x, y, z] = slot
        const marker = object.getObjectByName('selection-marker')
        if (marker) marker.visible = false
        if (reduced()) t.call(() => object.position.set(x, y, z), [], 0)
        else {
          t.to(object.position, { y: 1.45, duration: 0.1, ease: 'power2.out' }, i * 0.025)
          t.to(object.position, { x, z, duration: 0.28, ease: 'power2.inOut' }, i * 0.025 + 0.08)
          t.to(object.position, { y, duration: 0.13, ease: 'power2.in' }, i * 0.025 + 0.32)
        }
      })
      if (reduced()) wait(t, 0.08)
    })
  }
  return {
    collected,
    collect,
    async cleanup(state: GameState) {
      feedback.cue?.({ text: 'Zarlar kendi kenarlarında toplanıyor.' })
      await collect(Object.values(state.players).flatMap(player => player.dice.map(die => die.id)))
      if (!closed) feedback.cue?.(null)
    },
    reset() { collected.clear(); counts['player-1'] = 0; counts['player-2'] = 0 },
    async title(title: string) {
      if (closed) return
      feedback.cue?.({ title })
      await animate(t => wait(t, reduced() ? 0.45 : 0.9), false)
      if (!closed) feedback.cue?.(null)
    },
    async play(event: GameEvent) {
      if (closed) return
      const failure = favorFailureTitle(event)
      if (failure) {
        feedback.cue?.({ title: failure })
        await animate(t => wait(t, reduced() ? 0.65 : 1.3), false)
        if (!closed) feedback.cue?.(null)
        return
      }
      const text = eventText(event)
      if (text) feedback.cue?.({ text,
        symbol: event.type === 'AttackBlocked' || event.type === 'DamageDealt' ? event.symbol : undefined,
        targetSymbol: event.type === 'AttackBlocked' ? event.symbol === 'arrow' ? 'shield' : 'helmet' : undefined,
      })
      const ids = eventDice(event)
      markers(ids, true)
      try {
        if (event.type === 'AttackBlocked') {
          await flight(source(event), board.dice.get(event.defenderDieId)!.position.clone(), { symbol: event.symbol, blocked: true })
        } else if (event.type === 'DamageDealt' || event.type === 'HealthRestored' || event.type === 'HealthSacrificed') {
          const player = event.type === 'DamageDealt' ? event.targetId : event.playerId
          for (let step = 1; step <= event.amount && !closed; step++) {
            const healing = event.type === 'HealthRestored'
            const index = healing ? event.health - event.amount + step - 1 : event.health + event.amount - step
            await stoneContact(event, player, index, step, source(event), healing, event.type === 'DamageDealt' ? event.symbol : undefined)
          }
        } else if (event.type === 'TokensStolen') {
          await stealGold(event)
        } else if (event.type === 'TokensGained' || event.type === 'TokensGranted' || event.type === 'TokensDestroyed' || event.type === 'FavorInvoked') {
          const count = resourceSteps(event)
          if (event.type === 'TokensGained') markers(ids, false)
          for (let step = 1; step <= count && !closed; step++) {
            if (event.type === 'TokensGained') {
              markers(ids, false)
              markers([event.dieIds[step - 1]!], true)
            }
            const outgoing = event.type === 'TokensDestroyed' || event.type === 'FavorInvoked'
            const tokenOwner = event.type === 'TokensDestroyed' ? event.targetId : event.playerId
            const tokenIndex = outgoing ? event.tokens + count - step : event.tokens - count + step - 1
            const pile = board.tokenPosition(tokenOwner, tokenIndex)
            const from = event.type === 'TokensGained' ? board.dice.get(event.dieIds[step - 1]!)!.position.clone()

              : outgoing ? pile : source(event)
            const to = outgoing ? source(event) : pile
            feedback.cue?.({ text, progress: `${step} / ${count}` })
            await flight(from, to, { token: true, contact: () => contact(event, step) })
          }
          if (event.type === 'FavorInvoked' && !closed) {
            const totem = board.totem(event.playerId, event.favorId)
            const y = totem.position.y
            await animate(t => {
              if (reduced()) wait(t, 0.12)
              else { t.to(totem.position, { y: y + 0.45, duration: 0.18 }); t.to(totem.position, { y, duration: 0.18 }) }
            })
          }
        } else if (event.type === 'HelmetsRemoved' || event.type === 'DiceRemoved') {
          for (const id of event.dieIds) {
            if (closed) return
            const die = board.dice.get(id)!
            await animate(t => {
              if (reduced()) wait(t, 0.1)
              else t.to(die.scale, { x: 0, y: 0, z: 0, duration: 0.22 })
            })
            die.visible = false
            die.scale.setScalar(1)
          }
        } else if (event.type === 'DiceValuesChanged') {
          for (const value of event.values) {
            if (closed) return
            await flight(source(event), board.dice.get(value.dieId)!.position.clone(), { blocked: true, color: '#aee5c5' })
          }
        } else if (event.type === 'FavorReduced' || event.type === 'FavorEffectApplied') {
          await flight(source(event), event.type === 'FavorReduced' ? board.totem(event.targetId, event.favorId).position.clone() : source(event), { blocked: true, color: '#c1b8ff' })
        }
      } finally {
        markers(ids, false)
      }
    },
    setSpeed(value: number) { active?.timeScale(value / durationScale) },
    setPaused(value: boolean) { paused = value; active?.paused(value) },
    dispose() {
      closed = true
      active?.kill()
      finish?.()
      feedback.cue?.(null)
      board.effect.visible = false
      board.tokenEffect.visible = false
      board.steal.clear()
      Object.values(board.attackEffects).forEach(effect => { effect.visible = false })
    },
  }
}
