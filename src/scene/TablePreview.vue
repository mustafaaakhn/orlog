<script setup lang="ts">
import FavorPicker from "../ui/FavorPicker.vue";
import GameMark from "../ui/GameMark.vue";
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
import { inspectFavor as inspect, leaveFavor } from '../ui/favorInspection';
import type { FavorInspection } from '../ui/favorInspection';
import type { SceneFavorTarget } from "./dieTargets";
import SceneDiceControls from "../ui/SceneDiceControls.vue";
import OpponentDiceSummary from '../ui/OpponentDiceSummary.vue';
import { useVisibleDice } from '../presentation/visibleDice';
import { useTableInsets } from './useTableInsets';
import type { SceneDieTarget } from "./dieTargets";
const props = defineProps<{
  audio: AudioPort;
  reduced: boolean;
  paused: boolean;
  background: boolean;
  quality: string;
  speed: number;

  viewerId?: PlayerId;
  controlPlayer?: PlayerId | null;
  favorPlayer?: PlayerId | null;
  state: GameState;
  batch: PresentationBatch | null;
  blocked?: boolean;
}>();
const viewport = ref<HTMLElement | null>(null);
const frameInsets = useTableInsets(viewport);
const visibleDice = useVisibleDice(() => props.state, () => props.batch);
const opponentId = computed(() => props.viewerId === 'player-2' ? 'player-1' : 'player-2');
function presented(id: number, event: GameEvent) {
  visibleDice.presented(id, event);
  emit('presented', id, event);
}
const emit = defineEmits<{
  availability: [ready: boolean];
  settled: [batchId: number];
  presented: [batchId: number, event: GameEvent];
  progress: [batchId: number, event: GameEvent, step: number];
  select: [dieId: DieId];
  choose: [favorId: import("../core").FavorId, level: import("../core").FavorLevel, input?: import("../core").FavorInput];
  seatTurn: [player: PlayerId | null];
}>();
const turningSeat = ref<PlayerId | null>(null);
function seatTurn(player: PlayerId | null) {
  turningSeat.value = player;
  emit('seatTurn', player);
}
const targets = ref<SceneDieTarget[]>([]);
const favors = ref<SceneFavorTarget[]>([]);
const inspection = ref<FavorInspection>({ target: null, pinned: false });
const menuFavor = computed(() => inspection.value.target);
const menuPinned = computed(() => inspection.value.pinned);
const favorMenu = ref<HTMLElement | null>(null);
function inspectFavor(target: SceneFavorTarget, activate: boolean) {
  if (props.batch || props.paused || turningSeat.value) return;
  inspection.value = inspect(inspection.value, target, activate, props.favorPlayer ?? null);
  if (inspection.value.pinned && activate) void nextTick(() => favorMenu.value?.focus());
}
function highlightFavor(target: SceneFavorTarget | null) {
  highlightedFavor.value = target;
  if (!target) inspection.value = leaveFavor(inspection.value);
}
function closeFavor() {
  const target = menuFavor.value;
  inspection.value = { target: null, pinned: false };
  if (target) document.querySelector<HTMLElement>(`[data-player-id="${target.playerId}"][data-favor-id="${target.favorId}"]`)?.focus();
  // Focusing the source is also a preview trigger; Escape must still close it.
  inspection.value = { target: null, pinned: false };
}
watch([() => props.batch, () => props.paused, () => props.favorPlayer, () => props.state.gameId, turningSeat], () => {
  inspection.value = { target: null, pinned: false };
});
const highlightedDie = ref<DieId | null>(null);
const highlightedFavor = ref<SceneFavorTarget | null>(null);
watch([() => props.batch, () => props.paused, turningSeat], () => {
  highlightedFavor.value = null;
  highlightedDie.value = null;
});
const cue = ref<PresentationCue | null>(null);
const collected = ref<DieId[]>([]);
const controlsDisabled = computed(
  () =>
    props.paused ||
    props.blocked ||
    !!turningSeat.value ||
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
  inspection.value = { target: null, pinned: false };
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
    ref="viewport"
    class="table-viewport"
    :aria-busy="status === 'checking' || status === 'loading'"
    @keydown.esc.stop="closeFavor"
  >
    <TresCanvas
      v-if="sceneKey > 0 && (status === 'loading' || status === 'ready')"
      :key="sceneKey"
      shadows
      alpha
      render-mode="on-demand"
      :clear-alpha="0"
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
        :background="background"
        :quality="quality"
        :speed="speed"
        :highlighted-favor="highlightedFavor"
        :highlighted-die="!background && !batch && !paused && !blocked && !turningSeat && status === 'ready' ? highlightedDie : null"
        :viewer-id="viewerId ?? 'player-1'"
        :state="state"
        :batch="batch"
        :frame-insets="frameInsets"
        @presented="presented"
        @progress="(id, event, step) => emit('progress', id, event, step)"
        @cue="cue = $event"
        @collected="collected = $event"
        @seat-turn="seatTurn"
        @settled="emit('settled', $event)"
        @select="emit('select', $event)"
        @failed="failed"
        @targets="targets = $event"
        @favors="favors = $event"
      />
    </TresCanvas>
    <OpponentDiceSummary v-show="status === 'ready'" :state="visibleDice.state.value"
      :viewer-id="viewerId ?? 'player-1'" :rolling="visibleDice.rolling(opponentId)" :collected="collected" />
    <SceneFavorControls v-if="status === 'ready' && !batch && !paused && !turningSeat" :targets="favors" :active-player="favorPlayer" :pinned-target="menuPinned ? menuFavor : null" @highlight="highlightFavor" @inspect="inspectFavor" />
    <section v-if="menuFavor && status === 'ready' && !batch && !paused" ref="favorMenu"
      id="table-favor-menu" class="table-favor-menu" :class="{ 'is-preview': !menuPinned }" :role="menuPinned ? 'dialog' : 'region'" :aria-label="menuPinned ? 'Tanrı gücü seçimi' : 'Tanrı bilgileri'" tabindex="-1">
      <p class="favor-menu-help">{{ menuPinned ? 'Seviyeni seç · Escape ile kapat' : menuFavor.playerId === favorPlayer ? 'Seçmek için tanrıya tıkla' : 'Tanrı bilgileri' }}</p>
      <FavorPicker :key="`${menuFavor.playerId}/${menuFavor.favorId}`" :favor-id="menuFavor.favorId"
        :state="state" :player="state.players[menuFavor.playerId]" :disabled="false" :preview="!menuPinned"
        @choose="(id, level, input) => emit('choose', id, level, input)" />
    </section>
    <div v-if="turningSeat && !paused" class="seat-turn-cue" role="status" aria-live="polite" aria-atomic="true">
      <div><h2>{{ turningSeat === 'player-1' ? '1. Oyuncu' : '2. Oyuncu' }}</h2><p>Sıra sende</p></div>
    </div>
    <div v-if="cue?.title && !turningSeat" class="resolution-cue is-title" role="status" aria-live="polite" aria-atomic="true">
      <h2>{{ cue.title }}</h2>
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
      v-if="status === 'ready'"
      :players="Object.values(state.players)"
      :viewer-id="viewerId ?? 'player-1'"
      :selectable-player="controlsDisabled ? null : controlPlayer ?? null"
      :targets="targets"
      :collected="collected"
      :safe-area="frameInsets"
      :disabled="!!background || !!batch || paused || !!blocked || !!turningSeat || menuPinned"
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
