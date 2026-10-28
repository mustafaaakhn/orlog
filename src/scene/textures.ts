import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'
import type { DieFace } from '../core'
import { SYMBOL_PATHS } from './symbols'

function canvas(size: number) {
  const element = document.createElement('canvas')
  element.width = element.height = size
  const context = element.getContext('2d')
  if (!context) throw new Error('2D texture canvas is unavailable')
  return { element, context }
}

function texture(element: HTMLCanvasElement) {
  const result = new CanvasTexture(element)
  result.colorSpace = SRGBColorSpace
  result.anisotropy = 4
  return result
}

export function createClothTexture() {
  const { element, context: ctx } = canvas(1024)
  ctx.fillStyle = '#4b5844'
  ctx.fillRect(0, 0, 1024, 1024)
  // Deterministic woven threads; no game randomness is consumed.
  for (let i = 0; i < 1024; i += 3) {
    ctx.fillStyle = i % 2 ? '#87927220' : '#17271e30'
    ctx.fillRect(i, 0, 1, 1024)
    ctx.fillRect(0, i, 1024, 1)
  }
  for (let y = 0; y < 1024; y += 6) {
    for (let x = 0; x < 1024; x += 6) {
      const shade = Math.sin(x * 17.3 + y * 53.9) * 0.04 + 0.04
      ctx.fillStyle = `rgba(219,207,160,${shade})`
      ctx.fillRect(x + (y % 12 ? 2 : 0), y, 2, 3)
    }
  }
  const result = texture(element)
  result.wrapS = result.wrapT = RepeatWrapping
  result.repeat.set(2, 2)
  return result
}

export function createWoodTexture() {
  const { element, context: ctx } = canvas(512)
  ctx.fillStyle = '#745035'
  ctx.fillRect(0, 0, 512, 512)
  for (let y = 0; y < 512; y++) {
    const wave = Math.sin(y * 0.23) + Math.sin(y * 0.071) * 0.5
    ctx.strokeStyle =
      wave > 0
        ? `rgba(213,165,96,${wave * 0.11})`
        : `rgba(25,11,5,${-wave * 0.13})`
    ctx.beginPath()
    ctx.moveTo(0, y)
    for (let x = 0; x <= 512; x += 8)
      ctx.lineTo(x, y + Math.sin(x * 0.016 + y * 0.025) * 5)
    ctx.stroke()
  }
  return texture(element)
}

export function createFaceTexture(face: DieFace) {
  const { element, context: ctx } = canvas(256)
  ctx.fillStyle = '#e6d6b2'
  ctx.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 1600; i++) {
    ctx.fillStyle = `rgba(97,68,33,${0.015 + (i % 5) * 0.009})`
    ctx.fillRect((i * 73.7) % 256, (i * 41.3) % 256, 1.5, 1.5)
  }
  if (face.grantsToken) {
    ctx.strokeStyle = '#a77329'
    ctx.lineWidth = 11
    ctx.strokeRect(12, 12, 232, 232)
    ctx.strokeStyle = '#f0c96d'
    ctx.lineWidth = 3
    ctx.strokeRect(13, 13, 230, 230)
    ctx.fillStyle = '#80541b'
    for (const [x, y] of [
      [13, 13],
      [243, 13],
      [13, 243],
      [243, 243],
    ]) {
      ctx.beginPath()
      ctx.arc(x!, y!, 5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.save()
  ctx.translate(25, 25)
  ctx.scale(2.06, 2.06)
  ctx.strokeStyle = '#453a2d'
  ctx.lineWidth = 5
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke(new Path2D(SYMBOL_PATHS[face.symbol]))
  ctx.restore()
  return texture(element)
}

export function createInscriptionTexture(text: string, color = '#d9bd7d') {
  const { element, context: ctx } = canvas(256)
  ctx.fillStyle = color
  ctx.font = 'bold 110px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 128, 136)
  return texture(element)
}
