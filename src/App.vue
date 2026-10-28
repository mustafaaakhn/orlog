<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue'
import SymbolIcon from './ui/SymbolIcon.vue'
import { SYMBOL_GUIDE } from './scene/symbols'
import SceneLoaderState from './ui/SceneLoaderState.vue'

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
</script>

<template>
  <main class="experience">
    <header class="masthead">
      <a class="wordmark" href="./" aria-label="Orlog ana sayfa"
        ><span aria-hidden="true">ᛟ</span> ORLOG</a
      >
      <span class="edition">KUZEYİN ZAR OYUNU</span>
      <span class="prototype"
        ><span aria-hidden="true"></span> GÖRSEL PROTOTİP</span
      >
    </header>
    <section class="table-section" aria-labelledby="table-title">
      <div class="table-heading">
        <div>
          <p class="eyebrow">AHŞAP, KEMİK VE KADER</p>
          <h1 id="table-title">Tanrıların masası</h1>
        </div>
        <p class="intro">
          Altı zar. Kadim güçler.<br />Henüz yazılmamış bir destan.
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
          @availability="sceneReady = $event"
        />
        <div class="view-controls" aria-label="Sahne görünümü">
          <button
            :disabled="!sceneReady"
            :aria-pressed="!closeView"
            @click="closeView = false"
          >
            Masa
          </button>
          <button
            :disabled="!sceneReady"
            :aria-pressed="closeView"
            @click="closeView = true"
          >
            Zarlara yaklaş <span aria-hidden="true">↗</span>
          </button>
        </div>
      </div>
      <div class="table-meta">
        <p>
          <span class="small-diamond" aria-hidden="true">◇</span> Yerleşim
          örneği <span class="meta-divider">/</span> Maç başlamadı
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
            <p>Her yanda 15 taş · 4 örnek jeton</p>
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
      ><span>AŞAMA 02 <span aria-hidden="true">/</span> GÖRSEL YÖN</span>
    </footer>
  </main>
</template>

<style>
@import './ui/styles.css';
</style>
