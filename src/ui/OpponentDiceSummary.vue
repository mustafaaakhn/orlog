<script setup lang="ts">
import { computed } from 'vue'
import { getDieFace } from '../core'
import type { DieId, GameState, PlayerId } from '../core'
import { SYMBOL_GUIDE } from '../scene/symbols'
import SymbolIcon from './SymbolIcon.vue'
import TokenIcon from './TokenIcon.vue'
const props = defineProps<{ state: GameState; viewerId: PlayerId; rolling: readonly DieId[]; collected: readonly DieId[] }>()
const dice = computed(() => props.state.players[props.viewerId === 'player-1' ? 'player-2' : 'player-1'].dice
  .filter(die => !die.kept && !die.selected && !die.removed && !props.collected.includes(die.id))
  .map(die => {
    const face = die.faceId && !props.rolling.includes(die.id) ? getDieFace(die.definitionId, die.faceId) : null
    const label = face ? `${SYMBOL_GUIDE.find(guide => guide.id === face.symbol)!.name}${face.grantsToken ? ', jeton getirir' : ''}${die.value > 1 ? `, etki ${die.value}` : ''}`
      : props.rolling.includes(die.id) ? 'Atılıyor' : 'Henüz atılmadı'
    return { ...die, face, label }
  }))
</script>
<template>
  <section class="opponent-dice-summary" aria-label="Rakibin haznesindeki zarlar">
    <span class="opponent-dice-label">Rakibin haznesi</span>
    <ul v-if="dice.length">
      <li v-for="die in dice" :key="die.id" :data-die-id="die.id" :aria-label="die.label" :title="die.label"
        :class="{ 'grants-token': die.face?.grantsToken, 'is-rolling': rolling.includes(die.id) }">
        <template v-if="die.face"><SymbolIcon :symbol="die.face.symbol" /><TokenIcon v-if="die.face.grantsToken" />
          <span v-if="die.value > 1" class="summary-die-value">{{ die.value }}</span></template>
        <span v-else class="summary-die-unknown" aria-hidden="true">{{ rolling.includes(die.id) ? '…' : '—' }}</span>
      </li>
    </ul>
    <span v-else class="opponent-dice-empty">Zarlar merkezde</span>
  </section>
</template>
