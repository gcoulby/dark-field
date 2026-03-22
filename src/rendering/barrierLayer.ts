/**
 * barrierLayer.ts — Renders barrier (AABB) regions
 *
 * Dark field: near-black fill with a subtle bright-green edge glow — like
 * an opaque glass wall in a darkfield microscope.
 *
 * Light field: pale grey fill with a darker border — opaque object blocking
 * transmitted light.
 *
 * A subtle diagonal hatching pattern signals impassable material.
 */

import type { Barrier } from '../simulation/islands.js'

type WTS = (wx: number, wy: number) => [number, number]

export function drawBarrierLayer(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  barriers: Barrier[],
  worldToScreen: WTS,
  vscale: number,
  W: number,
  H: number,
  fieldMode: 'dark' | 'light',
): void {
  ctx.clearRect(0, 0, W, H)
  if (barriers.length === 0) return

  const c = ctx as CanvasRenderingContext2D

  for (const b of barriers) {
    const [sx, sy] = worldToScreen(b.x, b.y)
    const sw = b.w * vscale
    const sh = b.h * vscale

    if (sx > W || sy > H || sx + sw < 0 || sy + sh < 0) continue

    if (fieldMode === 'dark') {
      // Solid near-black fill
      c.fillStyle = 'rgba(4,8,5,0.96)'
      c.fillRect(sx, sy, sw, sh)

      // Bright-green edge glow (inner)
      c.strokeStyle = 'rgba(60,140,70,0.55)'
      c.lineWidth = Math.max(1, vscale * 0.8)
      c.strokeRect(sx + 0.5, sy + 0.5, sw - 1, sh - 1)

      // Outer soft glow
      const edgeGlow = c.createLinearGradient(sx, sy, sx + 4, sy + 4)
      edgeGlow.addColorStop(0, 'rgba(60,180,80,0.15)')
      edgeGlow.addColorStop(1, 'rgba(60,180,80,0)')
      c.fillStyle = edgeGlow
      c.fillRect(sx - 2, sy - 2, sw + 4, sh + 4)

    } else {
      // Light field: grey fill, dark border
      c.fillStyle = 'rgba(160,170,162,0.88)'
      c.fillRect(sx, sy, sw, sh)
      c.strokeStyle = 'rgba(80,100,82,0.7)'
      c.lineWidth = Math.max(1, vscale * 0.6)
      c.strokeRect(sx + 0.5, sy + 0.5, sw - 1, sh - 1)
    }

    // Diagonal hatching (both modes)
    const hatchSpacing = Math.max(6, vscale * 8)
    c.save()
    c.rect(sx, sy, sw, sh)
    c.clip()
    c.beginPath()
    const startX = sx - sh
    const endX = sx + sw + sh
    for (let hx = startX; hx < endX; hx += hatchSpacing) {
      c.moveTo(hx, sy)
      c.lineTo(hx + sh, sy + sh)
    }
    c.strokeStyle = fieldMode === 'dark' ? 'rgba(40,80,44,0.3)' : 'rgba(100,120,102,0.25)'
    c.lineWidth = 0.5
    c.stroke()
    c.restore()
  }
}
