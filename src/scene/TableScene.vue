<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch, computed, nextTick } from "vue";
import { gsap } from 'gsap';
import { isWebGLRenderer, useTres } from "@tresjs/core";
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
import type { PresentationCue } from "../presentation/combatPresenter";
import { lastContributions, phaseTitle } from "../presentation/resolutionPlan";
import { applyResourceEvent, applyResourceProgress, resourceSteps } from "../presentation/resources";
import type { AudioPort } from "../audio/catalog";
import { createRollRecorder } from "../presentation/rollRecorder";
import { createDicePresenter } from "../presentation/dicePresenter";
import type { PresentationBatch } from "../app/rollSession";
import type { DieId, GameState, GameEvent, PlayerId } from "../core";

import type { SceneDieTarget } from "./dieTargets";
import { projectDiceTargets } from "./projectDiceTargets";
import { projectTokenTargets } from './projectTokenTargets';
import { frameTableCamera, isMobileTableView } from './tableCamera';
import type { TableInsets } from './tableCamera';
import { eventFocusPoints, collectionFocusPoints } from "./eventFocus";
import { collectionSlot } from './tableLayout';
import { createSeatTurn } from '../presentation/seatTurn';

const props = defineProps<{
  audio: AudioPort;
  reduced: boolean;
  paused: boolean;
  background: boolean;
  quality: string;
  speed: number;
  highlightedDie: DieId | null;
  highlightedTokens: PlayerId | null;
  highlightedFavor: { playerId: PlayerId; favorId: import("../core").FavorId } | null;
  viewerId: PlayerId;
  state: GameState;
  batch: PresentationBatch | null;
  frameInsets: TableInsets;
}>();
const emit = defineEmits<{
  settled: [batchId: number];
  presented: [batchId: number, event: GameEvent];
  progress: [batchId: number, event: GameEvent, step: number];
  select: [dieId: DieId];
  failed: [];
  targets: [targets: SceneDieTarget[]];
  favors: [targets: import("./dieTargets").SceneFavorTarget[]];
  tokens: [targets: import('./dieTargets').SceneTokenTarget[]];
  cue: [cue: PresentationCue | null];
  collected: [ids: DieId[]];
  seatTurn: [player: PlayerId | null];
}>();
const { sizes, invalidate, renderer, scene } = useTres();
const board = createBoard(invalidate, isWebGLRenderer(renderer) ? renderer.capabilities.getMaxAnisotropy() : 4);
board.syncDice(props.state);
board.syncResources(props.state);
let sceneClosed = false;
let visualEvent: GameEvent | null = null;
let concealedDice: readonly DieId[] = [];
const finishedDice = new Set<DieId>();
// The renderer and board survive focus/visibility changes. Only the obsolete
// playback is retired before authoritative state takes ownership of transforms.
function createPlayback() {
  let retired = false;
  let shown = props.state;
  let shownPhase = props.state.phase.name;
  let last = new Map<DieId, string>();
  let batchId: number | null = null;
  let running = Promise.resolve();
  let playing = false;
  const recorder = createRollRecorder();
  const combat = createCombatPresenter(board, () => { invalidate(); publishTargets(); }, () => props.speed, () => props.reduced, {
    cue: value => { if (!retired) emit('cue', value); },
    progress: (event, step) => {
      if (retired || sceneClosed || !props.batch || props.paused) return;
      shown = applyResourceProgress(shown, event, step);
      board.syncResources(shown);
      props.audio.event(event, step);
      emit('progress', props.batch.id, event, step);
      invalidate();
    },
  });
  const presenter = createDicePresenter(board.dice, () => { invalidate(); publishTargets(); }, {
    record: recorder.record,
    reduced: () => props.reduced,
    speed: () => props.speed,
    audio: props.audio,
    collected: combat.collected,
  });
  const queue = createEventQueue(async event => {
    const batch = props.batch;
    if (!batch || retired) return;
    if (event.type === 'RoundStarted') {
      combat.reset();
      finishedDice.clear();
      emit('collected', []);
      board.syncDice(batch.state);
    }
    const title = phaseTitle(event, shownPhase);
    if (event.type === 'PhaseChanged') shownPhase = event.phase.name;
    if (title) await combat.title(title);
    if (retired || sceneClosed) return;
    if (event.type === 'DiceRolled' && batch.state.round === 1 && shown.revision === 0)
      await combat.title('Tur 1 · Zar atışı');
    if (retired || sceneClosed) return;
    visualEvent = event;
    concealedDice = event.type === 'DiceRolled' ? event.dice.map(d => d.dieId)
      : event.type === 'DiceRecast' ? event.dice.map(d => d.id) : [];
    const points = eventFocusPoints(event, board);
    if (points.length && (batch.state.phase.name === 'round-complete' || batch.state.phase.name === 'ended')) focusEvent(points);
    publishTargets();
    await presenter.play({
      ...batch,
      state: event.type === 'DiceRecast' ? applyResourceEvent(shown, event) : batch.state,
      events: [event],
    });
    if (!retired && !sceneClosed) await combat.play(event);
  }, event => {
    if (retired || sceneClosed) return;
    if (!resourceSteps(event)) props.audio.event(event);
    shown = applyResourceEvent(shown, event);
    board.syncResources(shown);
    invalidate();
    concealedDice = [];
    if (props.batch) emit('presented', props.batch.id, event);
    publishTargets();
  }, async event => {
    const ids = [...last].filter(([, eventId]) => eventId === event.id).map(([id]) => id);
    if (ids.length) focusEvent(collectionFocusPoints(ids, board));
    await combat.collect(ids);
    if (!retired && !sceneClosed) {
      ids.forEach(id => finishedDice.add(id));
      emit('collected', [...combat.collected]);
      publishTargets();
    }
  });
  return {
    get state() { return shown; },
    get playing() { return playing; },
    resources(state: GameState) { shown = state; board.syncResources(state); },
    sync(state: GameState) {
      shown = state;
      shownPhase = state.phase.name;
      combat.reset();
      finishedDice.clear();
      visualEvent = null;
      concealedDice = [];
      board.dice.forEach(die => die.scale.setScalar(1));
      board.syncDice(state);
      board.syncResources(state);
      board.favorTargets().forEach(totem => { totem.position.y = 0; });
      if (state.phase.name === 'round-complete' || state.phase.name === 'ended') {
        for (const player of Object.values(state.players)) {
          let slot = 0;
          for (const value of player.dice) {
            const die = board.dice.get(value.id)!;
            if (!die.visible) continue;
            combat.collected.add(value.id);
            finishedDice.add(value.id);
            die.position.set(...collectionSlot(player.id, slot++));
            die.getObjectByName('selection-marker')!.visible = false;
          }
        }
      }
      emit('collected', [...combat.collected]);
      emit('cue', null);
      focusEvent([], true);
      invalidate();
    },
    play(batch: PresentationBatch) {
      if (retired || batchId === batch.id) return running;
      batchId = batch.id;
      playing = true;
      running = (async () => {
        try {
          board.setDiceReadability(false);
          const resolution = batch.state.phase.name === 'round-complete' || batch.state.phase.name === 'ended';
          last = resolution ? lastContributions(batch.events) : new Map();
          await queue.play(batch.events);
          if (retired || sceneClosed) return;
          if (resolution) {
            const remaining = [...board.dice.keys()].filter(id => !combat.collected.has(id));
            visualEvent = null;
            focusEvent(collectionFocusPoints(remaining, board));
            await combat.cleanup(batch.state);
            combat.collected.forEach(id => finishedDice.add(id));
            if (retired || sceneClosed) return;
            emit('collected', [...combat.collected]);
          }
          visualEvent = null;
          concealedDice = [];
          focusEvent([]);
          publishTargets();
          emit('cue', null);
          if (await queue.ready() && !retired && !sceneClosed) emit('settled', batch.id);
        } catch (error) {
          if (retired || sceneClosed) return;
          console.error('Dice presentation failed', error);
          emit('failed');
        } finally { playing = false; }
      })();
      return running;
    },
    setSpeed(value: number) { presenter.setSpeed(value); combat.setSpeed(value); },
    setPaused(value: boolean) { queue.setPaused(value); presenter.setPaused(value); combat.setPaused(value); },
    stop() {
      retired = true;
      visualEvent = null;
      concealedDice = [];
      finishedDice.clear();
      focusEvent([], true);
      queue.dispose();
      recorder.dispose();
      combat.dispose();
      presenter.dispose();
      emit('cue', null);
      return running;
    },
  };
}
let playback: ReturnType<typeof createPlayback> | null = createPlayback();
function retirePlayback() {
  const previous = playback;
  playback = null;
  if (previous) void previous.stop();
}
watch(() => props.background, background => {
  if (background) {
    // An unchanged idle table needs neither a new presenter nor new positions.
    if (playback?.playing || (playback && playback.state !== props.state)) retirePlayback();
    else playback?.setPaused(true);
  } else {
    // stop() revokes transform ownership synchronously. Never wait for an old
    // animation/worker promise to repaint the latest authoritative snapshot.
    if (!playback) {
      playback = createPlayback();
      playback.sync(props.state);
    } else if (!props.batch) playback.sync(props.state);
    if (props.batch) void playback.play(props.batch);
    playback.setPaused(props.paused);
    // An on-demand WebGL buffer may have been discarded while the tab was away,
    // even when no state changed. Repaint the idle table on every return too.
    seatTurn.snap(props.viewerId);
    frameCamera(seatTurn.angle);
    invalidate();
  }
// Read the complete prop update: focus, snapshot and settled batch can arrive
// together. A synchronous prop watcher can still see the previous snapshot.
});
watch(() => props.speed, value => playback?.setSpeed(value));
watch(() => props.paused, value => playback?.setPaused(value || props.background), { immediate: true });
watch(() => props.state, state => {
  if (props.background) {
    if (playback && playback.state !== state) retirePlayback();
    return;
  }
  playback?.resources(state);
  if (!props.batch && state.revision === 0) playback?.sync(state);
  publishTargets();
});
watch(() => props.batch, async batch => {
  if (sceneClosed || props.background || batch !== props.batch) return;
  if (batch) await playback?.play(batch);
  else { await nextTick(); publishTargets(); }
}, { immediate: true });
// Stable prop identities prevent scene patches from invalidating every idle frame.
const keyPosition: [number, number, number] = [-8, 9, 3];
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
const composition = { weight: 0, minX: -5.65, maxX: 5.65, minY: 0, maxY: 4.1, minZ: -1.8, maxZ: 10.1 };
let compositionTween: gsap.core.Tween | undefined;
let seatTurning = false;
const seatTurn = createSeatTurn(props.viewerId, {
  frame: angle => frameCamera(angle),
  active: player => {
    seatTurning = player !== null;
    pointer = undefined;
    if (seatTurning) {
      board.highlightDie(null);
      board.highlightFavor(null, null);
      board.highlightTokens(null);
      emit('targets', []);
      emit('favors', []);
      emit('tokens', []);
    }
    emit('seatTurn', player);
    if (!seatTurning) publishTargets();
  },
});
function publishTargets() {
  if (sceneClosed || seatTurning || !sizes.width.value || !sizes.height.value) return;
  const mobile = isMobileTableView(sizes.width.value, sizes.height.value);
  // Desktop keeps its existing nodes/focus through playback. Mobile projection
  // is visual-only; App still owns the unchanged input and presentation locks.
  if (props.batch && !mobile) return;
  board.setDiceReadability(!props.batch, sizes.width.value <= 600 || (sizes.height.value <= 500 && sizes.width.value > sizes.height.value));
  board.object.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  if (!mobile) emit('tokens', projectTokenTargets(board.tokenTargets(), camera, sizes.width.value, sizes.height.value));
  const targets = projectDiceTargets(board.dice, camera, sizes.width.value, sizes.height.value, {
    mobile, presenting: !!props.batch, insets: props.frameInsets, event: visualEvent,
    concealed: concealedDice, finished: finishedDice,
  });
  emit("targets", targets);
  emit('favors', board.favorTargets().map(totem => {
    const point = totem.getWorldPosition(new Vector3()).add(new Vector3(0, 0.26, 0)).project(camera);
    return { playerId: totem.userData.playerId, favorId: totem.userData.favorId, x: (point.x + 1) * 50, y: (1 - point.y) * 50 };
  }));
}

