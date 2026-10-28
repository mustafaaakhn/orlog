<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue'
import SymbolIcon from './ui/SymbolIcon.vue'
import { SYMBOL_GUIDE } from './scene/symbols'
import SceneLoaderState from './ui/SceneLoaderState.vue'
import DiceTray from './ui/DiceTray.vue'
import { createRollSession } from './app/rollSession'

const TablePreview = defineAsyncComponent({
  loader: () => import('./scene/TablePreview.vue'),
  loadingComponent: SceneLoaderState,
  errorComponent: SceneLoaderState,
  delay: 0,
  timeout: 30000,
})
const closeView = ref(false)
const guideOpen = ref(false)
const sceneReady = ref(false)
const session = createRollSession()
const { state, pending, error } = session
const phase = computed(() => state.value.phase)
const activePlayer = computed(() =>
  phase.value.name === 'roll'
    ? state.value.players[phase.value.activePlayerId]
    : null,
)
const busy = computed(() => !!pending.value || !sceneReady.value)
const instruction = computed(() => {
  if (pending.value?.events.some((event) => event.type === 'DiceRolled'))
    return 'Zarlar kâsede yatışıyor…'
  if (pending.value) return 'Zarlar yerini alıyor…'
  if (phase.value.name !== 'roll')
    return 'İki tarafın zarları hazır. Güç seçimi ve savaş Aşama 4’te açılacak.'
  if (phase.value.step === 'awaiting-roll')
    return 'Saklanmayan zarları at. Her oyuncunun en fazla üç atış hakkı var.'
  if (activePlayer.value?.rollsUsed === 3)
    return 'Son atışın zarları otomatik saklandı. Sonucu onayla.'
  return 'Saklamak istediğin zarlara dokun; geri almak için tekrar dokun. Ardından seçimi onayla.'
})
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
        ><span aria-hidden="true"></span> ATIŞ VE SEÇİM</span
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
      <div class="table-frame">
        <div class="frame-corner top-left" aria-hidden="true"></div>
        <div class="frame-corner bottom-right" aria-hidden="true"></div>
        <div class="scene-caption">
          <span class="small-diamond" aria-hidden="true">◆</span>
          {{ closeView ? 'KEMİK ZARLAR' : 'MASA YERLEŞİMİ' }}
        </div>
        <TablePreview
          :close-view="closeView"
          :state="state"
          :batch="pending"
          @availability="availability"
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
        class="roll-panel"
        aria-label="Zar atışı ve seçim"
        :aria-busy="!!pending"
      >
        <div class="turn-heading">
          <div>
            <p class="eyebrow">
              {{
                activePlayer
                  ? `OYUNCU ${activePlayer.id === 'player-1' ? 'I' : 'II'} · ATIŞ ${Math.min(activePlayer.rollsUsed + (phase.name === 'roll' && phase.step === 'awaiting-roll' ? 1 : 0), 3)} / 3`
                  : 'ZARLAR HAZIR'
              }}
            </p>
            <h2>
              {{
                activePlayer
                  ? phase.name === 'roll' && phase.step === 'awaiting-roll'
                    ? 'Kaderini at'
                    : 'Payına düşeni seç'
                  : 'Atışlar tamamlandı'
              }}
            </h2>
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
            <button
              class="restart-action"
              :disabled="busy"
              @click="session.restart()"
            >
              Yeniden başlat
            </button>
          </div>
        </div>
        <p class="roll-instruction" role="status" aria-live="polite">
          {{ instruction }}
        </p>
        <p v-if="error" role="alert">{{ error }}</p>
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
      ><span>AŞAMA 03 <span aria-hidden="true">/</span> ATIŞ VE SEÇİM</span>
    </footer>
  </main>
</template>

<style>
@import './ui/styles.css';
</style>
