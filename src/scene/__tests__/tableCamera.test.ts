import { describe, expect, it } from 'vitest'
import { PerspectiveCamera, Vector3 } from 'three'
import { frameTableCamera } from '../tableCamera'
import { playerSide, TABLE_WIDTH, TABLE_DEPTH } from '../tableLayout'

const desktopSizes = [[1920, 866], [1600, 1000], [1280, 720], [768, 1024]]
// Projected 0.88-unit die width in pixels, measured with the pre-stage-3 camera.
const previousDieWidth: Record<string, number> = { '360x800': 15.427, '390x844': 16.762, '430x932': 18.588, '844x390': 10.937, '568x320': 7.403 }
const mobileSizes = [[360, 800], [390, 844], [430, 932], [844, 390], [568, 320]]
const pixels = (point: Vector3, camera: PerspectiveCamera, width: number, height: number) => {
  const screen = point.clone().project(camera)
  return { x: (screen.x + 1) * width / 2, y: (1 - screen.y) * height / 2, z: screen.z }
}

describe('table framing', () => {
  it.each(desktopSizes)('preserves the complete desktop table throughout the seat turn at %ix%i', (width, height) => {
    const camera = new PerspectiveCamera(42, width / height, .1, 100)
    for (let step = 0; step <= 24; step++) {
      frameTableCamera(camera, width, height, 'player-1', false, step * Math.PI / 12)
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        const point = pixels(new Vector3(x * TABLE_WIDTH / 2, 0, z * TABLE_DEPTH / 2), camera, width, height)
        expect(point.x).toBeGreaterThan(0); expect(point.x).toBeLessThan(width)
        expect(point.y).toBeGreaterThan(72); expect(point.y).toBeLessThan(height - 80)
        expect(point.z).toBeLessThan(1)
      }
      expect(camera.view?.enabled ?? false).toBe(false)
    }
  })

  it.each(mobileSizes)('fits the near bowl and both nine-die battle lines inside the actual HUD gap at %ix%i', (width, height) => {
    const insets = width > height ? { top: 112, bottom: 80, left: 280, right: 16 } : { top: 172, bottom: 190, left: 16, right: 16 }
    for (const player of ['player-1', 'player-2'] as const) {
      const side = playerSide(player), camera = new PerspectiveCamera(42, width / height, .1, 100)
      frameTableCamera(camera, width, height, player, width < 620 && width < height, undefined, { insets })
      for (const x of [-5.5, 5.5]) for (const z of [-1.6, 9.9]) for (const y of [.1, 1.5]) {
        const point = pixels(new Vector3(x * side, y, z * side), camera, width, height)
        expect(point.x).toBeGreaterThan(insets.left); expect(point.x).toBeLessThan(width - insets.right)
        expect(point.y).toBeGreaterThan(insets.top); expect(point.y).toBeLessThan(height - insets.bottom)
        expect(point.z).toBeLessThan(1)
      }
      expect(camera.position.z * side).toBeGreaterThan(0)
      const die = pixels(new Vector3(0, .8, 6.7 * side), camera, width, height)
      const edge = pixels(new Vector3(.88, .8, 6.7 * side), camera, width, height)
      expect(Math.abs(edge.x - die.x)).toBeGreaterThan(previousDieWidth[`${width}x${height}`]! * 1.1)
    }
  })

  it('includes both resource/god contact areas during mobile resolution and clears the offset on desktop', () => {
    const camera = new PerspectiveCamera(42, 390 / 844, .1, 100)
    const insets = { top: 172, bottom: 190, left: 16, right: 16 }
    for (const player of ['player-1', 'player-2'] as const) {
      frameTableCamera(camera, 390, 844, player, true, undefined, { insets, combat: true })
      for (const x of [-6.8, 6.8]) for (const z of [-7.8, 9.9]) {
        const point = pixels(new Vector3(x * playerSide(player), .6, z * playerSide(player)), camera, 390, 844)
        expect(point.y).toBeGreaterThan(insets.top); expect(point.y).toBeLessThan(844 - insets.bottom)
        expect(point.x).toBeGreaterThan(insets.left); expect(point.x).toBeLessThan(374)
      }
    }
    frameTableCamera(camera, 1440, 900, 'player-1', false)
    expect(camera.view?.enabled).toBe(false)
  })
})
