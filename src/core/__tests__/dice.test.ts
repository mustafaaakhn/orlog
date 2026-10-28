import { describe, expect, it } from 'vitest'
import { DICE_DEFINITIONS, DIE_DEFINITION_IDS, FACE_IDS, getDieFace, PLAYER_IDS, rollFace } from '../index'

describe('the six fixed Orlog dice', () => {
  it('preserves each die’s specific pair of gold faces', () => {
    expect(DICE_DEFINITIONS.map(die => die.faces.filter(face => face.grantsToken).map(face => face.id))).toEqual([
      ['arrow', 'shield'], ['arrow', 'helmet'], ['arrow', 'hand'],
      ['helmet', 'shield'], ['helmet', 'hand'], ['shield', 'hand'],
    ])
  })

  it.each(DICE_DEFINITIONS)('$id has two axes, one of each other symbol, and two gold faces', die => {
    expect(die.faces.map(face => face.id)).toEqual(FACE_IDS)
    expect(die.faces.map(face => face.symbol).sort()).toEqual(['arrow', 'axe', 'axe', 'hand', 'helmet', 'shield'])
    expect(die.faces.filter(face => face.grantsToken)).toHaveLength(2)
    expect(die.faces.filter(face => face.symbol === 'axe').every(face => !face.grantsToken)).toBe(true)
  })

  it('uses a single equally sized random interval for each physical face', () => {
    const faces = [0, 1, 2, 3, 4, 5].map(index => rollFace('die-1', () => (index + 0.5) / 6))
    expect(faces.map(face => face.id)).toEqual(FACE_IDS)
    expect(rollFace('die-1', () => 0).id).toBe('axe-1')
    expect(rollFace('die-1', () => 1 - Number.EPSILON).id).toBe('hand')
  })

  it('never carries a gold frame from a previous roll onto an axe', () => {
    expect(rollFace('die-1', () => 0.4).grantsToken).toBe(true)
    expect(rollFace('die-1', () => 0).grantsToken).toBe(false)
    expect(getDieFace('die-1', 'shield').grantsToken).toBe(true)
    expect(getDieFace('die-2', 'shield').grantsToken).toBe(false)
  })

  it('does not allow callers to alter shared face definitions', () => {
    expect(Object.isFrozen(PLAYER_IDS)).toBe(true)
    expect(Object.isFrozen(DIE_DEFINITION_IDS)).toBe(true)
    expect(Object.isFrozen(FACE_IDS)).toBe(true)
    expect(Object.isFrozen(DICE_DEFINITIONS)).toBe(true)
    expect(Object.isFrozen(DICE_DEFINITIONS[0]!.faces[0])).toBe(true)
  })
})
