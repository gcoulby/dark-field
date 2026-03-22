import { traitsFrom, buildShapePoints } from '../simulation/genome.js'
import type { WorldSnapshot } from '../simulation/serialize.js'
import { drawShape } from './shapes.js'

type WTS = (wx: number, wy: number) => [number, number]

export function drawLightField(
  ctx: CanvasRenderingContext2D,
  snapshot: WorldSnapshot,
  worldToScreen: WTS,
  vscale: number,
  W: number,
  H: number,
  selectedId: number | null,
): void {
  // Background
  ctx.fillStyle = '#e8eeea'
  ctx.fillRect(0, 0, W, H)
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(0,0,0,0.1)')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, W, H)

  // Nutrients
  for (const n of snapshot.nutrients) {
    const [sx, sy] = worldToScreen(n.x, n.y)
    if (sx < -4 || sx > W + 4 || sy < -4 || sy > H + 4) continue
    ctx.beginPath()
    ctx.arc(sx, sy, Math.max(0.8, vscale * 1.3), 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(70,150,90,0.35)'
    ctx.fill()
  }

  // Colony halos (bonded cells)
  for (const cell of snapshot.cells) {
    if (cell.bondCount === 0) continue
    const [sx, sy] = worldToScreen(cell.x, cell.y)
    const t = traitsFrom(cell.genome)
    const sr = t.radius * vscale
    const hue = (t.lineage / 4) * 360
    ctx.beginPath()
    ctx.arc(sx, sy, sr * 1.3, 0, Math.PI * 2)
    ctx.strokeStyle = `hsla(${hue},60%,25%,0.12)`
    ctx.lineWidth = 1
    ctx.setLineDash([3, 5])
    ctx.stroke()
    ctx.setLineDash([])
  }

  // Draw cells
  for (const cell of snapshot.cells) {
    const [sx, sy] = worldToScreen(cell.x, cell.y)
    if (sx < -60 || sx > W + 60 || sy < -60 || sy > H + 60) continue

    const t = traitsFrom(cell.genome)
    const sr = t.radius * vscale
    const ef = Math.min(1, cell.energy / t.divisionEnergy)
    const hue = (t.lineage / 4) * 360
    const sat = 55
    const darkLit = 10 + ef * 14
    const shapePoints = buildShapePoints(t.shape, t.radius, cell.genome)

    // Diffraction halo
    const hr = sr * 1.55
    const hg = ctx.createRadialGradient(sx, sy, sr * 0.75, sx, sy, hr)
    hg.addColorStop(0, `hsla(${hue},${sat}%,${darkLit}%,0.12)`)
    hg.addColorStop(0.5, `hsla(${hue},${sat}%,${darkLit}%,0.05)`)
    hg.addColorStop(1, `hsla(${hue},${sat}%,${darkLit}%,0)`)
    ctx.beginPath()
    ctx.arc(sx, sy, hr, 0, Math.PI * 2)
    ctx.fillStyle = hg
    ctx.fill()

    // Body
    drawShape(ctx, t.shape, shapePoints, sx, sy, sr, t.radius, cell.rotation)
    ctx.fillStyle = `hsla(${hue},${sat}%,${darkLit + 6}%,0.52)`
    ctx.fill()

    // Membrane
    drawShape(ctx, t.shape, shapePoints, sx, sy, sr, t.radius, cell.rotation)
    ctx.strokeStyle = `hsla(${hue},${sat + 10}%,${darkLit}%,0.88)`
    ctx.lineWidth = Math.max(0.5, sr * 0.13)
    ctx.stroke()

    // Nucleus
    if (sr > 5) {
      ctx.beginPath()
      ctx.arc(
        sx + Math.sin(cell.phase * 0.6) * sr * 0.15,
        sy + Math.cos(cell.phase * 0.6) * sr * 0.15,
        sr * 0.3, 0, Math.PI * 2,
      )
      ctx.fillStyle = `hsla(${hue},${sat}%,${darkLit - 3}%,0.55)`
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
      ctx.strokeStyle = `hsla(${hue},40%,${darkLit + 12}%,0.45)`
      ctx.lineWidth = Math.max(0.3, sr * 0.07)
      ctx.stroke()
    }

    // Selection ring
    if (cell.id === selectedId) {
      ctx.beginPath()
      ctx.arc(sx, sy, sr + 4, 0, Math.PI * 2)
      ctx.strokeStyle = `hsla(${hue},70%,18%,0.7)`
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.stroke()
      ctx.setLineDash([])
    }
  }
}
