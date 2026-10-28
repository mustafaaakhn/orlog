<script setup lang="ts">
import { onUnmounted, watchEffect } from 'vue'
import { useTres } from '@tresjs/core'
import { PerspectiveCamera, Vector3 } from 'three'
import { createBoard } from './board'

const props = defineProps<{ closeView: boolean }>()
const { sizes, invalidate } = useTres()
const board = createBoard()
const camera = new PerspectiveCamera(42, 1, 0.1, 100)
const direction = new Vector3(0, 0.83, 0.56).normalize()
const up = new Vector3(0, direction.z, -direction.y)

watchEffect(() => {
  const aspect = Math.max(sizes.aspectRatio.value, 0.25)
  const compact = sizes.width.value < 620 && aspect < 1.1
  board.setCompact(compact)
  const target = new Vector3(0, props.closeView ? 0.5 : 0.2, 0)
  // Fit all corners of the presentation bounds in the camera's frustum.
  const halfWidth = props.closeView ? 3.5 : compact ? 4.5 : 9.5
  const halfDepth = props.closeView ? 3.4 : compact ? 7.2 : 6.1
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

onUnmounted(() => board.dispose())
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
