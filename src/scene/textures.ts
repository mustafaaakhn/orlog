import { CanvasTexture, SRGBColorSpace } from "three";
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
  const path = new Path2D(SYMBOL_PATHS[symbol]);
  context.strokeStyle = '#49321b';
  context.lineWidth = 3.5;
  context.lineJoin = 'round';
  context.stroke(path);
  context.fillStyle = '#ffe4b0';
  context.fill(path, 'evenodd');
  return texture(element);
}
// Only surface noise; never consumes the game's random source.
function noise(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
export function createClothTexture() {
  const { element, context: ctx } = canvas(1024);
  ctx.fillStyle = "#626b58";
  ctx.fillRect(0, 0, 1024, 1024);
  // A quiet lichen-dyed field; decoration stays on the runner's free edges.
  for (let y = 0; y < 1024; y += 3)
    for (let x = 0; x < 1024; x += 3) {
      const shade = noise(x, y);
      ctx.fillStyle = `rgba(216,207,167,${0.035 + shade * 0.09})`;
      ctx.fillRect(x, y + ((x / 3) % 2), 2, 1);
      ctx.fillStyle = `rgba(22,34,26,${0.04 + shade * 0.08})`;
      ctx.fillRect(x + 2, y, 1, 3);
    }
  for (const edge of [54, 970]) {
    ctx.fillStyle = "#484d3d";
    ctx.fillRect(edge - 24, 0, 48, 1024);
    ctx.strokeStyle = "#aa9870";
    ctx.lineWidth = 2;
    for (const offset of [-29, 29]) {
      ctx.beginPath(); ctx.moveTo(edge + offset, 0); ctx.lineTo(edge + offset, 1024); ctx.stroke();
    }
    ctx.strokeStyle = "#9c8a65";
    ctx.lineWidth = 3;
    for (let y = -20; y < 1050; y += 58) {
      ctx.beginPath();
      ctx.moveTo(edge, y); ctx.lineTo(edge + 17, y + 22);
      ctx.lineTo(edge, y + 44); ctx.lineTo(edge - 17, y + 22);
      ctx.closePath(); ctx.stroke();
    }
  }
  // Individual faded fibres soften the border along with the field.
  for (let i = 0; i < 5500; i++) {
    ctx.fillStyle = `rgba(203,190,153,${noise(i, 8) * 0.08})`;
    ctx.fillRect(noise(i, 1) * 1024, noise(i, 2) * 1024, 1, 3);
  }
  return texture(element);
}
export function createWoodTexture() {
  const { element, context: ctx } = canvas(1024);
  ctx.fillStyle = "#614936";
  ctx.fillRect(0, 0, 1024, 1024);
  // Broad, unequal boards and long grain, rather than periodic dark stripes.
  const joints = [0, 151, 324, 503, 671, 862, 1024];
  for (let i = 0; i < joints.length - 1; i++) {
    const y = joints[i]!, height = joints[i + 1]! - y;
    ctx.fillStyle = `rgba(${i % 2 ? '156,121,79' : '31,26,21'},0.1)`;
    ctx.fillRect(0, y, 1024, height);
    ctx.fillStyle = "#302b23"; ctx.fillRect(0, y, 1024, 3);
    ctx.fillStyle = "#b29970"; ctx.fillRect(0, y + 3, 1024, 1);
  }
  for (let i = 0; i < 1800; i++) {
    const y = noise(i, 3) * 1024;
    ctx.strokeStyle = i % 3
      ? `rgba(25,23,19,${0.03 + noise(i, 5) * 0.11})`
      : `rgba(201,167,116,${0.03 + noise(i, 6) * 0.1})`;
    ctx.lineWidth = 0.4 + noise(i, 7) * 1.5;
    ctx.beginPath();
    const start = noise(i, 9) * -200;
    for (let x = start; x <= 1024; x += 12) {
      const knot = Math.exp(-Math.pow((x - 620) / 100, 2)) * Math.sin(y * 0.028) * 16;
      const wave = Math.sin(x * 0.006 + y * 0.07) * (2 + noise(i, 4) * 5) + knot;
      if (x === start) ctx.moveTo(x, y + wave); else ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 420; i++) {
    const x = noise(i, 1) * 1024, y = noise(i, 2) * 1024;
    ctx.strokeStyle = `rgba(223,197,148,${noise(i, 0) * 0.11})`;
    ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x + 8 + noise(i, 3) * 75, y + 0.5); ctx.stroke();
  }
  return texture(element);
}
export function createBowlTexture() {
  const { element, context: ctx } = canvas(512);
  const pixels = ctx.createImageData(512, 512);
  for (let y = 0; y < 512; y++)
    for (let x = 0; x < 512; x++) {
      const radius = Math.hypot((x - 215) * 0.8, (y - 270) * 1.1);
      const grain = Math.sin(y * 0.15 + Math.sin(x * 0.014) * 3 + Math.sin(radius * 0.024) * 4);
      const shade = grain * 3.5 + Math.sin(radius * 0.035) * 3 + noise(x, y) * 7;
      const i = (y * 512 + x) * 4;
      pixels.data[i] = 92 + shade;
      pixels.data[i + 1] = 65 + shade * 0.8;
      pixels.data[i + 2] = 42 + shade * 0.6;
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
    ctx.lineWidth = 25;
    ctx.strokeRect(14, 14, 228, 228);
    ctx.strokeStyle = "#dda82d";
    ctx.lineWidth = 17;
    ctx.strokeRect(14, 14, 228, 228);
    ctx.strokeStyle = "#f3d58a";
    ctx.lineWidth = 4;
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
