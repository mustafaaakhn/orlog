<script setup lang="ts">
import { t } from '../i18n';
import { computed } from 'vue'
import type { GameState, PlayerId } from '../core'
import UiIcon from './UiIcon.vue'
import TokenIcon from './TokenIcon.vue'

const props = defineProps<{
  state: GameState
  names: Record<PlayerId, string>
  viewerId: PlayerId
}>()

const seats = computed(() => [
  { id: props.viewerId === 'player-1' ? 'player-2' : 'player-1', side: 'opponent' },
  { id: props.viewerId, side: 'self' },
] as const)
</script>

<template>
  <!-- The existing live status announces these same presentation values. -->
  <div v-for="seat in seats" :key="seat.side"
    :class="seat.side === 'self' ? 'mobile-match-footer' : 'mobile-match-opponent'">
    <div class="mobile-resource-row" aria-hidden="true"
      :class="`is-${seat.side}`" :data-player-id="seat.id">
      <span class="mobile-resource-name" :title="names[seat.id]">{{ names[seat.id] }}</span>
      <span class="mobile-resource-value resource-health" :title="t('Can')">
        <UiIcon name="heart" />
        <span>{{ t(state.players[seat.id].health) }}</span>
      </span>
      <span class="mobile-resource-value resource-tokens" :title="t('Tanrı jetonu')">
        <TokenIcon />
        <span>{{ t(state.players[seat.id].tokens) }}</span>
      </span>
    </div>
    <slot v-if="seat.side === 'self'" />
  </div>
</template>
