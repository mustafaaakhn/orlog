<script setup lang="ts">
import FavorPicker from "../ui/FavorPicker.vue";
import GameMark from "../ui/GameMark.vue";
import SymbolIcon from '../ui/SymbolIcon.vue';
import UiIcon from '../ui/UiIcon.vue';
import type { PresentationCue } from '../presentation/combatPresenter';
import { getDieFace } from "../core";
import { SYMBOL_GUIDE } from "./symbols";
import {
  onErrorCaptured,
  onMounted,
  onUnmounted,
  onBeforeUnmount,
  ref,
  computed,
  nextTick,
  watch,
} from "vue";
import { TresCanvas } from "@tresjs/core";
import type { TresContext } from "@tresjs/core";
import TableScene from "./TableScene.vue";
import type { AudioPort } from "../audio/catalog";
import type { PresentationBatch } from "../app/rollSession";
import type { DieId, GameState, GameEvent, PlayerId } from "../core";

import SceneFavorControls from "../ui/SceneFavorControls.vue";
import type { SceneFavorTarget } from "./dieTargets";
import SceneDiceControls from "../ui/SceneDiceControls.vue";
import type { SceneDieTarget } from "./dieTargets";
const props = defineProps<{
  audio: AudioPort;
  reduced: boolean;
  paused: boolean;
  quality: string;
  speed: number;

  viewerId?: PlayerId;
  controlPlayer?: PlayerId | null;
  favorPlayer?: PlayerId | null;
  state: GameState;
  batch: PresentationBatch | null;
}>();
const emit = defineEmits<{
  availability: [ready: boolean];
  settled: [batchId: number];
  presented: [batchId: number, event: GameEvent];
  progress: [batchId: number, event: GameEvent, step: number];
  select: [dieId: DieId];
  choose: [favorId: import("../core").FavorId, level: import("../core").FavorLevel, input?: import("../core").FavorInput];
}>();
const targets = ref<SceneDieTarget[]>([]);
const favors = ref<SceneFavorTarget[]>([]);
const menuFavor = ref<SceneFavorTarget | null>(null);
const menuPinned = ref(false);
const favorMenu = ref<HTMLElement | null>(null);
function inspectFavor(target: SceneFavorTarget, activate: boolean) {
  if (target.playerId !== props.favorPlayer || props.batch || props.paused) return;
  if (menuPinned.value && !activate) return;
  if (menuFavor.value?.favorId !== target.favorId) menuPinned.value = false;
  menuFavor.value = target;
  if (activate) { menuPinned.value = true; void nextTick(() => favorMenu.value?.focus()); }
}
function closeFavor() {
  const target = menuFavor.value;
  menuFavor.value = null;
  menuPinned.value = false;
  if (target) document.querySelector<HTMLElement>(`[data-player-id="${target.playerId}"][data-favor-id="${target.favorId}"]`)?.focus();
  // Focusing the source is also a preview trigger; Escape must still close it.
  menuFavor.value = null;
}
watch([() => props.batch, () => props.paused, () => props.favorPlayer], () => {
  menuFavor.value = null; menuPinned.value = false;
});
const highlightedDie = ref<DieId | null>(null);
const highlightedFavor = ref<SceneFavorTarget | null>(null);
watch([() => props.batch, () => props.paused], () => { highlightedFavor.value = null; });
const cue = ref<PresentationCue | null>(null);
const collected = ref<DieId[]>([]);
const controlsDisabled = computed(
  () =>
    props.paused ||
    !!props.batch ||
    props.state.phase.name !== "roll" ||
    props.state.phase.step !== "selecting-dice",
);
const diceSummary = computed(() =>
  Object.values(props.state.players).map((player) => ({
    id: player.id,
    text: player.dice
      .map((die, index) => {
        if (!die.faceId) return `Zar ${index + 1}: henüz atılmadı`;
        const face = getDieFace(die.definitionId, die.faceId);
        const symbol = SYMBOL_GUIDE.find(
          (value) => value.id === face.symbol,
        )!.name;
        return `Zar ${index + 1}: ${symbol}${face.grantsToken ? ", altın çerçeveli" : ""}${die.value > 1 ? `, etki ${die.value}` : ""}, ${die.removed ? "kaldırıldı" : collected.value.includes(die.id) ? 'kendi kenarında, kullanıldı' : die.kept ? "merkezde, kilitli" : die.selected ? "merkezde, seçili" : "haznede"}`;
      })
      .join("; "),
  })),
);
const status = ref<"checking" | "loading" | "ready" | "unsupported" | "error">(
  "checking",
);
watch(status, (value) => emit("availability", value === "ready"), {
  immediate: true,
});
const sceneKey = ref(0);
const sceneComponent = ref<{ dispose(): void } | null>(null);
let activeCanvas: HTMLCanvasElement | undefined;
let loadingTimeout: ReturnType<typeof setTimeout> | undefined;

