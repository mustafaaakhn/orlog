<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import FavorPortrait from "./FavorPortrait.vue";
import UiIcon from "./UiIcon.vue";
import SymbolIcon from "./SymbolIcon.vue";
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
import { DIFFICULTIES } from "../ai/computer";
import type { Difficulty, OpponentOptions } from "../ai/computer";
type Screen = "welcome" | "mode" | "room" | "gods" | "coin";
const emit = defineEmits<{
  start: [
    options: GameOptions,
    names: Record<PlayerId, string>,
    opponent: OpponentOptions,
  ];
  screen: [screen: Screen];
}>();
const screen = ref<Screen>("welcome");
const selectedMode = ref<"computer" | "friend" | "room">("computer");
const friendMode = ref<"local" | "join">("local");
const difficulty = ref<Difficulty>("normal");
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
const roomPreview = computed(
  () =>
    selectedMode.value === "room" ||
    (selectedMode.value === "friend" && friendMode.value === "join"),
);
const isHost = computed(() => selectedMode.value === "room");
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
    await nextTick();
    document
      .querySelector<HTMLElement>(".setup-screen h1")
      ?.focus({ preventScroll: true });
  },
  { immediate: true },
);
function goBack() {
  if (screen.value === "mode") screen.value = "welcome";
  else if (screen.value === "room") screen.value = "mode";
  else if (screen.value === "gods")
    screen.value = roomPreview.value ? "room" : "mode";
  else if (screen.value === "coin") {
    firstPlayer.value = null;
    screen.value = "gods";
  }
}
function continueMode() {
  roomError.value = "";
  screen.value = roomPreview.value ? "room" : "gods";
}
function joinRoom() {
  if (!/^[A-Z0-9]{6}$/.test(roomCode.value.trim().toUpperCase())) {
    roomError.value = "6 harf veya rakamdan oluşan bir oda kodu gir.";
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
        difficulty: difficulty.value,
      },
    );
}
</script>
<template>
  <section
    v-if="screen === 'welcome'"
    class="welcome-screen setup-screen"
    aria-labelledby="welcome-title"
  >
    <div class="welcome-copy">
      <h1 id="welcome-title" tabindex="-1">Bir avuç zar.<br />Bir destan.</h1>
      <p>
        Tanrılarını yanına al. Zarlarını at.<br />Kuzeyin masasında kaderini
        kendin seç.
      </p>
      <button class="primary-action welcome-play" @click="screen = 'mode'">
        Oyna <UiIcon name="arrow" />
      </button>
      <div class="welcome-symbols" aria-label="Altı zar, üç tanrı, tek kazanan">
        <SymbolIcon symbol="axe" /><span>6 zar</span
        ><span class="welcome-divider"></span><span>3 tanrı</span
        ><span class="welcome-divider"></span><span>Tek kazanan</span>
      </div>
    </div>
    <p class="welcome-footnote">
      Valhalla’dan ilham alan bağımsız bir hayran uyarlaması.
    </p>
  </section>
  <section
    v-else
    class="setup-screen flow-screen"
    :class="`screen-${screen}`"
    aria-label="Yeni oyun hazırlığı"
  >
    <nav class="flow-navigation" aria-label="Hazırlık adımları">
      <button class="text-button back-button" @click="goBack">
        <UiIcon name="back" /> Geri
      </button>
      <ol>
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
        <div class="flow-heading">
          <h1 tabindex="-1">Masada kiminle karşılaşacaksın?</h1>
          <p>Bir rakip seç. Sonra tanrılarını kuşanıp masaya geçelim.</p>
        </div>
        <div class="mode-selection" aria-label="Oyun modu">
          <button
            :aria-pressed="selectedMode === 'computer'"
            @click="selectedMode = 'computer'"
          >
            <UiIcon name="robot" />
            <h2>Robota karşı</h2>
            <p>Kendi hızında oyna. Üç zorluk, aynı mücadele.</p>
            <span
              >{{ selectedMode === "computer" ? "Seçildi" : "Tek oyuncu"
              }}<UiIcon v-if="selectedMode === 'computer'" name="check"
            /></span>
          </button>
          <button
            :aria-pressed="selectedMode === 'friend'"
            @click="selectedMode = 'friend'"
          >
            <UiIcon name="people" />
            <h2>Arkadaşınla</h2>
            <p>Aynı cihazı paylaş veya bir odaya katıl.</p>
            <span
              >{{ selectedMode === "friend" ? "Seçildi" : "İki oyuncu"
              }}<UiIcon v-if="selectedMode === 'friend'" name="check"
            /></span>
          </button>
          <button
            :aria-pressed="selectedMode === 'room'"
            @click="selectedMode = 'room'"
          >
            <UiIcon name="door" />
            <h2>Oda kur</h2>
            <p>Kodunu paylaş. Arkadaşını masana davet et.</p>
            <span
              >Oda önizlemesi<UiIcon
                v-if="selectedMode === 'room'"
                name="check"
            /></span>
          </button>
        </div>
        <div class="mode-detail">
          <template v-if="selectedMode === 'computer'"
            ><fieldset class="difficulty-options">
              <legend>Zorluk</legend>
              <button
                v-for="(entry, key) in DIFFICULTIES"
                :key="key"
                :aria-pressed="difficulty === key"
                @click="difficulty = key"
              >
                {{ entry.label }}
              </button>
            </fieldset>
            <p>{{ DIFFICULTIES[difficulty].description }}</p></template
          >
          <template v-else-if="selectedMode === 'friend'"
            ><div
              class="segmented-control"
              aria-label="Arkadaşınla oynama şekli"
            >
              <button
                :aria-pressed="friendMode === 'local'"
                @click="friendMode = 'local'"
              >
                Aynı cihazda</button
              ><button
                :aria-pressed="friendMode === 'join'"
                @click="friendMode = 'join'"
              >
                Odaya katıl
              </button>
            </div>
            <p>
              {{
                friendMode === "local"
                  ? "Yan yana oturun. Sırayla zar atıp aynı masayı paylaşın."
                  : "Arkadaşının oda koduyla katılma ekranını incele. Çevrim içi oyun yakında."
              }}
            </p></template
          >
          <p v-else class="preview-note">
            Oda akışını inceleyebilirsin. Çevrim içi bağlantı daha sonra
            eklenecek.
          </p>
        </div>
      </div>
      <div class="flow-footer">
        <span>{{
          selectedMode === "computer"
            ? "Sen ve bilgisayar"
            : selectedMode === "room"
              ? "Özel oda · Arayüz önizlemesi"
              : friendMode === "local"
                ? "Aynı masada iki kişi"
                : "Odaya katılım · Arayüz önizlemesi"
        }}</span
        ><button class="primary-action" @click="continueMode">
          {{ roomPreview ? "Odaya geç" : "Tanrılarını seç" }}
          <UiIcon name="arrow" />
        </button>
      </div>
    </template>
    <template v-else-if="screen === 'room'">
      <div class="flow-heading">
        <h1 tabindex="-1">
          {{
            isHost
              ? "Masan hazır. Arkadaşını davet et."
              : roomJoined
                ? "Masada yerin hazır."
                : "Arkadaşının masasına katıl."
          }}
        </h1>
        <p>Oda önizlemesi. Bu ekranda gerçek bir bağlantı kurulmaz.</p>
      </div>
      <div class="room-layout">
        <div class="room-code-area">
          <template v-if="isHost"
            ><h2>Davet kodun</h2>
            <div class="room-code">SKAL26</div>
            <button class="secondary-action" @click="copyCode">
              <UiIcon name="copy" />{{
                copied ? "Kod kopyalandı" : "Kodu kopyala"
              }}
            </button>
            <p>
              Arkadaşın bu kodla odana katılacak.<br />Oyunu yalnızca sen
              başlatabilirsin.
            </p></template
          >
          <form v-else-if="!roomJoined" @submit.prevent="joinRoom">
            <label for="room-code">Oda kodu</label
            ><input
              id="room-code"
              v-model="roomCode"
              autocomplete="off"
              autocapitalize="characters"
              spellcheck="false"
              maxlength="6"
              placeholder="Örn. SKAL26"
              :aria-invalid="!!roomError"
              :aria-describedby="roomError ? 'room-error' : undefined"
            /><button class="primary-action" type="submit">
              Katılımı önizle <UiIcon name="arrow" />
            </button>
          </form>
          <template v-else
            ><h2>Katıldığın oda</h2>
            <div class="room-code">{{ roomCode.toUpperCase() }}</div>
            <p>Oda sahibinin başlatması bekleniyor.</p></template
          >
          <p v-if="roomError" id="room-error" class="field-error" role="alert">
            {{ roomError }}
          </p>
        </div>
        <div class="room-players">
          <h2>
            Masadakiler
            <span
              >{{
                (isHost && !guestPresent) || (!isHost && !roomJoined)
                  ? "1"
                  : "2"
              }}
              / 2</span
            >
          </h2>
          <div class="room-player">
            <UiIcon name="people" />
            <div>
              <strong>{{ isHost ? "Sen" : "Oda sahibi" }}</strong
              ><span>Oda sahibi</span>
            </div>
            <span class="ready-label">Hazır</span>
          </div>
          <div
            class="room-player"
            :class="{ waiting: isHost ? !guestPresent : !roomJoined }"
          >
            <UiIcon name="people" />
            <div>
              <strong>{{
                isHost
                  ? guestPresent
                    ? "Arkadaşın"
                    : "Arkadaş bekleniyor"
                  : roomJoined
                    ? "Sen"
                    : "Boş koltuk"
              }}</strong
              ><span>{{
                isHost
                  ? guestPresent
                    ? "Katılım önizlemesi"
                    : "Davet koduyla katılacak"
                  : roomJoined
                    ? "Misafir"
                    : "Kodunu girerek katıl"
              }}</span>
            </div>
            <UiIcon v-if="isHost ? guestPresent : roomJoined" name="check" />
          </div>
          <button
            v-if="isHost"
            class="text-button"
            @click="guestPresent = !guestPresent"
          >
            {{
              guestPresent
                ? "Bekleme durumunu göster"
                : "Arkadaş katılımını önizle"
            }}
          </button>
        </div>
      </div>
      <div class="flow-footer">
        <span role="status">{{
          isHost
            ? guestPresent
              ? "İki oyuncu da masada."
              : "Arkadaşının katılması bekleniyor."
            : "Başlatma yetkisi oda sahibinde."
        }}</span
        ><button
          v-if="isHost"
          class="primary-action"
          :disabled="!guestPresent"
          @click="screen = 'gods'"
        >
          Tanrı seçimine geç <UiIcon name="arrow" /></button
        ><button
          v-else
          class="secondary-action"
          :disabled="!roomJoined"
          @click="screen = 'gods'"
        >
          Tanrı seçimini önizle <UiIcon name="arrow" />
        </button>
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
            :aria-label="`${shortName(id)}${currentLoadout.includes(id) ? ', kuşanıldı; kaldır' : currentLoadout.length === 3 ? ', gücü incele' : ', kuşan'}`"
            @click="toggleFavor(id)"
          >
            <FavorPortrait :id="id" /><span class="god-tile-name"
              >{{ shortName(id)
              }}<UiIcon v-if="currentLoadout.includes(id)" name="check" /></span
            ><span class="god-tile-power">{{
              FAVOR_CATALOG[id].name
                .split("'")
                .slice(1)
                .join("'")
                .replace(/^[a-zıiuü]+\s/, "") || "Tanrı gücü"
            }}</span>
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
                <UiIcon name="close" />
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
            <h2>{{ FAVOR_CATALOG[browsing].name }}</h2>
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
                <dt>{{ FAVOR_CATALOG[browsing].tiers[tier].cost }} jeton</dt>
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
