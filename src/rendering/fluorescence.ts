/**
 * fluorescence.ts — Fluorescence rendering mode
 *
 * Simulates epi-fluorescence microscopy: cells glow based on expressed
 * pigmentation genes. Background is pitch black; emitted light bleeds
 * outward (bloom handles this in the compositor).
 *
 * Channel mapping (pigmentation gene bits 24-25):
 *   0 = none    → faint autofluorescence (blue-white, dim)
 *   1 = red     → RFP / mCherry channel (red-orange)
 *   2 = green   → GFP channel (lime-green)
 *   3 = blue    → BFP / DAPI channel (blue-violet)
 *
 * Intensity is proportional to energy / divisionEnergy (how full the cell is).
 * Emitter cells pulse with their phase (simulating oscillating reporter expression).
 * Predators always have a red-shifted overlay regardless of pigmentation.
 * Photo cells have boosted green output.
 */

import { traitsFrom, buildShapePoints } from '../simulation/genome.js'
import type { WorldSnapshot } from '../simulation/serialize.js'
import { drawShape } from './shapes.js'

// [hue, saturation] per pigmentation channel
const CHANNEL_HS: [number, number][] = [
  [210, 30],  // 0: autofluorescence — cold blue-white
  [10,  85],  // 1: RFP/mCherry — red-orange
  [120, 90],  // 2: GFP — lime-green
  [270, 80],  // 3: BFP — blue-violet
]

type WTS = (wx: number, wy: number) => [number, number]

export function drawFluorescenceCells(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  snapshot: WorldSnapshot,
  worldToScreen: WTS,
  vscale: number,
  W: number,
  H: number,
  selectedId: number | null,
): void {
  // Pitch-black background
  ctx.fillStyle = '#000'
  ;(ctx as CanvasRenderingContext2D).fillRect(0, 0, W, H)

  for (const cell of snapshot.cells) {
    const [sx, sy] = worldToScreen(cell.x, cell.y)
    if (sx < -120 || sx > W + 120 || sy < -120 || sy > H + 120) continue

    const t = traitsFrom(cell.genome)
    const sr = t.radius * vscale
    const ef = Math.min(1, cell.energy / t.divisionEnergy)

    // Base channel from pigmentation gene
    let [hue, sat] = CHANNEL_HS[t.pigmentation]!

    // Predators shift toward red regardless of pigmentation
    if (t.isPredator) { hue = 8; sat = 90 }
    // Photo cells boost green component
    else if (t.photo && t.pigmentation !== 1 && t.pigmentation !== 3) {
      hue = 100 + t.pigmentation * 5; sat = 85
    }

    // Emitter cells pulse — amplitude ×1.3 at peak
    const emitterBoost = t.emitter ? 1 + 0.3 * Math.sin(cell.phase * 2) : 1

    const baseIntensity = ef * emitterBoost
    const coreAlpha  = Math.min(0.95, 0.4 + baseIntensity * 0.55)
    const glowAlpha  = Math.min(0.6,  baseIntensity * 0.6)
    const outerAlpha = Math.min(0.25, baseIntensity * 0.25)

    // Outer glow (wide halo — picked up by bloom)
    const outerR = sr * 3.5
    const og = (ctx as CanvasRenderingContext2D).createRadialGradient(sx, sy, sr * 0.3, sx, sy, outerR)
    og.addColorStop(0,   `hsla(${hue},${sat}%,60%,${glowAlpha})`)
    og.addColorStop(0.4, `hsla(${hue},${sat}%,50%,${outerAlpha})`)
    og.addColorStop(1,   `hsla(${hue},${sat}%,40%,0)`)
    ctx.beginPath()
    ctx.arc(sx, sy, outerR, 0, Math.PI * 2)
    ;(ctx as CanvasRenderingContext2D).fillStyle = og
    ctx.fill()

    // Cell body — filled bright core
    const shapePoints = buildShapePoints(t.shape, t.radius, cell.genome)
    drawShape(ctx as CanvasRenderingContext2D, t.shape, shapePoints, sx, sy, sr, t.radius, cell.rotation)
    const bodyG = (ctx as CanvasRenderingContext2D).createRadialGradient(sx, sy, 0, sx, sy, sr)
    bodyG.addColorStop(0,   `hsla(${hue},${sat}%,78%,${coreAlpha})`)
    bodyG.addColorStop(0.7, `hsla(${hue},${sat}%,55%,${coreAlpha * 0.7})`)
    bodyG.addColorStop(1,   `hsla(${hue},${sat}%,40%,${coreAlpha * 0.3})`)
    ;(ctx as CanvasRenderingContext2D).fillStyle = bodyG
    ctx.fill()

    // Bright membrane rim (fluorescence often illuminates the plasma membrane)
    drawShape(ctx as CanvasRenderingContext2D, t.shape, shapePoints, sx, sy, sr, t.radius, cell.rotation)
    ;(ctx as CanvasRenderingContext2D).strokeStyle = `hsla(${hue},${Math.min(100, sat + 10)}%,82%,${Math.min(0.9, coreAlpha + 0.1)})`
    ;(ctx as CanvasRenderingContext2D).lineWidth = Math.max(0.6, sr * 0.12)
    ctx.stroke()

    // Nucleus marker — always emits slightly (DAPI-like)
    if (sr > 4) {
      ctx.beginPath()
      ctx.arc(
        sx + Math.sin(cell.phase * 0.6) * sr * 0.14,
        sy + Math.cos(cell.phase * 0.6) * sr * 0.14,
        sr * 0.28, 0, Math.PI * 2,
      )
      ;(ctx as CanvasRenderingContext2D).fillStyle = `hsla(240,60%,70%,${0.15 + ef * 0.3})`
      ctx.fill()
    }

    // Flagella — emits faintly
    if (t.flagella && sr > 4) {
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.quadraticCurveTo(
        sx + Math.cos(cell.phase + 0.9) * sr,
        sy + Math.sin(cell.phase + 0.9) * sr,
        sx + Math.cos(cell.phase * 1.8) * sr * (t.isPredator ? 4.5 : 3.2),
        sy + Math.sin(cell.phase * 1.8) * sr * 0.9,
      )
      ;(ctx as CanvasRenderingContext2D).strokeStyle = `hsla(${hue},60%,70%,0.35)`
      ;(ctx as CanvasRenderingContext2D).lineWidth = Math.max(0.3, sr * 0.08)
      ctx.stroke()
    }

    // Selection ring
    if (cell.id === selectedId) {
      ctx.beginPath()
      ctx.arc(sx, sy, sr + 4, 0, Math.PI * 2)
      ;(ctx as CanvasRenderingContext2D).strokeStyle = 'rgba(255,255,255,0.6)'
      ;(ctx as CanvasRenderingContext2D).lineWidth = 1
      ;(ctx as CanvasRenderingContext2D).setLineDash([3, 3])
      ctx.stroke()
      ;(ctx as CanvasRenderingContext2D).setLineDash([])
    }
  }
}