function clearLoadingTimeout() {
  clearTimeout(loadingTimeout);
}
function detachCanvas() {
  activeCanvas?.removeEventListener("webglcontextlost", contextLost);
  activeCanvas = undefined;
}
function failed() {
  cue.value = null;
  sceneComponent.value?.dispose();
  clearLoadingTimeout();
  detachCanvas();
  status.value = "error";
}
function contextLost(event: Event) {
  event.preventDefault();
  failed();
}
function initialize() {
  clearLoadingTimeout();
  detachCanvas();
  const probe = document.createElement("canvas");
  let supported = false;
  try {
    const context = probe.getContext("webgl2");
    supported = !!context;
    context?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    supported = false;
  }
  if (!supported) {
    status.value = "unsupported";
    return;
  }
  status.value = "loading";
  loadingTimeout = setTimeout(failed, 20000);
  try {
    sceneKey.value++;
  } catch {
    failed();
  }
}
function ready(context: TresContext) {
  activeCanvas = context.renderer.instance.domElement;
  activeCanvas.addEventListener("webglcontextlost", contextLost);
}
function rendered() {
  if (status.value === "loading") {
    clearLoadingTimeout();
    status.value = "ready";
  }
}

onMounted(initialize);
// Tres owns a separate render tree; release its board before renderer disposal.
onBeforeUnmount(() => sceneComponent.value?.dispose());
onUnmounted(() => {
  clearLoadingTimeout();
  detachCanvas();
});
onErrorCaptured(() => {
  failed();
  return false;
});
</script>

