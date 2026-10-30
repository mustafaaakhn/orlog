<script setup lang="ts">
import { computed, watch, onMounted, onBeforeUnmount, ref, nextTick } from "vue";
import { createDieHighlight } from "./dieHighlight";
import type { DieId, PlayerState, PlayerId } from "../core";
import { closestDieTarget } from "../scene/dieTargets";
import type { SceneDieTarget } from "../scene/dieTargets";
import { inspectableDice } from "./dieInspection";
import SymbolIcon from "./SymbolIcon.vue";
import TokenIcon from "./TokenIcon.vue";
import { dieTargetCapacity, layoutDieTargets } from "./dieTargetLayout";
import type { DieTargetArea } from "./dieTargetLayout";
const props = defineProps<{
  players: readonly PlayerState[];
  selectablePlayer: PlayerId | null;
  viewerId: PlayerId;
  targets: readonly SceneDieTarget[];
  disabled: boolean;
  collected: readonly DieId[];
  safeArea?: DieTargetArea;
}>();
const emit = defineEmits<{ select: [id: DieId]; highlight: [id: DieId | null] }>();
const inspected = computed(() => inspectableDice(
  props.players, props.targets, props.selectablePlayer, props.collected,
).filter(target => !mobile.value || target.id.startsWith(`${props.viewerId}/`) || target.location !== "Haznede"));
const size = ref({ width: 0, height: 0 });
const mobile = computed(() => size.value.width > 0 && (size.value.width <= 600 ||
  (size.value.height <= 500 && size.value.width > size.value.height)));
const safeArea = computed(() => props.safeArea ?? {
  top: size.value.height <= 500 ? 115 : 200,
  bottom: size.value.height <= 500 ? 70 : 160,
  left: 12, right: size.value.height <= 500 ? 210 : 12,
});
const overflow = computed(() => mobile.value && dieTargetCapacity(size.value.width, size.value.height, safeArea.value) < inspected.value.length);
const controls = computed(() => mobile.value && !overflow.value
  ? layoutDieTargets(inspected.value, size.value.width, size.value.height, safeArea.value)
  : inspected.value.map(target => ({ ...target, sourceX: target.x, sourceY: target.y })));
