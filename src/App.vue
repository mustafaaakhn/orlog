<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue'
import SymbolIcon from './ui/SymbolIcon.vue'
import { SYMBOL_GUIDE } from './scene/symbols'
import SceneLoaderState from './ui/SceneLoaderState.vue'
import DiceTray from './ui/DiceTray.vue'
import MatchSetup from './ui/MatchSetup.vue'
import FavorPicker from './ui/FavorPicker.vue'
import { eventText, playerLabel } from './presentation/eventText'
import type { GameOptions, PlayerId, FavorId, FavorLevel } from './core'
import { createRollSession } from './app/rollSession'

const TablePreview = defineAsyncComponent({
  loader: () => import('./scene/TablePreview.vue'),
  loadingComponent: SceneLoaderState,
  errorComponent: SceneLoaderState,
  delay: 0,
  timeout: 30000,
})
const preparing = ref(true)
const speed = ref(1)
const names = ref<Record<PlayerId, string>>({ 'player-1': 'Oyuncu I', 'player-2': 'Oyuncu II' })
function start(options: GameOptions, playerNames: Record<PlayerId, string>) {
  if (session.start(options)) { names.value = playerNames; preparing.value = false }
}
function restart() { if (!busy.value) { session.restart(); preparing.value = true } }
const closeView = ref(false)
const guideOpen = ref(false)
const sceneReady = ref(false)
const session = createRollSession()
const { state, pending, error, lastEvent, history } = session
const combatLog = computed(() => history.value.map(event => ({ id: event.id, text: eventText(event) })).filter(event => event.text).slice(-16))
const phase = computed(() => state.value.phase)
const activePlayer = computed(() =>
  phase.value.name === 'roll' || phase.value.name === 'favor'
    ? state.value.players[phase.value.activePlayerId]
    : null,
)
const busy = computed(() => !!pending.value || !sceneReady.value)
const instruction = computed(() => {
  if (pending.value?.events.some((event) => event.type === 'DiceRolled'))
    return 'Zarlar kâsede yatışıyor…'
  if (pending.value) return eventText(lastEvent.value) || 'Olaylar masada çözülüyor…'
  if (phase.value.name === 'ended') return `${names.value[phase.value.winnerId]} kazandı. Yeni bir maç için yeniden başlat.`
  if (phase.value.name === 'round-complete') return 'Tur tamamlandı. Sonraki turda ilk oyuncu değişecek; canlar ve jetonlar korunur.'
  if (phase.value.name === 'resolution') return 'İki güç seçimi de tamamlandı. Savaşı başlat.'
  if (phase.value.name === 'favor') return `${names.value[phase.value.activePlayerId]} bir güç seçebilir veya pas geçebilir.`
  if (phase.value.step === 'awaiting-roll')
    return 'Saklanmayan zarları at. Her oyuncunun en fazla üç atış hakkı var.'
  if (activePlayer.value?.rollsUsed === 3)
    return 'Son atışın zarları otomatik saklandı. Sonucu onayla.'
  return 'Saklamak istediğin zarlara dokun; geri almak için tekrar dokun. Ardından seçimi onayla.'
})
function choose(favorId: FavorId, level: FavorLevel) {
  if (!busy.value && phase.value.name === 'favor') session.dispatch({ type: 'ChooseFavor', playerId: phase.value.activePlayerId, favorId, level })
}
function skip() {
  if (!busy.value && phase.value.name === 'favor') session.dispatch({ type: 'SkipFavor', playerId: phase.value.activePlayerId })
}
function advance() {
  if (busy.value) return
  if (phase.value.name === 'resolution' || phase.value.name === 'round-complete') session.dispatch({ type: phase.value.name === 'resolution' ? 'ResolveRound' : 'NextRound', playerId: state.value.firstPlayerId })
}
function availability(ready: boolean) {
  sceneReady.value = ready
  if (!ready) session.recover()
}
function roll() {
  if (!busy.value && phase.value.name === 'roll')
    session.dispatch({
      type: 'RollDice',
      playerId: phase.value.activePlayerId,
    })
}
function confirm() {
  if (!busy.value && phase.value.name === 'roll')
    session.dispatch({
      type: 'ConfirmRoll',
      playerId: phase.value.activePlayerId,
    })
}
</script>

