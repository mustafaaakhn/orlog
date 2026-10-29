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

const TablePreview = defineAsyncComponent({
  loader: () => import("./scene/TablePreview.vue"),
  loadingComponent: SceneLoaderState,
  errorComponent: SceneLoaderState,
  delay: 0,
  timeout: 30000,
});
const preparing = ref(true);
const setupScreen = ref("welcome");
const overlay = ref<"rules" | "settings" | "log" | "menu" | null>(null);
const dialog = ref<HTMLDialogElement | null>(null);
const localViewer = ref<PlayerId>("player-1");
const viewerId = computed(() =>
  opponent.value.mode === "computer" ? "player-1" : localViewer.value,
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
const paused = ref(document.hidden);
watch(settings, (value) => audio.configure(value), { immediate: true });
const unlockAudio = () => audio.unlock();
const visibility = () => {
  paused.value = document.hidden;
  audio.visibility(paused.value);
};
onMounted(() => {
  audio.visibility(document.hidden);
  document.addEventListener("pointerdown", unlockAudio, { capture: true });
  document.addEventListener("keydown", unlockAudio, { capture: true });
  document.addEventListener("visibilitychange", visibility);
});
onUnmounted(() => {
  document.removeEventListener("pointerdown", unlockAudio, { capture: true });
  document.removeEventListener("keydown", unlockAudio, { capture: true });
  document.removeEventListener("visibilitychange", visibility);
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
    localViewer.value = options.firstPlayerId ?? "player-1";
    names.value = playerNames;
    opponent.value = opponentOptions;
    preparing.value = false;
    void nextTick(focusAction);
  }
}
const sceneGeneration = ref(0);
function restart() {
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
const sceneReady = ref(false);
const session = createRollSession();
const { state, pending, error, lastEvent, history } = session;
const combatLog = computed(() =>
  history.value
    .map((event) => ({ id: event.id, text: eventText(event) }))
    .filter((event) => event.text)
    .slice(reduced.value ? -120 : -16),
);
const phase = computed(() => state.value.phase);
const activePlayer = computed(() =>
  phase.value.name === "roll" || phase.value.name === "favor"
    ? state.value.players[phase.value.activePlayerId]
    : null,
);
const busy = computed(() => !!pending.value || !sceneReady.value);
watch([activePlayer, opponent], ([player, options]) => {
  if (options.mode === "local" && player) localViewer.value = player.id;
});
const computerTurn = computed(
  () =>
    !preparing.value &&
    opponent.value.mode === "computer" &&
    activePlayer.value?.id === "player-2",
);
const driver = createComputerDriver((command) => session.dispatch(command));
watch(
  [state, pending, preparing, sceneReady, paused, opponent, overlay],
  () => {
    driver.update({
      state: state.value,
      playerId: opponent.value.mode === "computer" ? "player-2" : null,
      difficulty: opponent.value.difficulty,
      blocked: preparing.value || busy.value || paused.value || !!overlay.value,
    });
  },
  { immediate: true, flush: "sync" },
);
onUnmounted(() => driver.dispose());
function selectDie(dieId: Parameters<typeof session.select>[0]) {
  if (!busy.value && !computerTurn.value && !preparing.value)
    session.select(dieId);
}
const instruction = computed(() => {
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
  if (!busy.value && !computerTurn.value && phase.value.name === "favor")
    session.dispatch({
      type: "ChooseFavor",
      playerId: phase.value.activePlayerId,
      favorId,
      level,
      input,
    });
}
function skip() {
  if (!busy.value && !computerTurn.value && phase.value.name === "favor")
    session.dispatch({
      type: "SkipFavor",
      playerId: phase.value.activePlayerId,
    });
}
function availability(ready: boolean) {
  if (ready) session.resume();
  sceneReady.value = ready;
  if (!ready) {
    audio.stopEffects();
    session.recover();
  }
}
watch([state, pending, sceneReady, paused, preparing, overlay], () => {
  if (!preparing.value && !busy.value && !paused.value && !overlay.value) {
    session.finishLastRoll();
    session.resolveReady();
    session.advanceRound();
  }
});
function roll() {
  if (!busy.value && !computerTurn.value && phase.value.name === "roll")
    session.dispatch({
      type: "RollDice",
      playerId: phase.value.activePlayerId,
    });
}
function confirm() {
  if (!busy.value && !computerTurn.value && phase.value.name === "roll")
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
    }"
    :data-reduced-motion="reduced"
  >
    <a v-if="!preparing" class="skip-link" href="#match-controls"
      >Oyun kontrollerine geç</a
    >
    <header v-if="!preparing || setupScreen !== 'welcome'" class="masthead">
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
      <nav class="header-tools" aria-label="Yardımcı alanlar">
        <button v-if="!preparing" class="text-button" @click="overlay = 'log'">
          <UiIcon name="log" /><span>Tur olayları</span>
        </button>
        <button class="text-button" @click="overlay = 'rules'">
          <UiIcon name="book" /><span>Oyun rehberi</span>
        </button>
        <button class="text-button" @click="overlay = 'settings'">
          <UiIcon name="settings" /><span>Ayarlar</span>
        </button>
        <button
          v-if="!preparing"
          class="icon-button"
          aria-label="Oyun menüsü"
          @click="overlay = 'menu'"
        >
          <UiIcon name="menu" />
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
        :quality="settings.quality"
        :speed="speed"
        :state="state"
        :batch="pending"
        :viewer-id="viewerId"
        :control-player="
          !preparing && !computerTurn && phase.name === 'roll'
            ? phase.activePlayerId
            : null
        "
        @availability="availability"
        @presented="session.present"
        @progress="session.progress"
        @settled="session.settle($event)"
        :favor-player="!preparing && !computerTurn && !busy && phase.name === 'favor' ? phase.activePlayerId : null"
        @choose="choose"
        @select="selectDie"
      />
    </div>
    <MatchSetup
      v-if="preparing"
      @start="start"
      @screen="setupScreen = $event"
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
      <section
        id="match-controls"
        tabindex="-1"
        class="match-actions"
        aria-label="Oyun kontrolleri"
      >
        <template v-if="!busy && !computerTurn && phase.name === 'roll'">
          <button v-if="phase.step === 'awaiting-roll'" class="primary-action" @click="roll">
            Zar at <UiIcon name="arrow" />
          </button>
          <button v-else-if="activePlayer && activePlayer.rollsUsed < 3" class="primary-action" @click="confirm">
            Seçimi onayla <UiIcon name="check" />
          </button>
        </template>
        <template v-if="!busy && !computerTurn && phase.name === 'favor'">
          <p class="favor-prompt">Bir tanrı seç veya devam et.</p>
          <button class="primary-action" @click="skip">Devam et <UiIcon name="arrow" /></button>
        </template>
        <template v-if="!busy && phase.name === 'ended'">
          <p class="match-winner">{{ names[phase.winnerId] }} kazandı.</p>
          <button class="primary-action" @click="restart">Yeni oyun <UiIcon name="arrow" /></button>
        </template>
        <p v-if="error" class="field-error" role="alert">{{ error }}</p>
      </section>
    </section>
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
                ? "Ses ve görünüm"
                : overlay === "log"
                  ? `Tur ${state.round} · Olaylar`
                  : "Oyuna ara ver"
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
      <div v-if="overlay === 'log'" class="combat-log">
        <ol v-if="combatLog.length">
          <li v-for="event in combatLog" :key="event.id">{{ event.text }}</li>
        </ol>
        <p v-else>
          Henüz bir savaş yaşanmadı. İlk tur tamamlandığında olaylar burada
          görünecek.
        </p>
      </div>
      <div v-if="overlay === 'menu'" class="game-menu">
        <p>
          Tur {{ state.round }} ·
          {{
            opponent.mode === "computer"
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
</style>
