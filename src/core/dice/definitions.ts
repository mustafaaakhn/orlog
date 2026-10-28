import { deepFreeze } from '../immutable'
import { randomIndex } from '../random'
import type { RandomSource } from '../random'
import { DIE_DEFINITION_IDS, FACE_IDS } from '../types'
import type { DieDefinition, DieDefinitionId, DieFace, DieSymbol, FaceId } from '../types'

// Logical face order, not a claim about the original game's physical cube axes.
const SYMBOLS: Readonly<Record<FaceId, DieSymbol>> = {
  'axe-1': 'axe',
  'axe-2': 'axe',
  arrow: 'arrow',
  helmet: 'helmet',
  shield: 'shield',
  hand: 'hand',
}

// Each unordered pair of non-axe faces appears exactly once across the set.
const GOLD_FACES: Readonly<Record<DieDefinitionId, readonly FaceId[]>> = {
  'die-1': ['arrow', 'shield'],
  'die-2': ['arrow', 'helmet'],
  'die-3': ['arrow', 'hand'],
  'die-4': ['helmet', 'shield'],
  'die-5': ['helmet', 'hand'],
  'die-6': ['shield', 'hand'],
}

export const DICE_DEFINITIONS: readonly DieDefinition[] = deepFreeze(
  DIE_DEFINITION_IDS.map(id => ({
    id,
    faces: FACE_IDS.map(faceId => ({
      id: faceId,
      symbol: SYMBOLS[faceId],
      grantsToken: GOLD_FACES[id].includes(faceId),
    })),
  })),
)

export function getDieDefinition(id: DieDefinitionId): DieDefinition {
  const definition = DICE_DEFINITIONS.find(die => die.id === id)
  if (!definition) throw new RangeError(`Unknown die definition: ${id}`)
  return definition
}

export function getDieFace(id: DieDefinitionId, faceId: FaceId): DieFace {
  const face = getDieDefinition(id).faces.find(candidate => candidate.id === faceId)
  if (!face) throw new RangeError(`Unknown die face: ${faceId}`)
  return face
}

export function rollFace(id: DieDefinitionId, random: RandomSource): DieFace {
  const faces = getDieDefinition(id).faces
  return faces[randomIndex(random, faces.length)]!
}
