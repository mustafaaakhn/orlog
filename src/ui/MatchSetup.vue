<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import WelcomeIntro from "./WelcomeIntro.vue";
import FavorPortrait from "./FavorPortrait.vue";
import UiIcon from "./UiIcon.vue";
import SymbolIcon from "./SymbolIcon.vue";
import TokenIcon from "./TokenIcon.vue";
import GameMark from "./GameMark.vue";
import { favorSummary } from "./favorSummary";
import {
  DEFAULT_FAVORS,
  FAVOR_CATALOG,
  describeFavorTier,
  PLAYER_IDS,
  mathRandom,
  randomIndex,
} from "../core";
import type { FavorId, GameOptions, PlayerId } from "../core";
import { FAVOR_ART_IDS } from "../scene/favorArt";
import type { OpponentOptions } from "../ai/computer";
type Screen = "welcome" | "mode" | "gods" | "coin";
const props = defineProps<{
  reduced: boolean;
  paused: boolean;
  muted: boolean;
  volume: number;
}>();
const emit = defineEmits<{
  start: [
    options: GameOptions,
    names: Record<PlayerId, string>,
    opponent: OpponentOptions,
  ];
  screen: [screen: Screen];
  cinematic: [active: boolean];
}>();
const screen = ref<Screen>("welcome");
const welcomeArtFailed = ref(false);
const desktopQuery = window.matchMedia("(min-width: 1024px)");
const desktopWelcome = ref(desktopQuery.matches);
const introActive = ref(false);
const updateDesktop = () => { desktopWelcome.value = desktopQuery.matches; };
desktopQuery.addEventListener("change", updateDesktop);
watch(desktopWelcome, (desktop) => {
  if (!desktop && introActive.value) finishIntro();
});
onBeforeUnmount(() => {
  desktopQuery.removeEventListener("change", updateDesktop);
  emit("cinematic", false);
});
function setIntroActive(active: boolean) {
  introActive.value = active;
  emit("cinematic", active);
}
function finishIntro() {
  setIntroActive(false);
  void nextTick(() => document.querySelector<HTMLElement>(screen.value === "welcome" ? ".welcome-play" : ".setup-screen h1")?.focus({ preventScroll: true }));
}
const selectedMode = ref<"computer" | "friend">("computer");
const friendOpen = ref(false);
const friendMode = ref<"local" | "host" | "join">("local");
const names = ref<Record<PlayerId, string>>({
  "player-1": "Oyuncu I",
  "player-2": "Oyuncu II",
});
const loadouts = ref<Record<PlayerId, FavorId[]>>({
  "player-1": [],
  "player-2": [...DEFAULT_FAVORS],
});
const editingPlayer = ref<PlayerId>("player-1");
const browsing = ref<FavorId>(FAVOR_ART_IDS[0]!);
const firstPlayer = ref<PlayerId | null>(null);
const roomCode = ref("");
const roomError = ref("");
const roomJoined = ref(false);
const guestPresent = ref(false);
const copied = ref(false);
const roomPreview = computed(() => selectedMode.value === "friend" && friendMode.value !== "local");
const isHost = computed(() => friendMode.value === "host");
const roomReady = computed(
  () => !roomPreview.value || (isHost.value ? guestPresent.value : roomJoined.value),
);
const friendPaths = [
  { id: "local", label: "Aynı bilgisayarda", icon: "monitor" },
  { id: "host", label: "Oda kur", icon: "room-add" },
  { id: "join", label: "Odaya katıl", icon: "door" },
] as const;
const roomStatus = computed(() => isHost.value
  ? guestPresent.value ? "Arkadaşın geldi. Masanız hazır." : "Arkadaşın bekleniyor…"
  : roomJoined.value ? "Odaya katıldın. Oda sahibinin başlatması bekleniyor." : "Arkadaşının paylaştığı 6 karakterli kodu gir.");
