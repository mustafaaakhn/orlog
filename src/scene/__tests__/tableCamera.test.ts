import { describe, expect, it } from 'vitest'
import { PerspectiveCamera, Vector3 } from 'three'
import { frameTableCamera } from '../tableCamera'
import { TABLE_WIDTH, TABLE_NARROW_WIDTH, TABLE_DEPTH } from '../tableLayout'

describe('complete tabletop framing', () => {
  it.each([[1920, 866], [1280, 720], [390, 844], [844, 390]])('keeps every corner in frame throughout the seat turn at %ix%i', (width, height) => {
    const narrow = width < 620 && width / height < 1.1
    const header = height <= 500 && width > height ? 56 : width <= 600 ? 64 : 72
    const camera = new PerspectiveCamera(42, width / height, 0.1, 100)
    for (let step = 0; step <= 24; step++) {
      frameTableCamera(camera, width, height, 'player-1', narrow, step * Math.PI / 12)
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        const corner = new Vector3(x * (narrow ? TABLE_NARROW_WIDTH : TABLE_WIDTH) / 2, 0, z * TABLE_DEPTH / 2).project(camera)
        expect((corner.x + 1) * width / 2).toBeGreaterThan(0)
        expect((corner.x + 1) * width / 2).toBeLessThan(width)
        expect((1 - corner.y) * height / 2).toBeGreaterThan(header)
        expect((1 - corner.y) * height / 2).toBeLessThan(height - 80)
        expect(corner.z).toBeLessThan(1)
      }
    }
  })
  it.each([[1920, 866], [1600, 1000], [1280, 720], [390, 844], [844, 390]])('keeps the whole board clear of overlays at %ix%i from both seats', (width, height) => {
    const narrow = width < 620 && width / height < 1.1
    const header = height <= 500 && width > height ? 56 : width <= 600 ? 64 : 72
    for (const player of ['player-1', 'player-2'] as const) {
      const camera = new PerspectiveCamera(42, width / height, 0.1, 100)
      frameTableCamera(camera, width, height, player, narrow)
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        const point = new Vector3(x * (narrow ? TABLE_NARROW_WIDTH : TABLE_WIDTH) / 2, 0, z * TABLE_DEPTH / 2).project(camera)
        const screenX = (point.x + 1) * width / 2
        const screenY = (1 - point.y) * height / 2
        expect(screenX).toBeGreaterThan(0)
        expect(screenX).toBeLessThan(width)
        expect(screenY).toBeGreaterThan(header)
        expect(screenY).toBeLessThan(height - 80)
        expect(point.z).toBeLessThan(1)
      }
      // An oblique seat perspective remains, rather than a top-down camera.
      expect(Math.abs(camera.position.z)).toBeGreaterThan(camera.position.y * 0.7)
    }
  })
})
