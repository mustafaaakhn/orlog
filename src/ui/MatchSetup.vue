<script setup lang="ts">
import { computed, ref } from 'vue'
import { DEFAULT_FAVORS, FAVOR_CATALOG, describeFavorTier, PLAYER_IDS, mathRandom, randomIndex } from '../core'
import type { FavorId, GameOptions, PlayerId } from '../core'
const emit = defineEmits<{ start: [options: GameOptions, names: Record<PlayerId, string>] }>()
const names = ref({ 'player-1': 'Oyuncu I', 'player-2': 'Oyuncu II' })
const loadouts = ref<Record<PlayerId, FavorId[]>>({ 'player-1': [...DEFAULT_FAVORS], 'player-2': [...DEFAULT_FAVORS] })
const firstPlayer = ref<PlayerId | null>(null)
const valid = computed(() => PLAYER_IDS.every(id => names.value[id].trim() && loadouts.value[id].length === 3))
function toss() { firstPlayer.value = PLAYER_IDS[randomIndex(mathRandom, 2)]! }
function start() {
  if (valid.value && firstPlayer.value) emit('start', { firstPlayerId: firstPlayer.value, loadouts: loadouts.value }, { 'player-1': names.value['player-1'].trim(), 'player-2': names.value['player-2'].trim() })
}
</script>
<template>
  <section class="roll-panel setup-panel" aria-label="Maç hazırlığı">
    <p class="eyebrow">AYNI MASADA İKİ OYUNCU</p><h2>Masaya yerleşin</h2>
    <p>Her oyuncu üç farklı güç kuşanır. 20 güç arasından seçim yapabilirsin.</p>
    <div class="setup-players">
      <fieldset v-for="id in PLAYER_IDS" :key="id" :disabled="!!firstPlayer">
        <legend>{{ id === 'player-1' ? 'Oyuncu I' : 'Oyuncu II' }}</legend>
        <p>{{ loadouts[id].length }} / 3 güç seçili · Değiştirmek için seçili gücü kaldır.</p>
        <label>Oyuncu adı <input v-model="names[id]" maxlength="28" /></label>
        <label v-for="favor in Object.keys(FAVOR_CATALOG) as FavorId[]" :key="favor" class="loadout-option"><input v-model="loadouts[id]" type="checkbox" :value="favor" :disabled="!loadouts[id].includes(favor) && loadouts[id].length >= 3" /><span>{{ FAVOR_CATALOG[favor].name }}<small>{{ describeFavorTier(favor, 1) }}</small></span></label>
      </fieldset>
    </div>
    <p v-if="!valid" role="status">İki oyuncu için ad ve üçer güç seçin.</p>
    <button v-if="!firstPlayer" class="primary-action" :disabled="!valid" @click="toss">Yazı tura at</button>
    <template v-else>
      <div class="coin-result" role="status"><span class="toss-coin" aria-hidden="true">{{ firstPlayer === 'player-1' ? 'I' : 'II' }}</span><p>{{ names[firstPlayer] }} ilk başlayacak.</p></div>
      <button class="primary-action" @click="start">Maça başla →</button>
    </template>
  </section>
</template>
