import { expect, it } from 'vitest'
import { Group, PerspectiveCamera } from 'three'
import { projectDiceTargets } from '../projectDiceTargets'
import type { DieId, GameEvent } from '../../core'

it('tracks current transforms through locks, withholds recasts and clears finished/invisible identities', () => {
  const camera = new PerspectiveCamera(42, 390 / 844, .1, 100)
  camera.position.set(0, 12, 12); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true)
  const ids: DieId[] = ['player-1/die-1', 'player-1/die-2', 'player-2/die-1']
  const dice = new Map(ids.map(id => [id, new Group()]))
  const event: GameEvent = { type: 'AttackBlocked', playerId: 'player-1', targetId: 'player-2', dieId: ids[0]!, defenderDieId: ids[2]!, symbol: 'axe', id: 'test/1', sequence: 1, revision: 1, round: 1 }
  const options: Parameters<typeof projectDiceTargets>[4] = { mobile: true, presenting: true, insets: { top: 180, bottom: 180, left: 12, right: 12 }, event, concealed: [] as DieId[], finished: new Set<DieId>() }
  const project = () => projectDiceTargets(dice, camera, 390, 844, options)
  const first = project()
  expect(first.map(t => t.eventRole)).toEqual(['source', undefined, 'target'])
  dice.get(ids[0]!)!.position.x = 3
  camera.position.z = 16; camera.updateMatrixWorld(true)
  const moved = project()
  expect(moved[0]!.x).not.toBe(first[0]!.x)
  expect(moved).toHaveLength(3)
  options.concealed = [ids[1]!]
  expect(project().map(t => t.id)).toEqual([ids[0], ids[2]])
  options.concealed = []
  options.finished = new Set([ids[0]!])
  dice.get(ids[2]!)!.visible = false
  expect(project().map(t => t.id)).toEqual([ids[1]])
  options.event = null
  expect(project()[0]!.eventRole).toBeUndefined()
  expect(dice.get(ids[0]!)!.position.x).toBe(3)
})
