import { traitsFrom, buildShapePoints } from '../simulation/genome.js'
import type { CellSnapshot, NutrientSnapshot, WorldSnapshot } from '../simulation/serialize.js'
import { drawShape } from './shapes.js'
import { drawBloomPass } from './bloom.js'

type WTS = (wx: number, wy: number) => [number, number]

function drawColonyMembranes(
  ctx: CanvasRenderingContext2D,
  cells: CellSnapshot[],
  worldToScreen: WTS,
): void {
  // Colony membership is approximated from bondCount > 0 — renderer groups by proximity.
  // Full colony membership requires the live cell graph; here we draw halos around bonded cells.
  const bonded = cells.filter(c => c.bondCount > 0)
  if (bonded.length === 0) return

  // Group by lineage as a proxy for colony hue
  for (const cell of bonded) {
    const [sx, sy] = worldToScreen(cell.x, cell.y)
    const t = traitsFrom(cell.genome)
    const sr = t.radius
    const hue = (t.lineage / 4) * 360
    ctx.beginPath()
    ctx.arc(sx, sy, sr * 1.35, 0, Math.PI * 2)
    ctx.strokeStyle = `hsla(${hue},50%,65%,0.12)`
    ctx.lineWidth = 1.5
    ctx.setLineDash([3, 5])
    ctx.stroke()
    ctx.setLineDash([])
  }
}

export function drawDarkField(
  ctx: CanvasRenderingContext2D,
  bloomCtx: CanvasRenderingContext2D,
  snapshot: WorldSnapshot,
  worldToScreen: WTS,
  vscale: number,
  W: number,
  H: number,
  selectedId: number | null,
): void {
  // Background
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)
  const vg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.75)
  vg.addColorStop(0, 'rgba(0,5,3,0)')
  vg.addColorStop(1, 'rgba(0,0,0,0.6)')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, W, H)

  // Nutrients
  for (const n of snapshot.nutrients) {
    const [sx, sy] = worldToScreen(n.x, n.y)
    if (sx < -4 || sx > W + 4 || sy < -4 || sy > H + 4) continue
    ctx.beginPath()
    ctx.arc(sx, sy, Math.max(0.7, vscale * 1.4), 0, Math.PI * 2)
    ctx.fillStyle = `rgba(100,200,130,${0.22 + Math.random() * 0.18})`
    ctx.fill()
  }

  // Colony halos
  drawColonyMembranes(ctx, snapshot.cells, worldToScreen)

  // Bloom pass 1 — wide diffuse
  drawBloomPass(bloomCtx, snapshot.cells, worldToScreen, vscale, W, H, false)
  ctx.globalCompositeOperation = 'screen'
  ctx.drawImage(bloomCtx.canvas, 0, 0)
  ctx.globalCompositeOperation = 'source-over'

  // Draw cells
  for (const cell of snapshot.cells) {
    const [sx, sy] = worldToScreen(cell.x, cell.y)
    if (sx < -60 || sx > W + 60 || sy < -60 || sy > H + 60) continue

    const t = traitsFrom(cell.genome)
    const sr = t.radius * vscale
    const ef = Math.min(1, cell.energy / t.divisionEnergy)
    const hue = (t.lineage / 4) * 360
    const sat = 50 + t.metabolism * 18
    const lit = 40 + ef * 22
    const shapePoints = buildShapePoints(t.shape, t.radius, cell.genome)

    // Inner glow
    const ig = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 1.7)
    ig.addColorStop(0, `hsla(${hue},${sat}%,${lit + 12}%,0.4)`)
    ig.addColorStop(0.4, `hsla(${hue},${sat}%,${lit}%,0.15)`)
    ig.addColorStop(1, `hsla(${hue},${sat}%,${lit}%,0)`)
    ctx.beginPath()
    ctx.arc(sx, sy, sr * 1.7, 0, Math.PI * 2)
    ctx.fillStyle = ig
    ctx.fill()

    // Body
    drawShape(ctx, t.shape, shapePoints, sx, sy, sr, t.radius, cell.rotation)
    ctx.fillStyle = `hsla(${hue},18%,7%,0.9)`
    ctx.fill()

    // Bright rim
    drawShape(ctx, t.shape, shapePoints, sx, sy, sr, t.radius, cell.rotation)
    ctx.strokeStyle = `hsla(${hue},${sat + 20}%,${lit + 45}%,0.94)`
    ctx.lineWidth = Math.max(0.6, sr * 0.17)
    ctx.stroke()

    // Secondary rim
    if (sr > 4) {
      drawShape(ctx, t.shape, shapePoints, sx, sy, sr * 0.86, t.radius, cell.rotation)
      ctx.strokeStyle = `hsla(${hue},${sat}%,${lit + 28}%,0.2)`
      ctx.lineWidth = Math.max(0.3, sr * 0.09)
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
      ctx.strokeStyle = `hsla(${hue},40%,${lit + 28}%,0.38)`
      ctx.lineWidth = Math.max(0.3, sr * 0.07)
      ctx.stroke()
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
      ctx.strokeStyle = `hsla(${hue},40%,65%,0.28)`
      ctx.lineWidth = Math.max(0.3, sr * 0.07)
      ctx.stroke()
    }

    // Photo tint
    if (t.photo) {
      drawShape(ctx, t.shape, shapePoints, sx, sy, sr * 0.74, t.radius, cell.rotation)
      ctx.fillStyle = 'rgba(40,200,70,0.07)'
      ctx.fill()
    }

    // Selection ring
    if (cell.id === selectedId) {
      ctx.beginPath()
      ctx.arc(sx, sy, sr + 4, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255,255,200,0.75)'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.stroke()
      ctx.setLineDash([])
    }
  }

  // Bloom pass 2 — tight hot glow
  drawBloomPass(bloomCtx, snapshot.cells, worldToScreen, vscale, W, H, true)
  ctx.globalCompositeOperation = 'screen'
  ctx.globalAlpha = 0.65
  ctx.drawImage(bloomCtx.canvas, 0, 0)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
}
