<script setup lang="ts">
import type { DieSymbol } from "../core";
import { SYMBOL_PATHS } from "../scene/symbols";
defineProps<{ symbol: DieSymbol }>();
</script>

<template>
  <svg
    viewBox="0 0 100 100"
    fill="currentColor"
    stroke="none"
    stroke-width="5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="SYMBOL_PATHS[symbol]" fill-rule="evenodd" />
  </svg>
</template>
