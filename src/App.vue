<script setup lang="ts">
import { t, LANGUAGES, locale, setLocale } from './i18n';
import {
  computed,
  defineAsyncComponent,
  ref,
  watch,
  nextTick,
  onMounted,
  onUnmounted,
} from "vue";
import { usePreferences } from "./app/preferences";
import { createAudioPlayer } from "./audio/player";
import ExperienceSettings from "./ui/ExperienceSettings.vue";
import GameGuide from "./ui/GameGuide.vue";
import GameMark from "./ui/GameMark.vue";
import UiIcon from "./ui/UiIcon.vue";
import SceneLoaderState from "./ui/SceneLoaderState.vue";
import MatchSetup from "./ui/MatchSetup.vue";
import MatchResult from "./ui/MatchResult.vue";
import MatchResources from "./ui/MatchResources.vue";
import MatchTurnIndicator from "./ui/MatchTurnIndicator.vue";
import MobileFavorPanel from "./ui/MobileFavorPanel.vue";
import { eventText } from "./presentation/eventText";
import type {
  GameOptions,
  PlayerId,
  FavorId,
  FavorLevel,
  FavorInput,
} from "./core";
import { createRollSession } from "./app/rollSession";
import { createDiceSelectionDraft } from './app/diceSelectionDraft';
import { createComputerDriver } from "./app/computerDriver";
import type { OpponentOptions } from "./ai/computer";
import { createOnlineClient } from "./network/client";
import type { MatchUpdate } from "./network/protocol";
import type { RematchSetup } from './app/rematchSetup';

