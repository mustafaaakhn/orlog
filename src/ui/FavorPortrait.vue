<script setup lang="ts">
import { computed } from "vue";
import type { FavorId } from "../core";
import { FAVOR_ART_URL, favorArtIndex } from "../scene/favorArt";
const props = defineProps<{ id: FavorId }>();
const position = computed(() => {
  const index = favorArtIndex(props.id);
  return `${(index % 5) * 25}% ${(Math.floor(index / 5) / 3) * 100}%`;
});
</script>
<template>
  <span
    class="favor-portrait"
    :style="{
      backgroundImage: `url(${FAVOR_ART_URL})`,
      backgroundPosition: position,
    }"
    aria-hidden="true"
  ></span>
</template>
