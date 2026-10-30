import type { SceneDieTarget } from '../scene/dieTargets'

export interface DieTargetArea {
  top: number
  bottom: number
  left: number
  right: number
}
export const DIE_TARGET_SIZE = 44
const GAP = 4
export function dieTargetCapacity(width: number, height: number, area: DieTargetArea) {
  const columns = Math.max(0, Math.floor((width - area.left - area.right + GAP) / (DIE_TARGET_SIZE + GAP)))
  const rows = Math.max(0, Math.floor((height - area.top - area.bottom + GAP) / (DIE_TARGET_SIZE + GAP)))
  return columns * rows
}

// These are screen-space face controls, never physics or game coordinates.
// A short leader keeps a displaced control attached to its projected die.
export function layoutDieTargets<T extends SceneDieTarget>(
  targets: readonly T[], width: number, height: number, area: DieTargetArea,
): (T & { sourceX: number; sourceY: number })[] {
  if (!width || !height || dieTargetCapacity(width, height, area) < targets.length) return []
  const half = DIE_TARGET_SIZE / 2
  const left = area.left + half, right = Math.max(left, width - area.right - half)
  const top = area.top + half, bottom = Math.max(top, height - area.bottom - half)
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
  const cells: { x: number; y: number }[] = []
  for (let y = top; y <= bottom; y += DIE_TARGET_SIZE + GAP)
    for (let x = left; x <= right; x += DIE_TARGET_SIZE + GAP) cells.push({ x, y })
  const occupied: { x: number; y: number }[] = []
  return targets.map(target => {
    const sourceX = target.x, sourceY = target.y
    const x = clamp(target.x * width / 100, left, right)
    const y = clamp(target.y * height / 100, top, bottom)
    // Every fallback uses one shared lattice; reserving a cell prevents later
    // dice from taking its space, even with all three bonus dice on both sides.
    const candidate = cells.map((cell, index) => ({ cell, index, distance: (cell.x - x) ** 2 + (cell.y - y) ** 2 }))
      .sort((a, b) => a.distance - b.distance || a.index - b.index)
      .find(({ cell }) => !occupied.some(other => Math.abs(other.x - cell.x) < DIE_TARGET_SIZE + GAP && Math.abs(other.y - cell.y) < DIE_TARGET_SIZE + GAP))?.cell
    const position = candidate ?? { x, y }
    occupied.push(position)
    return { ...target, sourceX, sourceY, x: position.x / width * 100, y: position.y / height * 100 }
  })
}