function frameCamera(angle: number) {
  if (sceneClosed) return;
  const aspect = Math.max(sizes.aspectRatio.value, 0.25);
  const narrow = sizes.width.value < 620 && aspect < 1.1;
  board.setNarrow(narrow);
  frameTableCamera(camera, sizes.width.value, sizes.height.value, props.viewerId, narrow, angle, { insets: props.frameInsets, focus: [new Vector3(composition.minX, composition.minY, composition.minZ), new Vector3(composition.maxX, composition.maxY, composition.maxZ)], focusBlend: composition.weight });
  invalidate();
  publishTargets();
}
watch(() => props.viewerId, player => seatTurn.turn(player, props.reduced, props.paused));
watch(() => props.paused, paused => { if (paused) seatTurn.snap(props.viewerId); });
watch(() => props.reduced, reduced => { if (reduced) seatTurn.snap(props.viewerId); });
function focusEvent(points: readonly Vector3[], instant = false) {
  if (sceneClosed) return;
  compositionTween?.kill();
  const min = new Vector3(Infinity, Infinity, Infinity), max = min.clone().negate();
  for (const point of points) { min.min(point); max.max(point); }
  const target = points.length ? { weight: 1, minX: min.x, maxX: max.x, minY: min.y, maxY: max.y, minZ: min.z, maxZ: max.z } : { weight: 0 };
  if (instant || props.reduced || props.background) { Object.assign(composition, target); frameCamera(seatTurn.angle); }
  else compositionTween = gsap.to(composition, { ...target, duration: .28 / props.speed, ease: 'power2.out', onUpdate: () => frameCamera(seatTurn.angle) });
}
watch(() => props.reduced, reduced => { if (reduced) { compositionTween?.progress(1); compositionTween?.kill(); } });
watch(
  [
    () => sizes.aspectRatio.value,
    () => sizes.width.value,
    () => sizes.height.value,
    () => props.frameInsets,
    () => props.batch,
  ],
  () => {
    frameCamera(seatTurn.angle);
  },
  { immediate: true },
);

