import { PerspectiveCamera, Vector3 } from 'three'
import type { PlayerId } from '../core'
import { playerAngle, TABLE_DEPTH, TABLE_NARROW_WIDTH, TABLE_WIDTH } from './tableLayout'

// Fit the actual wooden outline, not only the dice/contact rectangle. Reserve
// the header and main action before projecting the table from either seat.
export function frameTableCamera(camera: PerspectiveCamera, width: number, height: number, player: PlayerId, narrow: boolean, angle = playerAngle(player)) {
  const aspect = Math.max(width / Math.max(height, 1), 0.25)
  const landscape = height <= 500 && width > height
  const header = landscape ? 56 : width <= 600 ? 64 : 72
  const bottom = landscape ? 90 : 88
  const padding = width <= 600 ? 12 : 24
  const safeX = Math.max(0.2, 1 - 2 * padding / width)
  const safeTop = Math.max(0.2, 1 - 2 * (header + 12) / height)
  const safeBottom = Math.max(0.2, 1 - 2 * bottom / height)
  const radius = narrow ? 0.9 : 1.16
  const direction = new Vector3(Math.sin(angle) * radius, 1, Math.cos(angle) * radius).normalize()
  const right = new Vector3(Math.cos(angle), 0, -Math.sin(angle))
  const up = new Vector3().crossVectors(direction, right)
  const target = new Vector3(Math.sin(angle) * 1.1, 0.2, Math.cos(angle) * 1.1)
  const tangent = Math.tan(camera.fov * Math.PI / 360)
  const halfWidth = (narrow ? TABLE_NARROW_WIDTH : TABLE_WIDTH) / 2
  let distance = 0
  for (const x of [-halfWidth, halfWidth]) for (const z of [-TABLE_DEPTH / 2, TABLE_DEPTH / 2]) for (const y of [-0.48, 2]) {
    const point = new Vector3(x, y, z).sub(target)
    const vertical = point.dot(up)
    distance = Math.max(distance, point.dot(direction) + Math.max(
      Math.abs(point.dot(right)) / (tangent * aspect * safeX),
      Math.abs(vertical) / (tangent * (vertical >= 0 ? safeTop : safeBottom)),
    ))
  }
  camera.position.copy(target).addScaledVector(direction, distance * 1.04)
  camera.aspect = aspect
  camera.far = Math.max(100, distance + 50)
  camera.lookAt(target)
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld(true)
}
