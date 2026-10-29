<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import UiIcon from "./UiIcon.vue";

const props = defineProps<{
  reduced: boolean;
  paused: boolean;
  muted: boolean;
  volume: number;
}>();
const emit = defineEmits<{
  active: [value: boolean];
  enter: [];
  complete: [];
}>();
type Phase = "idle" | "loading" | "playing" | "revealing";
const phase = ref<Phase>("idle");
const video = ref<HTMLVideoElement | null>(null);
const skipButton = ref<HTMLButtonElement | null>(null);
const posterFailed = ref(false);
let disposed = false;
let entered = false;
let completed = false;
let waitingTimer: ReturnType<typeof setTimeout> | undefined;
let revealTimer: ReturnType<typeof setTimeout> | undefined;

function clearWaiting() {
  clearTimeout(waitingTimer);
  waitingTimer = undefined;
}
function guardWaiting() {
  clearWaiting();
  if (!props.paused && phase.value !== "idle" && phase.value !== "revealing") {
    waitingTimer = setTimeout(() => reveal(false), 15000);
  }
}
function complete() {
  if (completed || disposed) return;
  completed = true;
  clearWaiting();
  clearTimeout(revealTimer);
  emit("complete");
}
function reveal(animate = true) {
  if (entered || disposed) return;
  entered = true;
  clearWaiting();
  video.value?.pause();
  phase.value = "revealing";
  emit("enter");
  if (!animate || props.reduced) complete();
  else revealTimer = setTimeout(complete, 650);
}
function onTransitionEnd(event: TransitionEvent) {
  if (phase.value === "revealing" && event.target === event.currentTarget && event.propertyName === "opacity") complete();
}
async function play() {
  if (disposed || entered || props.paused || !video.value) return;
  video.value.muted = props.muted;
  video.value.volume = Math.max(0, Math.min(1, props.volume));
  guardWaiting();
  try {
    await video.value.play();
  } catch {
    if (!disposed && !entered && !props.paused) reveal(false);
  }
}
async function start() {
  if (phase.value !== "idle") return;
  if (props.reduced) {
    reveal(false);
    return;
  }
  phase.value = "loading";
  emit("active", true);
  await nextTick();
  if (disposed) return;
  skipButton.value?.focus({ preventScroll: true });
  await play();
}
function onPlaying() {
  if (entered || disposed) return;
  if (props.paused) {
    video.value?.pause();
    return;
  }
  phase.value = "playing";
  guardWaiting();
}
watch(() => props.paused, (paused) => {
  if (phase.value === "idle" || phase.value === "revealing") return;
  if (paused) {
    clearWaiting();
    video.value?.pause();
  } else void play();
});
watch(() => props.reduced, (reduced) => {
  if (!reduced || phase.value === "idle") return;
  if (entered) complete();
  else reveal(false);
});
watch(() => [props.muted, props.volume] as const, ([muted, volume]) => {
  if (video.value) {
    video.value.muted = muted;
    video.value.volume = Math.max(0, Math.min(1, volume));
  }
});
onBeforeUnmount(() => {
  disposed = true;
  clearWaiting();
  clearTimeout(revealTimer);
  if (video.value) {
    video.value.pause();
    video.value.removeAttribute("src");
    video.value.load();
  }
});
</script>

<template>
  <section
    class="welcome-intro"
    :class="[`is-${phase}`, { 'poster-unavailable': posterFailed }]"
    aria-labelledby="welcome-title"
    @keydown.esc.prevent="phase !== 'idle' && reveal(false)"
    @transitionend="onTransitionEnd"
  >
    <h1 id="welcome-title" class="sr-only">Orlog</h1>
    <img
      v-if="!posterFailed"
      class="intro-poster"
      src="/assets/art/welcome-orlog-intro-2k.webp"
      width="2688" height="1536"
      fetchpriority="high" decoding="async"
      alt="Eivor ve sarışın Viking kadını, bahar fiyordunun kıyısında karşılıklı Orlog oynuyor."
      @error="posterFailed = true"
    />
    <video
      v-if="phase !== 'idle'"
      ref="video"
      class="intro-video"
      :class="{ 'is-visible': phase === 'playing' || phase === 'revealing' }"
      src="/assets/video/orlog-intro-2k.mp4"
      poster="/assets/art/welcome-orlog-intro-2k.webp"
      preload="auto" playsinline disablepictureinpicture
      :muted="muted"
      aria-hidden="true" tabindex="-1"
      @playing="onPlaying"
      @timeupdate="guardWaiting"
      @waiting="guardWaiting"
      @ended="reveal()"
      @error="reveal(false)"
    />
    <button
      v-if="phase === 'idle' || phase === 'loading'"
      class="welcome-play intro-start"
      :disabled="phase === 'loading'"
      @click="start"
    >
      <span>{{ phase === 'loading' ? 'Sahne açılıyor…' : 'Oyuna Başla' }}</span>
      <UiIcon v-if="phase === 'idle'" name="arrow" />
    </button>
    <button
      v-if="phase === 'loading' || phase === 'playing'"
      ref="skipButton"
      class="intro-skip"
      @click="reveal(false)"
    >Girişi geç <UiIcon name="arrow" /></button>
    <p class="sr-only" role="status" aria-live="polite">
      {{ phase === 'loading' ? 'Oyun girişi yükleniyor.' : phase === 'playing' ? 'Zarlar atılıyor. Girişi geçebilir veya Escape tuşuna basabilirsin.' : '' }}
    </p>
  </section>
</template>

<style scoped>
.welcome-intro {
  position: absolute;
  inset: 0;
  z-index: 1;
  isolation: isolate;
  overflow: hidden;
  background: #21160f;
}
.intro-poster,
.intro-video {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}
.intro-video { opacity: 0; }
.intro-video.is-visible { opacity: 1; }
.intro-start {
  position: absolute;
  left: 50%;
  top: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 22px;
  min-width: 300px;
  min-height: 72px;
  width: auto;
  height: auto;
  padding: 20px 30px;
  transform: translate(-50%, -50%);
  border: 1px solid #d3b176;
  border-radius: 4px;
  background: #302016;
  color: #fff1ce;
  font: 500 clamp(20px, 1.65vw, 28px)/1.25 var(--display);
  letter-spacing: 0.1em;
  text-indent: 0;
  text-shadow: none;
  text-transform: none;
  transition: background-color 180ms ease-out, color 180ms ease-out;
}
.intro-start::before,
.intro-start::after { content: none; }
.intro-start:hover { background: #4b3220; color: #fff8e8; }
.intro-start:active { background: #21160f; }
.intro-start:focus-visible { outline: 2px solid #fff1ce; outline-offset: 6px; }
.intro-start:disabled { opacity: 1; cursor: wait; }
.intro-start svg { width: 23px; height: 23px; flex: 0 0 auto; }
.intro-skip {
  position: absolute;
  right: 3.3%;
  bottom: 28px;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 10px 16px;
  border: 1px solid #d3b17680;
  border-radius: 4px;
  background: #302016;
  color: #fff1ce;
  font: 400 15px/1.3 "Source Sans 3", sans-serif;
  cursor: pointer;
}
.intro-skip svg { width: 18px; height: 18px; }
.intro-skip:hover { background: #4b3220; }
.intro-skip:focus-visible { outline: 2px solid #fff1ce; outline-offset: 4px; }
.is-loading,
.is-playing,
.is-revealing { z-index: 6; }
.is-revealing {
  opacity: 0;
  pointer-events: none;
  transition: opacity 550ms cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
