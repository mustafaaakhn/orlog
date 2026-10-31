<script setup lang="ts">
import { t } from '../i18n';
import { computed, ref, watch } from "vue";
import {
  FAVOR_CATALOG,
  describeFavorTier,
  majoritySymbols,
  validFavorInput,
  getDieFace,
} from "../core";
import type {
  DieId,
  DieSymbol,
  FavorId,
  FavorInput,
  FavorLevel,
  GameState,
  PlayerState,
} from "../core";
import { SYMBOL_GUIDE } from "../scene/symbols";
import SymbolIcon from "./SymbolIcon.vue";
import FavorPortrait from "./FavorPortrait.vue";
import TokenIcon from "./TokenIcon.vue";
const props = defineProps<{
  player: PlayerState;
  state: GameState;
  disabled: boolean;
  favorId: FavorId;
  preview?: boolean;
  active?: boolean;
}>();
const emit = defineEmits<{
  select: [];
  choose: [favorId: FavorId, level: FavorLevel, input?: FavorInput];
}>();
const selected = ref<FavorId | null>(null),
  level = ref<FavorLevel>(1);
const dieIds = ref<DieId[]>([]),
  health = ref(0),
  chosenSymbol = ref<DieSymbol>("axe");
const definition = computed(() =>
  selected.value ? FAVOR_CATALOG[selected.value] : null,
);
const symbolName = (id: DieSymbol) =>
  SYMBOL_GUIDE.find((s) => s.id === id)!.name;
const input = computed<FavorInput | undefined>(() => {
  switch (definition.value?.target) {
    case "any-dice":
    case "enemy-dice":
      return { dieIds: dieIds.value };
    case "health":
      return { health: health.value };
    case "majority":
      return { symbol: chosenSymbol.value };
    default:
      return undefined;
  }
});
const valid = computed(
  () =>
    selected.value &&
    validFavorInput(
      props.state,
      props.player.id,
      selected.value,
      level.value,
      input.value,
    ),
);
watch(
  () => props.player.id,
  () => {
    selected.value = null;

  },
);
watch(() => props.active, active => {
  if (active === false) selected.value = null;
});
function select(id: FavorId, tier: FavorLevel) {
  if (props.disabled || props.preview) return;
  emit("select");
  selected.value = id;
  level.value = tier;
  dieIds.value = [];
  health.value = 0;
  chosenSymbol.value =
    majoritySymbols(props.state, props.player.id)[0] ?? "axe";
}
function confirm() {
  if (!props.disabled && !props.preview && valid.value && selected.value)
    emit("choose", selected.value, level.value, input.value);
}
</script>
<template>
  <div class="favor-picker">
    <div class="favor-cards">
      <article v-for="id in [favorId]" :key="id">
        <div class="favor-card-heading">
          <FavorPortrait :id="id" />
          <div>
            <h3>{{ t(FAVOR_CATALOG[id].name) }}</h3>
            <p>
              {{ t("Öncelik") }} {{ t(FAVOR_CATALOG[id].priority) }} ·
              {{ t(FAVOR_CATALOG[id].timing === "before-resolution"
                  ? "Savaş öncesi"
                  : "Savaş sonrası") }}
            </p>
          </div>
        </div>
        <component
          :is="preview ? 'div' : 'button'"
          class="favor-tier"
          v-for="tier in [1, 2, 3] as const"
          :key="tier"
          :disabled="!preview && disabled ? true : undefined"
          :aria-pressed="preview ? undefined : selected === id && level === tier"
          @click="!preview && select(id, tier)"
        >
          <span class="tier-cost"
            ><span>{{ t(FAVOR_CATALOG[id].tiers[tier].cost) }}<span class="sr-only"> {{ t(" jeton") }}</span></span><TokenIcon /></span
          ><span class="tier-effect">{{ t(describeFavorTier(id, tier)) }}<small class="tier-label">{{ t("Seviye") }} {{ t(tier) }}<span v-if="selected === id && level === tier"> {{ t("· Seçildi") }}</span></small></span>
        </component>
      </article>
    </div>
    <fieldset
      v-if="!preview && definition && selected"
      class="favor-targets"
      :disabled="disabled"
    >
      <legend>{{ t(definition.name) }} {{ t("· Seviye") }} {{ t(level) }}</legend>
      <template
        v-if="
          definition.target === 'any-dice' || definition.target === 'enemy-dice'
        "
      >
        <p>
          {{ t(definition.tiers[level].amount) }} {{ t("zar seç. Seçim sırası:") }}
          {{ t(dieIds
              .map((id) =>
                id.replace("player-1/", "I / ").replace("player-2/", "II / "),
              )
              .join(", ") || "—") }}
        </p>
        <template v-for="owner in state.players" :key="owner.id">
          <div
            v-if="definition.target === 'any-dice' || owner.id !== player.id"
            class="target-dice"
          >
            <p>{{ t("Oyuncu") }} {{ t(owner.id === "player-1" ? "I" : "II") }}</p>
            <label
              v-for="(die, i) in owner.dice.filter(
                (d) => !d.removed && d.faceId,
              )"
              :key="die.id"
            >
              <input
                v-model="dieIds"
                type="checkbox"
                :value="die.id"
                :disabled="
                  !dieIds.includes(die.id) &&
                  dieIds.length >= definition.tiers[level].amount
                "
              />
              <SymbolIcon
                :symbol="getDieFace(die.definitionId, die.faceId!).symbol"
              />
              {{ t("Zar") }} {{ t(i + 1) }}
            </label>
          </div>
        </template>
        <p>
          {{ t("Seviye düşerse ilk hedefler kullanılır. Önceden kaldırılan hedef atlanır.") }}
        </p>
      </template>
      <label v-else-if="definition.target === 'health'"
        >{{ t("Feda edilecek can (0–") }}{{ t(player.health) }})
        <input
          v-model.number="health"
          type="number"
          min="0"
          :max="player.health"
          step="1"
        />
        <span
          >{{ t("Çağırma anındaki canla sınırlanır. Son canını feda edersen maçı kaybedersin.") }}</span
        >
      </label>
      <label v-else-if="definition.target === 'majority'"
        >{{ t("Çoğunluk simgesi") }}
        <select v-model="chosenSymbol">
          <option
            v-for="symbol in majoritySymbols(state, player.id)"
            :key="symbol"
            :value="symbol"
          >
            {{ t(symbolName(symbol)) }}
          </option>
        </select>
        <span
          >{{ t("Eşitlikte seçimin kullanılır. Önceki güçler çoğunluğu değiştirirse yeni çoğunluk geçerli olur; eşitlik sırası balta, ok, miğfer, kalkan, el.") }}</span
        >
      </label>
      <p v-else>{{ t("Hedef ve etki otomatik uygulanır.") }}</p>
      <button
        class="primary-action"
        :disabled="disabled || !valid"
        @click="confirm"
      >
        {{ t("Gücü onayla") }}
      </button>
    </fieldset>
  </div>
</template>