<template>
  <div
    class="table-viewport"
    :aria-busy="status === 'checking' || status === 'loading'"
  >
    <TresCanvas
      v-if="sceneKey > 0 && (status === 'loading' || status === 'ready')"
      :key="sceneKey"
      shadows
      render-mode="on-demand"
      clear-color="#30251e"
      :dpr="quality === 'high' ? 1.75 : quality === 'low' ? 1 : [1, 1.25]"
      :tone-mapping-exposure="1"
      aria-label="Üç boyutlu Orlog masası: iki ayrı ahşap hazne, ortada savaş zarları, solda can taşları ve sağda yatay tanrı levhaları. Zarları doğrudan masada seç. Klavyede Tab ile zarlara geç, Space veya Enter ile seç; yön tuşlarıyla gezin."
      role="img"
      @ready="ready"
      @render="rendered"
      @error="failed"
    >
      <TableScene
        ref="sceneComponent"
        :audio="audio"
        :reduced="reduced"
        :paused="paused"
        :quality="quality"
        :speed="speed"
        :highlighted-favor="highlightedFavor"
        :highlighted-die="!controlsDisabled && controlPlayer && status === 'ready' ? highlightedDie : null"
        :viewer-id="viewerId ?? 'player-1'"
        :state="state"
        :batch="batch"
        @presented="(id, event) => emit('presented', id, event)"
        @progress="(id, event, step) => emit('progress', id, event, step)"
        @cue="cue = $event"
        @collected="collected = $event"
        @settled="emit('settled', $event)"
        @select="emit('select', $event)"
        @failed="failed"
        @targets="targets = $event"
        @favors="favors = $event"
      />
    </TresCanvas>
    <SceneFavorControls v-if="status === 'ready' && !batch && !paused" :targets="favors" :active-player="favorPlayer" @highlight="highlightedFavor = $event" @inspect="inspectFavor" />
    <section v-if="menuFavor && favorPlayer && !batch && !paused" ref="favorMenu"
      class="table-favor-menu" role="dialog" aria-label="Tanrı gücü seçimi" tabindex="-1"
      :style="{ left: `clamp(12px, calc(${menuFavor.x}% - 364px), max(12px, calc(100% - 352px)))` }"
      @keydown.esc.stop="closeFavor">
      <div class="favor-menu-heading"><h2>Tanrı gücü</h2><button aria-label="Tanrı menüsünü kapat" @click="closeFavor"><UiIcon name="close" /></button></div>
      <FavorPicker :key="`${favorPlayer}/${menuFavor.favorId}`" :favor-id="menuFavor.favorId"
        :state="state" :player="state.players[favorPlayer]" :disabled="false"
        @editing="menuPinned = true" @choose="(id, level, input) => emit('choose', id, level, input)" />
    </section>
    <div class="resolution-cue" :class="{ 'is-title': cue?.title }" role="status" aria-live="polite" aria-atomic="true">
      <template v-if="cue">
        <h2 v-if="cue.title">{{ cue.title }}</h2>
        <template v-else>
          <span v-if="cue.symbol" class="cue-symbols" aria-hidden="true">
            <SymbolIcon :symbol="cue.symbol" />
            <UiIcon v-if="cue.targetSymbol" name="arrow" />
            <SymbolIcon v-if="cue.targetSymbol" :symbol="cue.targetSymbol" />
          </span>
          <p>{{ cue.text }} <span v-if="cue.progress" class="cue-progress">{{ cue.progress }}</span></p>
        </template>
      </template>
    </div>
    <section
      v-if="status === 'ready'"
      class="sr-only"
      aria-label="İki oyuncunun masadaki zarları"
    >
      <p v-for="player in diceSummary" :key="player.id">
        Oyuncu {{ player.id === "player-1" ? "I" : "II" }}: {{ player.text }}
      </p>
    </section>
    <SceneDiceControls
      v-if="status === 'ready' && controlPlayer"
      :player="state.players[controlPlayer]"
      :targets="targets"
      :disabled="controlsDisabled"
      @select="emit('select', $event)"
      @highlight="highlightedDie = $event"
    />
    <div
      v-if="status !== 'ready'"
      class="scene-state"
      :role="status === 'error' ? 'alert' : 'status'"
      aria-live="polite"
    >
      <GameMark class="state-rune" />
      <template v-if="status === 'checking' || status === 'loading'"
        ><h2>Masa hazırlanıyor</h2>
        <p>Ahşap, kumaş ve kemik bir araya geliyor.</p></template
      >
      <template v-else-if="status === 'unsupported'"
        ><h2>Bu masa WebGL 2 gerektiriyor</h2>
        <p>
          Güncel bir tarayıcı kullanıp donanım hızlandırmasını açarak yeniden
          deneyebilirsin.
        </p>
        <button @click="initialize">Yeniden dene</button></template
      >
      <template v-else
        ><h2>Sahne görüntülenemedi</h2>
        <p>
          Grafik bağlantısı kesilmiş veya sahne hazırlanırken bir sorun oluşmuş
          olabilir.
        </p>
        <button @click="initialize">Sahneyi yeniden yükle</button></template
      >
    </div>
  </div>
</template>
