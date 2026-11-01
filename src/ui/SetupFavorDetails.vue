<script setup lang="ts">
import { t } from '../i18n';
import { FAVOR_CATALOG, describeFavorTier } from '../core';
import type { FavorId } from '../core';
import FavorPortrait from './FavorPortrait.vue';
import UiIcon from './UiIcon.vue';
import TokenIcon from './TokenIcon.vue';
import { favorSummary } from './favorSummary';
defineProps<{ id: FavorId; full: boolean; equipped: boolean }>();
const shortName = (id: FavorId) => FAVOR_CATALOG[id].name.split("'")[0];
</script>
<template>
  <div class="setup-favor-details">
    <div class="description-heading"><FavorPortrait :id="id" /><div><h2>{{ t(shortName(id)) }}</h2><p class="god-effect-summary" :data-tone="favorSummary(id).tone"><UiIcon :name="favorSummary(id).icon" />{{ t(favorSummary(id).label) }}</p></div></div>
    <p class="favor-timing">
      {{ t(FAVOR_CATALOG[id].timing === "before-resolution"
          ? "Savaş öncesi"
          : "Savaş sonrası") }}
      {{ t("· Öncelik") }} {{ t(FAVOR_CATALOG[id].priority) }}
    </p>
    <dl>
      <div v-for="tier in [1, 2, 3] as const" :key="tier">
        <dt>{{ t(FAVOR_CATALOG[id].tiers[tier].cost) }}<TokenIcon /><span class="sr-only"> {{ t(" jeton") }}</span></dt>
        <dd>{{ t(describeFavorTier(id, tier)) }}</dd>
      </div>
    </dl>
    <p
      v-if="full && !equipped"
      class="selection-hint"
    >
      {{ t("Kuşanmak için önce seçili bir tanrıyı kaldır.") }}
    </p>
  </div>
</template>
