/**
 * nutrientWash.ts — Layer 2: nutrient concentration heatmap
 *
 * Renders the pre-computed nutrient density grid as a smooth colour overlay.
 * The grid is always rasterised at its native resolution (GRID_W × GRID_H = 50×50)
 * and then scaled to screen with drawImage — so cost is O(2500) regardless of zoom.
 *
 * An OffscreenCanvas is reused across frames (allocated lazily) to avoid
 * per-frame allocation.
 */

import type { WorldSnapshot } from '../simulation/serialize.js'

// Reusable scratch canvas for grid rasterisation
let _scratch: OffscreenCanvas | null = null
let _scratchCtx: OffscreenCanvasRenderingContext2D | null = null

function getScratch(w: number, h: number): OffscreenCanvasRenderingContext2D {
  if (!_scratch || _scratch.width !== w || _scratch.height !== h) {
    _scratch = new OffscreenCanvas(w, h)
    _scratchCtx = _scratch.getContext('2d')!
  }
  return _scratchCtx!
}

export function drawNutrientWash(
  ctx: CanvasRenderingContext2D,
  snapshot: WorldSnapshot,
  worldToScreen: (wx: number, wy: number) => [number, number],
  _vscale: number,
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

  // Rasterise grid at native resolution into a reusable scratch canvas
  const scratchCtx = getScratch(gridW, gridH)
  const imgData = scratchCtx.createImageData(gridW, gridH)
  const data = imgData.data

  for (let i = 0; i < gridW * gridH; i++) {
    const intensity = nutrientGrid[i]! / maxVal
    const idx = i * 4
    if (fieldMode === 'dark') {
      data[idx]     = Math.round(20  * intensity)
      data[idx + 1] = Math.round(140 * intensity)
      data[idx + 2] = Math.round(60  * intensity)
      data[idx + 3] = Math.round(90  * intensity)
    } else {
      data[idx]     = Math.round(10  * intensity)
      data[idx + 1] = Math.round(100 * intensity)
      data[idx + 2] = Math.round(50  * intensity)
      data[idx + 3] = Math.round(60  * intensity)
    }
  }
  scratchCtx.putImageData(imgData, 0, 0)

  // Map grid origin and extent to screen coordinates
  const GRID_CELL_SIZE = 3200 / gridW  // world units per grid cell
  const [x0s, y0s] = worldToScreen(0, 0)
  const [x1s, y1s] = worldToScreen(3200, 3200)
  const imgW = x1s - x0s
  const imgH = y1s - y0s

  if (imgW <= 0 || imgH <= 0) return
  if (x0s > W || y0s > H || x0s + imgW < 0 || y0s + imgH < 0) return

  // drawImage with smoothing scales the 50×50 bitmap to the viewport extent
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'medium'
  ctx.drawImage(_scratch!, x0s, y0s, imgW, imgH)
  ctx.restore()

  // suppress unused-variable warning for the reference
  void GRID_CELL_SIZE
}
