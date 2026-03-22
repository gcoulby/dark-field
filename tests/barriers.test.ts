import { describe, it, expect } from 'vitest'
import {
  makeBarrier,
  closestPointOnBarrier,
  circleOverlapsBarrier,
  resolveCircleBarrier,
} from '../src/simulation/islands.js'
import { initWorld, stepWorld } from '../src/simulation/world.js'

describe('closestPointOnBarrier', () => {
  const b = makeBarrier(100, 100, 200, 200) // x:100-300, y:100-300

  it('point inside barrier returns point itself (clamped to edges is same)', () => {
    const p = closestPointOnBarrier(b, 200, 200)
    expect(p.x).toBe(200)
    expect(p.y).toBe(200)
  })

  it('point left of barrier: clamps to left edge', () => {
    const p = closestPointOnBarrier(b, 50, 200)
    expect(p.x).toBe(100)
    expect(p.y).toBe(200)
  })

  it('point right of barrier: clamps to right edge', () => {
    const p = closestPointOnBarrier(b, 400, 200)
    expect(p.x).toBe(300)
    expect(p.y).toBe(200)
  })

  it('point above barrier: clamps to top edge', () => {
    const p = closestPointOnBarrier(b, 200, 50)
    expect(p.x).toBe(200)
    expect(p.y).toBe(100)
  })

  it('point below barrier: clamps to bottom edge', () => {
    const p = closestPointOnBarrier(b, 200, 400)
    expect(p.x).toBe(200)
    expect(p.y).toBe(300)
  })

  it('corner case — top-left corner', () => {
    const p = closestPointOnBarrier(b, 50, 50)
    expect(p.x).toBe(100)
    expect(p.y).toBe(100)
  })

  it('corner case — bottom-right corner', () => {
    const p = closestPointOnBarrier(b, 400, 400)
    expect(p.x).toBe(300)
    expect(p.y).toBe(300)
  })
})

describe('circleOverlapsBarrier', () => {
  const b = makeBarrier(100, 100, 100, 100) // 100-200 x 100-200

  it('circle far away does not overlap', () => {
    expect(circleOverlapsBarrier(b, 0, 0, 5)).toBe(false)
  })

  it('circle overlapping from left overlaps', () => {
    expect(circleOverlapsBarrier(b, 95, 150, 10)).toBe(true)
  })

  it('circle centred inside overlaps', () => {
    expect(circleOverlapsBarrier(b, 150, 150, 5)).toBe(true)
  })

  it('circle just touching edge does not overlap (dist===radius)', () => {
    // Circle at x=90, centre is 10 units from left edge, radius=10 → dist=10=radius → no overlap
    expect(circleOverlapsBarrier(b, 90, 150, 10)).toBe(false)
  })
})

describe('resolveCircleBarrier', () => {
  const b = makeBarrier(100, 100, 100, 100)

  it('pushes circle out of barrier', () => {
    // Circle at left edge, overlapping by 5
    const result = resolveCircleBarrier(b, 95, 150, 10, 1, 0)
    // After resolution, circle should not overlap
    const overlaps = circleOverlapsBarrier(b, result.x, result.y, 10)
    expect(overlaps).toBe(false)
  })

  it('non-overlapping circle is unchanged', () => {
    const result = resolveCircleBarrier(b, 50, 150, 5, 1, 0)
    expect(result.x).toBe(50)
    expect(result.y).toBe(150)
    expect(result.vx).toBe(1)
    expect(result.vy).toBe(0)
  })
})

describe('barrier integration in stepWorld', () => {
  it('no cell centre is inside a barrier after 30 steps', () => {
    const world = initWorld()
    // Place a barrier in the middle of the world
    world.barriers = [makeBarrier(1500, 1500, 200, 200)]
    for (let i = 0; i < 30; i++) stepWorld(world)

    for (const cell of world.cells) {
      const b = world.barriers[0]!
      const inside = cell.x >= b.x && cell.x <= b.x + b.w && cell.y >= b.y && cell.y <= b.y + b.h
      expect(inside).toBe(false)
    }
  })
})
