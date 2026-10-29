<script setup lang="ts">
import { computed, watch, onBeforeUnmount } from "vue";
import { createDieHighlight } from "./dieHighlight";
import { getDieFace } from "../core";
import type { DieId, PlayerState } from "../core";
import { closestDieTarget } from "../scene/dieTargets";
import type { SceneDieTarget } from "../scene/dieTargets";
import { SYMBOL_GUIDE } from "../scene/symbols";
const props = defineProps<{
  player: PlayerState;
  targets: readonly SceneDieTarget[];
  disabled: boolean;
}>();
const emit = defineEmits<{ select: [id: DieId]; highlight: [id: DieId | null] }>();
const controls = computed(() =>
  props.player.dice.flatMap((die, index) => {
    const target = props.targets.find((value) => value.id === die.id);
    if (!target || !die.faceId || die.kept || die.removed) return [];
    const face = getDieFace(die.definitionId, die.faceId);
    const symbol = SYMBOL_GUIDE.find((value) => value.id === face.symbol)!.name;
    return [
      {
        ...target,
        selected: die.selected,
        label: `Zar ${index + 1}: ${symbol}${face.grantsToken ? ", altın çerçeveli" : ""}${die.value > 1 ? `, etki ${die.value}` : ""}${die.selected ? ", merkezde; geri al" : ", haznede; merkeze al"}`,
      },
    ];
  }),
);
const highlight = createDieHighlight(
  () => !props.disabled,
  () => controls.value.map(target => target.id),
);
const { aimed } = highlight;
watch(() => props.player.id, highlight.clear);
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
  if (event.pointerType !== "touch") aimed.value = nearest(event)?.id ?? null;
}
function select(event: MouseEvent, fallback: DieId) {
  emit("select", event.detail ? (nearest(event)?.id ?? fallback) : fallback);
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
    class="scene-die-controls"
    role="group"
    aria-label="Masadaki zarları seç"
    @keydown="navigate"
    @pointermove="aim"
    @pointerleave="aimed = null"
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
      :aria-pressed="target.selected"
      :disabled="disabled"
      @focus="highlight.focus(target.id)"
      @blur="highlight.focus(null)"
      @click="select($event, target.id)"
    >
      <span class="sr-only">{{ target.label }}</span>
    </button>
  </div>
</template>
