import { describe, expect, it } from 'vitest'
import { DIE_TARGET_SIZE, dieTargetCapacity, layoutDieTargets } from '../dieTargetLayout'
import type { DieId } from '../../core'

const targets = Array.from({ length: 18 }, (_, index) => ({
  id: `${index < 9 ? 'player-1' : 'player-2'}/${index % 9 < 6 ? `die-${index % 9 + 1}` : `bonus-${index % 9 - 5}`}` as DieId,
  x: 32 + (index % 9) * 4, y: index < 9 ? 55 : 45,
}))
describe('mobile die face targets', () => {
  it.each([[360, 800], [390, 844], [430, 932], [844, 390]])('keeps all eighteen 44px controls distinct inside the available %ix%i area', (width, height) => {
    const area = height < 500 ? { top: 115, bottom: 70, left: 12, right: 210 } : { top: 200, bottom: 160, left: 12, right: 12 }
    const layout = layoutDieTargets(targets, width, height, area)
    expect(layout.map(t => t.id)).toEqual(targets.map(t => t.id))
    for (const [index, target] of layout.entries()) {
      const x = target.x * width / 100, y = target.y * height / 100
      expect(x - 22).toBeGreaterThanOrEqual(area.left - 1e-6)
      expect(x + 22).toBeLessThanOrEqual(width - area.right + 1e-6)
      expect(y - 22).toBeGreaterThanOrEqual(area.top - 1e-6)
      expect(y + 22).toBeLessThanOrEqual(height - area.bottom + 1e-6)
      expect(target.sourceX).toBe(targets[index]!.x)
      expect(target.sourceY).toBe(targets[index]!.y)
      for (const other of layout.slice(index + 1))
        expect(Math.max(Math.abs(target.x - other.x) * width / 100, Math.abs(target.y - other.y) * height / 100)).toBeGreaterThanOrEqual(DIE_TARGET_SIZE - 1e-6)
    }
  })
  it('reports a cramped area so the UI can use a scrollable list instead of overlapping targets', () => {
    const area = { top: 110, bottom: 90, left: 275, right: 12 }
    expect(dieTargetCapacity(568, 320, area)).toBeLessThan(18)
    expect(layoutDieTargets(targets, 568, 320, area)).toEqual([])
  })
  it('drops absent dice without transferring their identities to surviving targets', () => {
    const visible = targets.filter((_, i) => i !== 2 && i !== 7)
    const layout = layoutDieTargets(visible, 390, 844, { top: 200, bottom: 160, left: 12, right: 12 })
    expect(layout.map(t => t.id)).toEqual(visible.map(t => t.id))
    expect(layout).toEqual(layoutDieTargets(visible, 390, 844, { top: 200, bottom: 160, left: 12, right: 12 }))
  })
})
