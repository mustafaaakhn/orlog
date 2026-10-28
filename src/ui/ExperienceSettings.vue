<script setup lang="ts">
import type { Preferences } from '../app/preferences'
defineProps<{ settings: Preferences; audioFailed: boolean }>()
defineEmits<{ retry: [] }>()
</script>
<template>
  <details class="experience-settings">
    <summary>Ses ve görünüm ayarları</summary>
    <div class="settings-grid">
      <fieldset><legend>Ses</legend>
        <label class="setting-row"><input v-model="settings.muted" type="checkbox" /> Sessize al</label>
        <div class="setting-row"><label for="music-volume">Müzik ve ortam</label> <output for="music-volume">{{ Math.round(settings.music * 100) }}%</output><input id="music-volume" v-model.number="settings.music" type="range" min="0" max="1" step="0.05" /></div>
        <div class="setting-row"><label for="effects-volume">Efektler</label> <output for="effects-volume">{{ Math.round(settings.effects * 100) }}%</output><input id="effects-volume" v-model.number="settings.effects" type="range" min="0" max="1" step="0.05" /></div>
        <p>Ses ilk dokunuş veya tuşla açılır; arka sekmede durur.</p>
        <p v-if="audioFailed" role="status">Ses açılamadı. <button class="restart-action" @click="$emit('retry')">Sesi yeniden dene</button></p>
      </fieldset>
      <fieldset><legend>Hareket ve görüntü</legend>
        <div class="setting-row"><label for="motion-preference">Hareket</label> <select id="motion-preference" v-model="settings.motion"><option value="system">Sistem tercihi</option><option value="reduce">Hareketi azalt</option><option value="full">Tam hareket</option></select></div>
        <label class="setting-row"><input v-model="settings.fast" type="checkbox" /> Animasyonları hızlandır (4×)</label>
        <div class="setting-row"><label for="quality-preference">Görüntü kalitesi</label> <select id="quality-preference" v-model="settings.quality"><option value="auto">Dengeli (önerilen)</option><option value="low">Ekonomik</option><option value="high">Yüksek</option></select></div>
        <p>Hareket azaltma, zarları ve olayları doğrudan son konumlarında gösterir ve olay dökümünü açar. Tercihler bu tarayıcıda saklanır.</p>
      </fieldset>
    </div>
  </details>
</template>
