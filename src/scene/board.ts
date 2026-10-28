import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Texture,
  TorusGeometry,
  Vector2,
  Vector3,
} from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { DICE_DEFINITIONS } from '../core'
import type { FaceId } from '../core'
import {
  createClothTexture,
  createFaceTexture,
  createInscriptionTexture,
  createWoodTexture,
} from './textures'

// Explicit adaptation, independent of the core's logical array order.
// These are our cube axes, not a reconstruction of Valhalla's original cubes.
export const FACE_NORMALS: Record<FaceId, [number, number, number]> = {
  arrow: [0, 1, 0],
  'axe-2': [0, -1, 0],
  helmet: [1, 0, 0],
  shield: [-1, 0, 0],
  hand: [0, 0, 1],
  'axe-1': [0, 0, -1],
}

export function createBoard() {
  const root = new Group()
  root.name = 'Orlog visual prototype (not a match)'
  const textures = new Set<Texture>()
  const geometries = new Set<BufferGeometry>()
  const materials = new Set<MeshStandardMaterial>()
  function keepTexture<T extends Texture>(value: T) {
    textures.add(value)
    return value
  }
  function geometry<T extends BufferGeometry>(value: T) {
    geometries.add(value)
    return value
  }
  function material(
    options: ConstructorParameters<typeof MeshStandardMaterial>[0],
  ) {
    const value = new MeshStandardMaterial(options)
    materials.add(value)
    return value
  }
  function mesh(
    parent: Group,
    shape: BufferGeometry,
    surface: MeshStandardMaterial,
    position: [number, number, number],
  ) {
    const value = new Mesh(shape, surface)
    value.position.set(...position)
    value.castShadow = true
    value.receiveShadow = true
    parent.add(value)
    return value
  }

  const wood = material({
    map: keepTexture(createWoodTexture()),
    roughness: 0.78,
  })
  const darkWood = material({ color: '#37291f', roughness: 0.9 })
  const brass = material({ color: '#b9914e', metalness: 0.64, roughness: 0.42 })
  const cloth = material({
    map: keepTexture(createClothTexture()),
    roughness: 1,
    bumpScale: 0.022,
  })
  cloth.bumpMap = cloth.map
  const bone = material({ color: '#ded0af', roughness: 0.62 })
  const redStone = material({
    color: '#98614a',
    roughness: 0.32,
    metalness: 0.15,
  })
  const blueStone = material({
    color: '#608d8a',
    roughness: 0.28,
    metalness: 0.18,
  })
  const inlay = material({ color: '#b09b69', roughness: 0.85 })

  const table = mesh(
    root,
    geometry(new BoxGeometry(18.4, 0.42, 11.9)),
    darkWood,
    [0, -0.3, 0],
  )
  const fabric = mesh(
    root,
    geometry(new BoxGeometry(17.8, 0.12, 11.3)),
    cloth,
    [0, -0.03, 0],
  )

  // Woven borders, corner diamonds and a simple compass inlay.
  const borderLong = geometry(new BoxGeometry(17.25, 0.012, 0.035))
  const borderShort = geometry(new BoxGeometry(0.035, 0.012, 10.7))
  const borders = new Group()
  root.add(borders)
  for (const z of [-5.3, 5.3]) {
    mesh(borders, borderLong, inlay, [0, 0.038, z])
    mesh(borders, borderLong, inlay, [0, 0.038, z + Math.sign(z) * 0.13])
  }
  for (const x of [-8.5, 8.5]) mesh(borders, borderShort, inlay, [x, 0.038, 0])
  const diamond = geometry(new BoxGeometry(0.22, 0.014, 0.22))
  for (const x of [-8, 8])
    for (const z of [-4.85, 4.85])
      mesh(borders, diamond, inlay, [x, 0.04, z]).rotation.y = Math.PI / 4
  const ring = geometry(new TorusGeometry(3.48, 0.016, 5, 96))
  mesh(root, ring, inlay, [0, 0.045, 0]).rotation.x = -Math.PI / 2
  const dash = geometry(new BoxGeometry(0.035, 0.015, 0.2))
  for (let i = 0; i < 48; i++) {
    const angle = (i * Math.PI) / 24
    mesh(root, dash, inlay, [
      Math.sin(angle) * 3.65,
      0.045,
      Math.cos(angle) * 3.65,
    ]).rotation.y = angle
  }

  const bowlProfile = [
    [0.01, 0.08],
    [2.2, 0.08],
    [2.52, 0.19],
    [2.8, 0.43],
    [3.05, 0.8],
    [3.11, 0.99],
    [3.05, 1.07],
    [2.96, 1.04],
    [2.86, 0.78],
    [2.63, 0.5],
    [2.35, 0.31],
    [0.01, 0.31],
  ].map(([x, y]) => new Vector2(x, y))
  mesh(root, geometry(new LatheGeometry(bowlProfile, 96)), wood, [0, 0, 0])
  mesh(
    root,
    geometry(new CylinderGeometry(2.35, 2.35, 0.03, 96)),
    wood,
    [0, 0.31, 0],
  )
  const rim = geometry(new TorusGeometry(3.065, 0.035, 8, 96))
  mesh(root, rim, brass, [0, 1.035, 0]).rotation.x = -Math.PI / 2
  const innerRing = geometry(new TorusGeometry(2.16, 0.012, 6, 96))
  mesh(root, innerRing, darkWood, [0, 0.33, 0]).rotation.x = -Math.PI / 2

  const dieShape = geometry(new RoundedBoxGeometry(0.88, 0.88, 0.88, 3, 0.075))
  const faceShape = geometry(new PlaneGeometry(0.735, 0.735))
  const faceMaterials = new Map<string, MeshStandardMaterial>()
  const displayFaces: FaceId[] = [
    'arrow',
    'helmet',
    'hand',
    'shield',
    'axe-1',
    'axe-2',
  ]
  DICE_DEFINITIONS.forEach((definition, index) => {
    const die = new Group()
    die.name = `Preview ${definition.id}: ${displayFaces[index]}`
    mesh(die, dieShape, bone, [0, 0, 0])
    definition.faces.forEach((face) => {
      const cacheKey = `${face.symbol}-${face.grantsToken}`
      let surface = faceMaterials.get(cacheKey)
      if (!surface) {
        surface = material({
          map: keepTexture(createFaceTexture(face)),
          roughness: 0.7,
        })
        faceMaterials.set(cacheKey, surface)
      }
      const normal = new Vector3(...FACE_NORMALS[face.id])
      const plaque = mesh(
        die,
        faceShape,
        surface,
        normal.clone().multiplyScalar(0.441).toArray(),
      )
      plaque.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), normal)
      plaque.castShadow = false
    })
    const normal = new Vector3(...FACE_NORMALS[displayFaces[index]!])
    die.quaternion.setFromUnitVectors(normal, new Vector3(0, 1, 0))
    const faceRotation = new Quaternion().setFromUnitVectors(
      new Vector3(0, 0, 1),
      normal,
    )
    const faceUp = new Vector3(0, 1, 0)
      .applyQuaternion(faceRotation)
      .applyQuaternion(die.quaternion)
    const upright = Math.atan2(faceUp.x, -faceUp.z)
    die.quaternion.premultiply(
      new Quaternion().setFromAxisAngle(
        new Vector3(0, 1, 0),
        upright + [-0.18, 0.12, -0.13, 0.14, -0.15, 0.1][index]!,
      ),
    )
    die.position.set(((index % 3) - 1) * 1.18, 0.77, index < 3 ? -0.72 : 0.72)
    root.add(die)
  })

  const pebble = geometry(new SphereGeometry(0.22, 16, 10))
  const tokenShape = geometry(new CylinderGeometry(0.29, 0.29, 0.1, 28))
  const tokenInset = geometry(new TorusGeometry(0.22, 0.012, 5, 24))
  const inscriptionShape = geometry(new PlaneGeometry(0.8, 0.8))
  const tokenRune = material({
    map: keepTexture(createInscriptionTexture('ᛟ')),
    transparent: true,
    roughness: 0.5,
    metalness: 0.4,
  })
  const totemRunes = ['ᛏ', 'ᛃ', 'ᛉ']
  const totemNames = ['Thor', 'Iðunn', 'Víðarr']
  const totemColors = ['#c7a36c', '#a4bc91', '#92b7bb']
  const totemBase = geometry(new CylinderGeometry(0.5, 0.56, 0.16, 8))
  const totemBody = geometry(new CylinderGeometry(0.26, 0.4, 1.12, 6))
  const totemHead = geometry(new SphereGeometry(0.3, 8, 6))
  const eyeShape = geometry(new BoxGeometry(0.06, 0.025, 0.04))
  const browShape = geometry(new BoxGeometry(0.48, 0.12, 0.35))
  const hammerHead = geometry(new BoxGeometry(0.63, 0.26, 0.26))
  const hammerHandle = geometry(new CylinderGeometry(0.045, 0.045, 0.56, 8))
  const apple = geometry(new SphereGeometry(0.15, 12, 8))
  const leaf = geometry(new SphereGeometry(0.11, 8, 6))
  const green = material({ color: '#82936a', roughness: 0.65 })
  const shieldShape = geometry(new CylinderGeometry(0.27, 0.27, 0.08, 6))
  const stoneGroups: Group[] = []
  const tokenGroups: Group[] = []
  const totemGroups: Group[] = []
  const labels: Mesh[] = []

  for (const side of [-1, 1]) {
    const stones = new Group()
    stones.name = `${side < 0 ? 'Left' : 'Right'}: 15 life stones`
    for (let i = 0; i < 15; i++) {
      const stone = mesh(stones, pebble, side < 0 ? blueStone : redStone, [
        ((i % 3) - 1) * 0.5,
        0.17,
        (Math.floor(i / 3) - 2) * 0.47,
      ])
      stone.scale.set(1, 0.65 + (i % 3) * 0.08, 0.83)
      stone.rotation.y = i * 0.7
    }
    stones.position.set(side * 6.8, 0, -0.3)
    root.add(stones)
    stoneGroups.push(stones)
    const tokens = new Group()
    tokens.position.set(side * 6.8, 0, 1.65)
    root.add(tokens)
    tokenGroups.push(tokens)
    for (let i = 0; i < 4; i++) {
      const x = ((i % 2) - 0.5) * 0.7
      const z = Math.floor(i / 2) * 0.66
      mesh(tokens, tokenShape, brass, [x, 0.12, z])
      mesh(tokens, tokenInset, darkWood, [x, 0.179, z]).rotation.x =
        -Math.PI / 2
      const rune = mesh(tokens, inscriptionShape, tokenRune, [x, 0.183, z])
      rune.scale.setScalar(0.47)
      rune.rotation.x = -Math.PI / 2
      rune.castShadow = false
    }
    for (let i = 0; i < 3; i++) {
      const totem = new Group()
      totem.name = `${totemNames[i]} placeholder`
      mesh(totem, totemBase, darkWood, [0, 0.11, 0])
      mesh(totem, totemBody, wood, [0, 0.73, 0])
      mesh(totem, totemHead, wood, [0, 1.4, 0])
      const brow = mesh(
        totem,
        browShape,
        i === 0 ? brass : darkWood,
        [0, 1.55, 0.05],
      )
      brow.rotation.z = i === 2 ? -0.15 : 0
      for (const x of [-0.12, 0.12])
        mesh(totem, eyeShape, darkWood, [x, 1.43, 0.27])
      if (i === 0) {
        mesh(totem, hammerHandle, darkWood, [0.45, 0.78, 0.08])
        mesh(totem, hammerHead, brass, [0.45, 1.1, 0.08])
      } else if (i === 1) {
        mesh(totem, apple, green, [0.38, 0.9, 0.17])
        mesh(totem, leaf, green, [0.06, 1.73, 0]).scale.set(1.8, 0.5, 0.6)
      } else {
        const shield = mesh(totem, shieldShape, brass, [0.35, 0.73, 0.14])
        shield.rotation.x = Math.PI / 2
      }
      const runeSurface = material({
        map: keepTexture(
          createInscriptionTexture(totemRunes[i]!, totemColors[i]),
        ),
        transparent: true,
        roughness: 0.9,
      })
      const rune = mesh(totem, inscriptionShape, runeSurface, [0, 0.77, 0.36])
      rune.scale.setScalar(0.6)
      rune.castShadow = false
      totem.position.set(side * (4.45 + i * 1.3), 0, -3.55)
      root.add(totem)
      totemGroups.push(totem)
    }
  }

  // Flat woven labels keep the two resource areas grounded in the scene.
  for (const side of [-1, 1]) {
    const labelTexture = keepTexture(
      createInscriptionTexture(side < 0 ? 'I' : 'II', '#bba77e'),
    )
    const labelSurface = material({
      map: labelTexture,
      transparent: true,
      roughness: 1,
    })
    const label = mesh(
      root,
      geometry(new PlaneGeometry(0.85, 0.85)),
      labelSurface,
      [side * 6.8, 0.055, 3.25],
    )
    label.rotation.x = -Math.PI / 2
    label.castShadow = false
    labels.push(label)
  }

  return {
    object: root,
    setCompact(compact: boolean) {
      table.scale.set(compact ? 0.49 : 1, 1, compact ? 1.21 : 1)
      fabric.scale.copy(table.scale)
      borders.scale.copy(table.scale)
      stoneGroups.forEach((group, index) => {
        const side = index === 0 ? -1 : 1
        group.position.set(
          compact ? -0.4 : side * 6.8,
          0,
          compact ? side * 4 : -0.3,
        )
        group.children.forEach((stone, i) => {
          stone.position.x = compact
            ? ((i % 5) - 2) * 0.42
            : ((i % 3) - 1) * 0.5
          stone.position.z = compact
            ? (Math.floor(i / 5) - 1) * 0.42
            : (Math.floor(i / 3) - 2) * 0.47
        })
        tokenGroups[index]!.position.set(
          compact ? 2 : side * 6.8,
          0,
          compact ? side * 4 - 0.3 : 1.65,
        )
        labels[index]!.position.set(
          compact ? -2.6 : side * 6.8,
          0.055,
          compact ? side * 4 : 3.25,
        )
      })
      totemGroups.forEach((totem, index) => {
        const side = index < 3 ? -1 : 1
        const i = index % 3
        totem.position.set(
          compact ? (i - 1) * 1.25 : side * (4.45 + i * 1.3),
          0,
          compact ? side * 5.65 : -3.55,
        )
      })
    },
    dispose() {
      geometries.forEach((value) => value.dispose())
      materials.forEach((value) => value.dispose())
      textures.forEach((value) => value.dispose())
      root.clear()
    },
  }
}
