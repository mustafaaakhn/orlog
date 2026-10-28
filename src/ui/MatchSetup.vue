<script setup lang="ts">
import { computed, ref } from "vue";
import FavorPortrait from "./FavorPortrait.vue";
import {
  DEFAULT_FAVORS,
  FAVOR_CATALOG,
  describeFavorTier,
  PLAYER_IDS,
  mathRandom,
  randomIndex,
} from "../core";
import type { FavorId, GameOptions, PlayerId } from "../core";
import { DIFFICULTIES } from "../ai/computer";
import type { Difficulty, OpponentOptions } from "../ai/computer";
const emit = defineEmits<{
  start: [
    options: GameOptions,
    names: Record<PlayerId, string>,
    opponent: OpponentOptions,
  ];
}>();
const mode = ref<OpponentOptions["mode"]>("computer");
const difficulty = ref<Difficulty>("normal");
const names = ref({ "player-1": "Oyuncu I", "player-2": "Oyuncu II" });
const loadouts = ref<Record<PlayerId, FavorId[]>>({
  "player-1": [...DEFAULT_FAVORS],
  "player-2": [...DEFAULT_FAVORS],
});
const editingPlayer = ref<PlayerId>("player-1");
const firstPlayer = ref<PlayerId | null>(null);
const valid = computed(() =>
  PLAYER_IDS.every(
    (id) =>
      ((id === "player-2" && mode.value === "computer") ||
        names.value[id].trim()) &&
      loadouts.value[id].length === 3,
  ),
);
function toss() {
  firstPlayer.value = PLAYER_IDS[randomIndex(mathRandom, 2)]!;
}
function start() {
  if (valid.value && firstPlayer.value)
    emit(
      "start",
      { firstPlayerId: firstPlayer.value, loadouts: loadouts.value },
      {
        "player-1": names.value["player-1"].trim(),
        "player-2":
          mode.value === "computer"
            ? "Bilgisayar"
            : names.value["player-2"].trim(),
      },
      { mode: mode.value, difficulty: difficulty.value },
    );
}
</script>
<template>
  <section class="setup-panel" aria-label="Maç hazırlığı">
    <div class="panel-heading">
      <h2>Masaya yerleş</h2>
      <span>15 can · 6 zar · 3 güç</span>
    </div>
    <fieldset class="opponent-settings" :disabled="!!firstPlayer">
      <legend>Rakibini seç</legend>
      <div class="mode-options">
        <label :class="{ chosen: mode === 'computer' }"
          ><input v-model="mode" type="radio" value="computer" />
          Bilgisayar</label
        >
        <label :class="{ chosen: mode === 'local' }"
          ><input v-model="mode" type="radio" value="local" /> İki kişi</label
        >
      </div>
      <label v-if="mode === 'computer'" class="difficulty-label"
        >Zorluk
        <select v-model="difficulty" aria-label="Zorluk">
          <option v-for="(entry, key) in DIFFICULTIES" :key="key" :value="key">
            {{ entry.label }}
          </option>
        </select>
      </label>
      <p v-if="mode === 'computer'" class="mode-description">
        {{ DIFFICULTIES[difficulty].description }}
      </p>
    </fieldset>
    <div class="player-tabs" aria-label="Güçlerini düzenleyeceğin oyuncu">
      <button
        v-for="id in PLAYER_IDS"
        :key="id"
        :aria-pressed="editingPlayer === id"
        @click="editingPlayer = id"
      >
        {{
          id === "player-1"
            ? "Oyuncu I"
            : mode === "computer"
              ? "Bilgisayar"
              : "Oyuncu II"
        }}
        <span>{{ loadouts[id].length }}/3</span>
      </button>
    </div>
    <div class="setup-players">
      <fieldset
        v-for="id in PLAYER_IDS"
        v-show="editingPlayer === id"
        :key="id"
        :disabled="!!firstPlayer"
      >
        <legend class="sr-only">
          {{ id === "player-1" ? "Oyuncu I güçleri" : "Oyuncu II güçleri" }}
        </legend>
        <label v-if="id !== 'player-2' || mode === 'local'" class="name-field"
          >Oyuncu adı <input v-model="names[id]" maxlength="28"
        /></label>
        <div class="equipped-favors" aria-label="Seçili güçler">
          <div v-for="favor in loadouts[id]" :key="favor">
            <FavorPortrait :id="favor" /><span>{{
              FAVOR_CATALOG[favor].name.split("'")[0]
            }}</span>
          </div>
          <div
            v-for="slot in Math.max(0, 3 - loadouts[id].length)"
            :key="slot"
            class="empty-favor"
          >
            Güç seç
          </div>
        </div>
        <details class="loadout-details">
          <summary>Tanrılarını değiştir <span>20 güç</span></summary>
          <p class="selection-hint">
            Üç güç kuşan. Değiştirmek için önce seçili bir gücü kaldır.
          </p>
          <div class="loadout-list">
            <label
              v-for="favor in Object.keys(FAVOR_CATALOG) as FavorId[]"
              :key="favor"
              class="loadout-option"
              :class="{ equipped: loadouts[id].includes(favor) }"
            >
              <input
                v-model="loadouts[id]"
                type="checkbox"
                :value="favor"
                :disabled="
                  !loadouts[id].includes(favor) && loadouts[id].length >= 3
                "
              />
              <FavorPortrait :id="favor" /><span
                >{{ FAVOR_CATALOG[favor].name
                }}<small>{{ describeFavorTier(favor, 1) }}</small></span
              >
            </label>
          </div>
        </details>
      </fieldset>
    </div>
    <p v-if="!valid" role="status" class="selection-hint">
      İki oyuncu için ad ve üçer güç seç.
    </p>
    <div class="setup-start">
      <template v-if="!firstPlayer"
        ><p>İlk hamleyi kader belirlesin.</p>
        <button class="primary-action" :disabled="!valid" @click="toss">
          Yazı tura at <span aria-hidden="true">→</span>
        </button></template
      >
      <template v-else>
        <div class="coin-result" role="status">
          <span class="toss-coin" aria-hidden="true">{{
            firstPlayer === "player-1" ? "I" : "II"
          }}</span>
          <p>
            {{
              firstPlayer === "player-2" && mode === "computer"
                ? "Bilgisayar"
                : names[firstPlayer]
            }}
            ilk başlayacak.
          </p>
        </div>
        <button class="primary-action" @click="start">
          Maça başla <span aria-hidden="true">→</span>
        </button>
      </template>
    </div>
  </section>
</template>