const TablePreview = defineAsyncComponent({
  loader: () => import("./scene/TablePreview.vue"),
  loadingComponent: SceneLoaderState,
  errorComponent: SceneLoaderState,
  delay: 0,
  timeout: 30000,
});
const preparing = ref(true);
const rematchSetup = ref<RematchSetup | null>(null);
const setupScreen = ref("welcome");
const introActive = ref(false);
const languagePicker = ref<HTMLElement | null>(null);
const aboutPanel = ref<HTMLElement | null>(null);
const overlay = ref<"rules" | "settings" | "menu" | null>(null);
watch([introActive, setupScreen, overlay], () => {
  for (const panel of [languagePicker.value, aboutPanel.value]) {
    if (panel?.matches(":popover-open")) panel.hidePopover();
  }
});
const dialog = ref<HTMLDialogElement | null>(null);
const localViewer = ref<PlayerId>("player-1");
const viewerId = computed(() =>
  online.identity.value?.playerId ?? (opponent.value.mode === "computer" ? "player-1" : localViewer.value),
);
watch(overlay, async (value) => {
  await nextTick();
  if (value) dialog.value?.showModal();
  else dialog.value?.close();
});
const { settings, system } = usePreferences();
const reduced = computed(
  () =>
    settings.motion === "reduce" ||
    (settings.motion === "system" && system.reduced),
);
const speed = computed(() => (settings.fast ? 4 : 1));
const audioFailed = ref(false);
const audio = createAudioPlayer((failed) => {
  audioFailed.value = failed;
});
watch(setupScreen, (_screen, previous) => {
  if (previous === "coin") audio.stopEffects();
});
const pageHidden = ref(document.hidden);
const paused = ref(document.hidden || !document.hasFocus());
watch(settings, (value) => audio.configure(value), { immediate: true });
const unlockAudio = () => audio.unlock();
const visibility = () => {
  pageHidden.value = document.hidden;
  paused.value = document.hidden || !document.hasFocus();
  audio.visibility(document.hidden);
};
onMounted(() => {
  online.restore();
  audio.visibility(document.hidden);
  audio.unlock();
  document.addEventListener("pointerdown", unlockAudio, { capture: true });
  document.addEventListener("keydown", unlockAudio, { capture: true });
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener('blur', visibility);
  window.addEventListener('focus', visibility);
});
onUnmounted(() => {
  online.dispose();
  document.removeEventListener("pointerdown", unlockAudio, { capture: true });
  document.removeEventListener("keydown", unlockAudio, { capture: true });
  document.removeEventListener("visibilitychange", visibility);
  window.removeEventListener('blur', visibility);
  window.removeEventListener('focus', visibility);
  audio.dispose();
});
const names = ref<Record<PlayerId, string>>({
  "player-1": t("Oyuncu I"),
  "player-2": t("Oyuncu II"),
});
const opponent = ref<OpponentOptions>({
  mode: "computer",
  difficulty: "normal",
});
function start(
  options: GameOptions,
  playerNames: Record<PlayerId, string>,
  opponentOptions: OpponentOptions,
) {
  if (session.start(options)) {
    rematchSetup.value = null;
    audio.stopEffects();
    pendingStartSound.value = true;
    localViewer.value = options.firstPlayerId ?? "player-1";
    names.value = playerNames;
    opponent.value = opponentOptions;
    preparing.value = false;
    void nextTick(focusAction);
  }
}
const sceneGeneration = ref(0);
function restart() {
  rematchSetup.value = null;
  if (online.identity.value) void online.leave();
  pendingStartSound.value = false;
  audio.stopEffects();
  session.recover();
  session.restart();
  sceneGeneration.value++;
  sceneReady.value = false;
  preparing.value = true;
  setupScreen.value = "welcome";
  overlay.value = null;
  void nextTick(() => document.querySelector<HTMLElement>(".welcome-play")?.focus());
}
async function rematch() {
  if (phase.value.name !== 'ended' || pending.value) return;
  if (online.identity.value) {
    await online.rematch(state.value.gameId);
    return;
  }
  const preparation = session.prepareRematch();
  if (!preparation) return;
  audio.stopEffects();
  rematchSetup.value = { ...preparation, names: { ...names.value }, opponent: { ...opponent.value } };
  resultOpen.value = false;
  sceneReady.value = false;
  overlay.value = null;
  setupScreen.value = 'gods';
  preparing.value = true;
}
function cancelRematch() {
  rematchSetup.value = null;
  preparing.value = false;
  resultOpen.value = true;
  sceneReady.value = false;
  sceneGeneration.value++;
}
const sceneReady = ref(false);
const turningSeat = ref(false);
const pendingStartSound = ref(false);
const session = createRollSession();
const online = createOnlineClient({
  snapshot(match: MatchUpdate) {
    const newMatch = preparing.value || state.value.gameId !== match.state.gameId;
    session.startRemote(match.state, {
      dispatch: (command, revision) => online.command(command, revision, match.state.gameId),
      dispatchAsync: (command, revision) => online.commandAsync(command, revision, match.state.gameId),
      settled: (revision) => online.presented(revision, match.state.gameId),
    });
    for (const player of online.room.value?.players ?? []) names.value[player.id] = player.name;
    opponent.value = { mode: "local", difficulty: "normal" };
    if (newMatch) pendingStartSound.value = true;
    sceneReady.value = false;
    sceneGeneration.value++;
    preparing.value = false;
  },
  batch: match => session.receive(match.state, match.events),
  closed() {
    if (!preparing.value) restart();
  },
});
const onlineRoom = online.room;
const onlineError = online.error;
watch(() => onlineRoom.value?.stage, stage => {
  if (stage === 'gods' && !preparing.value) {
    rematchSetup.value = null;
    resultOpen.value = false;
    sceneReady.value = false;
    setupScreen.value = 'gods';
    preparing.value = true;
  }
});
const passivePresentation = computed(() => paused.value || (!!onlineRoom.value && !!overlay.value));
watch(passivePresentation, (passive) => {
  online.visibility(!passive);
  session.setBackground(passive);
}, { immediate: true, flush: 'sync' });
const { state, pending, error, lastEvent } = session;
const phase = computed(() => state.value.phase);
const resultAvailable = computed(() => !preparing.value && phase.value.name === 'ended' && !pending.value);
const resultOpen = ref(false);
let announcedResult: string | null = null;
watch([resultAvailable, () => state.value.gameId], ([available, gameId]) => {
  if (available && announcedResult !== gameId) {
    announcedResult = gameId;
    const ended = session.history.value.findLast(event => event.type === 'GameEnded');
    if (ended?.type === 'GameEnded') {
      const listener = online.identity.value?.playerId ?? (opponent.value.mode === 'computer' ? 'player-1' : null);
      audio.result(ended, listener);
    }
    resultOpen.value = true;
  } else if (phase.value.name !== 'ended') resultOpen.value = false;
});
const activePlayer = computed(() =>
  phase.value.name === "roll" || phase.value.name === "favor"
    ? state.value.players[phase.value.activePlayerId]
    : null,
);
const busy = computed(() => turningSeat.value || !!pending.value || (!sceneReady.value && !paused.value) ||
  (!!onlineRoom.value && (online.busy.value || onlineRoom.value.waiting || !online.bothConnected.value)));
