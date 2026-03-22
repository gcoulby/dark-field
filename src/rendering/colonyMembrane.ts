/**
 * colonyMembrane.ts — Layer 3: colony membrane polygons
 *
 * Renders a convex hull around each colony's cells. Uses the gift-wrapping
 * (Jarvis march) algorithm on screen-space cell positions.
 *
 * In the scaffold the membranes were individual halos per bonded cell.
 * Here we get true colony outlines.
 */

import type { CellSnapshot } from '../simulation/serialize.js'
import { traitsFrom } from '../simulation/genome.js'

type WTS = (wx: number, wy: number) => [number, number]

// Jarvis march convex hull (gift wrapping)
function convexHull(pts: { x: number; y: number }[]): { x: number; y: number }[] {
  if (pts.length < 3) return pts

  // Find leftmost point
  let start = 0
  for (let i = 1; i < pts.length; i++) {
    if (pts[i]!.x < pts[start]!.x) start = i
  }

  const hull: { x: number; y: number }[] = []
  let current = start
  do {
    hull.push(pts[current]!)
    let next = (current + 1) % pts.length
    for (let i = 0; i < pts.length; i++) {
      const cross =
        (pts[next]!.x - pts[current]!.x) * (pts[i]!.y - pts[current]!.y) -
        (pts[next]!.y - pts[current]!.y) * (pts[i]!.x - pts[current]!.x)
      if (cross < 0) next = i
    }
    current = next
  } while (current !== start && hull.length <= pts.length)

  return hull
}

// Group cells into colonies by shared lineage+adhesion proximity
// (approximate — true colony detection requires the bond graph which isn't in snapshot)
function groupIntoColonies(cells: CellSnapshot[]): CellSnapshot[][] {
  // Use a union-find approach on proximity: cells within 2*maxRadius of each other
  // that share adhesion type form a colony candidate.
  const bonded = cells.filter(c => c.bondCount > 0)
  if (bonded.length === 0) return []

  const visited = new Set<number>()
  const groups: CellSnapshot[][] = []

  for (let i = 0; i < bonded.length; i++) {
    if (visited.has(i)) continue
    const cell = bonded[i]!
    const t = traitsFrom(cell.genome)
    if (t.adhesion === 0) continue

    const group: CellSnapshot[] = [cell]
    visited.add(i)
    const queue = [i]

    while (queue.length > 0) {
      const ci = queue.pop()!
      const c = bonded[ci]!
      const ct = traitsFrom(c.genome)

      for (let j = 0; j < bonded.length; j++) {
        if (visited.has(j)) continue
        const other = bonded[j]!
        const ot = traitsFrom(other.genome)
        if (ot.adhesion !== ct.adhesion) continue
        const dx = other.x - c.x
        const dy = other.y - c.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < (ct.radius + ot.radius) * 1.3) {
          visited.add(j)
          group.push(other)
          queue.push(j)
        }
      }
    }

    if (group.length >= 2) groups.push(group)
  }

  return groups
}

export function drawColonyMembranes(
  ctx: CanvasRenderingContext2D,
  cells: CellSnapshot[],
  worldToScreen: WTS,
  vscale: number,
  W: number,
  H: number,
  fieldMode: 'dark' | 'light',
): void {
  ctx.clearRect(0, 0, W, H)

  const colonies = groupIntoColonies(cells)
  if (colonies.length === 0) return

  for (const colony of colonies) {
    const t0 = traitsFrom(colony[0]!.genome)
    const hue = (t0.lineage / 4) * 360

    // Build screen-space points with radius expansion
    const pts = colony.map(cell => {
      const [sx, sy] = worldToScreen(cell.x, cell.y)
      const t = traitsFrom(cell.genome)
      const sr = t.radius * vscale
      // Expand outward from colony centroid
      return { x: sx, y: sy, sr }
    })

    // Centroid
    let cx = 0; let cy = 0
    for (const p of pts) { cx += p.x; cy += p.y }
    cx /= pts.length; cy /= pts.length

    // Expand points outward by radius
    const expanded = pts.map(p => {
      const dx = p.x - cx; const dy = p.y - cy
      const d = Math.sqrt(dx * dx + dy * dy)
      const scale = d > 0.1 ? (d + p.sr * 0.6) / d : 1
      return { x: cx + dx * scale, y: cy + dy * scale }
    })

    const hull = convexHull(expanded)
    if (hull.length < 3) continue

    // Check if any hull point is on screen
    const onScreen = hull.some(p => p.x >= -50 && p.x <= W + 50 && p.y >= -50 && p.y <= H + 50)
    if (!onScreen) continue

    ctx.beginPath()
    ctx.moveTo(hull[0]!.x, hull[0]!.y)
    for (let i = 1; i < hull.length; i++) ctx.lineTo(hull[i]!.x, hull[i]!.y)
    ctx.closePath()

    if (fieldMode === 'dark') {
      ctx.strokeStyle = `hsla(${hue},50%,65%,0.22)`
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 6])
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = `hsla(${hue},40%,30%,0.06)`
      ctx.fill()
    } else {
      ctx.strokeStyle = `hsla(${hue},60%,25%,0.20)`
      ctx.lineWidth = 1
      ctx.setLineDash([4, 6])
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = `hsla(${hue},40%,65%,0.08)`
      ctx.fill()
    }
  }
}
