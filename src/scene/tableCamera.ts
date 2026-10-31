import { PerspectiveCamera, Vector3 } from 'three'
import type { PlayerId } from '../core'
import { playerAngle, TABLE_DEPTH, TABLE_NARROW_WIDTH, TABLE_WIDTH } from './tableLayout'

export interface TableInsets { top: number; bottom: number; left: number; right: number }
export const isMobileTableView = (width: number, height: number) => width <= 600 || (height <= 500 && width > height)

function frameMobile(camera: PerspectiveCamera, width: number, height: number, angle: number, combat: number, insets?: TableInsets) {
  const landscape = width > height
  const edge = insets ?? (landscape
    ? { top: 110, bottom: 86, left: Math.min(280, width * .45), right: 12 }
    : { top: 172, bottom: 190, left: 16, right: 16 })
  const areaWidth = Math.max(100, width - edge.left - edge.right)
  const areaHeight = Math.max(100, height - edge.top - edge.bottom)
  const centerX = edge.left + areaWidth / 2
  const centerY = edge.top + areaHeight / 2
  const rotation = new Vector3(0, 1, 0)
  const target = new Vector3(0, .35, 4 - 3 * combat).applyAxisAngle(rotation, angle)
  const direction = new Vector3(0, 1, .85).normalize().applyAxisAngle(rotation, angle)
  const right = new Vector3(1, 0, 0).applyAxisAngle(rotation, angle)
  const up = new Vector3().crossVectors(direction, right)
  const tangent = Math.tan(camera.fov * Math.PI / 360)
  let distance = 0
  // Nine-die battle lines, the full near bowl, and the initial roll's height.
  // Resolution temporarily includes both seats' resource/god contact anchors.
  const points: Vector3[] = []
  for (const x of [-5.65 - 1.35 * combat, 5.65 + 1.35 * combat])
    for (const z of [-1.8 - 6.2 * combat, 10.1]) for (const y of [0, 1.85 + .15 * combat]) points.push(new Vector3(x, y, z))
  // High roll poses only occur over the near bowl, never over the battle lines.
  for (const x of [-2.5, 2.5]) for (const z of [4.8, 8.6]) points.push(new Vector3(x, 4.1, z))
  for (const pose of points) {
    const point = pose.applyAxisAngle(rotation, angle).sub(target)
    distance = Math.max(distance, point.dot(direction) + Math.max(
      Math.abs(point.dot(right)) / (tangent * (width / height) * areaWidth / width),
      Math.abs(point.dot(up)) / (tangent * areaHeight / height),
    ))
  }
  camera.position.copy(target).addScaledVector(direction, distance * 1.025)
  camera.aspect = width / height
  camera.far = Math.max(100, distance + 50)
  camera.lookAt(target)
  camera.setViewOffset(width, height, width / 2 - centerX, height / 2 - centerY, width, height)
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld(true)
}

// Desktop retains the complete wooden outline; mobile fits the near play area.
// Both paths reserve the applicable controls before projecting from either seat.
export function frameTableCamera(camera: PerspectiveCamera, width: number, height: number, player: PlayerId, narrow: boolean, angle = playerAngle(player), options: { insets?: TableInsets; combat?: boolean | number } = {}) {
  if (width <= 0 || height <= 0) return
  if (isMobileTableView(width, height)) {
    frameMobile(camera, width, height, angle, Math.max(0, Math.min(1, Number(options.combat ?? 0))), options.insets)
    return
  }
  camera.clearViewOffset()
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