watch([activePlayer, opponent], ([player, options]) => {
  if (!onlineRoom.value && options.mode === "local" && player) localViewer.value = player.id;
});
const computerTurn = computed(
  () =>
    !preparing.value &&
    opponent.value.mode === "computer" &&
    activePlayer.value?.id === "player-2",
);
const humanTurn = computed(() => !computerTurn.value &&
  (!onlineRoom.value || activePlayer.value?.id === online.identity.value?.playerId));
const networkStatus = computed(() => {
  if (!onlineRoom.value) return "";
  if (!online.connected.value) return "Odaya yeniden bağlanılıyor…";
  if (!online.bothConnected.value) return "Arkadaşının bağlantısı bekleniyor. Maç iki dakika boyunca korunur.";
  if (onlineRoom.value.waiting && !pending.value) return "Arkadaşının masası hazırlanıyor…";
  if (!humanTurn.value && activePlayer.value) return `${names.value[activePlayer.value.id]} oynuyor…`;
  return "";
});
const driver = createComputerDriver((command) => session.dispatch(command));
watch(
  [state, pending, preparing, sceneReady, paused, opponent, overlay, turningSeat],
  () => {
    driver.update({
      state: state.value,
      playerId: opponent.value.mode === "computer" ? "player-2" : null,
      difficulty: opponent.value.difficulty,
      blocked: preparing.value || busy.value || (!paused.value && !!overlay.value),
    });
  },
  { immediate: true, flush: "sync" },
);
onUnmounted(() => driver.dispose());
const mobileMedia = window.matchMedia('(max-width: 600px), (max-height: 500px) and (orientation: landscape)');
const mobileSelection = ref(mobileMedia.matches);
const updateMobileSelection = () => { mobileSelection.value = mobileMedia.matches; };
mobileMedia.addEventListener('change', updateMobileSelection);
const favorPanelOpen = ref(false);
const selectionInterrupted = computed(() => !mobileSelection.value || preparing.value || paused.value ||
  pageHidden.value || !!overlay.value || favorPanelOpen.value || !sceneReady.value || !humanTurn.value ||
  (!!onlineRoom.value && !online.bothConnected.value));
const selectionDraft = createDiceSelectionDraft(() => ({
  state: state.value,
  enabled: !selectionInterrupted.value && !busy.value,
  interrupted: selectionInterrupted.value,
}), command => session.dispatchAsync(command));
const draftSelectedIds = selectionDraft.selectedIds;
const canConfirmSelection = computed(() => humanTurn.value && !preparing.value && !paused.value &&
  !overlay.value && !favorPanelOpen.value && sceneReady.value && phase.value.name === 'roll' &&
  phase.value.step === 'selecting-dice' && (activePlayer.value?.rollsUsed ?? 3) < 3 &&
  !selectionDraft.confirming.value && (!busy.value || (mobileSelection.value && selectionDraft.applying.value)));
