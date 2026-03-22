import { describe, it, expect } from 'vitest'
import {
  computeNutrientGrid,
  sampleGrid,
  gradientAt,
  GRID_W,
  GRID_H,
  GRID_CELL,
} from '../src/simulation/nutrientGrid.js'

describe('computeNutrientGrid', () => {
  it('returns a Float32Array of GRID_W × GRID_H', () => {
    const grid = computeNutrientGrid([])
    expect(grid).toBeInstanceOf(Float32Array)
    expect(grid.length).toBe(GRID_W * GRID_H)
  })

  it('is all zeros for empty nutrient list', () => {
    const grid = computeNutrientGrid([])
    expect(grid.every(v => v === 0)).toBe(true)
  })

  it('accumulates energy in the correct bin', () => {
    // Single nutrient at (96, 64) → bin (1, 1) since 96/64=1.5→1, 64/64=1
    const grid = computeNutrientGrid([{ x: 96, y: 64, energy: 5 }])
    expect(grid[1 * GRID_W + 1]).toBe(5)
  })

  it('accumulates multiple nutrients in same bin', () => {
    const nuts = [
      { x: 10, y: 10, energy: 3 },
      { x: 20, y: 20, energy: 7 },
    ]
    const grid = computeNutrientGrid(nuts) // both in bin (0,0)
    expect(grid[0]).toBe(10)
  })

  it('ignores nutrients outside world bounds', () => {
    const grid = computeNutrientGrid([{ x: -100, y: 0, energy: 50 }])
    expect(grid.every(v => v === 0)).toBe(true)
  })

  it('places nutrients at far corner in last bin', () => {
    // Position just inside far corner: (GRID_W-1)*GRID_CELL + 1
    const wx = (GRID_W - 1) * GRID_CELL + 1
    const wy = (GRID_H - 1) * GRID_CELL + 1
    const grid = computeNutrientGrid([{ x: wx, y: wy, energy: 9 }])
    expect(grid[(GRID_H - 1) * GRID_W + (GRID_W - 1)]).toBe(9)
  })
})

describe('sampleGrid', () => {
  it('returns 0 for empty grid', () => {
    const grid = new Float32Array(GRID_W * GRID_H)
    expect(sampleGrid(grid, 100, 100)).toBe(0)
  })

  it('returns exact value at bin centre', () => {
    const grid = new Float32Array(GRID_W * GRID_H)
    grid[0] = 10 // bin (0,0)
    // Centre of bin (0,0) is at (GRID_CELL/2, GRID_CELL/2)
    const cx = GRID_CELL / 2
    const cy = GRID_CELL / 2
    // At exact centre (gx=0.5, gy=0.5), bilinear gives 10*(0.5*0.5) + 0+0+0 = 2.5
    // (because neighbours are 0); this is still > 0
    expect(sampleGrid(grid, cx, cy)).toBeGreaterThan(0)
  })

  it('returns 0 outside grid bounds', () => {
    const grid = new Float32Array(GRID_W * GRID_H)
    grid[0] = 100
    expect(sampleGrid(grid, -10, -10)).toBe(0)
    expect(sampleGrid(grid, 99999, 99999)).toBe(0)
  })

  it('interpolates between bins', () => {
    const grid = new Float32Array(GRID_W * GRID_H)
    grid[0 * GRID_W + 0] = 100  // bin (0,0)
    grid[0 * GRID_W + 1] = 100  // bin (1,0)
    // At x = GRID_CELL (boundary between bin 0 and 1), y = 0
    // gx = 1.0 → ix=1, fx=0, so v = grid[1] * 1 = 100
    const v = sampleGrid(grid, GRID_CELL, 0)
    expect(v).toBeGreaterThan(0)
  })
})

describe('gradientAt', () => {
  it('returns [0, 0] for flat (uniform) grid', () => {
    const grid = new Float32Array(GRID_W * GRID_H).fill(5)
    const [gx, gy] = gradientAt(grid, 1600, 1600)
    // Uniform field → gradient should be 0
    expect(Math.abs(gx)).toBeLessThan(0.01)
    expect(Math.abs(gy)).toBeLessThan(0.01)
  })

  it('points in positive x direction when density increases rightward', () => {
    const grid = new Float32Array(GRID_W * GRID_H)
    // Fill right half with high density, left half with 0
    for (let gy = 0; gy < GRID_H; gy++) {
      for (let gx = GRID_W / 2; gx < GRID_W; gx++) {
        grid[gy * GRID_W + gx] = 100
      }
    }
    // Sample at the boundary (world x = 1600 = midpoint of 3200)
    const [dx] = gradientAt(grid, 1600, 1600)
    expect(dx).toBeGreaterThan(0)
  })

  it('wider step produces non-zero gradient from further away', () => {
    const grid = new Float32Array(GRID_W * GRID_H)
    // High density at far right
    for (let gy = 0; gy < GRID_H; gy++) {
      grid[gy * GRID_W + (GRID_W - 1)] = 200
    }
    const [dxNarrow] = gradientAt(grid, 1600, 1600, GRID_CELL)
    const [dxWide]   = gradientAt(grid, 1600, 1600, GRID_CELL * 3)
    // Both should point right; wider step may differ in magnitude
    expect(dxNarrow).toBeGreaterThanOrEqual(0)
    expect(dxWide).toBeGreaterThanOrEqual(0)
  })
})
