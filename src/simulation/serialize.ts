/**
 * Lightweight snapshot of world state for transfer from worker to main thread.
 * Only includes data the renderer needs — no bond references (cycles can't serialize).
 */

import type { WorldState } from './world.js'
import type { SimStats } from './stats.js'
import { getStats } from './stats.js'

export interface CellSnapshot {
  id: number
  x: number
  y: number
  genome: number
  energy: number
  age: number
  generation: number
  phase: number
  rotation: number
  bondCount: number
  alive: boolean
}

export interface NutrientSnapshot {
  x: number
  y: number
  energy: number
}

export interface WorldSnapshot {
  cells: CellSnapshot[]
  nutrients: NutrientSnapshot[]
  stats: SimStats
}

export function serializeWorld(world: WorldState): WorldSnapshot {
  return {
    cells: world.cells.map(c => ({
      id: c.id,
      x: c.x,
      y: c.y,
      genome: c.genome,
      energy: c.energy,
      age: c.age,
      generation: c.generation,
      phase: c.phase,
      rotation: c.rotation,
      bondCount: c.bonds.length,
      alive: c.alive,
    })),
    nutrients: world.nutrients.map(n => ({ x: n.x, y: n.y, energy: n.energy })),
    stats: getStats(world),
  }
}
