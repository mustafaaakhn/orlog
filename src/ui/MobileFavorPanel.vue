<script setup lang="ts">
import { t } from '../i18n';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type { FavorId, FavorInput, FavorLevel, GameState, PlayerId } from '../core'
import FavorPicker from './FavorPicker.vue'
import TokenIcon from './TokenIcon.vue'

const props = defineProps<{
  state: GameState
  viewerId: PlayerId
  names: Record<PlayerId, string>
  blocked: boolean
  canChoose: boolean
}>()
const emit = defineEmits<{
  choose: [id: FavorId, level: FavorLevel, input?: FavorInput]
  skip: []
  openChange: [opened: boolean]
}>()
const trigger = ref<HTMLButtonElement | null>(null)
const panel = ref<HTMLDialogElement | null>(null)
const opened = ref(false)
watch(opened, value => emit('openChange', value), { flush: 'sync' })
const ownerId = ref<PlayerId>(props.viewerId)
const selectedId = ref<FavorId | null>(null)
const owner = computed(() => props.state.players[ownerId.value])
const canAct = computed(() => opened.value && props.canChoose && !props.blocked &&
  ownerId.value === props.viewerId && props.state.phase.name === 'favor' &&
  props.state.phase.activePlayerId === props.viewerId)
let media: MediaQueryList | undefined
let outside = false

function open() {
  if (props.blocked || opened.value) return
  ownerId.value = props.viewerId
  selectedId.value = null
  opened.value = true
  panel.value?.showModal()
  const scroll = panel.value?.querySelector<HTMLElement>('.mobile-favor-scroll')
  if (scroll) scroll.scrollTop = 0
}
function close() {
  panel.value?.close()
  opened.value = false
  selectedId.value = null
  void nextTick(() => trigger.value?.focus({ preventScroll: true }))
}
function choose(id: FavorId, level: FavorLevel, input?: FavorInput) {
  if (!canAct.value) return
  close()
  emit('choose', id, level, input)
}
function skip() {
  if (!canAct.value) return
  close()
  emit('skip')
}
function outsidePanel(event: PointerEvent) {
  const box = panel.value!.getBoundingClientRect()
  return event.target === panel.value &&
    (event.clientX < box.left || event.clientX > box.right ||
      event.clientY < box.top || event.clientY > box.bottom)
}
function endPointer(event: PointerEvent) {
  if (outside && outsidePanel(event)) close()
  outside = false
}
function resized() {
  if (!media?.matches && opened.value) close()
}
watch(ownerId, () => { selectedId.value = null })
watch(canAct, () => { selectedId.value = null })
watch([() => props.viewerId, () => props.state.gameId], () => {
  if (opened.value) close()
  ownerId.value = props.viewerId
})
onMounted(() => {
  media = window.matchMedia('(max-width: 600px), (max-height: 500px) and (orientation: landscape)')
  media.addEventListener('change', resized)
})
onUnmounted(() => {
  emit('openChange', false)
  media?.removeEventListener('change', resized)
  panel.value?.close()
})
</script>

<template>
  <button ref="trigger" class="mobile-favor-trigger secondary-action" :disabled="blocked"
    aria-haspopup="dialog" aria-controls="mobile-favor-panel" :aria-expanded="opened" @click="open">
    {{ t("Tanrı gücü") }}
  </button>
  <dialog ref="panel" id="mobile-favor-panel" class="mobile-favor-panel" aria-modal="true"
    aria-labelledby="mobile-favor-title" @cancel.prevent="close"
    @pointerdown="outside = outsidePanel($event)" @pointerup="endPointer" @pointercancel="outside = false">
    <header class="mobile-favor-heading">
      <h2 id="mobile-favor-title">{{ t("Tanrı gücü") }}</h2>
      <button type="button" autofocus @click="close">{{ t("Kapat") }}</button>
    </header>
    <div class="mobile-favor-scroll">
      <div class="mobile-favor-sides" role="group" :aria-label="t('İncelenen tanrılar')">
        <button v-for="id in [viewerId, viewerId === 'player-1' ? 'player-2' : 'player-1'] as const"
          :key="id" :aria-pressed="ownerId === id" @click="ownerId = id">
          {{ t(id === viewerId ? 'Senin tanrıların' : 'Rakibin tanrıları') }}
        </button>
      </div>
      <p class="mobile-favor-owner">{{ names[ownerId] }}</p>
      <p class="mobile-favor-balance"><TokenIcon /> {{ t("Mevcut jeton:") }} <strong>{{ t(owner.tokens) }}</strong></p>
      <p class="mobile-favor-help">{{ t(canAct
        ? 'Seviye ve gerekiyorsa hedef seç; Gücü onayla ile kesinleştir. Bedel, gücün sırası geldiğinde ödenir.'
        : 'Tanrıları inceliyorsun. Güç seçimi yalnız kendi tanrı gücü sıranda yapılabilir.') }}</p>
      <div class="mobile-favor-list">
        <FavorPicker v-for="id in owner.favors" :key="`${ownerId}/${id}`" :favor-id="id"
          :state="state" :player="owner" :disabled="!canAct" :preview="!canAct"
          :active="selectedId === id" @select="selectedId = id" @choose="choose" />
      </div>
    </div>
    <footer v-if="canAct" class="mobile-favor-footer">
      <button class="secondary-action" @click="skip">{{ t("Güç kullanmadan devam et") }}</button>
    </footer>
  </dialog>
