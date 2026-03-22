/**
 * cellLayer.ts — Layer 2: cell rendering (dark field microscopy style)
 *
 * All cells rendered as arcs/ellipses with concentric diffraction rings:
 * outer halo → dark body → primary bright rim → secondary ring → optional tertiary ring
 * No polygon shapes — real organisms are round or elongated.
 */

import { traitsFrom } from '../simulation/genome.js'
import type { WorldSnapshot } from '../simulation/serialize.js'

type WTS = (wx: number, wy: number) => [number, number]
type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

function lineageHue(lineage: number): number {
  return (lineage * 22.5) % 360
}

function drawCellPath(
  ctx: Ctx,
  sx: number,
  sy: number,
  sr: number,
  shape: number,
  rotation: number,
  scale = 1,
): void {
  ctx.beginPath()
  if (shape === 1) {
    // Elongated — ellipse
    ctx.ellipse(sx, sy, sr * scale * 1.45, sr * scale * 0.72, rotation, 0, Math.PI * 2)
  } else {
    ctx.arc(sx, sy, sr * scale, 0, Math.PI * 2)
  }
}

function drawDarkCell(
  ctx: Ctx,
  sx: number,
  sy: number,
  sr: number,
  hue: number,
  secHue: number,
  ef: number,
  phase: number,
  shape: number,
  rotation: number,
  isPredator: boolean,
  hasPhoto: boolean,
  hasFlagella: boolean,
  isSelected: boolean,
): void {
  const c = ctx as CanvasRenderingContext2D

  // 1. Outer soft halo (scatter glow)
  const haloR = sr * 2.4
  const haloG = c.createRadialGradient(sx, sy, sr * 0.6, sx, sy, haloR)
  const haloAlpha = 0.12 + ef * 0.08
  haloG.addColorStop(0, `hsla(${hue},85%,70%,${haloAlpha})`)
  haloG.addColorStop(0.45, `hsla(${hue},70%,55%,${haloAlpha * 0.4})`)
  haloG.addColorStop(1, `hsla(${hue},60%,40%,0)`)
  ctx.beginPath()
  ctx.arc(sx, sy, haloR, 0, Math.PI * 2)
  c.fillStyle = haloG
  ctx.fill()

  // 2. Body — near-black with subtle interior gradient
  const bodyG = c.createRadialGradient(sx - sr * 0.15, sy - sr * 0.15, 0, sx, sy, sr)
  bodyG.addColorStop(0, `hsla(${hue},18%,10%,0.96)`)
  bodyG.addColorStop(0.7, `hsla(${hue},12%,5%,0.97)`)
  bodyG.addColorStop(1, `hsla(${hue},10%,3%,0.98)`)
  drawCellPath(ctx, sx, sy, sr, shape, rotation)
  c.fillStyle = bodyG
  ctx.fill()

  // 3. Primary diffraction rim
  const rimAlpha = 0.75 + ef * 0.18
  drawCellPath(ctx, sx, sy, sr, shape, rotation)
  c.strokeStyle = `hsla(${hue},90%,78%,${rimAlpha})`
  c.lineWidth = Math.max(0.8, sr * 0.14)
  ctx.stroke()

  // 4. Secondary inner ring (complementary hue, dimmer)
  if (sr > 4) {
    drawCellPath(ctx, sx, sy, sr, shape, rotation, 0.82)
    c.strokeStyle = `hsla(${secHue},70%,65%,0.22)`
    c.lineWidth = Math.max(0.4, sr * 0.07)
    ctx.stroke()
  }

  // 5. Tertiary ring (large cells only)
  if (sr > 7) {
    drawCellPath(ctx, sx, sy, sr, shape, rotation, 0.62)
    c.strokeStyle = `hsla(${hue},60%,55%,0.10)`
    c.lineWidth = Math.max(0.3, sr * 0.05)
    ctx.stroke()
  }

  // 6. Nucleus (offset, visible as a dim ring inside)
  if (sr > 5) {
    const nx = sx + Math.sin(phase * 0.6) * sr * 0.18
    const ny = sy + Math.cos(phase * 0.6) * sr * 0.18
    ctx.beginPath()
    ctx.arc(nx, ny, sr * 0.28, 0, Math.PI * 2)
    c.fillStyle = `hsla(${hue},10%,6%,0.7)`
    ctx.fill()
    c.strokeStyle = `hsla(${hue},50%,${60 + ef * 18}%,0.28)`
    c.lineWidth = Math.max(0.3, sr * 0.06)
    ctx.stroke()
  }

  // 7. Granular bodies (shape=2 — rod-shaped)
  if (shape === 2 && sr > 6) {
    for (let i = 0; i < 3; i++) {
      const ga = rotation + (i / 3) * Math.PI * 2
      const gx = sx + Math.cos(ga) * sr * 0.32
      const gy = sy + Math.sin(ga) * sr * 0.32
      ctx.beginPath()
      ctx.arc(gx, gy, Math.max(0.6, sr * 0.11), 0, Math.PI * 2)
      c.fillStyle = `hsla(${hue},60%,72%,0.18)`
      ctx.fill()
    }
  }

  // 8. Photosynthetic organelle (green spot, offset)
  if (hasPhoto && sr > 5) {
    const px = sx + Math.cos(phase * 0.4 + 1.1) * sr * 0.28
    const py = sy + Math.sin(phase * 0.4 + 1.1) * sr * 0.28
    const pg = c.createRadialGradient(px, py, 0, px, py, sr * 0.28)
    pg.addColorStop(0, 'rgba(40,220,80,0.32)')
    pg.addColorStop(1, 'rgba(40,220,80,0)')
    ctx.beginPath()
    ctx.arc(px, py, sr * 0.28, 0, Math.PI * 2)
    c.fillStyle = pg
    ctx.fill()
  }

  // 9. Flagella
  if (hasFlagella && sr > 3) {
    const flagCount = isPredator ? 2 : 1
    for (let fi = 0; fi < flagCount; fi++) {
      const fAngle = phase * 1.8 + fi * Math.PI
      const cxOff = Math.cos(phase + 0.9 + fi * Math.PI) * sr
      const cyOff = Math.sin(phase + 0.9 + fi * Math.PI) * sr
      const flagLen = isPredator ? 4.2 : 3.0
      ctx.beginPath()
      ctx.moveTo(sx + Math.cos(fAngle + Math.PI) * sr, sy + Math.sin(fAngle + Math.PI) * sr)
      ctx.quadraticCurveTo(
        sx + cxOff,
        sy + cyOff,
        sx + Math.cos(fAngle) * sr * flagLen,
        sy + Math.sin(fAngle) * sr * (isPredator ? 1.1 : 0.85),
      )
      c.strokeStyle = `hsla(${hue},50%,70%,${isPredator ? 0.5 : 0.25})`
      c.lineWidth = Math.max(0.3, sr * (isPredator ? 0.10 : 0.06))
      ctx.stroke()
    }
  }

  // 10. Selection ring
  if (isSelected) {
    ctx.beginPath()
    ctx.arc(sx, sy, sr * (shape === 1 ? 1.55 : 1) + 5, 0, Math.PI * 2)
    c.strokeStyle = 'rgba(255,255,200,0.8)'
    c.lineWidth = 1.2
    c.setLineDash([4, 4])
    ctx.stroke()
    c.setLineDash([])
  }
}

