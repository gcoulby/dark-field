/**
 * islands.ts — Barrier (AABB) geometry and collision helpers
 *
 * Barriers are axis-aligned rectangles in world space. Cells and nutrients
 * cannot pass through them. Different isolated regions create independent
 * gene pools — selection pressure for speciation.
 */

export interface Barrier {
  id: number
  x: number  // left edge (world units)
  y: number  // top edge (world units)
  w: number  // width
  h: number  // height
}

let _barrierId = 0
export function makeBarrier(x: number, y: number, w: number, h: number): Barrier {
  return { id: _barrierId++, x, y, w: Math.abs(w), h: Math.abs(h) }
}

/** Closest point on AABB to point (px, py) */
export function closestPointOnBarrier(
  b: Barrier,
  px: number,
  py: number,
): { x: number; y: number } {
  return {
    x: Math.max(b.x, Math.min(b.x + b.w, px)),
    y: Math.max(b.y, Math.min(b.y + b.h, py)),
  }
}

/** True if circle (cx, cy, r) overlaps barrier */
export function circleOverlapsBarrier(b: Barrier, cx: number, cy: number, r: number): boolean {
  const cp = closestPointOnBarrier(b, cx, cy)
  const dx = cx - cp.x
  const dy = cy - cp.y
  return dx * dx + dy * dy < r * r
}

/**
 * Push circle out of barrier and reflect its velocity component into the barrier.
 * Returns new {x, y, vx, vy} for the circle.
 */
export function resolveCircleBarrier(
  b: Barrier,
  cx: number,
  cy: number,
  r: number,
  vx: number,
  vy: number,
): { x: number; y: number; vx: number; vy: number } {
  const cp = closestPointOnBarrier(b, cx, cy)
  const dx = cx - cp.x
  const dy = cy - cp.y
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist >= r || dist < 0.0001) {
    // Not overlapping, or centre inside barrier — handle inside case
    if (dist < 0.0001) {
      // Centre exactly on barrier edge or inside: push to nearest edge
      const toLeft = cx - b.x
      const toRight = b.x + b.w - cx
      const toTop = cy - b.y
      const toBottom = b.y + b.h - cy
      const minDist = Math.min(toLeft, toRight, toTop, toBottom)
      if (minDist === toLeft) return { x: b.x - r, y: cy, vx: -Math.abs(vx), vy }
      if (minDist === toRight) return { x: b.x + b.w + r, y: cy, vx: Math.abs(vx), vy }
      if (minDist === toTop) return { x: cx, y: b.y - r, vx, vy: -Math.abs(vy) }
      return { x: cx, y: b.y + b.h + r, vx, vy: Math.abs(vy) }
    }
    return { x: cx, y: cy, vx, vy }
  }

  const nx = dx / dist
  const ny = dy / dist
  const overlap = r - dist
  const newX = cx + nx * overlap
  const newY = cy + ny * overlap

  // Reflect velocity along collision normal
  const dot = vx * nx + vy * ny
  const newVx = vx - 2 * dot * nx * 0.5  // dampen
  const newVy = vy - 2 * dot * ny * 0.5

  return { x: newX, y: newY, vx: newVx, vy: newVy }
}

/** Push a point out of all barriers it overlaps */
export function resolvePointBarriers(
  barriers: Barrier[],
  px: number,
  py: number,
): { x: number; y: number } {
  let x = px; let y = py
  for (const b of barriers) {
    const cp = closestPointOnBarrier(b, x, y)
    const dx = x - cp.x
    const dy = y - cp.y
    if (dx === 0 && dy === 0) {
      // Inside barrier — push to nearest edge
      const toLeft = x - b.x
      const toRight = b.x + b.w - x
      const toTop = y - b.y
      const toBottom = b.y + b.h - y
      const minD = Math.min(toLeft, toRight, toTop, toBottom)
      if (minD === toLeft) x = b.x - 1
      else if (minD === toRight) x = b.x + b.w + 1
      else if (minD === toTop) y = b.y - 1
      else y = b.y + b.h + 1
    }
  }
  return { x, y }
}
