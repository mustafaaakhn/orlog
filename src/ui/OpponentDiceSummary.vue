<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
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
const root = ref<HTMLElement | null>(null)
const selected = ref<DieId | null>(null)
const inspected = computed(() => dice.value.find(die => die.id === selected.value && die.face))
const guide = computed(() => SYMBOL_GUIDE.find(item => item.id === inspected.value?.face?.symbol))
const infoStyle = computed(() => {
  if (!selected.value || !root.value) return {};
  const box = root.value.getBoundingClientRect();
  const experience = root.value.closest('.experience');
  const header = experience?.querySelector('.masthead')?.getBoundingClientRect().bottom ?? 56;
  const footer = experience?.querySelector('.mobile-resource-row.is-self')?.getBoundingClientRect().top ?? window.innerHeight - 12;
  const action = experience?.querySelector('.match-actions')?.getBoundingClientRect().top ?? footer;
  const bottom = Math.min(footer, action) - 12;
  const landscape = window.innerHeight <= 500 && window.innerWidth > window.innerHeight;
  const left = landscape ? Math.min(box.right + 12, window.innerWidth - 212) : box.left;
  const top = landscape ? header + 12 : Math.max(header + 12, Math.min(box.bottom + 6, bottom - 180));
  return { left: `${Math.max(12, left)}px`, top: `${top}px`,
    width: `${Math.min(260, window.innerWidth - left - 12)}px`, maxHeight: `${Math.max(80, Math.min(220, bottom - top))}px` };
})
function resized() { close() }
function close(restoreFocus = false) {
  const id = selected.value
  selected.value = null
  if (restoreFocus && id) void nextTick(() => root.value?.querySelector<HTMLButtonElement>(`[data-summary-die-id="${id}"]`)?.focus())
}
function outside(event: PointerEvent) {
  if (!(event.target instanceof Node) || !root.value?.contains(event.target)) close()
}
watch([() => props.viewerId, () => props.state.gameId], () => close())
watch(inspected, value => { if (!value) selected.value = null })
onMounted(() => { document.addEventListener('pointerdown', outside); window.addEventListener('resize', resized) })
onUnmounted(() => { document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', resized) })
</script>
<template>
  <section ref="root" class="opponent-dice-summary" @keydown.esc.stop="close(true)" aria-label="Rakibin haznesindeki zarlar">
    <span class="opponent-dice-label">Rakibin haznesi</span>
    <ul v-if="dice.length">
      <li v-for="die in dice" :key="die.id" :data-die-id="die.id"
        :class="{ 'grants-token': die.face?.grantsToken, 'is-rolling': rolling.includes(die.id) }">
        <button type="button" class="opponent-summary-die" :disabled="!die.face" :data-summary-die-id="die.id"
          :aria-label="die.label" :title="die.label" :aria-expanded="selected === die.id" aria-controls="opponent-die-info"
          @click="selected = selected === die.id ? null : die.id">
        <template v-if="die.face"><SymbolIcon :symbol="die.face.symbol" /><TokenIcon v-if="die.face.grantsToken" />
          <span v-if="die.value > 1" class="summary-die-value">{{ die.value }}</span></template>
        <span v-else class="summary-die-unknown" aria-hidden="true">{{ rolling.includes(die.id) ? '…' : '—' }}</span>
        </button>
      </li>
    </ul>
    <span v-else class="opponent-dice-empty">Zarlar merkezde</span>
    <section v-if="inspected && guide" id="opponent-die-info" class="opponent-die-info" :style="infoStyle" role="region" aria-label="Rakibin zar bilgisi">
      <strong>{{ guide.name }}<span v-if="inspected.value > 1"> × {{ inspected.value }}</span></strong>
      <p>{{ guide.description }}</p>
      <p v-if="inspected.face?.grantsToken">Jeton getirir</p>
      <p>Rakibin haznesinde · Yalnız inceleme</p>
      <button type="button" @click="close(true)">Kapat</button>
    </section>
  </section>
</template>

<style src="./opponent-dice-touch.css"></style>
