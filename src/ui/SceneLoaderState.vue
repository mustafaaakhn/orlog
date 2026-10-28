<script setup lang="ts">
defineProps<{ error?: Error }>()
function reload() {
  window.location.reload()
}
</script>

<template>
  <div class="table-viewport" :aria-busy="!error">
    <div
      class="scene-state"
      :role="error ? 'alert' : 'status'"
      aria-live="polite"
    >
      <span class="state-rune" aria-hidden="true">ᛟ</span>
      <h2>{{ error ? 'Sahne yüklenemedi' : 'Masa hazırlanıyor' }}</h2>
      <p>
        {{
          error
            ? 'Bağlantını kontrol edip yeniden deneyebilirsin.'
            : 'Ahşap, kumaş ve kemik bir araya geliyor.'
        }}
      </p>
      <button v-if="error" @click="reload">Yeniden yükle</button>
    </div>
  </div>
</template>
