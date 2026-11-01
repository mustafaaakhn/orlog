<script setup lang="ts">
import { computed } from 'vue';
import { t } from '../i18n';
import type { GameState, PlayerId } from '../core';
const props = defineProps<{ state: GameState; names: Record<PlayerId, string>; humanTurn: boolean; busy: boolean }>();
const active = computed(() => props.state.phase.name === 'roll' || props.state.phase.name === 'favor'
  ? props.state.phase.activePlayerId : null);
const yourTurn = computed(() => !!active.value && props.humanTurn && !props.busy);
const label = computed(() => active.value
  ? props.humanTurn ? t('Sıra sende') : t('{0} oynuyor', [props.names[active.value]])
  : t(props.state.phase.name === 'ended' ? 'Oyun bitti' : 'Savaş'));
</script>
<template>
  <div class="table-round" :class="{ 'is-your-turn': yourTurn }" :aria-label="t('Tur ve sıra')" role="status" aria-live="polite" aria-atomic="true">
    <span class="turn-marker" aria-hidden="true">{{ yourTurn ? '▶' : '◆' }}</span>
    <span class="turn-copy"><strong>{{ label }}</strong><small>{{ t('Tur') }} {{ state.round }}<span v-if="active && humanTurn"> · {{ names[active] }}</span></small></span>
  </div>
</template>
