<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch, computed, nextTick } from "vue";
import { useTres } from "@tresjs/core";
import {
  DirectionalLight,
  PerspectiveCamera,
  Vector3,
  Raycaster,
  Vector2,
  Object3D,
} from "three";
import { createBoard } from "./board";
import { createEventQueue } from "../presentation/eventQueue";
import { createCombatPresenter } from "../presentation/combatPresenter";
import { applyResourceEvent } from "../presentation/resources";
import type { AudioPort } from "../audio/catalog";
import { createRollRecorder } from "../presentation/rollRecorder";
import { createDicePresenter } from "../presentation/dicePresenter";
import type { PresentationBatch } from "../app/rollSession";
import type { DieId, GameState, GameEvent, PlayerId } from "../core";

import type { SceneDieTarget } from "./dieTargets";
import {
  TABLE_HALF_WIDTH,
  TABLE_NARROW_HALF_WIDTH,
  TABLE_HALF_DEPTH,
  playerSide,
} from "./tableLayout";

const props = defineProps<{
  audio: AudioPort;
  reduced: boolean;
  paused: boolean;
  quality: string;
  speed: number;
  closeView: boolean;
  viewerId: PlayerId;
  state: GameState;
  batch: PresentationBatch | null;
}>();
const emit = defineEmits<{
  settled: [batchId: number];
  presented: [batchId: number, event: GameEvent];
  select: [dieId: DieId];
  failed: [];
  targets: [targets: SceneDieTarget[]];
}>();
const { sizes, invalidate, renderer, scene } = useTres();
const board = createBoard(invalidate);
board.syncDice(props.state);
board.syncResources(props.state);
let sceneClosed = false;
const recorder = createRollRecorder();
const presenter = createDicePresenter(board.dice, invalidate, {
  record: recorder.record,
  reduced: () => props.reduced,
  speed: () => props.speed,
  audio: props.audio,
});
const combat = createCombatPresenter(
  board,
  invalidate,
  () => props.speed,
  () => props.reduced,
);
let shown = props.state;
const queue = createEventQueue(
  async (event) => {
    const batch = props.batch;
    if (!batch) return;
    await presenter.play({
      ...batch,
      state:
        event.type === "DiceRecast"
          ? applyResourceEvent(shown, event)
          : batch.state,
      events: [event],
    });
    await combat.play(event);
    if (event.type === "RoundStarted") board.syncDice(batch.state);
  },
  (event) => {
    props.audio.event(event);
    shown = applyResourceEvent(shown, event);
    board.syncResources(shown);
    invalidate();
    if (props.batch) emit("presented", props.batch.id, event);
  },
);
watch(
  () => props.speed,
  (value) => {
    presenter.setSpeed(value);
    combat.setSpeed(value);
  },
);
watch(
  () => props.paused,
  (value) => {
    queue.setPaused(value);
    presenter.setPaused(value);
    combat.setPaused(value);
  },
  { immediate: true },
);
watch(
  () => props.state,
  (state) => {
    shown = state;
    board.syncResources(state);
    if (
      !props.batch &&
      (state.revision === 0 ||
        state.phase.name === "round-complete" ||
        state.phase.name === "ended")
    ) {
      board.syncDice(state);
      invalidate();
    }
  },
);
watch(
  () => props.batch,
  async (batch) => {
    if (!batch) {
      await nextTick();
      publishTargets();
      return;
    }
    try {
      await queue.play(batch.events);
      if (!sceneClosed) emit("settled", batch.id);
    } catch (error) {
      if (sceneClosed) return;
      console.error("Dice presentation failed", error);
      if (!sceneClosed) emit("failed");
    }
  },
);
// Stable prop identities prevent scene patches from invalidating every idle frame.
const keyPosition: [number, number, number] = [-5, 10, 4];
const fillPosition: [number, number, number] = [6, 7, -4];
const frontPosition: [number, number, number] = [0, 5, 10];
const shadowSize = computed(
  () =>
    new Vector2(
      props.quality === "high" ? 2048 : 1024,
      props.quality === "high" ? 2048 : 1024,
    ),
);
watch(
  () => props.quality,
  () => {
    const size = props.quality === "high" ? 2048 : 1024;
    scene.value.traverse((object) => {
      if (object instanceof DirectionalLight && object.castShadow)
        object.shadow.map?.setSize(size, size);
    });
    invalidate();
  },
);
const camera = new PerspectiveCamera(42, 1, 0.1, 100);
const direction = new Vector3();
const up = new Vector3();
function publishTargets() {
  if (sceneClosed || props.batch || !sizes.width.value || !sizes.height.value)
    return;
  board.object.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  const targets: SceneDieTarget[] = [];
  for (const [id, die] of board.dice) {
    if (!die.visible) continue;
    const point = die.position
      .clone()
      .add(new Vector3(0, 0.18, 0))
      .project(camera);
    if (Math.abs(point.x) < 1.1 && Math.abs(point.y) < 1.1 && point.z < 1)
      targets.push({ id, x: (point.x + 1) * 50, y: (1 - point.y) * 50 });
  }
  emit("targets", targets);
}

