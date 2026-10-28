import { Group, Vector3, Mesh, SphereGeometry, MeshStandardMaterial } from 'three'
import type { GameState, DieId } from '../../core'
import type { createBoard } from '../../scene/board'

export function mockBoard(state: GameState) {
  const dice = new Map<DieId, Group>()
  Object.values(state.players).forEach(player => player.dice.forEach(die => { const object = new Group(); object.add(Object.assign(new Group(), {name: 'selection-marker'})); dice.set(die.id, object) }))
  const stones = Object.fromEntries(['player-1', 'player-2'].map(id => [id, Array.from({ length: 15 }, () => new Mesh(new SphereGeometry(), new MeshStandardMaterial()))]))
  return { steal: { object: new Group(), prepare: (_id: string, _index: number, count: number) => Array.from({ length: count }, (_, i) => new Vector3(i, 0, 0)), cargo: () => {}, lift: () => {}, clear: () => {} }, dice, attackEffects: { arrow: new Group(), axe: new Group() }, lifeStone: (id: string, index: number) => stones[id]![index]!, lifePosition: () => new Vector3(2, 0, 0), tokenPosition: () => new Vector3(2, 0, 0), effect: Object.assign(new Mesh(new SphereGeometry(), new MeshStandardMaterial()), { visible: false }), tokenEffect: Object.assign(new Group(), {visible: false}), resourcePosition: () => new Vector3(2, 0, 0), totem: () => new Group() } as unknown as ReturnType<typeof createBoard>
}
