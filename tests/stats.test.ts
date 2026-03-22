import { describe, it, expect } from 'vitest'
import { getStats } from '../src/simulation/stats.js'
import { initWorld, stepWorld } from '../src/simulation/world.js'

describe('getStats', () => {
  it('returns zero counts for empty world', () => {
    const world = initWorld()
    world.cells = []
    world.nutrients = []
    const s = getStats(world)
    expect(s.cellCount).toBe(0)
    expect(s.colonyCount).toBe(0)
    expect(s.nutrientCount).toBe(0)
    expect(s.speciesCount).toBe(0)
  })

  it('cell count matches cells array length', () => {
    const world = initWorld()
    const s = getStats(world)
    expect(s.cellCount).toBe(world.cells.length)
  })

  it('nutrient count matches nutrients array length', () => {
    const world = initWorld()
    const s = getStats(world)
    expect(s.nutrientCount).toBe(world.nutrients.length)
  })

  it('tick matches world tick', () => {
    const world = initWorld()
    stepWorld(world)
    stepWorld(world)
    const s = getStats(world)
    expect(s.tick).toBe(2)
  })

  it('speciesCount is at least 1 when there are cells', () => {
    const world = initWorld()
    const s = getStats(world)
    expect(s.speciesCount).toBeGreaterThanOrEqual(1)
  })

  it('speciesCount does not exceed cell count', () => {
    const world = initWorld()
    const s = getStats(world)
    expect(s.speciesCount).toBeLessThanOrEqual(s.cellCount)
  })
})

describe('stats history (ring buffer logic)', () => {
  it('accumulates stats over time', () => {
    const world = initWorld()
    const history: ReturnType<typeof getStats>[] = []
    for (let i = 0; i < 10; i++) {
      stepWorld(world)
      history.push(getStats(world))
    }
    expect(history.length).toBe(10)
    expect(history[9]!.tick).toBe(10)
    expect(history[0]!.tick).toBe(1)
  })

  it('tick strictly increases each step', () => {
    const world = initWorld()
    let prev = -1
    for (let i = 0; i < 20; i++) {
      stepWorld(world)
      const s = getStats(world)
      expect(s.tick).toBeGreaterThan(prev)
      prev = s.tick
    }
  })
})
