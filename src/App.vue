<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { usePreferences } from './app/preferences'
import { createAudioPlayer } from './audio/player'
import ExperienceSettings from './ui/ExperienceSettings.vue'
import SymbolIcon from './ui/SymbolIcon.vue'
import { SYMBOL_GUIDE } from './scene/symbols'
import SceneLoaderState from './ui/SceneLoaderState.vue'
import DiceTray from './ui/DiceTray.vue'
import MatchSetup from './ui/MatchSetup.vue'
import FavorPicker from './ui/FavorPicker.vue'
import { eventText, playerLabel } from './presentation/eventText'
import type { GameOptions, PlayerId, FavorId, FavorLevel, FavorInput } from './core'
import { createRollSession } from './app/rollSession'
import { createComputerDriver } from './app/computerDriver'
import { DIFFICULTIES } from './ai/computer'
import type { OpponentOptions } from './ai/computer'

const TablePreview = defineAsyncComponent({
  loader: () => import('./scene/TablePreview.vue'),
  loadingComponent: SceneLoaderState,
  errorComponent: SceneLoaderState,
  delay: 0,
  timeout: 30000,
})
const preparing = ref(true)
const { settings, system } = usePreferences()
const reduced = computed(() => settings.motion === 'reduce' || (settings.motion === 'system' && system.reduced))
const speed = computed(() => settings.fast ? 4 : 1)
const audioFailed = ref(false)
const audio = createAudioPlayer(failed => { audioFailed.value = failed })
const paused = ref(document.hidden)
watch(settings, value => audio.configure(value), { immediate: true })
const unlockAudio = () => audio.unlock()
const visibility = () => { paused.value = document.hidden; audio.visibility(paused.value) }
onMounted(() => {
  audio.visibility(document.hidden)
  document.addEventListener('pointerdown', unlockAudio, { capture: true })
  document.addEventListener('keydown', unlockAudio, { capture: true })
  document.addEventListener('visibilitychange', visibility)
})
onUnmounted(() => {
  document.removeEventListener('pointerdown', unlockAudio, { capture: true })
  document.removeEventListener('keydown', unlockAudio, { capture: true })
  document.removeEventListener('visibilitychange', visibility)
  audio.dispose()
})
const names = ref<Record<PlayerId, string>>({ 'player-1': 'Oyuncu I', 'player-2': 'Oyuncu II' })
const opponent = ref<OpponentOptions>({ mode: 'computer', difficulty: 'normal' })
function start(options: GameOptions, playerNames: Record<PlayerId, string>, opponentOptions: OpponentOptions) {
  if (session.start(options)) { names.value = playerNames; opponent.value = opponentOptions; preparing.value = false; void nextTick(focusAction) }
}
function restart() { if (!busy.value) { audio.stopEffects(); session.restart(); preparing.value = true; void nextTick(() => document.querySelector<HTMLInputElement>('.setup-panel input')?.focus()) } }
const closeView = ref(false)
const guideOpen = ref(false)
const sceneReady = ref(false)
const session = createRollSession()
const { state, pending, error, lastEvent, history } = session
const combatLog = computed(() => history.value.map(event => ({ id: event.id, text: eventText(event) })).filter(event => event.text).slice(reduced.value ? -120 : -16))
const phase = computed(() => state.value.phase)
const activePlayer = computed(() =>
  phase.value.name === 'roll' || phase.value.name === 'favor'
    ? state.value.players[phase.value.activePlayerId]
    : null,
)
const busy = computed(() => !!pending.value || !sceneReady.value)
const computerTurn = computed(() => !preparing.value && opponent.value.mode === 'computer' && activePlayer.value?.id === 'player-2')
const driver = createComputerDriver(command => session.dispatch(command))
watch([state, pending, preparing, sceneReady, paused, opponent], () => {
  driver.update({ state: state.value, playerId: opponent.value.mode === 'computer' ? 'player-2' : null,
    difficulty: opponent.value.difficulty, blocked: preparing.value || busy.value || paused.value })
}, { immediate: true, flush: 'sync' })
onUnmounted(() => driver.dispose())
function selectDie(dieId: Parameters<typeof session.select>[0]) {
  if (!busy.value && !computerTurn.value && !preparing.value) session.select(dieId)
}
const instruction = computed(() => {
  if (pending.value?.events.some((event) => event.type === 'DiceRolled'))
    return 'Zarlar kâsede yatışıyor…'
  if (pending.value) return eventText(lastEvent.value) || 'Olaylar masada çözülüyor…'
  if (computerTurn.value) return `Bilgisayar düşünüyor… (${DIFFICULTIES[opponent.value.difficulty].label})`
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
const phaseTitle = computed(() => preparing.value ? 'Maç hazırlığı · Mod ve güç seçimi' :
  phase.value.name === 'ended' ? `${names.value[phase.value.winnerId]} kazandı` :
  `Tur ${state.value.round} · ${activePlayer.value ? names.value[activePlayer.value.id] + ' · ' : ''}${phase.value.name === 'roll' ? 'Zar atışı ve seçim' : phase.value.name === 'favor' ? 'Güç seçimi' : phase.value.name === 'resolution' ? 'Savaş' : 'Tur tamamlandı'}`)
function focusAction() {
  const panel = document.querySelector('.roll-panel:not(.setup-panel)')
  const action = panel?.querySelector<HTMLElement>('.primary-action:not(:disabled), .favor-picker button:not(:disabled)') ?? panel?.querySelector<HTMLElement>('.restart-action:not(:disabled)')
  action?.focus({ preventScroll: true })
}
let previousFocus: HTMLElement | null = null
watch(pending, async (value, old) => {
  if (value) {
    const element = document.activeElement as HTMLElement | null
    previousFocus = element?.closest('.roll-panel') ? element : null
  } else if (old) {
    await nextTick()
    const current = document.activeElement
    if (previousFocus && (current === document.body || current === previousFocus)) {
      if (previousFocus.isConnected && !previousFocus.matches(':disabled')) previousFocus.focus({ preventScroll: true })
      else focusAction()
    }
    previousFocus = null
  }
}, { flush: 'sync' })
function choose(favorId: FavorId, level: FavorLevel, input?: FavorInput) {
  if (!busy.value && !computerTurn.value && phase.value.name === 'favor') session.dispatch({ type: 'ChooseFavor', playerId: phase.value.activePlayerId, favorId, level, input })
}
function skip() {
  if (!busy.value && !computerTurn.value && phase.value.name === 'favor') session.dispatch({ type: 'SkipFavor', playerId: phase.value.activePlayerId })
}
function advance() {
  if (busy.value) return
  if (phase.value.name === 'resolution' || phase.value.name === 'round-complete') session.dispatch({ type: phase.value.name === 'resolution' ? 'ResolveRound' : 'NextRound', playerId: state.value.firstPlayerId })
}
function availability(ready: boolean) {
  sceneReady.value = ready
  if (!ready) { audio.stopEffects(); session.recover() }
}
function roll() {
  if (!busy.value && !computerTurn.value && phase.value.name === 'roll')
    session.dispatch({
      type: 'RollDice',
      playerId: phase.value.activePlayerId,
    })
}
function confirm() {
  if (!busy.value && !computerTurn.value && phase.value.name === 'roll')
    session.dispatch({
      type: 'ConfirmRoll',
      playerId: phase.value.activePlayerId,
    })
}
</script>

<template>
  <main class="experience" :data-reduced-motion="reduced">
    <a v-if="!preparing" class="skip-link" href="#match-controls">Oyun kontrollerine geç</a>
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
      <div class="phase-banner" role="status" aria-live="polite" aria-atomic="true">
        <span aria-hidden="true">ᛟ</span><strong>{{ phaseTitle }}</strong><span v-if="pending">{{ paused ? 'Sekme arka planda · duraklatıldı' : 'Animasyon sürüyor' }}</span>
      </div>
      <ExperienceSettings :settings="settings" :audio-failed="audioFailed" @retry="audio.unlock()" />
      <details class="rules-guide"><summary>Nasıl oynanır?</summary><ol>
        <li>Bilgisayara karşı veya aynı cihazda iki kişilik maç seç. Bilgisayar sırasını kendi oynar; savaşı ve sonraki turu sen başlatırsın.</li>
        <li>Her oyuncu 15 can, 0 jeton ve üç güçle başlar. Yazı tura ilk oyuncuyu seçer.</li>
        <li>Dönüşümlü en fazla üç atış yap. Saklayacağın zarları seçip onayla; üçüncü atış otomatik saklanır.</li>
        <li>Altın çerçeveler jeton verir. Ok kalkanla, balta miğferle engellenir. El, rakibin jetonlarını çalar.</li>
        <li>Bir güç ve seviye seç veya pas geç. Bedel güç çalıştığında ödenir; yetmezse güç uygulanmaz.</li>
        <li>Savaş: önce güçler → altın jetonlar → oklar → baltalar → çalma → son güçler. İlk 0 can maçı bitirir.</li>
      </ol><p>Zar düğmelerinde Tab ile ilerle, Space veya Enter ile seç. Ok tuşları, Home ve End ile zarlar arasında gezinebilirsin. Seçimden sonra onay düğmesini kullan.</p></details>
      <MatchSetup v-if="preparing" @start="start" />
      <div class="table-frame">
        <div class="frame-corner top-left" aria-hidden="true"></div>
        <div class="frame-corner bottom-right" aria-hidden="true"></div>
        <div class="scene-caption">
          <span class="small-diamond" aria-hidden="true">◆</span>
          {{ closeView ? 'KEMİK ZARLAR' : 'MASA YERLEŞİMİ' }}
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
          <span class="small-diamond" aria-hidden="true">◇</span> {{ preparing ? 'Yerel maç · Modunu seç' : opponent.mode === 'computer' ? `Bilgisayara karşı · ${DIFFICULTIES[opponent.difficulty].label}` : 'Yerel iki oyuncu' }} <span class="meta-divider">/</span> 15 can · 0 jeton
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
        id="match-controls"
        tabindex="-1"
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
              v-if="!computerTurn && phase.name === 'roll' && phase.step === 'awaiting-roll'"
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
                  ? 'Sonucu onayla'
                  : 'Seçimi onayla'
              }}
              <span aria-hidden="true">→</span>
            </button>
            <button v-if="phase.name === 'resolution' || phase.name === 'round-complete'" class="primary-action" :disabled="busy" @click="advance">{{ phase.name === 'resolution' ? 'Savaşı başlat' : 'Sonraki tur' }} →</button>
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
        <FavorPicker v-if="!computerTurn && phase.name === 'favor'" :key="phase.activePlayerId" :state="state" :player="state.players[phase.activePlayerId]" :disabled="busy" @choose="choose" @skip="skip" />
        <details v-if="combatLog.length" class="combat-log" :open="reduced"><summary>Tur olayları</summary><ol><li v-for="event in combatLog" :key="event.id">{{ event.text }}</li></ol></details>
        <div class="dice-trays">
          <DiceTray
            v-for="player in state.players"
            :key="player.id"
            :player="player"
            :active="activePlayer?.id === player.id"
            :selectable="
              !busy && !computerTurn &&
              phase.name === 'roll' &&
              phase.step === 'selecting-dice' &&
              phase.activePlayerId === player.id
            "
            @select="selectDie"
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
            <p>20 güç · oyuncu başına üç totem</p>
          </div>
          <span class="inventory-glyph" aria-hidden="true">ᛉ</span>
        </article>
      </div>
    </section>
    <footer>
      <span>VALHALLA’DAN İLHAM ALAN BİR MASA DENEYİMİ</span
      ><span>AŞAMA 07 <span aria-hidden="true">/</span> BİLGİSAYAR RAKİBİ</span>
    </footer>
  </main>
</template>

<style>
@import './ui/styles.css';
</style>
