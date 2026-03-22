import { describe, it, expect } from 'vitest'
import { buildGrid, nearby, GRID_SIZE } from '../src/simulation/physics.js'

interface Point { x: number; y: number }

describe('buildGrid', () => {
  it('groups items into correct grid cells', () => {
    const items: Point[] = [
      { x: 10, y: 10 },
      { x: 10, y: 10 },
      { x: 200, y: 200 },
    ]
    const grid = buildGrid(items, p => p.x, p => p.y)
    // First two share a cell, third is in a different cell
    expect(grid.size).toBe(2)
  })

  it('handles empty input', () => {
    const grid = buildGrid([], p => (p as Point).x, p => (p as Point).y)
    expect(grid.size).toBe(0)
  })
})

describe('nearby', () => {
  it('finds items within radius', () => {
    const items: Point[] = [
      { x: 100, y: 100 },
      { x: 500, y: 500 },
    ]
    const grid = buildGrid(items, p => p.x, p => p.y)
    const found = nearby(grid, 100, 100, 10)
    expect(found).toContain(items[0])
    expect(found).not.toContain(items[1])
  })

  it('returns items in adjacent cells when radius spans boundary', () => {
    // Place items exactly one grid cell apart
    const a: Point = { x: GRID_SIZE - 1, y: GRID_SIZE / 2 }
    const b: Point = { x: GRID_SIZE + 1, y: GRID_SIZE / 2 }
    const grid = buildGrid([a, b], p => p.x, p => p.y)
    const found = nearby(grid, GRID_SIZE, GRID_SIZE / 2, GRID_SIZE)
    expect(found).toContain(a)
    expect(found).toContain(b)
  })

  it('returns empty array when nothing nearby', () => {
    const items: Point[] = [{ x: 1000, y: 1000 }]
    const grid = buildGrid(items, p => p.x, p => p.y)
    const found = nearby(grid, 0, 0, 10)
    expect(found).toHaveLength(0)
  })

  it('can find multiple items', () => {
    const items: Point[] = Array.from({ length: 10 }, (_, i) => ({ x: i * 5, y: 0 }))
    const grid = buildGrid(items, p => p.x, p => p.y)
    const found = nearby(grid, 25, 0, 30)
    expect(found.length).toBeGreaterThan(1)
  })
})
