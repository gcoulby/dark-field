/**
 * nutrientGrid.ts — coarse density grid for nutrient concentration field
 *
 * The grid is computed each tick from live nutrient positions. It serves two purposes:
 *  1. Gradient chemotaxis: cells bias their movement toward increasing density.
 *  2. Heatmap rendering: the main thread renders the grid as a smooth colour overlay.
 *
 * Grid resolution: 64 world-units per cell → 50×50 bins for a 3200×3200 world.
 */

export const GRID_CELL = 64   // world units per grid cell
export const GRID_W    = 50   // 3200 / 64
export const GRID_H    = 50

export function computeNutrientGrid(
  nutrients: ReadonlyArray<{ x: number; y: number; energy: number }>,
): Float32Array {
  const grid = new Float32Array(GRID_W * GRID_H)
  for (const n of nutrients) {
    const gx = (n.x / GRID_CELL) | 0
    const gy = (n.y / GRID_CELL) | 0
    if (gx < 0 || gx >= GRID_W || gy < 0 || gy >= GRID_H) continue
    grid[gy * GRID_W + gx] += n.energy
  }
  return grid
}

/** Bilinear sample of the density grid at world position (wx, wy). */
export function sampleGrid(grid: Float32Array, wx: number, wy: number): number {
  const gx = wx / GRID_CELL
  const gy = wy / GRID_CELL
  const ix = Math.floor(gx)
  const iy = Math.floor(gy)
  if (ix < 0 || ix >= GRID_W || iy < 0 || iy >= GRID_H) return 0
  const fx = gx - ix
  const fy = gy - iy
  const ix1 = Math.min(ix + 1, GRID_W - 1)
  const iy1 = Math.min(iy + 1, GRID_H - 1)
  const v00 = grid[iy  * GRID_W + ix ]!
  const v10 = grid[iy  * GRID_W + ix1]!
  const v01 = grid[iy1 * GRID_W + ix ]!
  const v11 = grid[iy1 * GRID_W + ix1]!
  return v00 * (1 - fx) * (1 - fy)
       + v10 *       fx  * (1 - fy)
       + v01 * (1 - fx) *       fy
       + v11 *       fx  *       fy
}

/**
 * Approximate nutrient density gradient at world position (wx, wy).
 * Returns the (unnormalised) gradient vector [gx, gy].
 * `step` controls the sampling radius in world units — larger values give
 * broader gradient sensing (used by sensor-role cells).
 */
export function gradientAt(
  grid: Float32Array,
  wx: number,
  wy: number,
  step: number = GRID_CELL,
): [number, number] {
  const dx = sampleGrid(grid, wx + step, wy) - sampleGrid(grid, wx - step, wy)
  const dy = sampleGrid(grid, wx, wy + step) - sampleGrid(grid, wx, wy - step)
  return [dx, dy]
}