const local = computed(() => selectedMode.value !== "computer");
const currentLoadout = computed(() => loadouts.value[editingPlayer.value]);
const valid = computed(() =>
  PLAYER_IDS.every(
    (id) =>
      ((id === "player-2" && !local.value) || names.value[id].trim()) &&
      loadouts.value[id].length === 3,
  ),
);
const canContinueGods = computed(
  () =>
    currentLoadout.value.length === 3 &&
    ((editingPlayer.value === "player-2" && !local.value) ||
      !!names.value[editingPlayer.value].trim()) &&
    ((local.value && editingPlayer.value === "player-1") || valid.value),
);
const steps = ["Rakibin", "Tanrıların", "İlk hamle"];
const stepIndex = computed(() =>
  screen.value === "coin" ? 2 : screen.value === "gods" ? 1 : 0,
);
const shortName = (id: FavorId) => FAVOR_CATALOG[id].name.split("'")[0];
const playerName = (id: PlayerId) =>
  id === "player-2" && !local.value
    ? "Bilgisayar"
    : names.value[id].trim() || (id === "player-1" ? "Oyuncu I" : "Oyuncu II");
watch(
  screen,
  async (value) => {
    emit("screen", value);
    if (introActive.value) return;
    await nextTick();
    document
      .querySelector<HTMLElement>(value === "welcome" ? ".welcome-play" : ".setup-screen h1")
      ?.focus({ preventScroll: true });
  },
  { immediate: true },
);
function goBack() {
  if (screen.value === "mode" && desktopWelcome.value && friendOpen.value) {
    friendOpen.value = false;
    void nextTick(() => document.querySelector<HTMLElement>(".mode-friend-choice")?.focus({ preventScroll: true }));
  } else if (screen.value === "mode") screen.value = "welcome";
  else if (screen.value === "gods") {
    friendOpen.value = false;
    screen.value = "mode";
  } else if (screen.value === "coin") {
    firstPlayer.value = null;
    screen.value = "gods";
  }
}
function chooseFriend() {
  selectedMode.value = "friend";
  friendOpen.value = true;
  if (desktopWelcome.value) void nextTick(() => document.querySelector<HTMLElement>(".mode-friend-title")?.focus({ preventScroll: true }));
}
function continueMode() {
  roomError.value = "";
  if (roomReady.value) {
    editingPlayer.value = "player-1";
    screen.value = "gods";
  }
}
watch(roomCode, () => { roomJoined.value = false; roomError.value = ""; });
function joinRoom() {
  if (!/^[A-Z0-9]{6}$/.test(roomCode.value.trim().toUpperCase())) {
    roomError.value = "6 harf veya rakamdan oluşan bir oda kodu gir.";
    void nextTick(() => {
      document.getElementById("room-error")?.scrollIntoView({ block: "nearest" });
      document.getElementById("room-code")?.focus({ preventScroll: true });
    });
    return;
  }
  roomError.value = "";
  roomJoined.value = true;
}
async function copyCode() {
  try {
    await navigator.clipboard.writeText("SKAL26");
    copied.value = true;
  } catch {
    copied.value = false;
    roomError.value =
      "Kod kopyalanamadı. SKAL26 kodunu seçip kopyalayabilirsin.";
  }
}
function toggleFavor(id: FavorId) {
  browsing.value = id;
  const index = currentLoadout.value.indexOf(id);
  if (index >= 0) currentLoadout.value.splice(index, 1);
  else if (currentLoadout.value.length < 3) currentLoadout.value.push(id);
}
function continueGods() {
  if (!canContinueGods.value) return;
  if (local.value && editingPlayer.value === "player-1") {
    editingPlayer.value = "player-2";
    return;
  }
  if (valid.value) screen.value = "coin";
}
function toss() {
  firstPlayer.value = PLAYER_IDS[randomIndex(mathRandom, 2)]!;
  void nextTick(() =>
    document
      .querySelector<HTMLElement>("[data-coin-start]")
      ?.focus({ preventScroll: true }),
  );
}
function start() {
  if (valid.value && firstPlayer.value)
    emit(
      "start",
      { firstPlayerId: firstPlayer.value, loadouts: loadouts.value },
      {
        "player-1": playerName("player-1"),
        "player-2": playerName("player-2"),
      },
      {
        mode: local.value ? "local" : "computer",
        difficulty: "normal",
      },
    );
}
</script>
<template>
  <WelcomeIntro
    v-if="desktopWelcome && (screen === 'welcome' || introActive)"
    :reduced="props.reduced" :paused="props.paused"
    :muted="props.muted" :volume="props.volume"
    @active="setIntroActive"
    @enter="screen = 'mode'"
    @complete="finishIntro"
  />
  <section
    v-if="screen === 'welcome' && !desktopWelcome"
    class="welcome-screen setup-screen"
    aria-labelledby="welcome-title"
    :class="{ 'is-unavailable': welcomeArtFailed }"
  >
    <h1 id="welcome-title" class="sr-only">Orlog</h1>
    <div class="welcome-stage">
      <picture v-if="!welcomeArtFailed" class="welcome-art">
        <source media="(min-width: 1024px)" srcset="/assets/art/welcome-orlog-desktop.webp" width="1672" height="941" />
        <source media="(orientation: portrait)" srcset="/assets/art/welcome-orlog-portrait.webp" width="887" height="1774" />
        <img
          src="/assets/art/welcome-orlog.webp"
          width="1536" height="1024" fetchpriority="high" decoding="async"
          alt="Eivor ve Sigurd, fiyort manzarasına karşı Orlog oynuyor; oyma ahşap tanrılar masanın çevresinden oyunu izliyor."
          @error="welcomeArtFailed = true"
        />
      </picture>
      <button class="welcome-play" @click="screen = 'mode'">Oyna</button>
    </div>
  </section>
  <section
    v-else-if="screen !== 'welcome'"
    class="setup-screen flow-screen"
    :class="[`screen-${screen}`, { 'cinematic-mode': screen === 'mode' && desktopWelcome, 'friend-open': friendOpen }]"
    aria-label="Yeni oyun hazırlığı"
    :inert="introActive"
  >
    <nav class="flow-navigation" aria-label="Hazırlık adımları">
      <button v-if="screen !== 'mode' || !desktopWelcome || friendOpen" class="text-button back-button" @click="goBack">
        <UiIcon name="back" /> Geri
      </button>
      <ol v-if="screen !== 'mode' || !desktopWelcome">
        <li
          v-for="(step, index) in steps"
          :key="step"
          :aria-current="index === stepIndex ? 'step' : undefined"
          :class="{ complete: index < stepIndex }"
        >
          <span class="step-number"
            ><UiIcon v-if="index < stepIndex" name="check" /><template v-else>{{
              index + 1
            }}</template></span
          ><span>{{ step }}</span>
        </li>
      </ol>
      <span class="flow-nav-spacer"></span>
    </nav>
    <template v-if="screen === 'mode'">
      <div class="mode-body">
        <div v-if="!desktopWelcome" class="mode-intro flow-heading">
          <h1 tabindex="-1">Masada kiminle karşılaşacaksın?</h1>
          <p>Bir rakip seç. Sonra tanrılarını kuşanıp masaya geçelim.</p>
          <div class="mode-pantheon" aria-hidden="true"><FavorPortrait id="thors-strike" /><FavorPortrait id="iduns-rejuvenation" /><FavorPortrait id="freyjas-plenty" /></div>
          <p class="mode-invitation">Her atış bir ihtimal.<br />Her tanrı başka bir yol.</p>
        </div>
        <div class="mode-options">
        <h1 v-if="desktopWelcome && !friendOpen" class="mode-brand" tabindex="-1" aria-label="Orlog — rakibini seç"><GameMark /><span>ORLOG</span></h1>
        <div v-if="!desktopWelcome || !friendOpen" class="mode-selection" aria-label="Oyun modu">
          <button
            class="mode-robot-choice"
            :aria-pressed="desktopWelcome ? undefined : selectedMode === 'computer'"
            aria-label="Robota karşı oyna"
            @click="selectedMode = 'computer'; continueMode()"
          >
            <img v-if="desktopWelcome" class="mode-scene" src="/assets/art/mode-robot.webp" width="1024" height="1536" alt="" decoding="async" />
            <span v-if="!desktopWelcome" class="mode-emblem"><UiIcon name="robot" /></span>
            <h2>Robota karşı</h2>
            <p v-if="!desktopWelcome">Tanrılarını seç ve mücadeleye başla.</p>
            <span class="mode-card-action"><span v-if="!desktopWelcome">Tek oyuncu</span><UiIcon name="arrow" /></span>
          </button>
          <button
            class="mode-friend-choice"
            :aria-pressed="desktopWelcome ? undefined : selectedMode === 'friend'"
            aria-label="Arkadaşınla oyna"
            @click="chooseFriend"
          >
            <img v-if="desktopWelcome" class="mode-scene" src="/assets/art/mode-friend.webp" width="1024" height="1536" alt="" decoding="async" />
            <span v-if="!desktopWelcome" class="mode-emblem"><UiIcon name="people" /></span>
            <h2>Arkadaşınla</h2>
            <p v-if="!desktopWelcome">Aynı bilgisayarı paylaş veya oda akışını incele.</p>
            <span class="mode-card-action"><span v-if="!desktopWelcome">{{ selectedMode === "friend" ? "Seçildi" : "İki oyuncu" }}</span><UiIcon :name="!desktopWelcome && selectedMode === 'friend' ? 'check' : 'arrow'" /></span>
          </button>
        </div>
        <div v-if="selectedMode === 'friend' && (!desktopWelcome || friendOpen)" class="friend-area">
          <div class="friend-heading"><h1 v-if="desktopWelcome" class="mode-friend-title" tabindex="-1">Arkadaşınla</h1><p>Nasıl buluşacaksınız?</p></div>
          <div class="segmented-control" role="group" aria-label="Arkadaşınla oynama şekli">
            <button v-for="path in friendPaths"
              :key="path.id" :aria-pressed="friendMode === path.id" @click="friendMode = path.id; roomError = ''"><UiIcon :name="path.icon" />{{ path.label }}</button>
          </div>
          <div v-if="friendMode === 'local'" class="friend-local">
            <div class="friend-seats" aria-hidden="true"><UiIcon name="people" /><span></span><UiIcon name="monitor" /><span></span><UiIcon name="people" /></div>
            <h2>Bir masa, iki oyuncu.</h2>
            <p>Yan yana oturun. Sırayla zar atıp aynı masayı paylaşın.</p>
          </div>
          <template v-else>
            <p id="room-preview-note" class="preview-note">Oda önizlemesi · Gerçek bağlantı kurulmaz. Devam ederseniz aynı bilgisayarda oynarsınız.</p>
            <div v-if="isHost" class="friend-room-inline">
              <div><span class="room-code-label">Örnek davet kodu</span><strong class="room-code">SKAL26</strong></div>
              <button class="secondary-action" @click="copyCode"><UiIcon name="copy" />{{ copied ? 'Kod kopyalandı' : 'Kodu kopyala' }}</button>
              <button class="text-button" :aria-pressed="guestPresent" @click="guestPresent = !guestPresent">{{ guestPresent ? 'Bekleme durumunu göster' : 'Arkadaş katılımını önizle' }}</button>
            </div>
            <form v-else class="friend-join-form" @submit.prevent="joinRoom">
              <label for="room-code">Oda kodu</label>
              <div class="friend-code-entry"><input id="room-code" v-model="roomCode" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="6" placeholder="Örn. SKAL26"
                :aria-invalid="!!roomError" :aria-describedby="roomError ? 'room-preview-note room-error' : 'room-preview-note'" />
                <button class="secondary-action" type="submit">Katıl</button></div>
            </form>
            <div v-if="isHost || roomJoined" class="room-players" aria-label="Odadaki oyuncular">
              <div class="room-player"><UiIcon name="people" /><span><strong>Oda sahibi</strong><small>{{ isHost ? 'Sen' : 'Arkadaşın' }}</small></span><UiIcon name="check" /></div>
              <div class="room-player" :class="{ 'is-waiting': isHost && !guestPresent }"><UiIcon :name="isHost && !guestPresent ? 'people' : 'check'" /><span><strong>Misafir</strong><small>{{ isHost ? guestPresent ? 'Arkadaşın' : 'Henüz katılmadı' : 'Sen' }}</small></span><span class="room-presence" :class="{ ready: !isHost || guestPresent }"></span></div>
            </div>
            <div class="friend-room-status" role="status" aria-live="polite" :class="{ 'is-waiting': isHost && !guestPresent, 'is-ready': roomReady }">
              <span class="room-status-mark" aria-hidden="true"><UiIcon :name="roomReady ? 'check' : 'people'" /></span>
              <span>{{ roomStatus }}<small v-if="isHost || roomJoined">{{ isHost && !guestPresent ? '1 / 2' : '2 / 2' }} oyuncu · Oda önizlemesi</small></span>
            </div>
            <p v-if="roomError" id="room-error" class="field-error" role="alert">{{ roomError }}</p>
          </template>
        </div>
        </div>
      </div>
      <div v-if="!desktopWelcome || friendOpen" class="flow-footer">
        <span>{{ roomPreview ? 'Oda arayüzü önizlemesi' : selectedMode === 'friend' ? 'Aynı masada iki kişi' : 'Sen ve bilgisayar' }}</span>
        <button class="primary-action" :disabled="!roomReady" @click="continueMode">{{ roomPreview ? 'Yerel önizlemeyi başlat' : 'Tanrılarını seç' }}<UiIcon name="arrow" /></button>
      </div>
    </template>
    <template v-else-if="screen === 'gods'">
      <div class="flow-heading gods-heading">
        <div>
          <h1 tabindex="-1">Tanrılarını yanına al.</h1>
          <p>Yirmi tanrıdan üçü seninle masaya oturacak.</p>
        </div>
        <div class="player-tabs" aria-label="Tanrılarını seçtiğin oyuncu">
          <button
            v-for="id in PLAYER_IDS"
            :key="id"
            :aria-pressed="editingPlayer === id"
            @click="editingPlayer = id"
          >
            {{ playerName(id) }} <span>{{ loadouts[id].length }}/3</span>
          </button>
        </div>
      </div>
      <div class="gods-layout">
        <div class="god-gallery" role="group" aria-label="20 tanrı kataloğu">
          <button
            v-for="id in FAVOR_ART_IDS"
            :key="id"
            class="god-tile"
            :class="{ browsing: browsing === id }"
            :aria-pressed="currentLoadout.includes(id)"
            :aria-label="`${shortName(id)}, ${favorSummary(id).label}${currentLoadout.includes(id) ? ', kuşanıldı; kaldır' : currentLoadout.length === 3 ? ', gücü incele' : ', kuşan'}`"
            @click="toggleFavor(id)"
          >
            <FavorPortrait :id="id" />
            <span v-if="currentLoadout.includes(id)" class="god-equipped"><UiIcon name="check" /><span class="sr-only">Kuşanıldı</span></span>
            <span class="god-tile-copy"><span class="god-tile-name">{{ shortName(id) }}</span>
              <span class="god-tile-power" :data-tone="favorSummary(id).tone"><UiIcon :name="favorSummary(id).icon" /><span>{{ favorSummary(id).label }}</span></span>
            </span>
          </button>
        </div>
        <aside
          class="loadout-sidebar"
          aria-label="Seçilen tanrılar ve güç açıklaması"
        >
          <label class="name-field" v-if="editingPlayer === 'player-1' || local"
            >Oyuncu adı<input v-model="names[editingPlayer]" maxlength="28"
          /></label>
          <div class="loadout-heading">
            <h2>Yanındaki tanrılar</h2>
            <span role="status" aria-live="polite"
              >{{ currentLoadout.length }} / 3</span
            >
          </div>
          <div class="chosen-gods">
            <div
              v-for="(id, index) in currentLoadout"
              :key="id"
              class="chosen-god"
            >
              <FavorPortrait :id="id" /><span
                ><small>{{ index + 1 }}. tanrı</small
                ><strong>{{ shortName(id) }}</strong></span
              ><button
                class="icon-button"
                :aria-label="`${shortName(id)} tanrısını kaldır`"
                @click="toggleFavor(id)"
              >
                <UiIcon name="close" /><span>Kaldır</span>
              </button>
            </div>
            <div
              v-for="slot in 3 - currentLoadout.length"
              :key="`empty-${slot}`"
              class="empty-god"
            >
              <span>{{ currentLoadout.length + slot }}</span
              >Bir tanrı seç
            </div>
          </div>
          <section class="god-description" aria-live="polite">
            <div class="description-heading"><FavorPortrait :id="browsing" /><div><h2>{{ shortName(browsing) }}</h2><p class="god-effect-summary" :data-tone="favorSummary(browsing).tone"><UiIcon :name="favorSummary(browsing).icon" />{{ favorSummary(browsing).label }}</p></div></div>
            <p class="favor-timing">
              {{
                FAVOR_CATALOG[browsing].timing === "before-resolution"
                  ? "Savaş öncesi"
                  : "Savaş sonrası"
              }}
              · Öncelik {{ FAVOR_CATALOG[browsing].priority }}
            </p>
            <dl>
              <div v-for="tier in [1, 2, 3] as const" :key="tier">
                <dt>{{ FAVOR_CATALOG[browsing].tiers[tier].cost }}<TokenIcon /><span class="sr-only"> jeton</span></dt>
                <dd>{{ describeFavorTier(browsing, tier) }}</dd>
              </div>
            </dl>
            <p
              v-if="
                currentLoadout.length === 3 &&
                !currentLoadout.includes(browsing)
              "
              class="selection-hint"
            >
              Kuşanmak için önce seçili bir tanrıyı kaldır.
            </p>
          </section>
        </aside>
      </div>
      <div class="flow-footer">
        <span>{{
          currentLoadout.length === 3
            ? "Üç tanrın hazır."
            : `${3 - currentLoadout.length} tanrı daha seç.`
        }}</span
        ><button
          class="primary-action"
          :disabled="!canContinueGods"
          @click="continueGods"
        >
          {{
            local && editingPlayer === "player-1"
              ? "İkinci oyuncunun tanrıları"
              : "İlk hamleyi belirle"
          }}<UiIcon name="arrow" />
        </button>
      </div>
    </template>
    <template v-else>
      <div class="coin-screen">
        <h1 tabindex="-1">İlk hamle kaderden.</h1>
        <p>Tanrılar seçildi. İlk zarı kimin atacağını belirleyelim.</p>
        <div class="coin-stage">
          <div
            class="toss-coin"
            :class="{ tossed: firstPlayer }"
            :key="firstPlayer ?? 'untossed'"
          >
            <span v-if="firstPlayer">{{
              firstPlayer === "player-1" ? "I" : "II"
            }}</span
            ><SymbolIcon v-else symbol="axe" />
          </div>
        </div>
        <p class="coin-announcement" role="status" aria-live="polite">
          {{
            firstPlayer
              ? `${playerName(firstPlayer)} ilk başlayacak.`
              : "Yazı mı, tura mı? Şans iki tarafa da eşit."
          }}
        </p>
        <button v-if="!firstPlayer" class="primary-action" @click="toss">
          Yazı tura at <UiIcon name="arrow" /></button
        ><button v-else data-coin-start class="primary-action" @click="start">
          {{ roomPreview ? "Yerel önizlemeyi başlat" : "Masaya geç" }}
          <UiIcon name="arrow" />
        </button>
        <p v-if="roomPreview" class="preview-note">
          Bu önizleme aynı cihazda iki oyuncuyla devam eder.
        </p>
        <div class="coin-loadouts">
          <div v-for="id in PLAYER_IDS" :key="id">
            <strong>{{ playerName(id) }}</strong>
            <div>
              <FavorPortrait
                v-for="favor in loadouts[id]"
                :key="favor"
                :id="favor"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>
