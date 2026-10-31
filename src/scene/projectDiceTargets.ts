import { Vector3 } from 'three'
import type { Camera, Group } from 'three'
import type { DieId, GameEvent } from '../core'
import { eventDieRole } from './eventFocus'
import type { SceneDieTarget } from './dieTargets'
import type { TableInsets } from './tableCamera'

// Projection is read-only even while input is locked. Withheld roll/recast
// identities cannot reveal a new face before the event's presentation boundary.
export function projectDiceTargets(
  dice: ReadonlyMap<DieId, Group>, camera: Camera, width: number, height: number,
  options: { mobile: boolean; presenting: boolean; insets: TableInsets; event: GameEvent | null;
    concealed: readonly DieId[]; finished: ReadonlySet<DieId> },
): SceneDieTarget[] {
  const result: SceneDieTarget[] = []
  for (const [id, die] of dice) {
    if (!die.visible || options.finished.has(id) || options.concealed.includes(id)) continue
    const point = die.position.clone().add(new Vector3(0, .18, 0)).project(camera)
    const x = (point.x + 1) * width / 2, y = (1 - point.y) * height / 2
    const edge = options.insets
    const underHud = options.mobile && (x < edge.left || x > width - edge.right || y < edge.top || y > height - edge.bottom)
    // During mobile resolution all extant faces keep their stable docks, even
    // when the current camera follows a different piece. Only active leaders move.
    if ((options.mobile && options.presenting) || (!underHud && Math.abs(point.x) < 1.1 && Math.abs(point.y) < 1.1 && point.z < 1))
      result.push({ id, x: (point.x + 1) * 50, y: (1 - point.y) * 50,
        eventRole: eventDieRole(options.event, id), combatRole: die.userData.combatRole })
  }
  return result
}
