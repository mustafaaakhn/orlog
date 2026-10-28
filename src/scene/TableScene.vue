<script setup lang="ts">
import { onMounted, onUnmounted, watch, watchEffect } from 'vue'
import { useTres } from '@tresjs/core'
import { PerspectiveCamera, Vector3, Raycaster, Vector2, Object3D } from 'three'
import { createBoard } from './board'
import { createEventQueue } from '../presentation/eventQueue'
import { createCombatPresenter } from '../presentation/combatPresenter'
import { applyResourceEvent } from '../presentation/resources'
import { createDicePresenter } from '../presentation/dicePresenter'
import type { PresentationBatch } from '../app/rollSession'
import type { DieId, GameState, GameEvent } from '../core'

const props = defineProps<{
  speed: number
  closeView: boolean
  state: GameState
  batch: PresentationBatch | null
}>()
const emit = defineEmits<{
  settled: [batchId: number]
  presented: [batchId: number, event: GameEvent]
  select: [dieId: DieId]
  failed: []
}>()
const { sizes, invalidate, renderer } = useTres()
const board = createBoard()
board.syncDice(props.state)
board.syncResources(props.state)
let sceneClosed = false
const presenter = createDicePresenter(board.dice, invalidate)
const combat = createCombatPresenter(board, invalidate, () => props.speed)
let shown = props.state
const queue = createEventQueue(async event => {
  const batch = props.batch
  if (!batch) return
  await presenter.play({ ...batch, state: event.type === 'DiceRecast' ? applyResourceEvent(shown, event) : batch.state, events: [event] })
  await combat.play(event)
  if (event.type === 'RoundStarted') board.syncDice(batch.state)
}, event => {
  shown = applyResourceEvent(shown, event)
  board.syncResources(shown)
  invalidate()
  if (props.batch) emit('presented', props.batch.id, event)
})
watch(
  () => props.state,
  (state) => {
    shown = state
    board.syncResources(state)
    if (!props.batch && (state.revision === 0 || state.phase.name === 'round-complete' || state.phase.name === 'ended')) {
      board.syncDice(state)
      invalidate()
    }
  },
)
watch(
  () => props.batch,
  async (batch) => {
    if (!batch) return
    try {
      await queue.play(batch.events)
      if (!sceneClosed) emit('settled', batch.id)
    } catch (error) {
      console.error('Dice presentation failed', error)
      if (!sceneClosed) emit('failed')
    }
  },
)
const camera = new PerspectiveCamera(42, 1, 0.1, 100)
const direction = new Vector3(0, 0.83, 0.56).normalize()
const up = new Vector3(0, direction.z, -direction.y)

watchEffect(() => {
  const aspect = Math.max(sizes.aspectRatio.value, 0.25)
  const compact = sizes.width.value < 620 && aspect < 1.1
  board.setCompact(compact)
  const target = new Vector3(0, props.closeView ? 0.5 : 0.2, 0)
  // Fit all corners of the presentation bounds in the camera's frustum.
  const halfWidth = props.closeView ? 3.7 : compact ? 4.5 : 9.5
  const halfDepth = props.closeView ? 5.7 : compact ? 9.2 : 6.1
  const tangent = Math.tan((camera.fov * Math.PI) / 360)
  let distance = 0
  for (const x of [-halfWidth, halfWidth]) {
    for (const z of [-halfDepth, halfDepth]) {
      for (const y of [0, 2]) {
        const point = new Vector3(x, y, z).sub(target)
        const depth = point.dot(direction)
        distance = Math.max(
          distance,
          depth + Math.abs(x) / (tangent * aspect),
          depth + Math.abs(point.dot(up)) / tangent,
        )
      }
    }
  }
  camera.position.copy(target).addScaledVector(direction, distance * 1.06)
  camera.aspect = aspect
  camera.lookAt(target)
  camera.updateProjectionMatrix()
  invalidate()
})

const raycaster = new Raycaster()
let pointer: { x: number; y: number; id: number } | undefined
function pointerDown(event: PointerEvent) {
  if (!props.batch && event.isPrimary && event.button === 0)
    pointer = { x: event.clientX, y: event.clientY, id: event.pointerId }
}
function pointerUp(event: PointerEvent) {
  const start = pointer
  pointer = undefined
  if (
    !start ||
    start.id !== event.pointerId ||
    props.batch ||
    Math.hypot(start.x - event.clientX, start.y - event.clientY) > 12
  )
    return
  const bounds = renderer.domElement.getBoundingClientRect()
  raycaster.setFromCamera(
    new Vector2(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      (-(event.clientY - bounds.top) / bounds.height) * 2 + 1,
    ),
    camera,
  )
  const hit = raycaster.intersectObjects(
    [...board.dice.values()].filter((die) => die.visible),
    true,
  )[0]
  let object: Object3D | undefined = hit?.object
  while (object && !object.userData.dieId) object = object.parent ?? undefined
  if (object) emit('select', object.userData.dieId as DieId)
}
function pointerCancel() {
  pointer = undefined
}
onMounted(() => {
  const canvas = renderer.domElement
  canvas.addEventListener('pointerdown', pointerDown)
  canvas.addEventListener('pointerup', pointerUp)
  canvas.addEventListener('pointercancel', pointerCancel)
})
onUnmounted(() => {
  sceneClosed = true
  queue.dispose()
  combat.dispose()
  presenter.dispose()
  const canvas = renderer.domElement
  canvas.removeEventListener('pointerdown', pointerDown)
  canvas.removeEventListener('pointerup', pointerUp)
  canvas.removeEventListener('pointercancel', pointerCancel)
  board.dispose()
})
</script>

<template>
  <primitive :object="camera" />
  <TresHemisphereLight
    color="#e5e6cb"
    ground-color="#463529"
    :intensity="1.6"
  />
  <TresDirectionalLight
    color="#ffd6a0"
    :position="[-5, 10, 4]"
    :intensity="3.2"
    cast-shadow
    :shadow-mapSize="[2048, 2048]"
    :shadow-camera-left="-11"
    :shadow-camera-right="11"
    :shadow-camera-top="10"
    :shadow-camera-bottom="-10"
    :shadow-camera-near="0.5"
    :shadow-camera-far="35"
    :shadow-normalBias="0.025"
    :shadow-bias="-0.0001"
  />
  <TresDirectionalLight
    color="#b6d6df"
    :position="[6, 7, -4]"
    :intensity="1.5"
  />
  <TresDirectionalLight
    color="#f3e4c9"
    :position="[0, 5, 10]"
    :intensity="1.4"
  />
  <primitive :object="board.object" :dispose="null" />
</template>
