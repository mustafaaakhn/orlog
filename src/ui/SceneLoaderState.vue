<script setup lang="ts">
import { t } from '../i18n';
import GameMark from "./GameMark.vue";
defineProps<{ error?: Error }>();
function reload() {
  window.location.reload();
}
</script>

<template>
  <div class="table-viewport" :aria-busy="!error">
    <div
      class="scene-state"
      :role="error ? 'alert' : 'status'"
      aria-live="polite"
    >
      <GameMark class="state-rune" />
      <h2>{{ t(error ? "Sahne yüklenemedi" : "Masa hazırlanıyor") }}</h2>
      <p>
        {{ t(error
            ? "Bağlantını kontrol edip yeniden deneyebilirsin."
            : "Ahşap, kumaş ve kemik bir araya geliyor.") }}
      </p>
      <button v-if="error" @click="reload">{{ t("Yeniden yükle") }}</button>
    </div>
  </div>
</template>