onUnmounted(() => {
  mobileMedia.removeEventListener('change', updateMobileSelection);
  selectionDraft.dispose();
});
function selectDie(dieId: Parameters<typeof session.select>[0]) {
  if (busy.value || !humanTurn.value || preparing.value || paused.value || overlay.value || favorPanelOpen.value) return;
  if (mobileSelection.value) selectionDraft.toggle(dieId);
  else session.select(dieId);
}
const instruction = computed(() => {
  if (networkStatus.value) return networkStatus.value;
  if (pending.value?.events.some((event) => event.type === "DiceRolled"))
    return "Zarlar kâsede yatışıyor…";
  if (pending.value)
    return eventText(lastEvent.value) || "Olaylar masada çözülüyor…";
  if (computerTurn.value)
    return "Bilgisayar düşünüyor…";
  if (phase.value.name === "ended")
    return `${names.value[phase.value.winnerId]} kazandı. Yeni bir maç için yeniden başlat.`;
  if (phase.value.name === "round-complete")
    return "Zarlar toplanıyor. Sonraki tur otomatik başlayacak.";
  if (phase.value.name === "resolution")
    return "İki güç kararı tamamlandı. Savaş otomatik başlıyor.";
  if (phase.value.name === "favor")
    return `${names.value[phase.value.activePlayerId]} masadaki bir tanrıyı seçebilir veya Devam et ile geçebilir.`;
  if (phase.value.step === "awaiting-roll")
    return "Kendi haznendeki zarları at.";
  if (activePlayer.value?.rollsUsed === 3)
    return "Son atışın zarları saklandı; sıra otomatik ilerliyor.";
  if (mobileSelection.value)
    return "Saklayacağın zarları seç; son değişiklikten 2 saniye sonra birlikte taşınır. Geri almak için tekrar dokun.";
  return "Saklayacağın zarlara dokun; merkezden geri almak için tekrar dokun.";
});
function focusAction() {
  const panel = document.querySelector(".match-screen");
  const action =
    panel?.querySelector<HTMLElement>(
      ".primary-action:not(:disabled), .favor-picker button:not(:disabled)",
    ) ?? panel?.querySelector<HTMLElement>(".restart-action:not(:disabled)");
  action?.focus({ preventScroll: true });
}
watch(turningSeat, async (turning, previous) => {
  if (!turning && previous && !paused.value && !overlay.value && !preparing.value) {
    await nextTick();
    focusAction();
  }
});
let previousFocus: HTMLElement | null = null;
watch(
  pending,
  async (value, old) => {
    if (value) {
      const element = document.activeElement as HTMLElement | null;
      previousFocus = element?.closest(".match-screen, .scene-die-controls, .scene-favor-controls, .table-favor-menu")
        ? element
        : null;
    } else if (old) {
      await nextTick();
      const current = document.activeElement;
      if (
        previousFocus &&
        (current === document.body || current === previousFocus)
      ) {
        if (previousFocus.isConnected && !previousFocus.matches(":disabled"))
          previousFocus.focus({ preventScroll: true });
        else focusAction();
      }
      previousFocus = null;
    }
  },
  { flush: "sync" },
);
function choose(favorId: FavorId, level: FavorLevel, input?: FavorInput) {
  if (!busy.value && humanTurn.value && phase.value.name === "favor")
    session.dispatch({
      type: "ChooseFavor",
      playerId: phase.value.activePlayerId,
      favorId,
      level,
      input,
    });
}
function skip() {
  if (!busy.value && humanTurn.value && phase.value.name === "favor")
    session.dispatch({
      type: "SkipFavor",
      playerId: phase.value.activePlayerId,
    });
}
function availability(ready: boolean) {
  if (ready) session.resume();
  sceneReady.value = ready;
  if (ready && pendingStartSound.value && !preparing.value) {
    pendingStartSound.value = false;
    audio.gameStart();
    void nextTick(focusAction);
  }
  if (!ready) {
    turningSeat.value = false;
    audio.stopEffects();
    session.recover();
  }
}
watch([state, pending, sceneReady, paused, preparing, overlay, turningSeat], () => {
  if (!preparing.value && !busy.value && (paused.value || !overlay.value)) {
    session.finishLastRoll();
    session.resolveReady();
    session.advanceRound();
  }
});
function roll() {
  if (!busy.value && humanTurn.value && !paused.value && !overlay.value && !favorPanelOpen.value &&
    phase.value.name === "roll" && phase.value.step === "awaiting-roll")
    session.dispatch({
      type: "RollDice",
      playerId: phase.value.activePlayerId,
    });
}
function confirm() {
  if (!canConfirmSelection.value || phase.value.name !== 'roll') return;
  if (mobileSelection.value) void selectionDraft.confirm();
  else session.dispatch({ type: 'ConfirmRoll', playerId: phase.value.activePlayerId });
}
</script>