export function drawDarkFieldCells(
  ctx: Ctx,
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
    if (sx < -80 || sx > W + 80 || sy < -80 || sy > H + 80) continue

    const t = traitsFrom(cell.genome)
    const sr = t.radius * vscale
    const ef = Math.min(1, cell.energy / t.divisionEnergy)
    const hue = t.isPredator ? 5 : lineageHue(t.lineage)
    const secHue = t.isPredator ? 30 : (hue + 195) % 360

    drawDarkCell(
      ctx, sx, sy, sr,
      hue, secHue, ef, cell.phase,
      t.shape, cell.rotation,
      t.isPredator, !!t.photo, !!t.flagella,
      cell.id === selectedId,
    )
  }
}

export function drawLightFieldCells(
  ctx: Ctx,
  snapshot: WorldSnapshot,
  worldToScreen: WTS,
  vscale: number,
  W: number,
  H: number,
  selectedId: number | null,
): void {
  ctx.clearRect(0, 0, W, H)
  const c = ctx as CanvasRenderingContext2D

  // Nutrients (light mode only)
  for (const n of snapshot.nutrients) {
    const [sx, sy] = worldToScreen(n.x, n.y)
    if (sx < -4 || sx > W + 4 || sy < -4 || sy > H + 4) continue
    ctx.beginPath()
    ctx.arc(sx, sy, Math.max(0.8, vscale * 1.3), 0, Math.PI * 2)
    c.fillStyle = 'rgba(70,150,90,0.35)'
    ctx.fill()
  }

  for (const cell of snapshot.cells) {
    const [sx, sy] = worldToScreen(cell.x, cell.y)
    if (sx < -80 || sx > W + 80 || sy < -80 || sy > H + 80) continue

    const t = traitsFrom(cell.genome)
    const sr = t.radius * vscale
    const ef = Math.min(1, cell.energy / t.divisionEnergy)
    const hue = t.isPredator ? 5 : lineageHue(t.lineage)
    const sat = t.isPredator ? 65 : 55
    const darkLit = 8 + ef * 16

    // Diffraction halo
    const hr = sr * 1.6
    const hg = c.createRadialGradient(sx, sy, sr * 0.7, sx, sy, hr)
    hg.addColorStop(0, `hsla(${hue},${sat}%,${darkLit}%,0.14)`)
    hg.addColorStop(0.5, `hsla(${hue},${sat}%,${darkLit}%,0.06)`)
    hg.addColorStop(1, `hsla(${hue},${sat}%,${darkLit}%,0)`)
    ctx.beginPath()
    ctx.arc(sx, sy, hr, 0, Math.PI * 2)
    c.fillStyle = hg
    ctx.fill()

    // Body
    drawCellPath(ctx, sx, sy, sr, t.shape, cell.rotation)
    c.fillStyle = `hsla(${hue},${sat}%,${darkLit + 6}%,0.55)`
    ctx.fill()

    // Membrane
    drawCellPath(ctx, sx, sy, sr, t.shape, cell.rotation)
    c.strokeStyle = `hsla(${hue},${sat + 10}%,${darkLit}%,0.9)`
    c.lineWidth = Math.max(0.5, sr * 0.13)
    ctx.stroke()

    // Nucleus
    if (sr > 5) {
      ctx.beginPath()
      ctx.arc(
        sx + Math.sin(cell.phase * 0.6) * sr * 0.15,
        sy + Math.cos(cell.phase * 0.6) * sr * 0.15,
        sr * 0.3, 0, Math.PI * 2,
      )
      c.fillStyle = `hsla(${hue},${sat}%,${darkLit - 3}%,0.55)`
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
      c.strokeStyle = `hsla(${hue},40%,${darkLit + 12}%,0.45)`
      c.lineWidth = Math.max(0.3, sr * 0.07)
      ctx.stroke()
    }

    // Selection ring
    if (cell.id === selectedId) {
      ctx.beginPath()
      ctx.arc(sx, sy, sr + 4, 0, Math.PI * 2)
      c.strokeStyle = `hsla(${hue},70%,18%,0.7)`
      c.lineWidth = 1
      c.setLineDash([3, 3])
      ctx.stroke()
      c.setLineDash([])
    }
  }
}
