import { describe, it, expect } from 'vitest'
import { parallaxViewport, makeWorldToScreen, WORLD_CX, WORLD_CY } from '../src/rendering/layers.js'
import type { Viewport } from '../src/rendering/renderer.js'

const baseVp: Viewport = { vx: 1600, vy: 1600, vscale: 1.0, W: 1920, H: 1080 }

describe('parallaxViewport', () => {
  it('at factor=1.0, returns viewport unchanged', () => {
    const vp = parallaxViewport(baseVp, 1.0)
    expect(vp.vx).toBeCloseTo(baseVp.vx)
    expect(vp.vy).toBeCloseTo(baseVp.vy)
    expect(vp.vscale).toBe(baseVp.vscale)
  })

  it('at factor=0.0, centres at WORLD_CX/WORLD_CY regardless of pan', () => {
    const vp = parallaxViewport({ ...baseVp, vx: 100, vy: 200 }, 0.0)
    expect(vp.vx).toBeCloseTo(WORLD_CX)
    expect(vp.vy).toBeCloseTo(WORLD_CY)
  })

  it('at factor=0.5, interpolates halfway between world centre and vp', () => {
    const vp = parallaxViewport({ ...baseVp, vx: 2000, vy: 2000 }, 0.5)
    expect(vp.vx).toBeCloseTo(2000 * 0.5 + WORLD_CX * 0.5)
    expect(vp.vy).toBeCloseTo(2000 * 0.5 + WORLD_CY * 0.5)
  })

  it('factor>1.0 moves viewport past world position (foreground effect)', () => {
    const vp = parallaxViewport({ ...baseVp, vx: 2000 }, 1.1)
    // layerVx = 2000 * 1.1 + WORLD_CX * (1 - 1.1) = 2200 - 160 = 2040
    expect(vp.vx).toBeGreaterThan(2000)
  })

  it('preserves vscale and dimensions', () => {
    const vp = parallaxViewport(baseVp, 0.3)
    expect(vp.vscale).toBe(baseVp.vscale)
    expect(vp.W).toBe(baseVp.W)
    expect(vp.H).toBe(baseVp.H)
  })
})

describe('makeWorldToScreen', () => {
  it('world centre maps to screen centre', () => {
    const vp: Viewport = { vx: 1000, vy: 1000, vscale: 1, W: 200, H: 100 }
    const wts = makeWorldToScreen(vp)
    const [sx, sy] = wts(1000, 1000)
    expect(sx).toBeCloseTo(100)
    expect(sy).toBeCloseTo(50)
  })

  it('scale 2 halves distances from centre', () => {
    const vp: Viewport = { vx: 0, vy: 0, vscale: 2, W: 100, H: 100 }
    const wts = makeWorldToScreen(vp)
    const [sx] = wts(10, 0)
    // (10 - 0) * 2 + 50 = 70
    expect(sx).toBeCloseTo(70)
  })
})