watch(() => props.highlightedDie, value => board.highlightDie(value));
watch(() => props.highlightedTokens, value => board.highlightTokens(value));
watch(() => props.highlightedFavor, value => board.highlightFavor(value?.playerId ?? null, value?.favorId ?? null));
const raycaster = new Raycaster();
let pointer: { x: number; y: number; id: number } | undefined;
function pointerDown(event: PointerEvent) {
  if (!props.batch && !props.paused && !seatTurning && event.isPrimary && event.button === 0)
    pointer = { x: event.clientX, y: event.clientY, id: event.pointerId };
}
function pointerUp(event: PointerEvent) {
  const start = pointer;
  pointer = undefined;
  if (
    !start ||
    start.id !== event.pointerId ||
    props.batch ||
    props.paused || seatTurning ||
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
  if (!props.batch) playback?.sync(props.state);
  publishTargets();
  const canvas = renderer.domElement;
  canvas.addEventListener("pointerdown", pointerDown);
  canvas.addEventListener("pointerup", pointerUp);
  canvas.addEventListener("pointercancel", pointerCancel);
});
function dispose() {
  compositionTween?.kill();
  if (sceneClosed) return;
  sceneClosed = true;
  seatTurn.dispose();
  void playback?.stop();
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
    color="#d5e3e4"
    ground-color="#333c30"
    :intensity="1.05"
  />
  <TresDirectionalLight
    color="#ffdeb0"
    :position="keyPosition"
    :intensity="2.65"
    cast-shadow
    :shadow-mapSize="shadowSize"
    :shadow-camera-left="-16"
    :shadow-camera-right="16"
    :shadow-camera-top="13"
    :shadow-camera-bottom="-13"
    :shadow-camera-near="0.5"
    :shadow-camera-far="45"
    :shadow-radius="5"
    :shadow-normalBias="0.025"
    :shadow-bias="-0.0001"
  />
  <TresDirectionalLight
    color="#b6d1e2"
    :position="fillPosition"
    :intensity="0.7"
  />
  <TresDirectionalLight
    color="#f3e4c9"
    :position="frontPosition"
    :intensity="0.35"
  />
  <primitive :object="board.object" :dispose="null" />
</template>
