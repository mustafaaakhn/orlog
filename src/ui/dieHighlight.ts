import { computed, ref, watch } from 'vue'
import type { DieId } from '../core'

// Pointer and keyboard share one contour. A new focus event takes ownership
// even when the mouse has not left another projected die's target.
export function createDieHighlight(enabled: () => boolean, available: () => readonly DieId[]) {
  const aimed = ref<DieId | null>(null)
  const focused = ref<DieId | null>(null)
  const id = computed(() => {
    const candidate = aimed.value ?? focused.value
    return enabled() && candidate && available().includes(candidate) ? candidate : null
  })
  function clear() { aimed.value = focused.value = null }
  function focus(value: DieId | null) {
    if (value) aimed.value = null
    focused.value = value
  }
  watch(enabled, value => { if (!value) clear() })
  return { id, aimed, focus, clear }
}
