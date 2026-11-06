<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { t } from '../i18n'
import type { GameState, PlayerId } from '../core'
import type { SceneTokenTarget } from '../scene/dieTargets'
import TokenIcon from './TokenIcon.vue'

const props = defineProps<{ targets: SceneTokenTarget[]; state: GameState; viewerId: PlayerId }>()
const emit = defineEmits<{ highlight: [player: PlayerId | null] }>()
const aimed = ref<PlayerId | null>(null)
const focused = ref<PlayerId | null>(null)
const dismissed = ref(false)
const active = computed(() => dismissed.value ? null : aimed.value ?? focused.value)
watch(active, player => emit('highlight', player))
watch(() => props.targets, targets => {
  if (!targets.some(target => target.playerId === aimed.value)) aimed.value = null
  if (!targets.some(target => target.playerId === focused.value)) focused.value = null
})
const owner = (player: PlayerId) => t(player === props.viewerId ? 'Senin jetonların' : 'Rakibin jetonları')
function inspect(player: PlayerId, pointer: boolean) {
  dismissed.value = false
  if (pointer) aimed.value = player
  else { aimed.value = null; focused.value = player }
}
onBeforeUnmount(() => emit('highlight', null))
</script>

<template>
  <div class="scene-token-controls" role="group" :aria-label="t('Tanrı jetonu')" @keydown.esc.stop="dismissed = true">
    <button v-for="target in targets" :key="target.playerId" type="button"
      class="scene-token-target" :data-player-id="target.playerId"
      :style="{ left: `${target.x}%`, top: `${target.y}%`, width: `${target.width}px`, height: `${target.height}px` }"
      :aria-label="`${owner(target.playerId)}: ${t(state.players[target.playerId].tokens)}`"
      :aria-describedby="active === target.playerId ? `token-count-${target.playerId}` : undefined"
      @pointerenter="inspect(target.playerId, true)" @pointerleave="aimed = null"
      @focus="inspect(target.playerId, false)" @blur="focused = null">
      <span v-if="active === target.playerId" :id="`token-count-${target.playerId}`" role="tooltip" class="token-tooltip">
        <span class="token-tooltip-content"><span>{{ owner(target.playerId) }}</span>
          <strong><TokenIcon />{{ t(state.players[target.playerId].tokens) }}</strong>
        </span>
      </span>
    </button>
  </div>
</template>

<style scoped>
.scene-token-controls { position: absolute; inset: 0; pointer-events: none; z-index: 2; }
.scene-token-target {
  position: absolute; transform: translate(-50%, -50%); min-width: 44px; min-height: 44px;
  padding: 0; border: 0; border-radius: 6px; background: transparent; pointer-events: auto;
  cursor: help;
}
.scene-token-target:hover { background: transparent; }
.scene-token-target:focus-visible { outline: 2px solid #f4d899; outline-offset: 3px; }
.token-tooltip {
  position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%);
  padding-bottom: 10px; width: max-content; max-width: 240px; cursor: default;
}
.token-tooltip-content {
  display: flex; align-items: center; gap: 16px; padding: 10px 14px;
  color: #f5ebd8; background: #1c2921; border-radius: 6px;
  box-shadow: 0 5px 16px #0b151b66; font-size: 14px;
}
.token-tooltip strong { display: inline-flex; align-items: center; gap: 7px; color: #f4d899; font-size: 20px; font-variant-numeric: tabular-nums; }
.token-tooltip svg { width: 22px; height: 22px; flex: none; }
</style>
