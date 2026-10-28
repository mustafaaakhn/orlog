import { PlaneGeometry } from 'three'

// Only free fabric ripples. Every gameplay contact keeps its established Y plane.
export function clothHeight(x: number, z: number) {
  const az = Math.abs(z), ax = Math.abs(x)
  // Narrow-seat peripheral pieces also sit on a flat patch; only the hem rises.
  const protectedSeat = az > 3.8 && az < 6.6 && ax < 8.65
  if (protectedSeat) return 0.025
  const edge = Math.max(0, Math.min(1, (Math.max(ax / 8.9, az / 8.85) - 0.82) / 0.18))
  const fold = Math.sin(x * 2.1 + z * 0.65) * 0.12 + Math.sin(z * 3.7 - x * 0.5) * 0.055
  return 0.025 + edge * edge * (0.17 + fold)
}

export function createClothGeometry() {
  const shape = new PlaneGeometry(18.3, 18.1, 48, 48)
  shape.rotateX(-Math.PI / 2)
  const vertices = shape.getAttribute('position')
  for (let i = 0; i < vertices.count; i++) {
    let x = vertices.getX(i), z = vertices.getZ(i)
    // A cut, irregular hem, without moving the flat play surface.
    if (Math.abs(x) > 8.9) x += Math.sin(z * 3.1) * 0.055 + Math.sin(z * 7.3) * 0.018
    if (Math.abs(z) > 8.8) z += Math.sin(x * 2.7) * 0.065 + Math.sin(x * 6.1) * 0.02
    vertices.setXYZ(i, x, clothHeight(x, z), z)
  }
  shape.computeVertexNormals()
  return shape
}
