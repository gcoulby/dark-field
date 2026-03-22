import { describe, it, expect } from 'vitest'
import { createDebrisPool, stepDebris } from '../src/rendering/debris.js'

describe('createDebrisPool', () => {
  it('creates 220 particles', () => {
    const pool = createDebrisPool()
    expect(pool.length).toBe(220)
  })

  it('all particles start within world bounds', () => {
    const pool = createDebrisPool()
    for (const p of pool) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThanOrEqual(3200)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThanOrEqual(3200)
    }
  })

  it('particles have positive radius and alpha', () => {
    const pool = createDebrisPool()
    for (const p of pool) {
      expect(p.radius).toBeGreaterThan(0)
      expect(p.alpha).toBeGreaterThan(0)
    }
  })
})

describe('stepDebris', () => {
  it('particles remain in world bounds after 1000 steps (wraparound)', () => {
    const pool = createDebrisPool()
    for (let i = 0; i < 1000; i++) stepDebris(pool)
    for (const p of pool) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThanOrEqual(3200)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThanOrEqual(3200)
    }
  })

  it('particles move over time', () => {
    const pool = createDebrisPool()
    const before = pool.map(p => ({ x: p.x, y: p.y }))
    for (let i = 0; i < 100; i++) stepDebris(pool)
    let anyMoved = false
    for (let i = 0; i < pool.length; i++) {
      if (pool[i]!.x !== before[i]!.x || pool[i]!.y !== before[i]!.y) {
        anyMoved = true
        break
      }
    }
    expect(anyMoved).toBe(true)
  })
})
