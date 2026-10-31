<script setup lang="ts">
import { t } from '../i18n';
import type { Preferences } from "../app/preferences";
defineProps<{ settings: Preferences; audioFailed: boolean }>();
defineEmits<{ retry: [] }>();
</script>
<template>
  <div class="experience-settings">
    <div class="settings-grid">
      <fieldset>
        <legend>{{ t("Ses") }}</legend>
        <div class="setting-row">
          <label for="music-volume">{{ t("Müzik seviyesi") }}</label>
          <output for="music-volume"
            >{{ t(Math.round(settings.music * 100)) }}%</output
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
          <label for="effects-volume">{{ t("Ses efekti seviyesi") }}</label>
          <output for="effects-volume"
            >{{ t(Math.round(settings.effects * 100)) }}%</output
          ><input
            id="effects-volume"
            v-model.number="settings.effects"
            type="range"
            min="0"
            max="1"
            step="0.05"
          />
        </div>
        <p>{{ t("Müzik girişte başlar; tarayıcı izin isterse ilk dokunuş veya tuşla açılır. Arka sekmede durur.") }}</p>
        <p v-if="audioFailed" role="status">
          {{ t("Ses açılamadı.") }}
          <button class="restart-action" @click="$emit('retry')">
            {{ t("Sesi yeniden dene") }}
          </button>
        </p>
      </fieldset>
    </div>
  </div>
</template>
