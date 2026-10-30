import { PerspectiveCamera, Vector3 } from 'three'
import type { PlayerId } from '../core'
import { playerSide, TABLE_DEPTH, TABLE_NARROW_WIDTH, TABLE_WIDTH } from './tableLayout'

// Fit the actual wooden outline, not only the dice/contact rectangle. Reserve
// the header and main action before projecting the table from either seat.
export function frameTableCamera(camera: PerspectiveCamera, width: number, height: number, player: PlayerId, narrow: boolean) {
  const side = playerSide(player)
  const aspect = Math.max(width / Math.max(height, 1), 0.25)
  const landscape = height <= 500 && width > height
  const header = landscape ? 56 : width <= 600 ? 64 : 72
  const bottom = landscape ? 90 : 88
  const padding = width <= 600 ? 12 : 24
  const safeX = Math.max(0.2, 1 - 2 * padding / width)
  const safeTop = Math.max(0.2, 1 - 2 * (header + 12) / height)
  const safeBottom = Math.max(0.2, 1 - 2 * bottom / height)
  const direction = new Vector3(0, 1, (narrow ? 0.9 : 1.16) * side).normalize()
  const up = new Vector3(0, Math.abs(direction.z), -direction.y * side)
  const target = new Vector3(0, 0.2, 1.1 * side)
  const tangent = Math.tan(camera.fov * Math.PI / 360)
  const halfWidth = (narrow ? TABLE_NARROW_WIDTH : TABLE_WIDTH) / 2
  let distance = 0
  for (const x of [-halfWidth, halfWidth]) for (const z of [-TABLE_DEPTH / 2, TABLE_DEPTH / 2]) for (const y of [-0.48, 2]) {
    const point = new Vector3(x, y, z).sub(target)
    const vertical = point.dot(up)
    distance = Math.max(distance, point.dot(direction) + Math.max(
      Math.abs(x) / (tangent * aspect * safeX),
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
