import { describe, expect, it } from 'vitest'
import { Group, PerspectiveCamera, Vector3 } from 'three'
import { collectionFocusPoints, eventDieRole, eventFocusPoints } from '../eventFocus'
import { frameTableCamera } from '../tableCamera'
import type { DieId, GameEvent, GameEventPayload, PlayerId } from '../../core'
import { playerSide } from '../tableLayout'

const dice = new Map<DieId, Group>()
for (const owner of ['player-1', 'player-2'] as const) for (let i = 1; i <= 6; i++) {
  const die = new Group(); die.position.set((i - 3.5) * .9, .7, playerSide(owner) * 1.5)
  dice.set(`${owner}/die-${i}` as DieId, die)
}
const board = {
  dice,
  lifePosition: (owner: PlayerId, i: number) => new Vector3(-5.2 * playerSide(owner) + i % 5 * .5, .3, 6.7 * playerSide(owner)),
  tokenPosition: (owner: PlayerId, i: number) => new Vector3((3.9 + Math.floor(i / 5) * .56) * playerSide(owner), .1 + i % 5 * .145, 3.6 * playerSide(owner)),
  totem: (owner: PlayerId) => { const object = new Group(); object.position.set(5.05 * playerSide(owner), 0, 6.7 * playerSide(owner)); return object },
} as unknown as Parameters<typeof eventFocusPoints>[1]
const event = (payload: GameEventPayload): GameEvent => ({ ...payload, id: 'e/1', sequence: 1, round: 1, revision: 1 })
const cases: GameEventPayload[] = [
  { type: 'AttackBlocked', playerId: 'player-1', targetId: 'player-2', dieId: 'player-1/die-1', defenderDieId: 'player-2/die-2', symbol: 'arrow' },
  { type: 'DamageDealt', playerId: 'player-1', targetId: 'player-2', dieId: 'player-1/die-1', amount: 3, health: 8 },
  { type: 'DamageDealt', playerId: 'player-2', targetId: 'player-1', favorId: 'thors-strike', amount: 5, health: 0 },
  { type: 'TokensGained', playerId: 'player-1', dieIds: ['player-1/die-2', 'player-1/die-3'], tokens: 5 },
  { type: 'TokensStolen', playerId: 'player-2', targetId: 'player-1', dieIds: ['player-2/die-2'], amount: 3, tokens: 7, targetTokens: 2 },
  { type: 'FavorInvoked', playerId: 'player-1', favorId: 'thors-strike', level: 2, cost: 8, tokens: 1 },
  { type: 'HealthRestored', playerId: 'player-1', favorId: 'iduns-rejuvenation', amount: 4, health: 13 },
  { type: 'HealthSacrificed', playerId: 'player-2', favorId: 'odins-sacrifice', amount: 3, health: 2 },
  { type: 'TokensGranted', playerId: 'player-1', favorId: 'bragis-verve', amount: 2, tokens: 8 },
  { type: 'TokensDestroyed', playerId: 'player-1', targetId: 'player-2', favorId: 'skulds-claim', amount: 2, tokens: 0 },
  { type: 'DiceValuesChanged', playerId: 'player-1', favorId: 'freyrs-gift', values: [{ dieId: 'player-1/die-2', value: 3 }] },
  { type: 'DiceRemoved', playerId: 'player-2', targetId: 'player-1', favorId: 'lokis-trick', dieIds: ['player-1/die-5'] },
  { type: 'HelmetsRemoved', playerId: 'player-2', targetId: 'player-1', dieIds: ['player-1/die-4'] },
  { type: 'DiceRecast', playerId: 'player-1', favorId: 'friggs-sight', added: false, dice: [{ id: 'player-1/die-2', definitionId: 'die-2', faceId: 'helmet', kept: true, selected: false, removed: false, value: 1 }] },
]

describe('current-event mobile framing', () => {
  it.each(cases)('fits source, target and contact envelope for $type at both seats and all mobile sizes', payload => {
    const e = event(payload), before = [...dice.values()].map(d => d.position.toArray())
    const points = eventFocusPoints(e, board)
    expect(points.length).toBeGreaterThan(0)
    for (const [width, height] of [[360, 800], [390, 844], [430, 932], [844, 390], [568, 320]]) for (const owner of ['player-1', 'player-2'] as const) {
      const insets = width > height ? { top: 112, bottom: 80, left: 280, right: 16 } : { top: 172, bottom: 190, left: 16, right: 16 }
      const camera = new PerspectiveCamera(42, width / height, .1, 100)
      frameTableCamera(camera, width, height, owner, width < 600, undefined, { insets, focus: points })
      for (const p of points) {
        const projected = p.clone().project(camera), x = (projected.x + 1) * width / 2, y = (1 - projected.y) * height / 2
        expect(x).toBeGreaterThan(insets.left); expect(x).toBeLessThan(width - insets.right)
        expect(y).toBeGreaterThan(insets.top); expect(y).toBeLessThan(height - insets.bottom)
        expect(projected.z).toBeLessThan(1)
      }
    }
    expect([...dice.values()].map(d => d.position.toArray())).toEqual(before)
  })
  it('frames recast recording and bonus destinations before the new die is visible', () => {
    const payload = cases.at(-1)!
    if (payload.type !== 'DiceRecast') throw new Error('Expected recast fixture')
    const bonus = { ...payload.dice[0]!, id: 'player-1/bonus-1' as DieId }
    const points = eventFocusPoints(event({ ...payload, added: true, dice: [bonus] }), board)
    expect(points.some(p => p.y === 4.1)).toBe(true)
    expect(points.some(p => p.z > 8)).toBe(true)
    expect(dice.has(bonus.id)).toBe(false)
  })
  it('reads only the current event IDs and labels the exact blocking defender', () => {
    const block = event(cases[0]!)
    expect(eventDieRole(block, 'player-1/die-1')).toBe('source')
    expect(eventDieRole(block, 'player-2/die-2')).toBe('target')
    expect(eventDieRole(block, 'player-2/die-3')).toBeUndefined()
    expect(eventDieRole(null, 'player-1/die-1')).toBeUndefined()
    expect(eventDieRole(event(cases[11]!), 'player-1/die-5')).toBe('target')
    const points = eventFocusPoints(block, board)
    expect(points).toHaveLength(2)
    expect(points[0]).toEqual(dice.get('player-1/die-1')!.position)
  })
  it('frames the actual last-use collection lane and uses a closer attack view than the full resolution table', () => {
    const points = collectionFocusPoints(['player-1/die-1'], board)
    expect(points).toHaveLength(3)
    const camera = new PerspectiveCamera(42, 390 / 844, .1, 100)
    frameTableCamera(camera, 390, 844, 'player-1', true, undefined, { combat: true })
    const wide = camera.position.clone()
    frameTableCamera(camera, 390, 844, 'player-1', true, undefined, { focus: eventFocusPoints(event(cases[0]!), board) })
    expect(camera.position.y).toBeLessThan(wide.y * .7)
    frameTableCamera(camera, 1440, 900, 'player-1', false, undefined, { focus: points })
    expect(camera.view?.enabled).toBe(false)
  })
})
