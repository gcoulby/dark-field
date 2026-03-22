import type { WorldState } from './world.js'
import { countColonies } from './colony.js'

export interface SimStats {
  cellCount: number
  colonyCount: number
  nutrientCount: number
  maxGeneration: number
  speciesCount: number
  tick: number
}

export function getStats(world: WorldState): SimStats {
  return {
    cellCount: world.cells.length,
    colonyCount: countColonies(world.cells),
    nutrientCount: world.nutrients.length,
    maxGeneration: world.maxGen,
    speciesCount: new Set(world.cells.map(c => c.traits.lineage)).size,
    tick: world.tick,
  }
}
