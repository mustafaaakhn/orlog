import type { PlayerId } from '../core'
import type { SceneDieTarget } from '../scene/dieTargets'

export interface DieTargetArea { top: number; bottom: number; left: number; right: number }
export const DIE_TARGET_SIZE = 44
const STEP = 52
const LABEL = 22
export type DieLane = 'opponent' | 'self' | 'bowl'
export const DIE_LANES: readonly DieLane[] = ['opponent', 'self', 'bowl']
export const LANE_LABELS = { opponent: 'Rakip · Merkez', self: 'Sen · Merkez', bowl: 'Sen · Hazne' }

export function dieLane(target: SceneDieTarget & { location?: string }, viewer: PlayerId): DieLane {
  return !target.id.startsWith(`${viewer}/`) ? 'opponent' : target.location === 'Haznede' ? 'bowl' : 'self'
}
// IDs reserve holes even when their die is removed. Bonus dice always start a
// second row; neither projection, enumeration order nor selection draft owns slots.
export function dieSlot(id: SceneDieTarget['id'], columns: number) {
  const [kind, number] = id.split('/')[1]!.split('-')
  const index = Number(number) - 1
  return { column: index % columns, row: (kind === 'bonus' ? Math.ceil(6 / columns) : 0) + Math.floor(index / columns) }
}
export function dieLayoutMetrics(width: number, height: number, area: DieTargetArea) {
  const availableWidth = Math.max(0, width - area.left - area.right)
  const availableHeight = Math.max(0, height - area.top - area.bottom)
  const columns = Math.max(1, Math.min(6, Math.floor((availableWidth + 8) / STEP)))
  const rows = Math.ceil(6 / columns) + Math.ceil(3 / columns)
  const laneHeight = Math.max(LABEL + rows * STEP, availableHeight / 3)
  const contentHeight = laneHeight * 3
  return { columns, laneHeight, contentHeight, availableHeight, availableWidth,
    overflow: contentHeight > availableHeight + .01 }
}
export function dieTargetCapacity(width: number, height: number, area: DieTargetArea) {
  const m = dieLayoutMetrics(width, height, area)
  return m.overflow ? 0 : 18
}
export function layoutDieTargets<T extends SceneDieTarget & { location?: string }>(
  targets: readonly T[], width: number, height: number, area: DieTargetArea, viewer: PlayerId = 'player-1',
): (T & { sourceX: number; sourceY: number; lane: DieLane; slot: number })[] {
  if (!width || !height) return []
  const m = dieLayoutMetrics(width, height, area)
  const gridWidth = (m.columns - 1) * STEP + DIE_TARGET_SIZE
  return targets.map(target => {
    const lane = dieLane(target, viewer), slot = dieSlot(target.id, m.columns)
    return { ...target, sourceX: target.x, sourceY: target.y, lane, slot: slot.row * m.columns + slot.column,
      x: (area.left + (m.availableWidth - gridWidth) / 2 + 22 + slot.column * STEP) / width * 100,
      y: (area.top + DIE_LANES.indexOf(lane) * m.laneHeight + LABEL + 22 + slot.row * STEP) / height * 100 }
  })
}
