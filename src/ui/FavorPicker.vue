<script setup lang="ts">
import { FAVOR_CATALOG } from '../core'
import type { FavorId, FavorLevel, PlayerState } from '../core'
defineProps<{ player: PlayerState; disabled: boolean }>()
const emit = defineEmits<{ choose: [favorId: FavorId, level: FavorLevel]; skip: [] }>()
const descriptions = { damage: 'doğrudan hasar', heal: 'can iyileştirme', 'remove-helmets': 'rakip miğferi kaldırma' }
</script>
<template>
  <div class="favor-picker">
    <p>Bir güç ve seviye seç veya pas geç. Bedel çağırma anında ödenir; jeton yetmezse güç çalışmaz. Víðarr altın jetonlardan önce, Thor ve Iðunn çalmadan sonra çalışır.</p>
    <div class="favor-cards">
      <article v-for="id in player.favors" :key="id">
        <h3>{{ FAVOR_CATALOG[id].name }}</h3>
        <p>Öncelik {{ FAVOR_CATALOG[id].priority }} · {{ FAVOR_CATALOG[id].timing === 'before-resolution' ? 'Savaş öncesi' : 'Savaş sonrası' }}</p>
        <button v-for="level in ([1, 2, 3] as const)" :key="level" :disabled="disabled" @click="emit('choose', id, level)">
          Seviye {{ level }} · {{ FAVOR_CATALOG[id].tiers[level].cost }} jeton<br />{{ FAVOR_CATALOG[id].tiers[level].amount }} {{ descriptions[FAVOR_CATALOG[id].effect] }}
        </button>
      </article>
    </div>
    <button class="restart-action" :disabled="disabled" @click="emit('skip')">Gücü pas geç</button>
  </div>
</template>