const listStyle = computed(() => overflow.value ? {
  top: `${safeArea.value.top}px`, bottom: `${safeArea.value.bottom}px`,
  left: `${safeArea.value.left}px`, right: `${safeArea.value.right}px`,
} : {});
const highlight = createDieHighlight(
  () => !props.disabled,
  () => controls.value.map(target => target.id),
);
const { aimed } = highlight;
const layer = ref<HTMLElement | null>(null);
const previewElement = ref<HTMLElement | null>(null);
const previewHeight = ref(164);
let resize: ResizeObserver | undefined;
const dismissed = ref(false);
const inspecting = ref<DieId | null>(null);
let keyboardMode = true;
const preview = computed(() => dismissed.value || props.disabled ? null : controls.value.find(target => target.id === (mobile.value ? inspecting.value : highlight.id.value)));
const previewStyle = computed(() => {
  if (!preview.value) return {};
  const x = overflow.value
    ? (safeArea.value.left + size.value.width - safeArea.value.right) / 2
    : preview.value.x * size.value.width / 100;
  const y = overflow.value ? safeArea.value.top : preview.value.y * size.value.height / 100;
  // Prefer above the die. At the far edge, flip below so the header cannot
  // cover the face. Clamp both axes inside the viewport, also in landscape.
  const safeTop = mobile.value ? safeArea.value.top : 80;
  const safeBottom = mobile.value ? safeArea.value.bottom : 12;
  const above = y - 30 - previewHeight.value;
  const top = above >= safeTop ? above : y + 30;
  const safeLeft = mobile.value ? safeArea.value.left : 0;
  const safeRight = mobile.value ? safeArea.value.right : 0;
  return {
    maxHeight: `${Math.max(100, size.value.height - safeTop - safeBottom)}px`,
    left: `${Math.max(safeLeft + 98, Math.min(size.value.width - safeRight - 98, x))}px`,
    top: `${Math.max(safeTop, Math.min(size.value.height - previewHeight.value - safeBottom, top))}px`,
  };
});
watch(preview, async () => {
  await nextTick();
  previewHeight.value = previewElement.value?.offsetHeight ?? 164;
});
watch(highlight.id, () => { dismissed.value = false; });
watch(() => props.selectablePlayer, () => { highlight.clear(); inspecting.value = null; });
let hold: ReturnType<typeof setTimeout> | undefined;
let gesture: { id: DieId; pointerId: number; x: number; y: number; consumed: boolean; released: boolean; held: boolean } | null = null;
function cancelHold() { clearTimeout(hold); hold = undefined; }
function resetGesture() { cancelHold(); gesture = null; }
watch(() => props.disabled, disabled => { resetGesture(); if (disabled) inspecting.value = null; });
watch(() => props.selectablePlayer, resetGesture);
function touchStart(event: PointerEvent, id: DieId) {
  resetGesture();
  if (props.disabled || event.pointerType !== "touch" || !event.isPrimary) return;
  gesture = { id, pointerId: event.pointerId, x: event.clientX, y: event.clientY, consumed: false, released: false, held: false };
  hold = setTimeout(() => {
    if (!gesture || props.disabled) return;
    gesture.consumed = true;
    gesture.held = true;
    highlight.focus(id);
    inspecting.value = id;
    dismissed.value = false;
  }, 400);
}
function moveTouch(event: PointerEvent) {
  if (!gesture || event.pointerId !== gesture.pointerId) return;
  if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 12) {
    cancelHold();
    gesture.consumed = true;
  }
}
function endTouch(event: PointerEvent) {
  cancelHold();
  if (gesture?.pointerId === event.pointerId) gesture.released = true;
}
function leaveTouch() { if (gesture && !gesture.released) cancelTouch(); }
function cancelTouch() { cancelHold(); if (gesture) { gesture.consumed = true; gesture.held = false; } }
function outside(event: PointerEvent) {
  if (!(event.target instanceof Element) || !event.target.closest(".scene-die-target, .die-face-preview")) { highlight.clear(); inspecting.value = null; }
}
onMounted(() => {
  document.addEventListener("pointerdown", outside);
  resize = new ResizeObserver(([entry]) => {
    if (entry) size.value = { width: entry.contentRect.width, height: entry.contentRect.height };
  });
  if (layer.value) resize.observe(layer.value);
});
onBeforeUnmount(() => {
  resetGesture();
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
  if (event.pointerType === "touch") return;
  const button = (event.target as Element).closest<HTMLElement>(".scene-die-target");
  aimed.value = mobile.value ? (button?.dataset.dieId as DieId | undefined) ?? null : nearest(event)?.id ?? null;
}
function focusDie(id: DieId) {
  highlight.focus(id);
  dismissed.value = false;
  if (mobile.value && keyboardMode) inspecting.value = id;
}
function blur(event: FocusEvent) {
  if (!(event.relatedTarget instanceof Element) || !event.relatedTarget.closest(".die-face-preview")) highlight.focus(null);
}
function select(event: MouseEvent, fallback: DieId) {
  if (props.disabled) return;
  const target = event.detail && !mobile.value ? nearest(event) : controls.value.find(target => target.id === fallback);
  if (!target) return;
  dismissed.value = false;
  highlight.focus(target.id);
  const consumed = gesture?.consumed && event.detail !== 0;
  const held = gesture?.held;
  resetGesture();
  if (consumed) { if (held) inspecting.value = target.id; return; }
  if (target.canSelect) {
    inspecting.value = null;
    emit("select", target.id);
  } else inspecting.value = target.id;
}
function navigate(event: KeyboardEvent) {
  keyboardMode = true;
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
      ".scene-die-target:not([aria-disabled='true'])",
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
    :class="{ 'mobile-die-controls': mobile }"
    role="group"
    aria-label="Masadaki zarları incele ve seç"
    @keydown="navigate"
    @keydown.esc.stop="dismissed = true"
    @pointerdown="keyboardMode = false"
    @contextmenu.prevent
    @pointermove="aim"
    @pointerleave="aimed = null"
  >
    <svg v-if="mobile && !overflow && !disabled" class="die-target-links" aria-hidden="true">
      <line v-for="target in controls.filter(t => Math.hypot((t.x-t.sourceX)*size.width/100, (t.y-t.sourceY)*size.height/100) > 6)"
        :key="target.id" :x1="`${target.sourceX}%`" :y1="`${target.sourceY}%`"
        :x2="`${target.x}%`" :y2="`${target.y}%`" />
    </svg>
    <div class="die-target-list" :class="{ 'is-overflow': overflow, 'is-short': size.height - safeArea.top - safeArea.bottom < 100 }" :style="listStyle" :role="overflow ? 'group' : undefined" :aria-label="overflow ? 'Masadaki zarlar, kaydırarak incele ve seç' : undefined">
    <button
      v-for="target in controls"
      :key="target.id"
      class="scene-die-target"
      :class="{ 'grants-token': target.face.grantsToken, 'is-selected': target.selected, 'is-kept': target.location === 'Kilitli' }"
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
      @pointerdown="touchStart($event, target.id)"
      @pointermove="moveTouch"
      @pointerup="endTouch"
      @pointercancel="cancelTouch"
      @pointerleave="leaveTouch"
      @pointerenter="$event.pointerType !== 'touch' && (aimed = target.id)"
      @focus="focusDie(target.id)"
      @blur="blur"
      @click="select($event, target.id)"
    >
      <template v-if="mobile">
        <SymbolIcon :symbol="target.face.symbol" />
        <span v-if="target.face.grantsToken" class="die-target-token"><TokenIcon /></span>
        <span v-if="target.selected || target.location === 'Kilitli'" class="die-target-check" aria-hidden="true">✓</span>
        <span v-if="target.value !== 1" class="die-target-value" aria-hidden="true">×{{ target.value }}</span>
      </template>
      <span class="sr-only">{{ target.label }}</span>
    </button>
    </div>
    <div v-if="preview" ref="previewElement" id="die-face-preview" class="die-face-preview" :role="mobile ? 'region' : 'tooltip'" :aria-label="mobile ? 'Zar bilgisi' : undefined" :style="previewStyle">
      <div class="die-preview-face" :class="{ 'grants-token': preview.face.grantsToken }">
        <SymbolIcon :symbol="preview.face.symbol" />
        <TokenIcon v-if="mobile && preview.face.grantsToken" class="die-preview-coin" />
      </div>
      <strong>{{ preview.name }}<span v-if="preview.value !== 1"> × {{ preview.value }}</span></strong>
      <span class="die-preview-effect">{{ preview.description }}</span>
      <span v-if="preview.face.grantsToken" class="die-preview-token">Jeton getirir</span>
      <span class="die-preview-owner">{{ preview.owner }} · {{ preview.location }}</span>
      <button v-if="mobile" type="button" class="die-preview-close" @click="dismissed = true; inspecting = null; highlight.clear()">Kapat</button>
    </div>
  </div>
</template>

<style src="./mobile-dice.css"></style>
