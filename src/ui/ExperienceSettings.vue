<script setup lang="ts">
import type { Preferences } from "../app/preferences";
defineProps<{ settings: Preferences; audioFailed: boolean }>();
defineEmits<{ retry: [] }>();
</script>
<template>
  <div class="experience-settings">
    <div class="settings-grid">
      <fieldset>
        <legend>Ses</legend>
        <div class="setting-row">
          <label for="music-volume">Müzik seviyesi</label>
          <output for="music-volume"
            >{{ Math.round(settings.music * 100) }}%</output
          ><input
            id="music-volume"
            v-model.number="settings.music"
            type="range"
            min="0"
            max="1"
            step="0.05"
          />
        </div>
        <div class="setting-row">
          <label for="effects-volume">Ses efekti seviyesi</label>
          <output for="effects-volume"
            >{{ Math.round(settings.effects * 100) }}%</output
          ><input
            id="effects-volume"
            v-model.number="settings.effects"
            type="range"
            min="0"
            max="1"
            step="0.05"
          />
        </div>
        <p>Müzik girişte başlar; tarayıcı izin isterse ilk dokunuş veya tuşla açılır. Arka sekmede durur.</p>
        <p v-if="audioFailed" role="status">
          Ses açılamadı.
          <button class="restart-action" @click="$emit('retry')">
            Sesi yeniden dene
          </button>
        </p>
      </fieldset>
    </div>
  </div>
</template>
