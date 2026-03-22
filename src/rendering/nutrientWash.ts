/**
 * nutrientWash.ts — Layer 1: nutrient concentration heatmap
 *
 * Bins nutrient positions into a coarse grid and renders each bin as a
 * soft radial blob. The result looks like a chemical gradient overlay —
 * greener where nutrients are dense, fading to background elsewhere.
 *
 * This layer sits between the background debris and the cells, giving
 * the impression of a visible culture medium with nutrient pockets.
 */

import type { NutrientSnapshot } from '../simulation/serialize.js'

const BIN_SIZE = 160 // world units per bin

export function drawNutrientWash(
  ctx: CanvasRenderingContext2D,
  nutrients: NutrientSnapshot[],
  worldToScreen: (wx: number, wy: number) => [number, number],
  vscale: number,
  W: number,
  H: number,
  fieldMode: 'dark' | 'light',
): void {
  ctx.clearRect(0, 0, W, H)

  // Bin nutrients
  const bins = new Map<string, number>()
  for (const n of nutrients) {
    const bx = Math.floor(n.x / BIN_SIZE)
    const by = Math.floor(n.y / BIN_SIZE)
    const key = `${bx},${by}`
    bins.set(key, (bins.get(key) ?? 0) + n.energy)
  }

  if (bins.size === 0) return

  // Find max for normalisation
  let maxVal = 0
  for (const v of bins.values()) if (v > maxVal) maxVal = v
  if (maxVal === 0) return

  for (const [key, val] of bins) {
    const [bxStr, byStr] = key.split(',')
    const bx = parseInt(bxStr!, 10)
    const by = parseInt(byStr!, 10)
    const cx = (bx + 0.5) * BIN_SIZE
    const cy = (by + 0.5) * BIN_SIZE
    const [sx, sy] = worldToScreen(cx, cy)

    const intensity = val / maxVal
    const blobR = Math.max(20, BIN_SIZE * vscale * 0.9)

    if (sx < -blobR || sx > W + blobR || sy < -blobR || sy > H + blobR) continue

    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, blobR)

    if (fieldMode === 'dark') {
      g.addColorStop(0, `rgba(40,160,80,${intensity * 0.13})`)
      g.addColorStop(0.5, `rgba(30,120,60,${intensity * 0.06})`)
      g.addColorStop(1, `rgba(20,80,40,0)`)
    } else {
      g.addColorStop(0, `rgba(30,120,50,${intensity * 0.09})`)
      g.addColorStop(0.5, `rgba(20,90,40,${intensity * 0.04})`)
      g.addColorStop(1, `rgba(10,60,30,0)`)
    }

    ctx.beginPath()
    ctx.arc(sx, sy, blobR, 0, Math.PI * 2)
    ctx.fillStyle = g
    ctx.fill()
  }
}
