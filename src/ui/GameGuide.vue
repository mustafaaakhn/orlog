<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { t } from '../i18n'
import { FAVOR_CATALOG } from '../core'
import SymbolIcon from './SymbolIcon.vue'
import TokenIcon from './TokenIcon.vue'
import UiIcon from './UiIcon.vue'
import { GUIDE_EXAMPLES } from './guideExamples'

const emit = defineEmits<{ close: [] }>()
const page = ref<0 | 1>(0)
const content = ref<HTMLElement | null>(null)
const heading = ref<HTMLElement | null>(null)
const thor = FAVOR_CATALOG['thors-strike'].tiers[1]
async function showPage(next: 0 | 1) {
  if (page.value === next) return
  page.value = next
  await nextTick()
  if (content.value) content.value.scrollTop = 0
  heading.value?.focus({ preventScroll: true })
}
</script>

<template>
  <div class="game-guide">
    <nav class="guide-pages" :aria-label="t('Rehber sayfaları')">
      <button type="button" :aria-current="page === 0 ? 'page' : undefined" @click="showPage(0)">
        <span aria-hidden="true">01</span>{{ t('Turun akışı') }}
      </button>
      <button type="button" :aria-current="page === 1 ? 'page' : undefined" @click="showPage(1)">
        <span aria-hidden="true">02</span>{{ t('Zarlar ve örnekler') }}
      </button>
    </nav>

    <section ref="content" class="guide-scroll" aria-labelledby="guide-page-title">
      <template v-if="page === 0">
        <h3 ref="heading" id="guide-page-title" tabindex="-1">{{ t('Amaç: rakibin canını sıfırla.') }}</h3>
        <p class="guide-lead">{{ t('İkiniz de 15 can, 6 zar ve 0 jetonla başlarsınız. Hazırlıkta seçtiğin üç tanrı sana özel güçler verir. Canı önce sıfıra düşen kaybeder.') }}</p>

        <ol class="guide-steps">
          <li>
            <span class="guide-step-number" aria-hidden="true">1</span>
            <div>
              <h4>{{ t('Zar at, işine yarayanları sakla.') }}</h4>
              <p>{{ t('Sırayla oynarsınız; her tur en fazla üç atış hakkın vardır. Saklamak istediğin zarlara dokun: merkeze geçerler. Diğerleri haznede kalır ve sonraki atışında yeniden atılır.') }}</p>
              <p class="guide-note"><strong>{{ t('Onay, seçimi kilitler.') }}</strong> {{ t('Seçimi onayla demeden merkezdeki zarı geri alabilirsin. Onayladıkların bu tur yeniden atılmaz. Üçüncü atışta kalan zarlar otomatik saklanır; iki taraf bitirince güç seçimine geçilir.') }}</p>
            </div>
          </li>
          <li>
            <span class="guide-step-number" aria-hidden="true">2</span>
            <div>
              <h4>{{ t('Jeton biriktir, tanrı gücü seç.') }}</h4>
              <p>{{ t('Masada kalan altın çerçeveli her yüz, savaş çözülürken 1 jeton kazandırır. Zarın üzerindeki simge de normal etkisini korur: altın çerçeveli miğfer hem savunur hem jeton getirir.') }}</p>
              <div class="guide-gold-example">
                <span class="guide-die is-framed" aria-hidden="true"><SymbolIcon symbol="helmet" /><TokenIcon class="guide-frame-token" /></span>
                <p>{{ t('Miğferin savunması + 1 jeton. Çerçeve, ayrı bir zar yüzü değildir.') }}</p>
              </div>
              <p>{{ t('Zarlar tamamlanınca üç tanrından birinin gücünü ve seviyesini seçebilir veya güç kullanmadan devam edebilirsin. Bedel, gücün çalışma sırası geldiğinde ödenir; o anda jeton yetmiyorsa güç çalışmaz.') }}</p>
              <p class="guide-power-example"><TokenIcon /><strong>{{ t('{0} jeton → {1} doğrudan hasar', [thor.cost, thor.amount]) }}</strong><span>{{ t("Örneğin Thor'un 1. seviye gücü. Miğfer ve kalkan bu tanrı hasarını engellemez.") }}</span></p>
            </div>
          </li>
          <li>
            <span class="guide-step-number" aria-hidden="true">3</span>
            <div>
              <h4>{{ t('Savaşı izle, yeni tura hazırlan.') }}</h4>
              <p>{{ t('İki güç kararı da bitince savaş otomatik başlar. Önce savaş öncesi güçler ve çerçeve jetonları; sonra oklar, baltalar ve jeton çalan eller çözülür. Savaş sonrası güçler en son gelir.') }}</p>
              <div class="guide-order" aria-hidden="true"><SymbolIcon symbol="arrow" /><UiIcon name="arrow" /><SymbolIcon symbol="axe" /><UiIcon name="arrow" /><SymbolIcon symbol="hand" /></div>
              <p>{{ t('Can ve jetonlar sonraki tura taşınır; bütün zarlar yeniden hazırlanır ve ilk başlayan oyuncu değişir. Birinin canı sıfırlanırsa maç hemen biter. İyileştirme canı en fazla 15 yapar.') }}</p>
            </div>
          </li>
        </ol>

        <details class="guide-controls">
          <summary>{{ t('Dokunma ve klavye ipuçları') }}</summary>
          <p>{{ t('Mobilde seçimler son dokunuştan 2 saniye sonra birlikte taşınır; bu süre sıra geçirmez. Seçimi onayla düğmesi beklemeden seçimini uygular ve kilitler.') }}</p>
          <p>{{ t('Zar bilgisi için uzun bas veya F1 kullan. İncelemek zar seçmez. Klavyede Tab ile zara git, Space/Enter ile seç, yön tuşlarıyla dolaş.') }}</p>
        </details>
      </template>

      <template v-else>
        <h3 ref="heading" id="guide-page-title" tabindex="-1">{{ t('Hangi zar, neyi etkiler?') }}</h3>
        <p class="guide-lead">{{ t('Örneklerde tanrı gücü veya ek etki yok. × işareti engellenen saldırıyı gösterir. Engellenmeyen balta ve oklar canı azaltır; savunma zarları saldırıya dönüşmez.') }}</p>
        <div class="guide-examples">
          <article v-for="example in GUIDE_EXAMPLES" :key="example.id" class="guide-example" :data-example="example.id">
            <h4>{{ t(example.title) }}</h4>
            <figure class="guide-matchup" aria-hidden="true">
              <div class="guide-side">
                <span>{{ t('Senin zarların') }}</span>
                <div class="guide-dice" aria-hidden="true">
                  <span v-for="(symbol, index) in example.attack" :key="index" class="guide-die" :class="{ 'is-stopped': index < example.blocked }"><SymbolIcon :symbol="symbol" /></span>
                </div>
              </div>
              <UiIcon name="arrow" class="guide-match-arrow" />
              <div class="guide-side">
                <span>{{ t(example.id === 'steal' ? 'Rakibin jetonları' : 'Rakibin savunması') }}</span>
                <div class="guide-dice" aria-hidden="true">
                  <span v-for="(symbol, index) in example.defense" :key="index" class="guide-die"><SymbolIcon :symbol="symbol" /></span>
                  <TokenIcon v-for="index in example.targetTokens" :key="`token-${index}`" class="guide-loose-token" />
                </div>
              </div>
            </figure>
            <div class="guide-outcome" aria-hidden="true">
              <template v-if="example.id !== 'steal'"><span>{{ t('{0} engellenen', [example.blocked]) }}</span><strong><UiIcon name="heart-minus" />{{ t('{0} can kaybı', [example.damage]) }}</strong></template>
              <template v-else><span>{{ t('Rakip: 3 → 1 jeton') }}</span><strong><TokenIcon />{{ t('Sana +2 jeton') }}</strong></template>
            </div>
            <p>{{ t(example.explanation) }}</p>
          </article>
        </div>
        <p class="guide-note guide-last-tip"><UiIcon name="info" />{{ t('Rakibinde hangi savunma var? Seçim yaparken önce buna bak. Jeton biriktirmek ve doğru anda tanrı gücü kullanmak da en az saldırmak kadar önemlidir.') }}</p>
      </template>
    </section>

    <footer class="guide-footer">
      <button v-if="page === 1" type="button" class="secondary-action" @click="showPage(0)"><UiIcon name="back" />{{ t('Önceki sayfa') }}</button>
      <span class="guide-page-count">{{ page + 1 }} / 2</span>
      <button type="button" class="primary-action" @click="page === 0 ? showPage(1) : emit('close')">{{ t(page === 0 ? 'Örneklerle devam et' : 'Anladım') }}<UiIcon v-if="page === 0" name="arrow" /></button>
    </footer>
  </div>
</template>

<style src="./game-guide.css"></style>
