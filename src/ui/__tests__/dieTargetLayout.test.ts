import { describe, expect, it } from 'vitest'
import { DIE_TARGET_SIZE, dieLayoutMetrics, layoutDieTargets } from '../dieTargetLayout'
import type { DieId } from '../../core'

const targets = Array.from({ length: 12 }, (_, i) => ({
  id: `${i < 6 ? 'player-1' : 'player-2'}/die-${i % 6 + 1}` as DieId,
  location: i < 6 ? 'Haznede' : 'Kilitli', x: 32 + (i % 6) * 4, y: i < 6 ? 55 : 45,
}))
const area = { top: 200, bottom: 160, left: 12, right: 12 }
describe('near bowl cards and projected center targets', () => {
  it.each([[360, 800], [390, 844], [430, 932], [844, 390], [568, 320]])('keeps center projections and lays out only near bowl cards at %ix%i', (width, height) => {
    const edge = height < 500 ? { top: 110, bottom: 90, left: 275, right: 12 } : area
    const metrics = dieLayoutMetrics(width, height, edge)
    const layout = layoutDieTargets(targets, width, height, edge)
    for (const [i, t] of layout.entries()) {
      expect(t.sourceX).toBe(targets[i]!.x)
      if (i >= 6) {
        expect([t.x, t.y]).toEqual([targets[i]!.x, targets[i]!.y])
        expect(t.lane).toBeUndefined()
        continue
      }
      expect(t.lane).toBe('bowl')
      expect(t.x * width / 100 - 22).toBeGreaterThanOrEqual(edge.left - 1e-6)
      expect(t.x * width / 100 + 22).toBeLessThanOrEqual(width - edge.right + 1e-6)
      expect(t.y * height / 100 - 22).toBeGreaterThanOrEqual(metrics.top - 1e-6)
      for (const other of layout.slice(i + 1, 6))
        expect(Math.max(Math.abs(t.x - other.x) * width / 100, Math.abs(t.y - other.y) * height / 100)).toBeGreaterThanOrEqual(DIE_TARGET_SIZE - 1e-6)
    }
  })
  it('retains bowl identity holes across drafts, removal and committed movement to center', () => {
    const before = layoutDieTargets(targets, 390, 844, area)
    const draft = layoutDieTargets(targets.map(t => ({ ...t, selected: true })), 390, 844, area)
    expect(draft.map(t => [t.x, t.y])).toEqual(before.map(t => [t.x, t.y]))
    const after = layoutDieTargets(targets.filter((_, i) => i !== 1).map((t, i) => i === 0 ? { ...t, location: 'Seçili' } : t).reverse(), 390, 844, area)
    for (const t of after) {
      const previous = before.find(p => p.id === t.id)!
      if (t.id === 'player-1/die-1') expect([t.x, t.y, t.lane]).toEqual([t.sourceX, t.sourceY, undefined])
      else expect([t.x, t.y, t.slot]).toEqual([previous.x, previous.y, previous.slot])
    }
  })
  it('confines short-screen scrolling to the bowl, leaving center projections outside the surface', () => {
    const edge = { top: 110, bottom: 90, left: 275, right: 12 }
    const metrics = dieLayoutMetrics(568, 320, edge)
    expect(metrics.overflow).toBe(true)
    expect(metrics.top).toBeGreaterThan(edge.top)
    expect(metrics.contentHeight).toBeGreaterThan(metrics.viewportHeight)
    const layout = layoutDieTargets(targets, 568, 320, edge)
    expect(layout.find(t => t.id === 'player-1/die-4')!.slot).toBe(3)
  })
})
