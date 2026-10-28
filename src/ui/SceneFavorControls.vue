<script setup lang="ts">
import { ref } from 'vue'
import { closestDieTarget } from '../scene/dieTargets'
import { FAVOR_CATALOG } from '../core'
import type { SceneFavorTarget } from '../scene/dieTargets'
const props = defineProps<{ targets: SceneFavorTarget[]; activePlayer?: import("../core").PlayerId | null }>()
const aimed = ref<SceneFavorTarget | null>(null)
const emit = defineEmits<{ highlight: [target: SceneFavorTarget | null]; inspect: [target: SceneFavorTarget, activate: boolean] }>()
function aim(event: PointerEvent) {
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
  aimed.value = closestDieTarget(props.targets, event.clientX - bounds.left, event.clientY - bounds.top, bounds.width, bounds.height) ?? null
  emit('highlight', aimed.value)
}
function inspect(target: SceneFavorTarget, activate = false) {
  emit('highlight', target)
  if (target.playerId === props.activePlayer) emit('inspect', target, activate)
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
      :aria-haspopup="target.playerId === activePlayer ? 'dialog' : undefined"
      :aria-label="`${target.playerId === 'player-1' ? 'Oyuncu I' : 'Oyuncu II'}: ${FAVOR_CATALOG[target.favorId].name}`"
      @pointerenter="inspect(target)"
      @pointerleave="emit('highlight', null)"
      @focus="inspect(target)"
      @blur="emit('highlight', null)"
      @click="inspect($event.detail ? aimed ?? target : target, true)"
    ><span class="favor-target-name">{{ FAVOR_CATALOG[target.favorId].name.split("'")[0] }}</span></button>
  </div>
</template>
