import { onMounted, onUnmounted, shallowRef, watch, type Ref } from 'vue'
import { isMobileTableView, type TableInsets } from './tableCamera'

// Measure the real HUD/footer, including safe areas and wrapping status text.
export function useTableInsets(viewport: Ref<HTMLElement | null>) {
  const insets = shallowRef<TableInsets>({ top: 0, bottom: 0, left: 0, right: 0 })
  let observer: ResizeObserver | undefined
  function measure() {
    const root = viewport.value?.closest('.experience')
    const bounds = viewport.value?.getBoundingClientRect()
    if (!root || !bounds || !isMobileTableView(bounds.width, bounds.height)) return
    const box = (selector: string) => root.querySelector<HTMLElement>(selector)?.getBoundingClientRect()
    const header = box('.masthead')
    const opponent = box('.mobile-resource-row.is-opponent')
    const summary = box('.opponent-dice-summary')
    const round = box('.table-round')
    const footer = box('.mobile-match-footer')
    const self = box('.mobile-resource-row.is-self')
    const action = box('.match-actions')
    const network = box('.network-status')
    const landscape = bounds.width > bounds.height && bounds.height <= 500
    const next = landscape ? {
      top: Math.max(header?.bottom ?? 56, round?.bottom ?? 0) - bounds.top + 12,
      bottom: bounds.bottom - Math.min(self?.top ?? bounds.bottom - 70, action?.height ? action.top : bounds.bottom - 70) + 12,
      left: Math.max(opponent?.right ?? 0, summary?.right ?? 0) - bounds.left + 16,
      right: Math.max(12, bounds.right - (round?.right ?? bounds.right)),
    } : {
      top: Math.max(opponent?.bottom ?? 160, summary?.bottom ?? 0, network?.bottom ?? 0) - bounds.top + 12,
      bottom: bounds.bottom - (footer?.height ? footer.top : self?.top ?? bounds.bottom - 150) + 12,
      left: Math.max(12, (opponent?.left ?? 12) - bounds.left),
      right: Math.max(12, bounds.right - (opponent?.right ?? bounds.right - 12)),
    }
    if (JSON.stringify(next) !== JSON.stringify(insets.value)) insets.value = next
  }
  onMounted(() => {
    observer = new ResizeObserver(measure)
    const root = viewport.value?.closest('.experience')
    if (root) for (const element of root.querySelectorAll('.table-viewport, .masthead, .mobile-resource-row, .mobile-match-footer, .match-actions, .opponent-dice-summary, .table-round, .network-status')) observer.observe(element)
    measure()
  })
  watch(viewport, measure, { flush: 'post' })
  onUnmounted(() => observer?.disconnect())
  return insets
}