<template>
  <main class="experience">
    <header class="masthead">
      <a class="wordmark" href="./" aria-label="Orlog ana sayfa"
        ><span aria-hidden="true">ᛟ</span> ORLOG</a
      >
      <span class="edition">KUZEYİN ZAR OYUNU</span>
      <span class="prototype"
        ><span aria-hidden="true"></span> YEREL TAM MAÇ</span
      >
    </header>
    <section class="table-section" aria-labelledby="table-title">
      <div class="table-heading">
        <div>
          <p class="eyebrow">AHŞAP, KEMİK VE KADER</p>
          <h1 id="table-title">Tanrıların masası</h1>
        </div>
        <p class="intro">
          Altı zar. Üç atış.<br />Kaderinden hangisini saklayacaksın?
        </p>
      </div>
      <MatchSetup v-if="preparing" @start="start" />
      <div class="table-frame">
        <div class="frame-corner top-left" aria-hidden="true"></div>
        <div class="frame-corner bottom-right" aria-hidden="true"></div>
        <div class="scene-caption">
          <span class="small-diamond" aria-hidden="true">◆</span>
          {{ closeView ? 'KEMİK ZARLAR' : 'MASA YERLEŞİMİ' }}
        </div>
        <TablePreview
          :speed="speed"
          :close-view="closeView"
          :state="state"
          :batch="pending"
          @availability="availability"
          @presented="session.present"
          @settled="session.settle($event)"
          @select="!busy && session.select($event)"
        />
        <div class="view-controls" aria-label="Sahne görünümü">
          <button
            :disabled="busy"
            :aria-pressed="!closeView"
            @click="closeView = false"
          >
            Masa
          </button>
          <button
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
          <span class="small-diamond" aria-hidden="true">◇</span> Yerel iki
          oyuncu <span class="meta-divider">/</span> 15 can · 0 jeton
        </p>
        <button
          class="guide-toggle"
          :aria-expanded="guideOpen"
          aria-controls="symbol-guide"
          @click="guideOpen = !guideOpen"
        >
          Zar yüzlerini tanı
          <span aria-hidden="true">{{ guideOpen ? '−' : '+' }}</span>
        </button>
      </div>
      <section
        v-if="!preparing"
        class="roll-panel"
        aria-label="Zar atışı ve seçim"
        :aria-busy="!!pending"
      >
        <div class="turn-heading">
          <div>
            <p class="eyebrow">TUR {{ state.round }} · İLK SIRA {{ names[state.firstPlayerId] }}</p>
            <h2>{{ phase.name === 'ended' ? `${names[phase.winnerId]} kazandı` : activePlayer ? `${names[activePlayer.id]} · ${phase.name === 'favor' ? 'Güç seçimi' : `Atış ${Math.min(activePlayer.rollsUsed + (phase.name === 'roll' && phase.step === 'awaiting-roll' ? 1 : 0), 3)} / 3`}` : phase.name === 'resolution' ? 'Savaş zamanı' : 'Tur tamamlandı' }}</h2>
          </div>
          <div class="roll-actions">
            <button
              v-if="phase.name === 'roll' && phase.step === 'awaiting-roll'"
              class="primary-action"
              :disabled="busy"
              @click="roll"
            >
              Zarları at <span aria-hidden="true">↗</span>
            </button>
            <button
              v-else-if="phase.name === 'roll'"
              class="primary-action"
              :disabled="busy"
              @click="confirm"
            >
              {{
                activePlayer?.rollsUsed === 3
                  ? 'Sonucu onayla'
                  : 'Seçimi onayla'
              }}
              <span aria-hidden="true">→</span>
            </button>
            <button v-if="phase.name === 'resolution' || phase.name === 'round-complete'" class="primary-action" :disabled="busy" @click="advance">{{ phase.name === 'resolution' ? 'Savaşı başlat' : 'Sonraki tur' }} →</button>
            <label class="speed-control"><input v-model="speed" type="checkbox" :true-value="4" :false-value="1" :disabled="busy" /> Hızlı çözümleme</label>
            <button
              class="restart-action"
              :disabled="busy"
              @click="restart"
            >
              Yeniden başlat
            </button>
          </div>
        </div>
        <p class="roll-instruction" role="status" aria-live="polite">
          {{ instruction }}
        </p>
        <p v-if="error" role="alert">{{ error }}</p>
        <div class="resource-scores" aria-label="Oyuncu kaynakları">
          <p v-for="player in state.players" :key="player.id"><strong>{{ names[player.id] }}</strong><span>{{ playerLabel(player.id) }} · {{ player.health }} can · {{ player.tokens }} jeton</span></p>
        </div>
        <FavorPicker v-if="phase.name === 'favor'" :player="state.players[phase.activePlayerId]" :disabled="busy" @choose="choose" @skip="skip" />
        <details v-if="combatLog.length" class="combat-log"><summary>Tur olayları</summary><ol><li v-for="event in combatLog" :key="event.id">{{ event.text }}</li></ol></details>
        <div class="dice-trays">
          <DiceTray
            v-for="player in state.players"
            :key="player.id"
            :player="player"
            :active="activePlayer?.id === player.id"
            :selectable="
              !busy &&
              phase.name === 'roll' &&
              phase.step === 'selecting-dice' &&
              phase.activePlayerId === player.id
            "
            @select="session.select($event)"
          />
        </div>
      </section>
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
          <span aria-hidden="true">▣</span> Altın çerçeve, yüzün etkisine ek
          olarak bir tanrı jetonu verir.
        </p>
      </section>
      <div class="inventory" aria-label="Masa parçaları">
        <article>
          <span class="inventory-number">01</span>
          <div>
            <h2>Kemik zarlar</h2>
            <p>Altı farklı zar · beş kadim simge</p>
          </div>
          <SymbolIcon symbol="axe" />
        </article>
        <article>
          <span class="inventory-number">02</span>
          <div>
            <h2>Can &amp; kudret</h2>
            <p>Her yanda 15 taş · başlangıçta 0 jeton</p>
          </div>
          <span class="inventory-glyph" aria-hidden="true">◇</span>
        </article>
        <article>
          <span class="inventory-number">03</span>
          <div>
            <h2>Tanrı totemleri</h2>
            <p>Thor · Iðunn · Víðarr</p>
          </div>
          <span class="inventory-glyph" aria-hidden="true">ᛉ</span>
        </article>
      </div>
    </section>
    <footer>
      <span>VALHALLA’DAN İLHAM ALAN BİR MASA DENEYİMİ</span
      ><span>AŞAMA 04 <span aria-hidden="true">/</span> YEREL TAM MAÇ</span>
    </footer>
  </main>
</template>

<style>
@import './ui/styles.css';
</style>
