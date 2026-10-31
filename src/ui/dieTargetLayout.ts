import type { PlayerId } from '../core'
import type { SceneDieTarget } from '../scene/dieTargets'

export interface DieTargetArea { top: number; bottom: number; left: number; right: number }
export const DIE_TARGET_SIZE = 44
const STEP = 52

// Empty identity slots remain stable while a selection draft is pending.
export function dieSlot(id: SceneDieTarget['id'], columns: number) {
  const [kind, number] = id.split('/')[1]!.split('-')
  const index = Number(number) - 1
  return { column: index % columns, row: (kind === 'bonus' ? Math.ceil(6 / columns) : 0) + Math.floor(index / columns) }
}
export function dieLayoutMetrics(width: number, height: number, area: DieTargetArea) {
  const availableWidth = Math.max(0, width - area.left - area.right)
  const availableHeight = Math.max(0, height - area.top - area.bottom)
  const columns = Math.max(1, Math.min(6, Math.floor((availableWidth + 8) / STEP)))
  const contentHeight = (Math.ceil(6 / columns) + Math.ceil(3 / columns)) * STEP - 8
  // Only the near bowl owns a card surface. Never scroll over the center rows.
  const viewportHeight = Math.min(contentHeight, Math.max(44, availableHeight * .4))
  return { columns, contentHeight, viewportHeight, availableHeight, availableWidth,
    top: height - area.bottom - viewportHeight,
    overflow: contentHeight > viewportHeight + .01 }
}
export function layoutDieTargets<T extends SceneDieTarget & { location?: string }>(
  targets: readonly T[], width: number, height: number, area: DieTargetArea, viewer: PlayerId = 'player-1',
): (T & { sourceX: number; sourceY: number; lane?: 'bowl'; slot?: number })[] {
  if (!width || !height) return []
  const m = dieLayoutMetrics(width, height, area)
  const gridWidth = (m.columns - 1) * STEP + DIE_TARGET_SIZE
  return targets.map(target => {
    const source = { sourceX: target.x, sourceY: target.y }
    // Center dice keep a transparent target at their actual 3D projection.
    if (!target.id.startsWith(`${viewer}/`) || target.location !== 'Haznede') return { ...target, ...source }
    const slot = dieSlot(target.id, m.columns)
    return { ...target, ...source, lane: 'bowl', slot: slot.row * m.columns + slot.column,
      x: (area.left + (m.availableWidth - gridWidth) / 2 + 22 + slot.column * STEP) / width * 100,
      y: (m.top + 22 + slot.row * STEP) / height * 100 }
  })
}
