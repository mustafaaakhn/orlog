import { PlaneGeometry } from 'three'
import { CLOTH_WIDTH, CLOTH_DEPTH } from './tableLayout'

// The runner is decorative: flat contact patches preserve the gameplay Y plane.
export function clothHeight(x: number, z: number) {
  const edge = Math.max(0, Math.min(1, (Math.abs(z) - 10.35) / 0.5))
  return 0.025 - edge * edge * (0.11 + Math.sin(x * 2.1) * 0.025)
}

export function createClothGeometry() {
  const shape = new PlaneGeometry(CLOTH_WIDTH, CLOTH_DEPTH, 36, 44)
  shape.rotateX(-Math.PI / 2)
  const vertices = shape.getAttribute('position')
  for (let i = 0; i < vertices.count; i++) {
    let x = vertices.getX(i), z = vertices.getZ(i)
    if (Math.abs(x) > CLOTH_WIDTH / 2 - 0.1) x += Math.sin(z * 4.1) * 0.018
    if (Math.abs(z) > 10.7) z += Math.sin(x * 5.3) * 0.025
    vertices.setXYZ(i, x, clothHeight(x, z), z)
  }
  shape.computeVertexNormals()
  return shape
}
