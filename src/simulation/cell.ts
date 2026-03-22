import { traitsFrom, buildShapePoints, mutate, randomGenome } from './genome.js'
import type { Traits, ShapePoint } from './genome.js'

export interface Cell {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  genome: number
  traits: Traits
  shapePoints: ShapePoint[] | null
  energy: number
  age: number
  generation: number
  bonds: Cell[]
  alive: boolean
  phase: number
  rotation: number
  rotVel: number
}

let _nextId = 0

export function makeCell(
  x: number,
  y: number,
  genome?: number,
  generation?: number,
): Cell {
  const g = genome !== undefined ? genome : randomGenome()
  const traits = traitsFrom(g)
  return {
    id: _nextId++,
    x,
    y,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    genome: g,
    traits,
    shapePoints: buildShapePoints(traits.shape, traits.radius, g),
    energy: traits.divisionEnergy * 0.5,
    age: 0,
    generation: generation ?? 0,
    bonds: [],
    alive: true,
    phase: Math.random() * Math.PI * 2,
    rotation: Math.random() * Math.PI * 2,
    rotVel: (Math.random() - 0.5) * 0.02,
  }
}

export function divideCell(parent: Cell): Cell {
  const childGenome = mutate(parent.genome)
  const childGen = parent.generation + 1
  const angle = Math.random() * Math.PI * 2
  const sep = parent.traits.radius * 2.3
  const child = makeCell(
    parent.x + Math.cos(angle) * sep,
    parent.y + Math.sin(angle) * sep,
    childGenome,
    childGen,
  )
  child.energy = parent.energy * 0.45
  parent.energy *= 0.45
  return child
}