<template>
  <main
    class="experience"
    :class="{
      'in-match': !preparing,
      'at-welcome': preparing && setupScreen === 'welcome',
      'at-mode': preparing && setupScreen === 'mode',
      'at-preparation': preparing && (setupScreen === 'gods' || setupScreen === 'coin'),
      'is-intro-active': introActive,
    }"
    :data-reduced-motion="reduced"
    :data-page-hidden="pageHidden"
  >
    <a v-if="!preparing" class="skip-link" href="#match-controls"
      >{{ t("Oyun kontrollerine geç") }}</a
    >
    <header class="masthead" :inert="introActive" :aria-hidden="introActive || undefined">
      <a
        class="wordmark"
        href="./"
        :aria-label="t('Orlog ana sayfa')"
        @click="
          (event) => {
            if (!preparing) {
              event.preventDefault();
              overlay = 'menu';
            }
          }
        "
        ><GameMark />{{ t("ORLOG") }}</a
      >
      <span class="edition">{{ t("Kuzeyin zar oyunu") }}</span>
      <nav class="header-tools entry-tools" :aria-label="t('Yardımcı alanlar')">
        <button class="icon-button entry-tool" :aria-label="t('Dil seçimi')" :title="t('Dil seçimi')" popovertarget="language-picker">
          <UiIcon name="translate" />
        </button>
        <button class="icon-button entry-tool" :aria-label="t('Ayarlar')" :title="t('Ayarlar')" @click="overlay = 'settings'">
          <UiIcon name="settings" />
        </button>
        <button class="icon-button entry-tool" :aria-label="t('Oyun rehberi')" :title="t('Oyun rehberi')" @click="overlay = 'rules'">
          <UiIcon name="book" />
        </button>
        <button class="icon-button entry-tool" :aria-label="t('Proje hakkında')" :title="t('Proje hakkında')" popovertarget="about-panel">
          <UiIcon name="info" />
        </button>
        <section id="about-panel" ref="aboutPanel" class="about-panel" popover aria-labelledby="about-title">
          <h2 id="about-title">{{ t("Proje hakkında") }}</h2>
          <p>{{ t("Bu oyun, Assassin’s Creed Valhalla’daki Orlog’dan esinlenen bağımsız bir fan yapımıdır. Resmî bir Ubisoft oyunu değildir; Ubisoft ile bağlantısı yoktur.") }}</p>
          <p class="about-contact"><a href="https://github.com/mustafaaakhn/orlog" target="_blank" rel="noopener noreferrer">{{ t("GitHub") }}</a></p>
          <p class="about-contact"><a href="mailto:contact@orlog.games" target="_blank" rel="noopener noreferrer">{{ t("İletişim") }}</a></p>
        </section>
        <div id="language-picker" ref="languagePicker" class="language-picker" popover>
          <h2>{{ t("Dil seçimi") }}</h2>
          <button v-for="language in LANGUAGES" :key="language.code" class="language-option"
            :aria-pressed="locale === language.code" :lang="language.code" translate="no"
            popovertarget="language-picker" popovertargetaction="hide" @click="setLocale(language.code)">
            {{ language.name }} <UiIcon v-if="locale === language.code" name="check" />
          </button>
        </div>
        <button v-if="!preparing" class="icon-button entry-tool" :aria-label="t('Oyundan çık')" :title="t('Oyundan çık')" @click="overlay = 'menu'">
          <UiIcon name="exit" />
        </button>
      </nav>
    </header>
    <div
      v-if="!preparing"
      class="scene-layer"
      :aria-hidden="preparing"
      :inert="preparing"
    >
      <TablePreview
        :key="sceneGeneration"
        :audio="audio"
        :reduced="reduced"
        :paused="paused || !!overlay"
        :background="passivePresentation"
        :quality="settings.quality"
        :speed="speed"
        :state="state"
        :draft-selected-ids="draftSelectedIds"
        :batch="pending"
        :blocked="busy || favorPanelOpen"
        :viewer-id="viewerId"
        :control-player="
          !preparing && humanTurn && phase.name === 'roll'
            ? phase.activePlayerId
            : null
        "
        @availability="availability"
        @presented="session.present"
        @progress="session.progress"
        @settled="session.settle($event)"
        @seat-turn="turningSeat = $event !== null"
        :favor-player="!preparing && humanTurn && !busy && phase.name === 'favor' ? phase.activePlayerId : null"
        @choose="choose"
        @select="selectDie"
      />
    </div>
    <MatchSetup
      v-if="preparing"
      :reduced="reduced"
      :paused="paused || !!overlay"
      :muted="settings.muted"
      :volume="settings.effects"
      :online="online"
      :rematch="rematchSetup ?? undefined"
      @cancel-rematch="cancelRematch"
      @start="start"
      @toss="audio.coinFlip()"
      @screen="setupScreen = $event"
      @cinematic="introActive = $event"
    />
    <section v-else class="match-screen" :aria-label="t('Orlog oyun masası')">
      <div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
        <p v-for="player in state.players" :key="player.id">
          {{ names[player.id] }}: {{ t(player.health) }} {{ t("can,") }} {{ t(player.tokens) }} {{ t("jeton.") }}
          {{ t(player.id === viewerId ? 'Senin tarafın.' : 'Karşı taraf.') }}
        </p>
        <p>{{ t(instruction) }}</p>
      </div>
      <MatchTurnIndicator :state="state" :names="names" :human-turn="humanTurn" :busy="busy" />
      <p v-if="networkStatus" class="network-status" role="status">{{ t(networkStatus) }}</p>
      <MatchResources :state="state" :names="names" :viewer-id="viewerId">
        <section
          id="match-controls"
          tabindex="-1"
          class="match-actions"
          :aria-label="t('Oyun kontrolleri')"
        >
          <MobileFavorPanel
            :state="state" :viewer-id="viewerId" :names="names"
            :blocked="busy || paused || !!overlay"
            :can-choose="!busy && humanTurn && phase.name === 'favor' && phase.activePlayerId === viewerId"
            @choose="choose" @skip="skip" @open-change="favorPanelOpen = $event"
          />
          <template v-if="humanTurn && phase.name === 'roll'">
            <button v-if="!busy && phase.step === 'awaiting-roll'" class="primary-action" @click="roll">
              {{ t("Zar at") }} <UiIcon name="arrow" />
            </button>
            <button v-else-if="canConfirmSelection" class="primary-action" @click="confirm">
              {{ t("Seçimi onayla") }} <UiIcon name="check" />
            </button>
          </template>
          <template v-if="!busy && humanTurn && phase.name === 'favor'">
            <p class="favor-prompt desktop-favor-action">{{ t("Bir tanrı seç veya devam et.") }}</p>
            <button class="primary-action desktop-favor-action" @click="skip">{{ t("Devam et") }} <UiIcon name="arrow" /></button>
          </template>
          <template v-if="resultAvailable">
            <button v-if="!resultOpen" class="secondary-action" @click="resultOpen = true">{{ t("Sonucu göster") }}</button>
          </template>
          <p v-if="error" class="field-error" role="alert">{{ t(error) }}</p>
          <p v-if="onlineError" class="field-error" role="alert">{{ t(onlineError) }}</p>
        </section>
      </MatchResources>
    </section>
    <MatchResult v-if="resultAvailable && resultOpen && phase.name === 'ended'"
      :winner="names[phase.winnerId]" :round="state.round"
      :busy="!!onlineRoom && (online.busy.value || onlineRoom.waiting || !online.bothConnected.value)"
      :error="onlineRoom ? onlineError || (!online.bothConnected.value ? 'Yeni oyun için iki oyuncu da bağlı olmalı.' : '') : ''"
      @restart="rematch" @close="resultOpen = false" />
    <dialog
      ref="dialog"
      class="utility-dialog"
      :class="{ 'is-guide': overlay === 'rules' }"
      aria-labelledby="utility-title"
      @close="overlay = null"
      @cancel="overlay = null"
      @click="
        (event) => {
          if (event.target === dialog) overlay = null;
        }
      "
    >
      <div class="dialog-heading">
        <h2 id="utility-title">
          {{ t(overlay === "rules"
              ? "Masaya ilk kez mi oturuyorsun?"
              : overlay === "settings"
                ? "Ses ayarları"
                : "Oyundan çık") }}
        </h2>
        <button
          class="icon-button"
          :aria-label="t('Pencereyi kapat')"
          @click="overlay = null"
        >
          <UiIcon name="close" />
        </button>
      </div>
      <GameGuide v-if="overlay === 'rules'" @close="overlay = null" />
      <ExperienceSettings
        v-if="overlay === 'settings'"
        :settings="settings"
        :audio-failed="audioFailed"
        @retry="audio.unlock()"
      />
      <div v-if="overlay === 'menu'" class="game-menu">
        <p>
          {{ t("Tur") }} {{ t(state.round) }} ·
          {{ t(onlineRoom ? `Çevrim içi · ${onlineRoom.code}` : opponent.mode === "computer"
              ? "Robota karşı"
              : "Aynı cihazda iki kişi") }}
        </p>
        <button class="primary-action" @click="overlay = null">
          {{ t("Oyuna dön") }} <UiIcon name="arrow" /></button
        ><button class="secondary-action" @click="restart">
          {{ t("Ana menüye dön") }}
        </button>
      </div>
    </dialog>
  </main>
</template>
<style>
@import "./ui/styles.css";
@import "./ui/mode-selection.css";
@import "./ui/entry-tools.css";
@import "./ui/setup-refresh.css";
@import "./ui/desktop-god-selection.css";
@import "./ui/fjord-table.css";
@import "./ui/match-moments.css";
@import "./ui/mobile-resources.css";
@import "./ui/mobile-camera.css";
@import "./ui/turn-indicator.css";
</style>
