import { Box3, Vector3 } from 'three'
import type { Camera, Group } from 'three'
import type { SceneTokenTarget } from './dieTargets'

// Read the real reserve's bounds, including its seat rotation and reserve scale.
// This projection never moves plates or calculates a player's token count.
export function projectTokenTargets(groups: readonly Group[], camera: Camera, width: number, height: number): SceneTokenTarget[] {
  return groups.flatMap(group => {
    const box = new Box3().setFromObject(group)
    if (box.isEmpty()) {
      const anchor = group.getWorldPosition(new Vector3()).add(new Vector3(0, .15, 0))
      box.setFromCenterAndSize(anchor, new Vector3(.5, .2, .5))
    }
    const center = box.getCenter(new Vector3()).project(camera)
    if (center.z < -1 || center.z > 1 || Math.abs(center.x) > 1 || Math.abs(center.y) > 1) return []
    let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      const point = new Vector3(x, y, z).project(camera)
      const px = (point.x + 1) * width / 2, py = (1 - point.y) * height / 2
      left = Math.min(left, px); right = Math.max(right, px)
      top = Math.min(top, py); bottom = Math.max(bottom, py)
    }
    return [{ playerId: group.userData.playerId, x: (left + right) * 50 / width, y: (top + bottom) * 50 / height,
      width: Math.max(44, right - left + 12), height: Math.max(44, bottom - top + 12) }]
  })
}