</template>

<style>
.in-match .mobile-favor-trigger { display: none; }
.mobile-favor-panel {
  position: fixed;
  inset: auto 0 0;
  margin: 0 auto;
  width: min(640px, 100%);
  max-width: 100%;
  max-height: calc(100dvh - max(12px, env(safe-area-inset-top, 0px)));
  padding: 0;
  border: 1px solid #5c5847;
  border-bottom: 0;
  border-radius: 18px 18px 0 0;
  background: #1c2921;
  color: #f5ebd8;
  color-scheme: dark;
  box-shadow: 0 -12px 48px #0d171080;
  overflow: hidden;
  pointer-events: auto;
  text-align: left;
}
.mobile-favor-panel[open] { display: flex; flex-direction: column; }
.mobile-favor-panel::backdrop { background: #0e1913b8; }
.mobile-favor-heading {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px max(16px, env(safe-area-inset-right, 0px)) 12px max(16px, env(safe-area-inset-left, 0px));
  border-bottom: 1px solid #5c5847;
  flex: 0 0 auto;
}
.mobile-favor-heading h2 { margin: 0; font-size: 20px; }
.mobile-favor-heading button { min-width: 72px; min-height: 44px; background: #303b2e; color: inherit; }
.mobile-favor-scroll {
  overflow-y: auto; overscroll-behavior: contain; min-height: 0;
  padding: 16px max(16px, env(safe-area-inset-right, 0px)) max(16px, env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px));
}
.mobile-favor-sides { display: flex; gap: 8px; }
.mobile-favor-sides button { flex: 1; min-width: 0; min-height: 44px; padding: 8px; font-size: 12px; background: #111b15; color: inherit; border: 1px solid #5c5847; }
.mobile-favor-sides [aria-pressed="true"] { background: #334534; border-color: #d3b176; }
.mobile-favor-owner { margin: 16px 0 8px; overflow-wrap: anywhere; font-size: 14px; }
.mobile-favor-balance { display: flex; gap: 8px; align-items: center; font-size: 14px; }
.mobile-favor-balance svg { width: 22px; height: 22px; flex-shrink: 0; }
.mobile-favor-help { margin: 12px 0 16px; font-size: 12px; line-height: 1.65; color: #c6bca7; }
.mobile-favor-list { display: grid; gap: 20px; }
.mobile-favor-list .favor-picker { padding: 16px 0 0; border-top: 1px solid #5c5847; }
.mobile-favor-list .favor-card-heading { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.mobile-favor-list .favor-card-heading > .favor-portrait { display: inline-block; width: 48px; height: 48px; flex-shrink: 0; }
.mobile-favor-list .favor-card-heading h3 { font-size: 16px; margin: 0 0 6px; overflow-wrap: anywhere; }
.mobile-favor-list .favor-card-heading p { margin: 0; font-size: 11px; }
.mobile-favor-list .favor-tier {
  display: grid; grid-template-columns: 52px minmax(0, 1fr); gap: 8px; align-items: center;
  width: 100%; min-height: 64px; margin-top: 8px; padding: 10px;
  text-align: left; color: inherit; background: #111b15; border: 1px solid #5c5847; border-radius: 6px;
  font-size: 14px; line-height: 1.6;
}
.mobile-favor-list .favor-tier[aria-pressed="true"] { background: #334534; border-color: #d3b176; outline: 1px solid #d3b176; }
.mobile-favor-list .tier-cost { float: none; display: flex; align-items: center; gap: 5px; font-size: 18px; color: #d3b176; }
.mobile-favor-list .tier-label { display: block; margin-top: 4px; font-size: 11px; color: #c6bca7; }
.mobile-favor-list .favor-targets { margin: 16px 0 0; padding: 12px 0 0; border: 0; border-top: 1px solid #5c5847; }
.mobile-favor-list .favor-targets legend, .mobile-favor-list .favor-targets p, .mobile-favor-list .favor-targets label { font-size: 12px; line-height: 1.6; }
.mobile-favor-list .target-dice { display: flex; flex-wrap: wrap; gap: 8px; }
.mobile-favor-list .target-dice p { flex-basis: 100%; }
.mobile-favor-list .target-dice label { min-height: 44px; padding: 8px; background: #111b15; border: 1px solid #5c5847; border-radius: 4px; }
.mobile-favor-list .target-dice input { width: 20px; height: 20px; flex-shrink: 0; }
.mobile-favor-list .favor-targets input[type="number"], .mobile-favor-list .favor-targets select { min-height: 44px; max-width: 100%; }
.mobile-favor-list .primary-action { width: 100%; min-height: 44px; font-size: 14px; }
.mobile-favor-footer { padding: 10px 16px max(12px, env(safe-area-inset-bottom, 0px)); border-top: 1px solid #5c5847; flex: 0 0 auto; }
.mobile-favor-footer button { width: 100%; min-height: 44px; font-size: 12px; }
@media (max-width: 600px), (max-height: 500px) and (orientation: landscape) {
  .in-match .mobile-favor-trigger { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 10px 16px; border: 1px solid #8e8061; background: #1c2921; color: #f5ebd8; }
  .in-match .desktop-favor-action { display: none; }
}
</style>
