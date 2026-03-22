import type { WorldState } from './world.js'
import { countColonies } from './colony.js'

export interface GenomeTally {
  genome: number
  lineage: number
  count: number
}

export interface SimStats {
  cellCount: number
  colonyCount: number
  nutrientCount: number
  maxGeneration: number
  speciesCount: number
  tick: number
  // Extended stats
  avgGeneration: number
  avgEnergy: number
  genDistribution: [number, number, number, number, number]  // 0, 1-5, 6-20, 21-100, 101+
  topGenomes: GenomeTally[]
}

export function getStats(world: WorldState): SimStats {
  const cells = world.cells
  if (cells.length === 0) {
    return {
      cellCount: 0, colonyCount: 0, nutrientCount: world.nutrients.length,
      maxGeneration: 0, speciesCount: 0, tick: world.tick,
      avgGeneration: 0, avgEnergy: 0,
      genDistribution: [0, 0, 0, 0, 0],
      topGenomes: [],
    }
  }

  let totalGen = 0
  let totalEnergy = 0
  const genDist: [number, number, number, number, number] = [0, 0, 0, 0, 0]
  const genomeCounts = new Map<number, number>()

  for (const c of cells) {
    totalGen += c.generation
    totalEnergy += c.energy
    // Generation distribution buckets: 0 | 1-5 | 6-20 | 21-100 | 101+
    if (c.generation === 0)        genDist[0]++
    else if (c.generation <= 5)   genDist[1]++
    else if (c.generation <= 20)  genDist[2]++
    else if (c.generation <= 100) genDist[3]++
    else                           genDist[4]++
    genomeCounts.set(c.genome, (genomeCounts.get(c.genome) ?? 0) + 1)
  }

  // Top 5 genomes by frequency
  const topGenomes: GenomeTally[] = [...genomeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genome, count]) => ({
      genome,
      lineage: cells.find(c => c.genome === genome)?.traits.lineage ?? 0,
      count,
    }))

  return {
    cellCount: cells.length,
    colonyCount: countColonies(cells),
    nutrientCount: world.nutrients.length,
    maxGeneration: world.maxGen,
    speciesCount: new Set(cells.map(c => c.traits.lineage)).size,
    tick: world.tick,
    avgGeneration: Math.round(totalGen / cells.length),
    avgEnergy: Math.round(totalEnergy / cells.length),
    genDistribution: genDist,
    topGenomes,
  }
}
