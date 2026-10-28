<script setup lang="ts">
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
  watch,
} from "vue";
import { TresCanvas } from "@tresjs/core";
import type { TresContext } from "@tresjs/core";
import TableScene from "./TableScene.vue";
import type { AudioPort } from "../audio/catalog";
import type { PresentationBatch } from "../app/rollSession";
import type { DieId, GameState, GameEvent, PlayerId } from "../core";

import SceneDiceControls from "../ui/SceneDiceControls.vue";
import type { SceneDieTarget } from "./dieTargets";
const props = defineProps<{
  audio: AudioPort;
  reduced: boolean;
  paused: boolean;
  quality: string;
  speed: number;
  closeView: boolean;
  viewerId?: PlayerId;
  controlPlayer?: PlayerId | null;
  state: GameState;
  batch: PresentationBatch | null;
}>();
const emit = defineEmits<{
  availability: [ready: boolean];
  settled: [batchId: number];
  presented: [batchId: number, event: GameEvent];
  progress: [batchId: number, event: GameEvent, step: number];
  select: [dieId: DieId];
}>();
const targets = ref<SceneDieTarget[]>([]);
const cue = ref<PresentationCue | null>(null);
const collected = ref<DieId[]>([]);
const controlsDisabled = computed(
  () =>
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
      clear-color="#152327"
      :dpr="quality === 'high' ? 1.75 : quality === 'low' ? 1 : [1, 1.25]"
      :tone-mapping-exposure="1.05"
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
        :close-view="closeView"
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
      />
    </TresCanvas>
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
