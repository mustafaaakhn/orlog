<script setup lang="ts">
import { t } from '../i18n';
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
    <h2 id="result-title">{{ winner }}<br /><span>{{ t("kazandı.") }}</span></h2>
    <p id="result-description">{{ t(round) }} {{ t("turluk mücadele sona erdi.") }}</p>
    <div class="result-actions">
      <button class="primary-action" autofocus :disabled="busy" @click="emit('restart')">{{ t("Yeni oyun") }} <UiIcon name="arrow" /></button>
      <button class="secondary-action" @click="dialog?.close()">{{ t("Masayı incele") }}</button>
    </div>
    <p v-if="error" class="field-error" role="alert">{{ t(error) }}</p>
  </dialog>
</template>
