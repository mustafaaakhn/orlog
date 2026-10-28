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
import FavorPortrait from "./ui/FavorPortrait.vue";
import GameMark from "./ui/GameMark.vue";
import UiIcon from "./ui/UiIcon.vue";
import { FAVOR_CATALOG } from "./core";
import SymbolIcon from "./ui/SymbolIcon.vue";
import { SYMBOL_GUIDE } from "./scene/symbols";
import SceneLoaderState from "./ui/SceneLoaderState.vue";
import DiceTray from "./ui/DiceTray.vue";
import MatchSetup from "./ui/MatchSetup.vue";
import FavorPicker from "./ui/FavorPicker.vue";
import { eventText, playerLabel } from "./presentation/eventText";
import type {
  GameOptions,
  PlayerId,
  FavorId,
  FavorLevel,
  FavorInput,
} from "./core";
import { createRollSession } from "./app/rollSession";
import { createComputerDriver } from "./app/computerDriver";
import { DIFFICULTIES } from "./ai/computer";
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
const inspectingPlayer = ref<PlayerId>("player-1");
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
    names.value = playerNames;
    opponent.value = opponentOptions;
    preparing.value = false;
    void nextTick(focusAction);
  }
}
function restart() {
  if (!busy.value) {
    audio.stopEffects();
    session.restart();
    preparing.value = true;
    setupScreen.value = "welcome";
    closeView.value = false;
    overlay.value = null;
    void nextTick(() =>
      document.querySelector<HTMLElement>(".welcome-play")?.focus(),
    );
  }
}
const closeView = ref(false);
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
watch(activePlayer, (player) => {
  if (player) inspectingPlayer.value = player.id;
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
    return `Bilgisayar düşünüyor… (${DIFFICULTIES[opponent.value.difficulty].label})`;
  if (phase.value.name === "ended")
    return `${names.value[phase.value.winnerId]} kazandı. Yeni bir maç için yeniden başlat.`;
  if (phase.value.name === "round-complete")
    return "Tur tamamlandı. Sonraki turda ilk oyuncu değişecek; canlar ve jetonlar korunur.";
  if (phase.value.name === "resolution")
    return "İki güç seçimi de tamamlandı. Savaşı başlat.";
  if (phase.value.name === "favor")
    return `${names.value[phase.value.activePlayerId]} bir güç seçebilir veya pas geçebilir.`;
  if (phase.value.step === "awaiting-roll")
    return "Saklanmayan zarları at. Her oyuncunun en fazla üç atış hakkı var.";
  if (activePlayer.value?.rollsUsed === 3)
    return "Son atışın zarları otomatik saklandı. Sonucu onayla.";
  return "Saklamak istediğin zarlara dokun; geri almak için tekrar dokun. Ardından seçimi onayla.";
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
      previousFocus = element?.closest(".match-screen") ? element : null;
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
function advance() {
  if (busy.value) return;
  if (
    phase.value.name === "resolution" ||
    phase.value.name === "round-complete"
  )
    session.dispatch({
      type: phase.value.name === "resolution" ? "ResolveRound" : "NextRound",
      playerId: state.value.firstPlayerId,
    });
}
function availability(ready: boolean) {
  sceneReady.value = ready;
  if (!ready) {
    audio.stopEffects();
    session.recover();
  }
}
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
    <header class="masthead">
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
      v-show="!preparing || setupScreen === 'welcome'"
      class="scene-layer"
      :aria-hidden="preparing"
      :inert="preparing"
    >
      <TablePreview
        :audio="audio"
        :reduced="reduced"
        :paused="paused || !!overlay"
        :quality="settings.quality"
        :speed="speed"
        :close-view="closeView"
        :state="state"
        :batch="pending"
        @availability="availability"
        @presented="session.present"
        @settled="session.settle($event)"
        @select="selectDie"
      />
    </div>
    <MatchSetup
      v-if="preparing"
      @start="start"
      @screen="setupScreen = $event"
    />
    <section v-else class="match-screen" aria-label="Orlog oyun masası">
      <div class="match-hud">
        <article
          v-for="player in state.players"
          :key="player.id"
          class="player-hud"
          :class="[player.id, { 'has-turn': activePlayer?.id === player.id }]"
        >
          <div class="player-identity">
            <span class="player-seal">{{
              player.id === "player-1" ? "I" : "II"
            }}</span>
            <div>
              <span class="player-label">{{ playerLabel(player.id) }}</span
              ><strong>{{ names[player.id] }}</strong>
            </div>
          </div>
          <p class="player-resources">
            <b>{{ player.health }}</b> can <span></span
            ><b>{{ player.tokens }}</b> jeton
          </p>
          <div class="resource-favors">
            <span
              v-for="id in player.favors"
              :key="id"
              :title="FAVOR_CATALOG[id].name"
              ><FavorPortrait :id="id" /><span class="sr-only">{{
                FAVOR_CATALOG[id].name
              }}</span></span
            >
          </div>
        </article>
        <div class="match-round" role="status" aria-live="polite">
          <strong>Tur {{ state.round }}</strong
          ><span>{{
            phase.name === "roll"
              ? "Zar atışı"
              : phase.name === "favor"
                ? "Tanrı gücü"
                : phase.name === "ended"
                  ? "Maç bitti"
                  : "Savaş"
          }}</span>
        </div>
      </div>
      <div class="table-tools" aria-label="Sahne görünümü">
        <button
          class="text-button"
          :disabled="busy"
          :aria-pressed="closeView"
          @click="closeView = !closeView"
        >
          {{ closeView ? "Tüm masayı gör" : "Zarlara yaklaş" }}
        </button>
      </div>
      <section
        v-if="!computerTurn && phase.name === 'favor'"
        class="favor-action-panel"
        aria-label="Tanrı gücü seçimi"
      >
        <h2>Bir tanrı çağır.</h2>
        <FavorPicker
          :key="phase.activePlayerId"
          :state="state"
          :player="state.players[phase.activePlayerId]"
          :disabled="busy"
          @choose="choose"
          @skip="skip"
        />
      </section>
      <section
        id="match-controls"
        tabindex="-1"
        class="action-dock roll-panel"
        :aria-busy="!!pending"
        aria-label="Oyun kontrolleri"
      >
        <div class="dock-status">
          <strong>{{
            phase.name === "ended"
              ? `${names[phase.winnerId]} kazandı`
              : activePlayer
                ? `${names[activePlayer.id]}${computerTurn ? " düşünüyor…" : ", sıra sende."}`
                : phase.name === "resolution"
                  ? "Savaş zamanı."
                  : "Tur tamamlandı."
          }}</strong
          ><span v-if="activePlayer && phase.name === 'roll'"
            >Atış
            {{
              Math.min(
                activePlayer.rollsUsed +
                  (phase.step === "awaiting-roll" ? 1 : 0),
                3,
              )
            }}
            / 3</span
          ><span v-if="pending">{{
            paused ? "Duraklatıldı" : "Olaylar oynanıyor…"
          }}</span>
        </div>
        <div class="dock-main">
          <div v-if="phase.name === 'roll'" class="dock-dice">
            <div class="dice-owner-tabs" aria-label="Zarlarını gördüğün oyuncu">
              <button
                v-for="player in state.players"
                :key="player.id"
                :aria-pressed="inspectingPlayer === player.id"
                @click="inspectingPlayer = player.id"
              >
                {{ names[player.id] }}
              </button>
            </div>
            <DiceTray
              :player="state.players[inspectingPlayer]"
              :active="activePlayer?.id === inspectingPlayer"
              :selectable="
                !busy &&
                !computerTurn &&
                phase.step === 'selecting-dice' &&
                phase.activePlayerId === inspectingPlayer
              "
              @select="selectDie"
            />
          </div>
          <p class="roll-instruction" role="status" aria-live="polite">
            {{ instruction }}
          </p>
          <div class="roll-actions">
            <button
              v-if="
                !computerTurn &&
                phase.name === 'roll' &&
                phase.step === 'awaiting-roll'
              "
              class="primary-action"
              :disabled="busy"
              @click="roll"
            >
              Zarları at <UiIcon name="arrow" />
            </button>
            <button
              v-else-if="!computerTurn && phase.name === 'roll'"
              class="primary-action"
              :disabled="busy"
              @click="confirm"
            >
              {{
                activePlayer?.rollsUsed === 3
                  ? "Sonucu onayla"
                  : "Seçimi onayla"
              }}<UiIcon name="check" />
            </button>
            <button
              v-if="
                phase.name === 'resolution' || phase.name === 'round-complete'
              "
              class="primary-action"
              :disabled="busy"
              @click="advance"
            >
              {{ phase.name === "resolution" ? "Savaşı başlat" : "Sonraki tur"
              }}<UiIcon name="arrow" />
            </button>
            <button
              v-if="phase.name === 'ended'"
              class="primary-action"
              :disabled="busy"
              @click="restart"
            >
              Yeni oyun <UiIcon name="arrow" />
            </button>
          </div>
        </div>
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
            sırasıyla çözülür. Sonraki turda ilk oyuncu değişir.
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
          Zarlarda Tab, Space/Enter, ok tuşları ve Home/End kullanabilirsin.
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
              ? `Bilgisayara karşı · ${DIFFICULTIES[opponent.difficulty].label}`
              : "Aynı cihazda iki kişi"
          }}
        </p>
        <button class="primary-action" @click="overlay = null">
          Oyuna dön <UiIcon name="arrow" /></button
        ><button class="secondary-action" :disabled="busy" @click="restart">
          Ana menüye dön
        </button>
        <p v-if="busy">Oyuna dönüp masa hareketinin tamamlanmasını bekle.</p>
      </div>
    </dialog>
  </main>
</template>
<style>
@import "./ui/styles.css";
</style>
