import { describe, expect, it } from 'vitest'
import { DIE_TARGET_SIZE, dieLayoutMetrics, layoutDieTargets } from '../dieTargetLayout'
import type { DieId } from '../../core'

const targets = Array.from({ length: 18 }, (_, i) => ({
  id: `${i < 9 ? 'player-1' : 'player-2'}/${i % 9 < 6 ? `die-${i % 9 + 1}` : `bonus-${i % 9 - 5}`}` as DieId,
  location: 'Kilitli', x: 32 + (i % 9) * 4, y: i < 9 ? 55 : 45,
}))
const area = { top: 200, bottom: 160, left: 12, right: 12 }
describe('identity-owned mobile rows', () => {
  it.each([[360, 800], [390, 844], [430, 932], [844, 390], [568, 320]])('reserves owner rows and bonus rows at %ix%i', (width, height) => {
    const edge = height < 500 ? { top: 110, bottom: 90, left: 275, right: 12 } : area
    const metrics = dieLayoutMetrics(width, height, edge)
    for (const viewer of ['player-1', 'player-2'] as const) {
      const layout = layoutDieTargets(targets, width, height, edge, viewer)
      expect(layout.map(t => t.id)).toEqual(targets.map(t => t.id))
      for (const [i, t] of layout.entries()) {
        const x = t.x * width / 100, y = t.y * height / 100
        expect(x - 22).toBeGreaterThanOrEqual(edge.left - 1e-6)
        expect(x + 22).toBeLessThanOrEqual(width - edge.right + 1e-6)
        expect(y - 22).toBeGreaterThanOrEqual(edge.top)
        expect(y + 22).toBeLessThanOrEqual(edge.top + metrics.contentHeight)
        expect(t.sourceX).toBe(targets[i]!.x)
        expect(t.lane).toBe(t.id.startsWith(viewer) ? 'self' : 'opponent')
        for (const other of layout.slice(i + 1))
          expect(Math.max(Math.abs(t.x - other.x) * width / 100, Math.abs(t.y - other.y) * height / 100)).toBeGreaterThanOrEqual(DIE_TARGET_SIZE)
      }
      expect(Math.max(...layout.filter(t => t.lane === 'opponent').map(t => t.y))).toBeLessThan(Math.min(...layout.filter(t => t.lane === 'self').map(t => t.y)))
      const own = layout.filter(t => t.lane === 'self')
      expect(own.slice(6).every(t => t.y > own[5]!.y)).toBe(true)
    }
  })
  it('keeps holes for all 0–9 counts, arbitrary removal, input reordering and moving projections', () => {
    const initial = layoutDieTargets(targets, 390, 844, area)
    for (let count = 0; count <= 9; count++) {
      const remaining = targets.filter((_, i) => i % 9 < count && i !== 2).reverse().map(t => ({ ...t, x: 99, y: 1 }))
      const layout = layoutDieTargets(remaining, 390, 844, area)
      for (const t of layout) {
        const old = initial.find(old => old.id === t.id)!
        expect([t.x, t.y, t.slot]).toEqual([old.x, old.y, old.slot])
      }
    }
  })
  it('moves only the committed bowl die; draft selection does not move any slot', () => {
    const bowl = targets.map(t => ({ ...t, location: t.id.startsWith('player-1') ? 'Haznede' : 'Kilitli', selected: false }))
    const before = layoutDieTargets(bowl, 390, 844, area)
    const draft = layoutDieTargets(bowl.map(t => ({ ...t, selected: true })), 390, 844, area)
    expect(draft.map(t => [t.x, t.y])).toEqual(before.map(t => [t.x, t.y]))
    const after = layoutDieTargets(bowl.map((t, i) => i === 2 ? { ...t, location: 'Seçili' } : t), 390, 844, area)
    for (const [i, t] of after.entries()) {
      expect(t.x).toBe(before[i]!.x)
      if (i === 2) { expect(t.lane).toBe('self'); expect(t.y).toBeLessThan(before[i]!.y) }
      else expect(t.y).toBe(before[i]!.y)
    }
  })
  it('uses grouped scroll content in a short area, retaining identity holes and 44px faces', () => {
    const edge = { top: 110, bottom: 90, left: 275, right: 12 }
    const metrics = dieLayoutMetrics(568, 320, edge)
    expect(metrics.overflow).toBe(true)
    expect(metrics.columns).toBe(5)
    expect(metrics.contentHeight).toBeGreaterThan(metrics.availableHeight)
    const layout = layoutDieTargets(targets.filter(t => t.id !== 'player-1/die-3'), 568, 320, edge)
    expect(layout.find(t => t.id === 'player-1/die-4')!.slot).toBe(3)
  })
})
