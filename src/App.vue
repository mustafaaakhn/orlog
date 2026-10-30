<script setup lang="ts">
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
import GameMark from "./ui/GameMark.vue";
import UiIcon from "./ui/UiIcon.vue";
import SymbolIcon from "./ui/SymbolIcon.vue";
import { SYMBOL_GUIDE } from "./scene/symbols";
import SceneLoaderState from "./ui/SceneLoaderState.vue";
import MatchSetup from "./ui/MatchSetup.vue";
import MatchResult from "./ui/MatchResult.vue";
import { eventText } from "./presentation/eventText";
import type {
  GameOptions,
  PlayerId,
  FavorId,
  FavorLevel,
  FavorInput,
} from "./core";
import { createRollSession } from "./app/rollSession";
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
const overlay = ref<"rules" | "settings" | "menu" | null>(null);
watch([introActive, setupScreen, overlay], () => {
  if (languagePicker.value?.matches(":popover-open")) languagePicker.value.hidePopover();
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
const unlockAudio = () => {
  if (!preparing.value || setupScreen.value !== "welcome") audio.unlock();
};
const visibility = () => {
  pageHidden.value = document.hidden;
  paused.value = document.hidden || !document.hasFocus();
  audio.visibility(document.hidden || introActive.value);
};
watch([introActive, paused], () => {
  audio.visibility(document.hidden || introActive.value);
});
onMounted(() => {
  online.restore();
  audio.visibility(document.hidden);
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
  "player-1": "Oyuncu I",
  "player-2": "Oyuncu II",
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
  const options = session.prepareRematch();
  if (!options) return;
  audio.stopEffects();
  rematchSetup.value = { options, names: { ...names.value }, opponent: { ...opponent.value } };
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
watch(passivePresentation, (passive, previous) => {
  online.visibility(!passive);
  session.setBackground(passive);
  if (paused.value || (!passive && previous && !preparing.value)) {
    sceneReady.value = false;
    sceneGeneration.value++;
  }
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
function selectDie(dieId: Parameters<typeof session.select>[0]) {
  if (!busy.value && humanTurn.value && !preparing.value)
    session.select(dieId);
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
  if (!busy.value && humanTurn.value && phase.value.name === "roll")
    session.dispatch({
      type: "RollDice",
      playerId: phase.value.activePlayerId,
    });
}
function confirm() {
  if (!busy.value && humanTurn.value && phase.value.name === "roll")
    session.dispatch({
      type: "ConfirmRoll",
      playerId: phase.value.activePlayerId,
    });
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
  >
    <a v-if="!preparing" class="skip-link" href="#match-controls"
      >Oyun kontrollerine geç</a
    >
    <header class="masthead" :inert="introActive" :aria-hidden="introActive || undefined">
      <a
        class="wordmark"
        href="./"
        aria-label="Orlog ana sayfa"
        @click="
          (event) => {
            if (!preparing) {
              event.preventDefault();
              overlay = 'menu';
            }
          }
        "
        ><GameMark />ORLOG</a
      >
      <span class="edition">Kuzeyin zar oyunu</span>
      <nav class="header-tools entry-tools" aria-label="Yardımcı alanlar">
        <button class="icon-button entry-tool" aria-label="Dil seçimi" title="Dil seçimi" popovertarget="language-picker">
          <UiIcon name="translate" />
        </button>
        <button class="icon-button entry-tool" aria-label="Ayarlar" title="Ayarlar" @click="overlay = 'settings'">
          <UiIcon name="settings" />
        </button>
        <button class="icon-button entry-tool" aria-label="Oyun rehberi" title="Oyun rehberi" @click="overlay = 'rules'">
          <UiIcon name="book" />
        </button>
        <div id="language-picker" ref="languagePicker" class="language-picker" popover>
          <h2>Dil seçimi</h2>
          <button class="language-option" aria-pressed="true" lang="tr" popovertarget="language-picker" popovertargetaction="hide">
            Türkçe <UiIcon name="check" />
          </button>
        </div>
        <button v-if="!preparing" class="icon-button entry-tool" aria-label="Oyundan çık" title="Oyundan çık" @click="overlay = 'menu'">
          <UiIcon name="exit" />
        </button>
      </nav>
    </header>
    <div
      v-if="!preparing && !pageHidden"
      class="scene-layer"
      :aria-hidden="preparing"
      :inert="preparing"
    >
      <TablePreview
        :key="sceneGeneration"
        :audio="audio"
        :reduced="reduced"
        :paused="paused || !!overlay"
        :quality="settings.quality"
        :speed="speed"
        :state="state"
        :batch="pending"
        :blocked="busy"
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
    <section v-else class="match-screen" aria-label="Orlog oyun masası">
      <div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
        <p v-for="player in state.players" :key="player.id">
          {{ names[player.id] }}: {{ player.health }} can, {{ player.tokens }} jeton.
          {{ player.id === viewerId ? 'Senin tarafın.' : 'Karşı taraf.' }}
        </p>
        <p>{{ instruction }}</p>
      </div>
      <p class="table-round" aria-label="Tur ve sıra">
        Tur {{ state.round }}<span v-if="activePlayer"> · {{ names[activePlayer.id] }}</span>
      </p>
      <p v-if="networkStatus" class="network-status" role="status">{{ networkStatus }}</p>
      <section
        id="match-controls"
        tabindex="-1"
        class="match-actions"
        aria-label="Oyun kontrolleri"
      >
        <template v-if="!busy && humanTurn && phase.name === 'roll'">
          <button v-if="phase.step === 'awaiting-roll'" class="primary-action" @click="roll">
            Zar at <UiIcon name="arrow" />
          </button>
          <button v-else-if="activePlayer && activePlayer.rollsUsed < 3" class="primary-action" @click="confirm">
            Seçimi onayla <UiIcon name="check" />
          </button>
        </template>
        <template v-if="!busy && humanTurn && phase.name === 'favor'">
          <p class="favor-prompt">Bir tanrı seç veya devam et.</p>
          <button class="primary-action" @click="skip">Devam et <UiIcon name="arrow" /></button>
        </template>
        <template v-if="resultAvailable">
          <button v-if="!resultOpen" class="secondary-action" @click="resultOpen = true">Sonucu göster</button>
        </template>
        <p v-if="error" class="field-error" role="alert">{{ error }}</p>
        <p v-if="onlineError" class="field-error" role="alert">{{ onlineError }}</p>
      </section>
    </section>
    <MatchResult v-if="resultAvailable && resultOpen && phase.name === 'ended'"
      :winner="names[phase.winnerId]" :round="state.round"
      :busy="!!onlineRoom && (online.busy.value || onlineRoom.waiting || !online.bothConnected.value)"
      :error="onlineRoom ? onlineError || (!online.bothConnected.value ? 'Yeni oyun için iki oyuncu da bağlı olmalı.' : '') : ''"
      @restart="rematch" @close="resultOpen = false" />
    <dialog
      ref="dialog"
      class="utility-dialog"
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
          {{
            overlay === "rules"
              ? "Masaya ilk kez mi oturuyorsun?"
              : overlay === "settings"
                ? "Ses ayarları"
                : "Oyundan çık"
          }}
        </h2>
        <button
          class="icon-button"
          aria-label="Pencereyi kapat"
          @click="overlay = null"
        >
          <UiIcon name="close" />
        </button>
      </div>
      <div v-if="overlay === 'rules'" class="rules-content">
        <p>Altı zar, üç tanrı gücü. Rakibinin 15 canını sıfırlayan kazanır.</p>
        <ol>
          <li>
            <strong>Zarlarını at ve sakla.</strong> Sırayla en fazla üç atış
            yap. Saklamak istediğin zarları seçip onayla.
          </li>
          <li>
            <strong>Jetonlarını biriktir.</strong> Altın çerçeveli her zar bir
            tanrı jetonu verir. El, rakibinden jeton çalar.
          </li>
          <li>
            <strong>Tanrını çağır.</strong> Bir güç ve seviye seç ya da pas geç.
            Jeton bedeli, güç çalıştığında ödenir.
          </li>
          <li>
            <strong>Savaşı izle.</strong> Güçler, oklar, baltalar ve çalma
            sırasıyla çözülür. Zarlar toplandıktan sonra yeni tur otomatik başlar; ilk oyuncu değişir.
          </li>
        </ol>
        <div class="symbol-guide">
          <div
            v-for="symbol in SYMBOL_GUIDE"
            :key="symbol.id"
            class="symbol-description"
          >
            <SymbolIcon :symbol="symbol.id" />
            <div>
              <strong>{{ symbol.name }}</strong>
              <p>{{ symbol.description }}</p>
            </div>
          </div>
        </div>
        <p>
          Masadaki zarlara Tab ile geçebilirsin. Space/Enter merkeze alır veya
          geri koyar; yön tuşları ve Home/End zarlar arasında dolaşır.
        </p>
      </div>
      <ExperienceSettings
        v-if="overlay === 'settings'"
        :settings="settings"
        :audio-failed="audioFailed"
        @retry="audio.unlock()"
      />
      <div v-if="overlay === 'menu'" class="game-menu">
        <p>
          Tur {{ state.round }} ·
          {{
            onlineRoom ? `Çevrim içi · ${onlineRoom.code}` : opponent.mode === "computer"
              ? "Robota karşı"
              : "Aynı cihazda iki kişi"
          }}
        </p>
        <button class="primary-action" @click="overlay = null">
          Oyuna dön <UiIcon name="arrow" /></button
        ><button class="secondary-action" @click="restart">
          Ana menüye dön
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
@import "./ui/fjord-table.css";
@import "./ui/match-moments.css";
</style>
