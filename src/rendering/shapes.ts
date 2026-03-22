import type { ShapePoint } from '../simulation/genome.js'

export function drawShape(
  ctx: CanvasRenderingContext2D,
  shapeIdx: number,
  shapePoints: ShapePoint[] | null,
  sx: number,
  sy: number,
  sr: number,
  radius: number,
  rotation: number,
): void {
  if (shapeIdx === 0 || !shapePoints) {
    ctx.beginPath()
    ctx.arc(sx, sy, sr, 0, Math.PI * 2)
    return
  }

  const pts = shapePoints
  const scale = sr / radius
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)

  ctx.beginPath()
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!
    const rx = p.x * cos - p.y * sin
    const ry = p.x * sin + p.y * cos
    if (i === 0) ctx.moveTo(sx + rx * scale, sy + ry * scale)
    else ctx.lineTo(sx + rx * scale, sy + ry * scale)
  }
  ctx.closePath()
}
