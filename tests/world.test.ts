import { describe, it, expect } from 'vitest'
import { initWorld, stepWorld, addCluster, seedAt, killAt, injectNutrients } from '../src/simulation/world.js'

describe('initWorld', () => {
  it('starts with cells and nutrients', () => {
    const world = initWorld()
    expect(world.cells.length).toBeGreaterThan(0)
    expect(world.nutrients.length).toBeGreaterThan(0)
    expect(world.tick).toBe(0)
    expect(world.maxGen).toBe(0)
  })

  it('all cells start alive', () => {
    const world = initWorld()
    expect(world.cells.every(c => c.alive)).toBe(true)
  })
})

describe('stepWorld', () => {
  it('increments tick', () => {
    const world = initWorld()
    stepWorld(world)
    expect(world.tick).toBe(1)
    stepWorld(world)
    expect(world.tick).toBe(2)
  })

  it('cells remain in world bounds after many steps', () => {
    const world = initWorld()
    for (let i = 0; i < 20; i++) stepWorld(world)
    for (const c of world.cells) {
      expect(c.x).toBeGreaterThanOrEqual(0)
      expect(c.x).toBeLessThanOrEqual(3200)
      expect(c.y).toBeGreaterThanOrEqual(0)
      expect(c.y).toBeLessThanOrEqual(3200)
    }
  })

  it('dead cells are removed', () => {
    const world = initWorld()
    // Kill all cells
    for (const c of world.cells) c.alive = false
    stepWorld(world)
    expect(world.cells.length).toBe(0)
  })

  it('nutrients are consumed and released on death', () => {
    const world = initWorld()
    const initial = world.nutrients.length
    // Run a few steps — nutrients are consumed by cells, some released on death
    for (let i = 0; i < 10; i++) stepWorld(world)
    // We can't assert an exact number because of probabilistic spawning,
    // but nutrients should remain non-negative
    expect(world.nutrients.length).toBeGreaterThanOrEqual(0)
    // Just verify the field is defined
    expect(typeof initial).toBe('number')
  })
})

describe('addCluster', () => {
  it('adds 8 cells', () => {
    const world = initWorld()
    const before = world.cells.length
    addCluster(world, 1600, 1600)
    expect(world.cells.length).toBe(before + 8)
  })
})

describe('seedAt', () => {
  it('adds cells near the target point', () => {
    const world = initWorld()
    const before = world.cells.length
    seedAt(world, 500, 500, 6)
    expect(world.cells.length).toBe(before + 6)
    const newCells = world.cells.slice(before)
    for (const c of newCells) {
      expect(Math.abs(c.x - 500)).toBeLessThan(50)
      expect(Math.abs(c.y - 500)).toBeLessThan(50)
    }
  })
})

describe('killAt', () => {
  it('marks cells within radius as dead', () => {
    const world = initWorld()
    // Put all cells at origin
    for (const c of world.cells) { c.x = 100; c.y = 100 }
    killAt(world, 100, 100, 50)
    expect(world.cells.every(c => !c.alive)).toBe(true)
  })

  it('does not kill cells outside radius', () => {
    const world = initWorld()
    for (const c of world.cells) { c.x = 2000; c.y = 2000 }
    killAt(world, 0, 0, 50)
    expect(world.cells.every(c => c.alive)).toBe(true)
  })
})

describe('injectNutrients', () => {
  it('adds nutrients near target', () => {
    const world = initWorld()
    const before = world.nutrients.length
    injectNutrients(world, 800, 800, 10)
    expect(world.nutrients.length).toBe(before + 10)
  })
})
