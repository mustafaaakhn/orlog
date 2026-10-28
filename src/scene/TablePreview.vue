<script setup lang="ts">
import GameMark from "../ui/GameMark.vue";
import {
  onErrorCaptured,
  onMounted,
  onUnmounted,
  onBeforeUnmount,
  ref,
  watch,
} from "vue";
import { TresCanvas } from "@tresjs/core";
import type { TresContext } from "@tresjs/core";
import TableScene from "./TableScene.vue";
import type { AudioPort } from "../audio/catalog";
import type { PresentationBatch } from "../app/rollSession";
import type { DieId, GameState, GameEvent } from "../core";

defineProps<{
  audio: AudioPort;
  reduced: boolean;
  paused: boolean;
  quality: string;
  speed: number;
  closeView: boolean;
  state: GameState;
  batch: PresentationBatch | null;
}>();
const emit = defineEmits<{
  availability: [ready: boolean];
  settled: [batchId: number];
  presented: [batchId: number, event: GameEvent];
  select: [dieId: DieId];
}>();
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
      aria-label="Üç boyutlu Orlog masası: ahşap kâse, oyuncuların zarları, can taşları ve kuşanılan tanrı totemleri. Zarları seçmek için dokun veya aşağıdaki zar düğmelerini kullan."
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
        :state="state"
        :batch="batch"
        @presented="(id, event) => emit('presented', id, event)"
        @settled="emit('settled', $event)"
        @select="emit('select', $event)"
        @failed="failed"
      />
    </TresCanvas>
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
