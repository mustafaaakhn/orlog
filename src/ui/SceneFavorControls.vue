<script setup lang="ts">
import { ref } from 'vue'
import { closestDieTarget } from '../scene/dieTargets'
import { FAVOR_CATALOG } from '../core'
import type { SceneFavorTarget } from '../scene/dieTargets'
const props = defineProps<{ targets: SceneFavorTarget[]; activePlayer?: import("../core").PlayerId | null; pinnedTarget?: SceneFavorTarget | null }>()
const aimed = ref<SceneFavorTarget | null>(null)
const emit = defineEmits<{ highlight: [target: SceneFavorTarget | null]; inspect: [target: SceneFavorTarget, activate: boolean] }>()
function aim(event: PointerEvent) {
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
  aimed.value = closestDieTarget(props.targets, event.clientX - bounds.left, event.clientY - bounds.top, bounds.width, bounds.height) ?? null
  if (aimed.value) inspect(aimed.value)
  else emit('highlight', null)
}
function inspect(target: SceneFavorTarget, activate = false) {
  emit('highlight', target)
  emit('inspect', target, activate)
}
function activate(event: MouseEvent, target: SceneFavorTarget) {
  const bounds = (event.currentTarget as HTMLElement).parentElement!.getBoundingClientRect()
  const hit = event.detail === 0 ? target : closestDieTarget(props.targets,
    event.clientX - bounds.left, event.clientY - bounds.top, bounds.width, bounds.height) ?? target
  inspect(hit, true)
}
</script>

<template>
  <div class="scene-favor-controls" role="group" aria-label="Masadaki tanrılar" @pointermove="aim" @pointerleave="emit('highlight', null)">
    <button
      v-for="target in targets"
      :key="`${target.playerId}/${target.favorId}`"
      class="scene-favor-target"
      :style="{ left: `${target.x}%`, top: `${target.y}%`, zIndex: aimed === target ? 2 : undefined }"
      :data-favor-id="target.favorId"
      :data-player-id="target.playerId"
      :aria-haspopup="target.playerId === activePlayer ? 'dialog' : undefined"
      :aria-expanded="target.playerId === activePlayer ? pinnedTarget?.favorId === target.favorId && pinnedTarget?.playerId === target.playerId : undefined"
      :aria-controls="target.playerId === activePlayer ? 'table-favor-menu' : undefined"
      :aria-label="`${target.playerId === 'player-1' ? 'Oyuncu I' : 'Oyuncu II'}: ${FAVOR_CATALOG[target.favorId].name}`"
      @pointerenter="inspect(target)"
      @pointerleave="emit('highlight', null)"
      @focus="inspect(target)"
      @blur="emit('highlight', null)"
      @click="activate($event, target)"
    ><span class="favor-target-name">{{ FAVOR_CATALOG[target.favorId].name.split("'")[0] }}</span></button>
  </div>
</template>
