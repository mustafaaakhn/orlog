<script setup lang="ts">
import { onErrorCaptured, onMounted, onUnmounted, ref, watch } from 'vue'
import { TresCanvas } from '@tresjs/core'
import type { TresContext } from '@tresjs/core'
import TableScene from './TableScene.vue'

defineProps<{ closeView: boolean }>()
const emit = defineEmits<{ availability: [ready: boolean] }>()
const status = ref<'checking' | 'loading' | 'ready' | 'unsupported' | 'error'>(
  'checking',
)
watch(status, (value) => emit('availability', value === 'ready'), {
  immediate: true,
})
const sceneKey = ref(0)
let activeCanvas: HTMLCanvasElement | undefined
let loadingTimeout: ReturnType<typeof setTimeout> | undefined

function clearLoadingTimeout() {
  clearTimeout(loadingTimeout)
}
function detachCanvas() {
  activeCanvas?.removeEventListener('webglcontextlost', contextLost)
  activeCanvas = undefined
}
function failed() {
  clearLoadingTimeout()
  detachCanvas()
  status.value = 'error'
}
function contextLost(event: Event) {
  event.preventDefault()
  failed()
}
function initialize() {
  clearLoadingTimeout()
  detachCanvas()
  const probe = document.createElement('canvas')
  let supported = false
  try {
    const context = probe.getContext('webgl2')
    supported = !!context
    context?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    supported = false
  }
  if (!supported) {
    status.value = 'unsupported'
    return
  }
  sceneKey.value++
  status.value = 'loading'
  loadingTimeout = setTimeout(failed, 20000)
}
function ready(context: TresContext) {
  activeCanvas = context.renderer.instance.domElement
  activeCanvas.addEventListener('webglcontextlost', contextLost)
}
function rendered() {
  if (status.value === 'loading') {
    clearLoadingTimeout()
    status.value = 'ready'
  }
}

onMounted(initialize)
onUnmounted(() => {
  clearLoadingTimeout()
  detachCanvas()
})
onErrorCaptured(() => {
  failed()
  return false
})
</script>

<template>
  <div
    class="table-viewport"
    :aria-busy="status === 'checking' || status === 'loading'"
  >
    <TresCanvas
      v-if="status === 'loading' || status === 'ready'"
      :key="sceneKey"
      shadows
      render-mode="on-demand"
      clear-color="#28332b"
      :dpr="[1, 1.75]"
      :tone-mapping-exposure="1.05"
      aria-label="Üç boyutlu Orlog masası: ahşap kâsede altı zar, iki yanda can taşları, örnek jetonlar ve tanrı totemleri."
      role="img"
      @ready="ready"
      @render="rendered"
      @error="failed"
    >
      <TableScene :close-view="closeView" />
    </TresCanvas>
    <div
      v-if="status !== 'ready'"
      class="scene-state"
      :role="status === 'error' ? 'alert' : 'status'"
      aria-live="polite"
    >
      <span class="state-rune" aria-hidden="true">ᛟ</span>
      <template v-if="status === 'checking' || status === 'loading'"
        ><h2>Masa hazırlanıyor</h2>
        <p>Ahşap, kumaş ve kemik bir araya geliyor.</p></template
      >
      <template v-else-if="status === 'unsupported'"
        ><h2>Bu masa WebGL 2 gerektiriyor</h2>
        <p>
          Güncel bir tarayıcı kullanıp donanım hızlandırmasını açarak yeniden
          deneyebilirsin.
        </p>
        <button @click="initialize">Yeniden dene</button></template
      >
      <template v-else
        ><h2>Sahne görüntülenemedi</h2>
        <p>
          Grafik bağlantısı kesilmiş veya sahne hazırlanırken bir sorun oluşmuş
          olabilir.
        </p>
        <button @click="initialize">Sahneyi yeniden yükle</button></template
      >
    </div>
  </div>
</template>
