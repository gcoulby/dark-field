/**
 * cellLayer.ts — Layer 2: cell rendering (no background, no bloom)
 *
 * Draws cells only — background and bloom are now separate layers.
 */

import { traitsFrom, buildShapePoints } from '../simulation/genome.js'
import type { WorldSnapshot } from '../simulation/serialize.js'
import { drawShape } from './shapes.js'

type WTS = (wx: number, wy: number) => [number, number]

export function drawDarkFieldCells(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  snapshot: WorldSnapshot,
  worldToScreen: WTS,
  vscale: number,
  W: number,
  H: number,
  selectedId: number | null,
): void {
  ctx.clearRect(0, 0, W, H)

  for (const cell of snapshot.cells) {
    const [sx, sy] = worldToScreen(cell.x, cell.y)
    if (sx < -60 || sx > W + 60 || sy < -60 || sy > H + 60) continue

    const t = traitsFrom(cell.genome)
    const sr = t.radius * vscale
    const ef = Math.min(1, cell.energy / t.divisionEnergy)
    // Predators: crimson hue; others: lineage-derived green/teal
    const hue = t.isPredator ? 0 + t.lineage * 8 : (t.lineage / 4) * 360
    const sat = t.isPredator ? 70 + t.metabolism * 10 : 50 + t.metabolism * 18
    const lit = 40 + ef * 22
    const shapePoints = buildShapePoints(t.shape, t.radius, cell.genome)

    // Inner glow
    const ig = (ctx as CanvasRenderingContext2D).createRadialGradient(sx, sy, 0, sx, sy, sr * 1.7)
    ig.addColorStop(0, `hsla(${hue},${sat}%,${lit + 12}%,0.4)`)
    ig.addColorStop(0.4, `hsla(${hue},${sat}%,${lit}%,0.15)`)
    ig.addColorStop(1, `hsla(${hue},${sat}%,${lit}%,0)`)
    ctx.beginPath()
    ctx.arc(sx, sy, sr * 1.7, 0, Math.PI * 2)
    ;(ctx as CanvasRenderingContext2D).fillStyle = ig
    ctx.fill()

    // Body
    drawShape(ctx as CanvasRenderingContext2D, t.shape, shapePoints, sx, sy, sr, t.radius, cell.rotation)
    ;(ctx as CanvasRenderingContext2D).fillStyle = `hsla(${hue},18%,7%,0.9)`
    ctx.fill()

    // Bright rim
    drawShape(ctx as CanvasRenderingContext2D, t.shape, shapePoints, sx, sy, sr, t.radius, cell.rotation)
    ;(ctx as CanvasRenderingContext2D).strokeStyle = `hsla(${hue},${sat + 20}%,${lit + 45}%,0.94)`
    ;(ctx as CanvasRenderingContext2D).lineWidth = Math.max(0.6, sr * 0.17)
    ctx.stroke()

    // Secondary rim
    if (sr > 4) {
      drawShape(ctx as CanvasRenderingContext2D, t.shape, shapePoints, sx, sy, sr * 0.86, t.radius, cell.rotation)
      ;(ctx as CanvasRenderingContext2D).strokeStyle = `hsla(${hue},${sat}%,${lit + 28}%,0.2)`
      ;(ctx as CanvasRenderingContext2D).lineWidth = Math.max(0.3, sr * 0.09)
      ctx.stroke()
    }

    // Nucleus
    if (sr > 5) {
      ctx.beginPath()
      ctx.arc(
        sx + Math.sin(cell.phase * 0.6) * sr * 0.14,
        sy + Math.cos(cell.phase * 0.6) * sr * 0.14,
        sr * 0.3, 0, Math.PI * 2,
      )
      ;(ctx as CanvasRenderingContext2D).strokeStyle = `hsla(${hue},40%,${lit + 28}%,0.38)`
      ;(ctx as CanvasRenderingContext2D).lineWidth = Math.max(0.3, sr * 0.07)
      ctx.stroke()
    }

    // Flagella (predators get a longer, more aggressive flagella)
    if (t.flagella && sr > 4) {
      const flagLen = t.isPredator ? 4.5 : 3.2
      const flagAlpha = t.isPredator ? 0.55 : 0.28
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.quadraticCurveTo(
        sx + Math.cos(cell.phase + 0.9) * sr,
        sy + Math.sin(cell.phase + 0.9) * sr,
        sx + Math.cos(cell.phase * 1.8) * sr * flagLen,
        sy + Math.sin(cell.phase * 1.8) * sr * 0.9,
      )
      ;(ctx as CanvasRenderingContext2D).strokeStyle = `hsla(${hue},40%,65%,${flagAlpha})`
      ;(ctx as CanvasRenderingContext2D).lineWidth = Math.max(0.3, sr * (t.isPredator ? 0.12 : 0.07))
      ctx.stroke()
    }

    // Photo tint
    if (t.photo) {
      drawShape(ctx as CanvasRenderingContext2D, t.shape, shapePoints, sx, sy, sr * 0.74, t.radius, cell.rotation)
      ;(ctx as CanvasRenderingContext2D).fillStyle = 'rgba(40,200,70,0.07)'
      ctx.fill()
    }

    // Selection ring
    if (cell.id === selectedId) {
      ctx.beginPath()
      ctx.arc(sx, sy, sr + 4, 0, Math.PI * 2)
      ;(ctx as CanvasRenderingContext2D).strokeStyle = 'rgba(255,255,200,0.75)'
      ;(ctx as CanvasRenderingContext2D).lineWidth = 1
      ;(ctx as CanvasRenderingContext2D).setLineDash([3, 3])
      ctx.stroke()
      ;(ctx as CanvasRenderingContext2D).setLineDash([])
    }
  }
}

