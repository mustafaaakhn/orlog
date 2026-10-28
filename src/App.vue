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
    void nextTick(() =>
      document.querySelector<HTMLInputElement>(".setup-panel input")?.focus(),
    );
  }
}
const closeView = ref(false);
const guideOpen = ref(false);
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
const computerTurn = computed(
  () =>
    !preparing.value &&
    opponent.value.mode === "computer" &&
    activePlayer.value?.id === "player-2",
);
const driver = createComputerDriver((command) => session.dispatch(command));
watch(
  [state, pending, preparing, sceneReady, paused, opponent],
  () => {
    driver.update({
      state: state.value,
      playerId: opponent.value.mode === "computer" ? "player-2" : null,
      difficulty: opponent.value.difficulty,
      blocked: preparing.value || busy.value || paused.value,
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
const phaseTitle = computed(() =>
  preparing.value
    ? "Maç hazırlığı · Mod ve güç seçimi"
    : phase.value.name === "ended"
      ? `${names.value[phase.value.winnerId]} kazandı`
      : `Tur ${state.value.round} · ${activePlayer.value ? names.value[activePlayer.value.id] + " · " : ""}${phase.value.name === "roll" ? "Zar atışı ve seçim" : phase.value.name === "favor" ? "Güç seçimi" : phase.value.name === "resolution" ? "Savaş" : "Tur tamamlandı"}`,
);
function focusAction() {
  const panel = document.querySelector(".roll-panel:not(.setup-panel)");
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
      previousFocus = element?.closest(".roll-panel") ? element : null;
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
  <main class="experience" :data-reduced-motion="reduced">
    <a v-if="!preparing" class="skip-link" href="#match-controls"
      >Oyun kontrollerine geç</a
    >
    <header class="masthead">
      <a class="wordmark" href="./" aria-label="Orlog ana sayfa"
        ><GameMark />ORLOG</a
      >
      <span class="edition">Kuzeyin zar oyunu</span>
      <nav class="header-tools" aria-label="Yardımcı alanlar">
        <a href="#rules">Oyun rehberi</a><a href="#settings">Ayarlar</a>
      </nav>
    </header>
    <section class="table-section" aria-labelledby="table-title">
      <div class="table-heading">
        <div>
          <h1 id="table-title">Tanrıların masası</h1>
          <p>Altı zar. Üç atış. Kaderinden hangisini saklayacaksın?</p>
        </div>
        <span class="game-mode">{{
          preparing
            ? "Yeni bir mücadele"
            : opponent.mode === "computer"
              ? `Bilgisayara karşı · ${DIFFICULTIES[opponent.difficulty].label}`
              : "Aynı masada iki kişi"
        }}</span>
      </div>
      <div class="game-layout" :class="{ preparing }">
        <div class="board-column">
          <div
            class="phase-banner"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <strong>{{ phaseTitle }}</strong
            ><span v-if="pending">{{
              paused
                ? "Duraklatıldı · Sekme arka planda"
                : "Olaylar masada oynanıyor…"
            }}</span>
          </div>
          <div
            v-if="!preparing"
            class="resource-scores"
            aria-label="Oyuncu kaynakları"
          >
            <article
              v-for="player in state.players"
              :key="player.id"
              :class="player.id"
            >
              <div>
                <span class="player-label">{{ playerLabel(player.id) }}</span
                ><strong>{{ names[player.id] }}</strong>
              </div>
              <p>
                <b>{{ player.health }}</b> can <span>/</span>
                <b>{{ player.tokens }}</b> jeton
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
          </div>
          <div class="table-frame">
            <div class="scene-caption">
              {{ closeView ? "Zar görünümü" : "Orlog · Oyun masası" }}
            </div>
            <TablePreview
              :audio="audio"
              :reduced="reduced"
              :paused="paused"
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
            <div class="view-controls" aria-label="Sahne görünümü">
              <button
                :disabled="busy"
                :aria-pressed="!closeView"
                @click="closeView = false"
              >
                Masa</button
              ><button
                :disabled="busy"
                :aria-pressed="closeView"
                @click="closeView = true"
              >
                Zarlara yaklaş <span aria-hidden="true">↗</span>
              </button>
            </div>
          </div>
          <div class="table-meta">
            <p>
              {{
                preparing
                  ? "Kemik zarlar, oyma tanrılar ve bir avuç kader."
                  : "Altın çerçeveli her zar, bir tanrı jetonu."
              }}
            </p>
            <button
              class="guide-toggle"
              :aria-expanded="guideOpen"
              aria-controls="symbol-guide"
              @click="guideOpen = !guideOpen"
            >
              Zar yüzlerini tanı
              <span aria-hidden="true">{{ guideOpen ? "−" : "+" }}</span>
            </button>
          </div>
          <section
            v-if="guideOpen"
            id="symbol-guide"
            class="symbol-guide"
            aria-label="Zar yüzleri ve anlamları"
          >
            <div
              v-for="symbol in SYMBOL_GUIDE"
              :key="symbol.id"
              class="symbol-description"
            >
              <SymbolIcon :symbol="symbol.id" />
              <div>
                <h2>{{ symbol.name }}</h2>
                <p>{{ symbol.description }}</p>
              </div>
            </div>
            <p class="gold-note">
              Altın çerçeve, yüzün etkisine ek olarak bir tanrı jetonu verir.
            </p>
          </section>
        </div>
        <aside class="control-column" aria-label="Maç kontrolleri">
          <MatchSetup v-if="preparing" @start="start" />
          <section
            v-else
            id="match-controls"
            tabindex="-1"
            class="roll-panel"
            aria-label="Zar atışı ve seçim"
            :aria-busy="!!pending"
          >
            <div class="turn-heading">
              <h2>
                {{
                  phase.name === "ended"
                    ? `${names[phase.winnerId]} kazandı`
                    : activePlayer
                      ? names[activePlayer.id]
                      : phase.name === "resolution"
                        ? "Savaş zamanı"
                        : "Tur tamamlandı"
                }}
              </h2>
              <span v-if="activePlayer && phase.name === 'roll'"
                >Atış
                {{
                  Math.min(
                    activePlayer.rollsUsed +
                      (phase.step === "awaiting-roll" ? 1 : 0),
                    3,
                  )
                }}
                / 3</span
              >
            </div>
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
                Zarları at <span aria-hidden="true">↗</span>
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
                }}
                <span aria-hidden="true">→</span>
              </button>
              <button
                v-if="
                  phase.name === 'resolution' || phase.name === 'round-complete'
                "
                class="primary-action"
                :disabled="busy"
                @click="advance"
              >
                {{
                  phase.name === "resolution" ? "Savaşı başlat" : "Sonraki tur"
                }}
                <span aria-hidden="true">→</span>
              </button>
              <button class="restart-action" :disabled="busy" @click="restart">
                Yeniden başlat
              </button>
            </div>
            <p class="roll-instruction" role="status" aria-live="polite">
              {{ instruction }}
            </p>
            <p v-if="error" role="alert">{{ error }}</p>
            <FavorPicker
              v-if="!computerTurn && phase.name === 'favor'"
              :key="phase.activePlayerId"
              :state="state"
              :player="state.players[phase.activePlayerId]"
              :disabled="busy"
              @choose="choose"
              @skip="skip"
            />
            <div class="dice-trays">
              <DiceTray
                v-for="player in state.players"
                :key="player.id"
                :player="player"
                :active="activePlayer?.id === player.id"
                :selectable="
                  !busy &&
                  !computerTurn &&
                  phase.name === 'roll' &&
                  phase.step === 'selecting-dice' &&
                  phase.activePlayerId === player.id
                "
                @select="selectDie"
              />
            </div>
            <details v-if="combatLog.length" class="combat-log" :open="reduced">
              <summary>
                Tur olayları <span>{{ combatLog.length }}</span>
              </summary>
              <ol>
                <li v-for="event in combatLog" :key="event.id">
                  {{ event.text }}
                </li>
              </ol>
            </details>
          </section>
        </aside>
      </div>
      <div class="support-tools">
        <div id="rules">
          <details class="rules-guide">
            <summary>Nasıl oynanır?</summary>
            <ol>
              <li>
                Bilgisayara karşı veya aynı cihazda iki kişilik maç seç.
                Bilgisayar sırasını kendi oynar; savaşı ve sonraki turu sen
                başlatırsın.
              </li>
              <li>
                Her oyuncu 15 can, 0 jeton ve üç güçle başlar. Yazı tura ilk
                oyuncuyu seçer.
              </li>
              <li>
                Dönüşümlü en fazla üç atış yap. Saklayacağın zarları seçip
                onayla; üçüncü atış otomatik saklanır.
              </li>
              <li>
                Altın çerçeveler jeton verir. Ok kalkanla, balta miğferle
                engellenir. El, rakibin jetonlarını çalar.
              </li>
              <li>
                Bir güç ve seviye seç veya pas geç. Bedel güç çalıştığında
                ödenir; yetmezse güç uygulanmaz.
              </li>
              <li>
                Savaş: önce güçler → altın jetonlar → oklar → baltalar → çalma →
                son güçler. İlk 0 can maçı bitirir.
              </li>
            </ol>
            <p>
              Zarlarda Tab, Space/Enter, ok tuşları ve Home/End kullanabilirsin.
            </p>
          </details>
        </div>
        <div id="settings">
          <ExperienceSettings
            :settings="settings"
            :audio-failed="audioFailed"
            @retry="audio.unlock()"
          />
        </div>
      </div>
    </section>
    <footer>
      <span>Valhalla’dan ilham alan bağımsız bir hayran uyarlaması.</span
      ><span>Ahşap, kemik ve kader.</span>
    </footer>
  </main>
</template>
<style>
@import "./ui/styles.css";
</style>
