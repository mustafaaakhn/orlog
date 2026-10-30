<script setup lang="ts">
import { onMounted, ref } from 'vue'
import GameMark from './GameMark.vue'
import UiIcon from './UiIcon.vue'

defineProps<{ winner: string; round: number; busy?: boolean; error?: string }>()
const emit = defineEmits<{ restart: []; close: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)
onMounted(() => dialog.value?.showModal())
</script>

<template>
  <dialog ref="dialog" class="match-result" aria-labelledby="result-title" aria-describedby="result-description" @close="emit('close')">
    <div class="result-mark"><span></span><GameMark /><span></span></div>
    <h2 id="result-title">{{ winner }}<br /><span>kazandı.</span></h2>
    <p id="result-description">{{ round }} turluk mücadele sona erdi.</p>
    <div class="result-actions">
      <button class="primary-action" autofocus :disabled="busy" @click="emit('restart')">Yeni oyun <UiIcon name="arrow" /></button>
      <button class="secondary-action" @click="dialog?.close()">Masayı incele</button>
    </div>
    <p v-if="error" class="field-error" role="alert">{{ error }}</p>
  </dialog>
</template>
