<script setup lang="ts">
import { computed, watch, onMounted, onBeforeUnmount, ref, nextTick } from "vue";
import { createDieHighlight } from "./dieHighlight";
import type { DieId, PlayerState, PlayerId } from "../core";
import { closestDieTarget } from "../scene/dieTargets";
import type { SceneDieTarget } from "../scene/dieTargets";
import { inspectableDice } from "./dieInspection";
import SymbolIcon from "./SymbolIcon.vue";
const props = defineProps<{
  players: readonly PlayerState[];
  selectablePlayer: PlayerId | null;
  targets: readonly SceneDieTarget[];
  disabled: boolean;
  collected: readonly DieId[];
}>();
const emit = defineEmits<{ select: [id: DieId]; highlight: [id: DieId | null] }>();
const controls = computed(() => inspectableDice(
  props.players, props.targets, props.selectablePlayer, props.collected,
));
const highlight = createDieHighlight(
  () => !props.disabled,
  () => controls.value.map(target => target.id),
);
const { aimed } = highlight;
const layer = ref<HTMLElement | null>(null);
const previewElement = ref<HTMLElement | null>(null);
const size = ref({ width: 0, height: 0 });
const previewHeight = ref(164);
let resize: ResizeObserver | undefined;
const dismissed = ref(false);
const preview = computed(() => dismissed.value ? null : controls.value.find(target => target.id === highlight.id.value));
const previewStyle = computed(() => {
  if (!preview.value) return {};
  const x = preview.value.x * size.value.width / 100;
  const y = preview.value.y * size.value.height / 100;
  // Prefer above the die. At the far edge, flip below so the header cannot
  // cover the face. Clamp both axes inside the viewport, also in landscape.
  const above = y - 30 - previewHeight.value;
  const top = above >= 80 ? above : y + 30;
  return {
    left: `${Math.max(98, Math.min(size.value.width - 98, x))}px`,
    top: `${Math.max(12, Math.min(size.value.height - previewHeight.value - 12, top))}px`,
  };
});
watch(preview, async () => {
  await nextTick();
  previewHeight.value = previewElement.value?.offsetHeight ?? 164;
});
watch(highlight.id, () => { dismissed.value = false; });
watch(() => props.selectablePlayer, highlight.clear);
let hold: ReturnType<typeof setTimeout> | undefined;
let suppressSelect = false;
let holdPoint: { x: number; y: number } | null = null;
function cancelHold() { clearTimeout(hold); holdPoint = null; }
watch(() => props.disabled, cancelHold);
function touchStart(event: PointerEvent) {
  cancelHold();
  suppressSelect = false;
  if (event.pointerType !== "touch") return;
  const target = nearest(event);
  if (!target) return;
  holdPoint = { x: event.clientX, y: event.clientY };
  hold = setTimeout(() => {
    suppressSelect = true;
    highlight.focus(target.id);
    dismissed.value = false;
  }, 400);
}
function outside(event: PointerEvent) {
  if (!(event.target instanceof Element) || !event.target.closest(".scene-die-target")) highlight.clear();
}
onMounted(() => {
  document.addEventListener("pointerdown", outside);
  resize = new ResizeObserver(([entry]) => {
    if (entry) size.value = { width: entry.contentRect.width, height: entry.contentRect.height };
  });
  if (layer.value) resize.observe(layer.value);
});
onBeforeUnmount(() => {
  cancelHold();
  resize?.disconnect();
  document.removeEventListener("pointerdown", outside);
});
watch(highlight.id, id => emit("highlight", id), { immediate: true });
onBeforeUnmount(() => emit("highlight", null));
function nearest(event: MouseEvent | PointerEvent) {
  const container = (event.currentTarget as HTMLElement).closest(
    ".scene-die-controls",
  )!;
  const bounds = container.getBoundingClientRect();
  return closestDieTarget(
    controls.value,
    event.clientX - bounds.left,
    event.clientY - bounds.top,
    bounds.width,
    bounds.height,
  );
}
function aim(event: PointerEvent) {
  if (holdPoint && Math.hypot(event.clientX - holdPoint.x, event.clientY - holdPoint.y) > 12) cancelHold();
  if (event.pointerType !== "touch") aimed.value = nearest(event)?.id ?? null;
}
function select(event: MouseEvent, fallback: DieId) {
  if (props.disabled) return;
  const target = event.detail ? nearest(event) : controls.value.find(target => target.id === fallback);
  if (!target) return;
  dismissed.value = false;
  highlight.focus(target.id);
  if (suppressSelect && event.detail) { suppressSelect = false; return; }
  suppressSelect = false;
  if (target.canSelect) emit("select", target.id);
}
function navigate(event: KeyboardEvent) {
  if (
    ![
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End",
    ].includes(event.key)
  )
    return;
  const buttons = [
    ...(event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>(
      "button:not(:disabled)",
    ),
  ];
  const current = buttons.indexOf(event.target as HTMLButtonElement);
  if (current < 0 || !buttons.length) return;
  event.preventDefault();
  aimed.value = null;
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? buttons.length - 1
        : (current +
            (["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1) +
            buttons.length) %
          buttons.length;
  buttons[next]?.focus({ preventScroll: true });
}
</script>
<template>
  <div
    ref="layer"
    class="scene-die-controls"
    role="group"
    aria-label="Masadaki zarları incele ve seç"
    @keydown="navigate"
    @keydown.esc.stop="dismissed = true"
    @pointerdown="touchStart"
    @pointerup="cancelHold"
    @pointercancel="cancelHold"
    @contextmenu.prevent
    @pointermove="aim"
    @pointerleave="cancelHold(); aimed = null"
  >
    <button
      v-for="target in controls"
      :key="target.id"
      class="scene-die-target"
      :style="{
        left: `${target.x}%`,
        top: `${target.y}%`,
        zIndex: aimed === target.id ? 3 : undefined,
      }"
      :aria-label="target.label"
      :aria-pressed="target.canSelect ? target.selected : undefined"
      :aria-disabled="disabled"
      :tabindex="disabled ? -1 : 0"
      :aria-describedby="preview?.id === target.id ? 'die-face-preview' : undefined"
      :data-die-id="target.id"
      :data-selectable="target.canSelect"
      @focus="highlight.focus(target.id); dismissed = false"
      @blur="highlight.focus(null)"
      @click="select($event, target.id)"
    >
      <span class="sr-only">{{ target.label }}</span>
    </button>
    <div v-if="preview" ref="previewElement" id="die-face-preview" class="die-face-preview" role="tooltip" :style="previewStyle">
      <div class="die-preview-face" :class="{ 'grants-token': preview.face.grantsToken }">
        <SymbolIcon :symbol="preview.face.symbol" />
      </div>
      <strong>{{ preview.name }}<span v-if="preview.value !== 1"> × {{ preview.value }}</span></strong>
      <span class="die-preview-effect">{{ preview.description }}</span>
      <span v-if="preview.face.grantsToken" class="die-preview-token">Jeton getirir</span>
      <span class="die-preview-owner">{{ preview.owner }} · {{ preview.location }}</span>
    </div>
  </div>
</template>