watch(
  [
    () => sizes.aspectRatio.value,
    () => sizes.width.value,
    () => props.closeView,
    () => props.viewerId,
    () => props.state.players[props.viewerId].dice.length,
  ],
  () => {
    const aspect = Math.max(sizes.aspectRatio.value, 0.25);
    const side = playerSide(props.viewerId);
    const narrow = sizes.width.value < 620 && aspect < 1.1;
    board.setNarrow(narrow);
    direction.set(0, 1.0, (narrow ? 0.36 : 0.62) * side).normalize();
    up.set(0, Math.abs(direction.z), -direction.y * side);
    const target = new Vector3(
      0,
      props.closeView ? 0.5 : 0.2,
      props.closeView ? 3.4 * side : 0,
    );
    // Fit all corners of the presentation bounds in the camera's frustum.
    const halfWidth = props.closeView
      ? props.state.players[props.viewerId].dice.length > 6
        ? 5.2
        : 3.6
      : narrow
        ? TABLE_NARROW_HALF_WIDTH
        : TABLE_HALF_WIDTH;
    const halfDepth = props.closeView ? 5.0 : TABLE_HALF_DEPTH;
    const centerZ = props.closeView ? 3.4 * side : 0;
    const tangent = Math.tan((camera.fov * Math.PI) / 360);
    let distance = 0;
    for (const x of [-halfWidth, halfWidth]) {
      for (const z of [centerZ - halfDepth, centerZ + halfDepth]) {
        for (const y of [0, 2]) {
          const point = new Vector3(x, y, z).sub(target);
          const depth = point.dot(direction);
          distance = Math.max(
            distance,
            depth + Math.abs(x) / (tangent * aspect),
            depth + Math.abs(point.dot(up)) / tangent,
          );
        }
      }
    }
    camera.position.copy(target).addScaledVector(direction, distance * 1.06);
    camera.aspect = aspect;
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    invalidate();
    publishTargets();
  },
  { immediate: true },
);

const raycaster = new Raycaster();
let pointer: { x: number; y: number; id: number } | undefined;
function pointerDown(event: PointerEvent) {
  if (!props.batch && event.isPrimary && event.button === 0)
    pointer = { x: event.clientX, y: event.clientY, id: event.pointerId };
}
function pointerUp(event: PointerEvent) {
  const start = pointer;
  pointer = undefined;
  if (
    !start ||
    start.id !== event.pointerId ||
    props.batch ||
    Math.hypot(start.x - event.clientX, start.y - event.clientY) > 12
  )
    return;
  const bounds = renderer.domElement.getBoundingClientRect();
  raycaster.setFromCamera(
    new Vector2(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      (-(event.clientY - bounds.top) / bounds.height) * 2 + 1,
    ),
    camera,
  );
  const hit = raycaster.intersectObjects(
    [...board.dice.values()].filter((die) => die.visible),
    true,
  )[0];
  let object: Object3D | undefined = hit?.object;
  while (object && !object.userData.dieId) object = object.parent ?? undefined;
  if (object) emit("select", object.userData.dieId as DieId);
}
function pointerCancel() {
  pointer = undefined;
}
onMounted(() => {
  publishTargets();
  const canvas = renderer.domElement;
  canvas.addEventListener("pointerdown", pointerDown);
  canvas.addEventListener("pointerup", pointerUp);
  canvas.addEventListener("pointercancel", pointerCancel);
});
function dispose() {
  if (sceneClosed) return;
  sceneClosed = true;
  queue.dispose();
  recorder.dispose();
  combat.dispose();
  presenter.dispose();
  const canvas = renderer.domElement;
  canvas.removeEventListener("pointerdown", pointerDown);
  canvas.removeEventListener("pointerup", pointerUp);
  canvas.removeEventListener("pointercancel", pointerCancel);
  board.dispose();
  scene.value.traverse((object) => {
    if (object instanceof DirectionalLight) object.dispose();
  });
}
defineExpose({ dispose });
onBeforeUnmount(dispose);
</script>

<template>
  <primitive :object="camera" :position="camera.position" />
  <TresHemisphereLight
    color="#d6e2dc"
    ground-color="#30251d"
    :intensity="1.35"
  />
  <TresDirectionalLight
    color="#ffd6a0"
    :position="keyPosition"
    :intensity="2.4"
    cast-shadow
    :shadow-mapSize="shadowSize"
    :shadow-camera-left="-11"
    :shadow-camera-right="11"
    :shadow-camera-top="10"
    :shadow-camera-bottom="-10"
    :shadow-camera-near="0.5"
    :shadow-camera-far="35"
    :shadow-normalBias="0.025"
    :shadow-bias="-0.0001"
  />
  <TresDirectionalLight
    color="#b6d6df"
    :position="fillPosition"
    :intensity="1.1"
  />
  <TresDirectionalLight
    color="#f3e4c9"
    :position="frontPosition"
    :intensity="1.2"
  />
  <primitive :object="board.object" :dispose="null" />
</template>