export function drawLightFieldCells(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  snapshot: WorldSnapshot,
  worldToScreen: WTS,
  vscale: number,
  W: number,
  H: number,
  selectedId: number | null,
): void {
  ctx.clearRect(0, 0, W, H)

  // Nutrients (drawn on this layer in light mode since background is the debris layer)
  for (const n of snapshot.nutrients) {
    const [sx, sy] = worldToScreen(n.x, n.y)
    if (sx < -4 || sx > W + 4 || sy < -4 || sy > H + 4) continue
    ctx.beginPath()
    ctx.arc(sx, sy, Math.max(0.8, vscale * 1.3), 0, Math.PI * 2)
    ;(ctx as CanvasRenderingContext2D).fillStyle = 'rgba(70,150,90,0.35)'
    ctx.fill()
  }

  for (const cell of snapshot.cells) {
    const [sx, sy] = worldToScreen(cell.x, cell.y)
    if (sx < -60 || sx > W + 60 || sy < -60 || sy > H + 60) continue

    const t = traitsFrom(cell.genome)
    const sr = t.radius * vscale
    const ef = Math.min(1, cell.energy / t.divisionEnergy)
    const hue = t.isPredator ? 0 + t.lineage * 8 : (t.lineage / 4) * 360
    const sat = t.isPredator ? 65 : 55
    const darkLit = 10 + ef * 14
    const shapePoints = buildShapePoints(t.shape, t.radius, cell.genome)

    // Diffraction halo
    const hr = sr * 1.55
    const hg = (ctx as CanvasRenderingContext2D).createRadialGradient(sx, sy, sr * 0.75, sx, sy, hr)
    hg.addColorStop(0, `hsla(${hue},${sat}%,${darkLit}%,0.12)`)
    hg.addColorStop(0.5, `hsla(${hue},${sat}%,${darkLit}%,0.05)`)
    hg.addColorStop(1, `hsla(${hue},${sat}%,${darkLit}%,0)`)
    ctx.beginPath()
    ctx.arc(sx, sy, hr, 0, Math.PI * 2)
    ;(ctx as CanvasRenderingContext2D).fillStyle = hg
    ctx.fill()

    // Body
    drawShape(ctx as CanvasRenderingContext2D, t.shape, shapePoints, sx, sy, sr, t.radius, cell.rotation)
    ;(ctx as CanvasRenderingContext2D).fillStyle = `hsla(${hue},${sat}%,${darkLit + 6}%,0.52)`
    ctx.fill()

    // Membrane
    drawShape(ctx as CanvasRenderingContext2D, t.shape, shapePoints, sx, sy, sr, t.radius, cell.rotation)
    ;(ctx as CanvasRenderingContext2D).strokeStyle = `hsla(${hue},${sat + 10}%,${darkLit}%,0.88)`
    ;(ctx as CanvasRenderingContext2D).lineWidth = Math.max(0.5, sr * 0.13)
    ctx.stroke()

    // Nucleus
    if (sr > 5) {
      ctx.beginPath()
      ctx.arc(
        sx + Math.sin(cell.phase * 0.6) * sr * 0.15,
        sy + Math.cos(cell.phase * 0.6) * sr * 0.15,
        sr * 0.3, 0, Math.PI * 2,
      )
      ;(ctx as CanvasRenderingContext2D).fillStyle = `hsla(${hue},${sat}%,${darkLit - 3}%,0.55)`
      ctx.fill()
    }

    // Flagella
    if (t.flagella && sr > 4) {
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.quadraticCurveTo(
        sx + Math.cos(cell.phase + 0.9) * sr,
        sy + Math.sin(cell.phase + 0.9) * sr,
        sx + Math.cos(cell.phase * 1.8) * sr * 3.2,
        sy + Math.sin(cell.phase * 1.8) * sr * 0.9,
      )
      ;(ctx as CanvasRenderingContext2D).strokeStyle = `hsla(${hue},40%,${darkLit + 12}%,0.45)`
      ;(ctx as CanvasRenderingContext2D).lineWidth = Math.max(0.3, sr * 0.07)
      ctx.stroke()
    }

    // Selection ring
    if (cell.id === selectedId) {
      ctx.beginPath()
      ctx.arc(sx, sy, sr + 4, 0, Math.PI * 2)
      ;(ctx as CanvasRenderingContext2D).strokeStyle = `hsla(${hue},70%,18%,0.7)`
      ;(ctx as CanvasRenderingContext2D).lineWidth = 1
      ;(ctx as CanvasRenderingContext2D).setLineDash([3, 3])
      ctx.stroke()
      ;(ctx as CanvasRenderingContext2D).setLineDash([])
    }
  }
}
