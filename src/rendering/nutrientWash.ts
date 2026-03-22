/**
 * nutrientWash.ts — Layer 1: nutrient concentration heatmap
 *
 * Renders the pre-computed nutrient density grid as a smooth colour overlay
 * using an ImageData bitmap scaled to screen space. This is much smoother than
 * the old blob approach and reads directly from the grid the worker computed.
 *
 * The result looks like a chemical gradient — greener where nutrients are dense,
 * fading to background elsewhere.
 */

import type { WorldSnapshot } from '../simulation/serialize.js'

export function drawNutrientWash(
  ctx: CanvasRenderingContext2D,
  snapshot: WorldSnapshot,
  worldToScreen: (wx: number, wy: number) => [number, number],
  vscale: number,
  W: number,
  H: number,
  fieldMode: 'dark' | 'light',
): void {
  ctx.clearRect(0, 0, W, H)

  const { nutrientGrid, gridW, gridH } = snapshot
  if (!nutrientGrid || nutrientGrid.length === 0) return

  // Find max density for normalisation
  let maxVal = 0
  for (const v of nutrientGrid) if (v > maxVal) maxVal = v
  if (maxVal === 0) return

  // Build a small ImageData (gridW × gridH) then draw it scaled to screen
  // We find the screen rect that maps to the entire world grid
  const GRID_CELL = 3200 / gridW   // world units per cell
  const [x0s, y0s] = worldToScreen(0, 0)
  const [x1s, y1s] = worldToScreen(GRID_CELL, GRID_CELL)
  const cellPx = x1s - x0s   // screen pixels per grid cell (may be fractional)
  const cellPy = y1s - y0s

  const imgW = Math.max(1, Math.round(gridW * cellPx))
  const imgH = Math.max(1, Math.round(gridH * cellPy))

  // Only draw if the grid maps to a visible region
  if (x0s > W || y0s > H || x0s + imgW < 0 || y0s + imgH < 0) return

  // Cap the ImageData size to avoid excessive memory (e.g. deeply zoomed out)
  const clampedW = Math.min(imgW, W * 2)
  const clampedH = Math.min(imgH, H * 2)

  const imgData = ctx.createImageData(clampedW, clampedH)
  const data = imgData.data
  const scaleX = gridW / clampedW
  const scaleY = gridH / clampedH

  for (let py = 0; py < clampedH; py++) {
    const gy = py * scaleY
    const iy = Math.floor(gy)
    const fy = gy - iy
    const iy1 = Math.min(iy + 1, gridH - 1)

    for (let px = 0; px < clampedW; px++) {
      const gx = px * scaleX
      const ix = Math.floor(gx)
      const fx = gx - ix
      const ix1 = Math.min(ix + 1, gridW - 1)

      // Bilinear interpolation
      const v00 = nutrientGrid[iy  * gridW + ix ]!
      const v10 = nutrientGrid[iy  * gridW + ix1]!
      const v01 = nutrientGrid[iy1 * gridW + ix ]!
      const v11 = nutrientGrid[iy1 * gridW + ix1]!
      const val = v00 * (1 - fx) * (1 - fy)
                + v10 *       fx  * (1 - fy)
                + v01 * (1 - fx) *       fy
                + v11 *       fx  *       fy

      const intensity = val / maxVal

      const idx = (py * clampedW + px) * 4
      if (fieldMode === 'dark') {
        // Green-teal glow on dark background
        data[idx]     = Math.round(20  * intensity)  // R
        data[idx + 1] = Math.round(140 * intensity)  // G
        data[idx + 2] = Math.round(60  * intensity)  // B
        data[idx + 3] = Math.round(80  * intensity)  // A (max ~80/255)
      } else {
        // Subtle blue-green tint on light background
        data[idx]     = Math.round(10  * intensity)
        data[idx + 1] = Math.round(100 * intensity)
        data[idx + 2] = Math.round(50  * intensity)
        data[idx + 3] = Math.round(55  * intensity)
      }
    }
  }

  // Draw the scaled bitmap at the world-to-screen origin
  // Use a temporary canvas so we can drawImage with smoothing
  const tmpCanvas = new OffscreenCanvas(clampedW, clampedH)
  const tmpCtx = tmpCanvas.getContext('2d')!
  tmpCtx.putImageData(imgData, 0, 0)

  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'medium'
  ctx.drawImage(tmpCanvas, x0s, y0s, clampedW * (imgW / clampedW), imgH)
  ctx.restore()
}
