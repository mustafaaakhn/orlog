import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import type { DieFace, DieSymbol } from "../core";
import { SYMBOL_PATHS } from "./symbols";

function canvas(size: number) {
  const element = document.createElement("canvas");
  element.width = element.height = size;
  const context = element.getContext("2d");
  if (!context) throw new Error("2D texture canvas is unavailable");
  return { element, context };
}
function texture(element: HTMLCanvasElement) {
  const result = new CanvasTexture(element);
  result.colorSpace = SRGBColorSpace;
  result.anisotropy = 4;
  return result;
}
export function createSymbolTexture(symbol: DieSymbol) {
  const { element, context } = canvas(128);
  context.scale(1.28, 1.28);
  context.fillStyle = '#ffe4b0';
  context.fill(new Path2D(SYMBOL_PATHS[symbol]), 'evenodd');
  return texture(element);
}
// Only surface noise; never consumes the game's random source.
function noise(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
export function createClothTexture() {
  const { element, context: ctx } = canvas(1024);
  ctx.fillStyle = "#29484d";
  ctx.fillRect(0, 0, 1024, 1024);
  // Dense linen warp/weft with larger, irregular dye variation.
  for (let y = 0; y < 1024; y += 4)
    for (let x = 0; x < 1024; x += 4) {
      const shade = noise(x, y);
      ctx.fillStyle = `rgba(170,188,171,${0.025 + shade * 0.075})`;
      ctx.fillRect(x, y + ((x / 4) % 2) * 2, 3, 1);
      ctx.fillStyle = `rgba(3,17,21,${0.08 + shade * 0.12})`;
      ctx.fillRect(x + 3, y, 1, 4);
    }
  for (let i = 0; i < 45; i++) {
    const x = noise(i, 2) * 1024,
      y = noise(i, 3) * 1024;
    const gradient = ctx.createRadialGradient(
      x,
      y,
      2,
      x,
      y,
      40 + noise(i, 5) * 130,
    );
    gradient.addColorStop(0, "rgba(5,19,24,.09)");
    gradient.addColorStop(1, "rgba(5,19,24,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 1024);
  }
  const result = texture(element);
  result.wrapS = result.wrapT = RepeatWrapping;
  result.repeat.set(2, 2);
  return result;
}
export function createWoodTexture() {
  const { element, context: ctx } = canvas(512);
  ctx.fillStyle = "#60412c";
  ctx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y++) {
    const grain = Math.sin(y * 0.52 + Math.sin(y * 0.071) * 3);
    ctx.strokeStyle =
      grain > 0
        ? `rgba(190,143,85,${grain * 0.16})`
        : `rgba(24,12,8,${-grain * 0.2})`;
    ctx.lineWidth = 0.5 + noise(y, 5);
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= 512; x += 4)
      ctx.lineTo(
        x,
        y + Math.sin(x * 0.012 + y * 0.013) * 10 + Math.sin(x * 0.04) * 1.4,
      );
    ctx.stroke();
  }
  for (let i = 0; i < 120; i++) {
    ctx.strokeStyle = `rgba(224,191,141,${noise(i, 0) * 0.09})`;
    ctx.beginPath();
    const x = noise(i, 1) * 512,
      y = noise(i, 2) * 512;
    ctx.moveTo(x, y);
    ctx.lineTo(x + 5 + noise(i, 3) * 50, y + 0.4);
    ctx.stroke();
  }
  return texture(element);
}
export function createBowlTexture() {
  const { element, context: ctx } = canvas(512);
  const pixels = ctx.createImageData(512, 512);
  for (let y = 0; y < 512; y++)
    for (let x = 0; x < 512; x++) {
      const dx = (x - 210) * 1.1,
        dy = (y - 265) * 0.86;
      const radius = Math.hypot(dx, dy);
      const grain = Math.sin(
        radius * 0.48 +
          Math.sin(Math.atan2(dy, dx) * 5) * 1.8 +
          Math.sin(radius * 0.06) * 3,
      );
      const fine = noise(x, y) * 9;
      const shade = grain * 8 + Math.sin(radius * 0.09) * 5 + fine;
      const i = (y * 512 + x) * 4;
      pixels.data[i] = 103 + shade;
      pixels.data[i + 1] = 69 + shade * 0.7;
      pixels.data[i + 2] = 44 + shade * 0.4;
      pixels.data[i + 3] = 255;
    }
  ctx.putImageData(pixels, 0, 0);
  return texture(element);
}
export function createSurfaceTexture(kind: "bone" | "stone" | "metal") {
  const { element, context: ctx } = canvas(128);
  ctx.fillStyle = kind === "bone" ? "#dfd2b9" : "#b9bab2";
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 2400; i++) {
    const x = noise(i, 1) * 128,
      y = noise(i, 2) * 128;
    ctx.fillStyle = `rgba(43,34,24,${noise(i, 3) * (kind === "bone" ? 0.09 : 0.22)})`;
    ctx.fillRect(x, y, kind === "metal" ? 10 : 1.5, 0.6);
  }
  if (kind === "stone") {
    ctx.strokeStyle = "#f7efda55";
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * 22);
      for (let x = 0; x < 130; x += 4)
        ctx.lineTo(x, i * 22 + Math.sin(x * 0.06 + i) * 10);
      ctx.stroke();
    }
  }
  return texture(element);
}
export function createFaceTexture(face: DieFace) {
  const { element, context: ctx } = canvas(256);
  const base = ctx.createRadialGradient(120, 105, 30, 128, 128, 180);
  base.addColorStop(0, "#eee4cd");
  base.addColorStop(0.8, "#e0d1b0");
  base.addColorStop(1, "#c5ac85");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1900; i++) {
    ctx.fillStyle = `rgba(97,68,33,${0.015 + noise(i, 3) * 0.055})`;
    ctx.fillRect(noise(i, 1) * 256, noise(i, 2) * 256, 1.2, 1.2);
  }
  if (face.grantsToken) {
    ctx.strokeStyle = "#78501e";
    ctx.lineWidth = 15;
    ctx.strokeRect(14, 14, 228, 228);
    ctx.strokeStyle = "#d7a744";
    ctx.lineWidth = 9;
    ctx.strokeRect(14, 14, 228, 228);
    ctx.strokeStyle = "#f3d58a";
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 236, 236);
    ctx.fillStyle = "#6e4718";
    for (const [x, y] of [
      [14, 14],
      [242, 14],
      [14, 242],
      [242, 242],
    ]) {
      ctx.beginPath();
      ctx.arc(x!, y!, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.save();
  ctx.translate(25, 25);
  ctx.scale(2.06, 2.06);
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // A light lower edge and dark cut give the shared symbol an engraved face.
  ctx.translate(0, 0.65);
  ctx.fillStyle = "#fff1d4";
  ctx.fill(new Path2D(SYMBOL_PATHS[face.symbol]), "evenodd");
  ctx.translate(0, -0.65);
  ctx.fillStyle = "#29231d";
  ctx.fill(new Path2D(SYMBOL_PATHS[face.symbol]), "evenodd");
  ctx.restore();
  return texture(element);
}
export function createInscriptionTexture(text: string, color = "#d9bd7d") {
  const { element, context: ctx } = canvas(256);
  ctx.fillStyle = color;
  ctx.font = "bold 110px Georgia, serif";
  const width = ctx.measureText(text).width;
  if (width > 216)
    ctx.font = `bold ${Math.floor((110 * 216) / width)}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 136);
  return texture(element);
}
