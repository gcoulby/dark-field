import { makeCell, divideCell } from './cell.js'
import type { Cell } from './cell.js'
import { makeNutrient } from './nutrients.js'
import type { Nutrient } from './nutrients.js'
import { buildGrid, nearby } from './physics.js'
import { resolveCircleBarrier, circleOverlapsBarrier } from './islands.js'
import type { Barrier } from './islands.js'

export const WORLD_W = 3200
export const WORLD_H = 3200
const MAX_CELLS = 1800
const MAX_NUTRIENTS = 1300
const NUTRIENT_SPAWN_CHANCE = 0.4

export interface WorldState {
  cells: Cell[]
  nutrients: Nutrient[]
  barriers: Barrier[]
  tick: number
  maxGen: number
}

export function initWorld(): WorldState {
  const cells: Cell[] = []
  const nutrients: Nutrient[] = []

  for (let i = 0; i < 900; i++) {
    nutrients.push(makeNutrient(undefined, undefined, WORLD_W, WORLD_H))
  }

  const cx = WORLD_W / 2
  const cy = WORLD_H / 2
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2
    const r = 100 + Math.random() * 60
    cells.push(makeCell(cx + Math.cos(a) * r, cy + Math.sin(a) * r))
  }

  return { cells, nutrients, barriers: [], tick: 0, maxGen: 0 }
}

export function addCluster(world: WorldState, cx: number, cy: number): void {
  const base = (Math.random() * 65536) | 0
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    world.cells.push(makeCell(
      cx + Math.cos(a) * 40,
      cy + Math.sin(a) * 40,
      base,
      0,
    ))
  }
}

export function injectNutrients(world: WorldState, cx: number, cy: number, count = 35): void {
  for (let i = 0; i < count; i++) {
    world.nutrients.push(makeNutrient(
      cx + (Math.random() - 0.5) * 70,
      cy + (Math.random() - 0.5) * 70,
      WORLD_W,
      WORLD_H,
    ))
  }
}

export function killAt(world: WorldState, wx: number, wy: number, radius = 45): void {
  for (const c of world.cells) {
    if (Math.sqrt((c.x - wx) ** 2 + (c.y - wy) ** 2) < radius) {
      c.alive = false
    }
  }
}

export function seedAt(world: WorldState, wx: number, wy: number, count = 6): void {
  for (let i = 0; i < count; i++) {
    world.cells.push(makeCell(
      wx + (Math.random() - 0.5) * 35,
      wy + (Math.random() - 0.5) * 35,
    ))
  }
}

export function stepWorld(world: WorldState): void {
  world.tick++

  // Move nutrients
  for (const n of world.nutrients) {
    n.x += n.drift + (Math.random() - 0.5) * 0.35
    n.y += (Math.random() - 0.5) * 0.35
    n.x = Math.max(10, Math.min(WORLD_W - 10, n.x))
    n.y = Math.max(10, Math.min(WORLD_H - 10, n.y))
    // Nudge nutrients out of barriers
    for (const barrier of world.barriers) {
      const cp = { x: Math.max(barrier.x, Math.min(barrier.x + barrier.w, n.x)), y: Math.max(barrier.y, Math.min(barrier.y + barrier.h, n.y)) }
      if (cp.x === n.x && cp.y === n.y) {
        // Inside barrier — push to nearest edge
        const toLeft = n.x - barrier.x; const toRight = barrier.x + barrier.w - n.x
        const toTop = n.y - barrier.y; const toBottom = barrier.y + barrier.h - n.y
        const minD = Math.min(toLeft, toRight, toTop, toBottom)
        if (minD === toLeft) n.x = barrier.x - 2
        else if (minD === toRight) n.x = barrier.x + barrier.w + 2
        else if (minD === toTop) n.y = barrier.y - 2
        else n.y = barrier.y + barrier.h + 2
      }
    }
  }

  // Spontaneous nutrient spawn
  if (world.nutrients.length < MAX_NUTRIENTS && Math.random() < NUTRIENT_SPAWN_CHANCE) {
    world.nutrients.push(makeNutrient(undefined, undefined, WORLD_W, WORLD_H))
  }

  const aliveCells = world.cells.filter(c => c.alive)
  const aliveNuts = world.nutrients.filter(n => n.alive)
  const nutGrid = buildGrid(aliveNuts, n => n.x, n => n.y)
  const cellGrid = buildGrid(aliveCells, c => c.x, c => c.y)
  const newCells: Cell[] = []

  for (const cell of aliveCells) {
    const t = cell.traits
    cell.age++
    cell.phase += 0.04
    cell.rotation += cell.rotVel
    cell.vx += (Math.random() - 0.5) * 0.12
    cell.vy += (Math.random() - 0.5) * 0.12

    // Chemotaxis
    if (t.chemotaxis) {
      const ns = nearby(nutGrid, cell.x, cell.y, 130)
      let bestDist = Infinity
      let bestNut: Nutrient | null = null
      for (const n of ns) {
        if (!n.alive) continue
        const d2 = (n.x - cell.x) ** 2 + (n.y - cell.y) ** 2
        if (d2 < bestDist) { bestDist = d2; bestNut = n }
      }
      if (bestNut) {
        const d = Math.sqrt(bestDist)
        cell.vx += (bestNut.x - cell.x) / d * 0.09
        cell.vy += (bestNut.y - cell.y) / d * 0.09
      }
    }

    // Bond spring forces
    for (const b of cell.bonds) {
      if (!b.alive) continue
      const dx = b.x - cell.x
      const dy = b.y - cell.y
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d < 0.001) continue
      const target = (t.radius + b.traits.radius) * 1.1
      const force = (d - target) * 0.04
      cell.vx += (dx / d) * force
      cell.vy += (dy / d) * force
    }

    // Speed cap
    const maxSpd = t.flagella ? 1.6 : 0.9
    const spd = Math.sqrt(cell.vx ** 2 + cell.vy ** 2)
    if (spd > maxSpd) {
      cell.vx *= maxSpd / spd
      cell.vy *= maxSpd / spd
    }

    // Move
    cell.x += cell.vx
    cell.y += cell.vy

    // Wall bounce
    if (cell.x < 20) { cell.x = 20; cell.vx *= -0.5 }
    if (cell.x > WORLD_W - 20) { cell.x = WORLD_W - 20; cell.vx *= -0.5 }
    if (cell.y < 20) { cell.y = 20; cell.vy *= -0.5 }
    if (cell.y > WORLD_H - 20) { cell.y = WORLD_H - 20; cell.vy *= -0.5 }

    // Barrier collision
    for (const barrier of world.barriers) {
      if (circleOverlapsBarrier(barrier, cell.x, cell.y, t.radius)) {
        const r = resolveCircleBarrier(barrier, cell.x, cell.y, t.radius, cell.vx, cell.vy)
        cell.x = r.x; cell.y = r.y; cell.vx = r.vx; cell.vy = r.vy
      }
    }

    // Neighbour interactions (bonds + collision + toxin)
    const neighbours = nearby(cellGrid, cell.x, cell.y, t.radius * 3.5)
    cell.bonds = []
    for (const other of neighbours) {
      if (other === cell || !other.alive) continue
      const dx = other.x - cell.x
      const dy = other.y - cell.y
      const d = Math.sqrt(dx * dx + dy * dy)
      const minD = t.radius + other.traits.radius
      if (d < minD * 1.2 && d > 0.01) {
        if (t.adhesion > 0 && t.adhesion === other.traits.adhesion && d < minD * 1.15) {
          cell.bonds.push(other)
        } else if (d < minD) {
          cell.vx -= (dx / d) * (minD - d) * 0.18
          cell.vy -= (dy / d) * (minD - d) * 0.18
        }
      }
    }

    // Eat nutrients
    const nearNuts = nearby(nutGrid, cell.x, cell.y, t.radius + 14)
    for (const n of nearNuts) {
      if (!n.alive) continue
      if (Math.sqrt((n.x - cell.x) ** 2 + (n.y - cell.y) ** 2) < t.radius + 8) {
        cell.energy += n.energy * t.metabolism
        n.alive = false
      }
    }

    // Photosynthesis
    if (t.photo) cell.energy += 0.06

    // Metabolic cost
    cell.energy -= t.metabolism * t.radius * 0.013 + 0.04

    // Toxin damage to neighbours
    if (t.toxin) {
      for (const other of neighbours) {
        if (other === cell || !other.alive) continue
        if (Math.sqrt((other.x - cell.x) ** 2 + (other.y - cell.y) ** 2) < t.radius * 2.5) {
          other.energy -= 0.07
        }
      }
    }

    // Death
    if (cell.energy <= 0 || cell.age > 3500) {
      cell.alive = false
      const released = Math.floor(Math.max(0, cell.energy + t.radius) / 8)
      const count = Math.min(released + 2, 6)
      for (let r = 0; r < count; r++) {
        world.nutrients.push(makeNutrient(
          cell.x + (Math.random() - 0.5) * 22,
          cell.y + (Math.random() - 0.5) * 22,
          WORLD_W,
          WORLD_H,
        ))
      }
      continue
    }

    // Division
    if (cell.energy >= t.divisionEnergy && world.cells.length + newCells.length < MAX_CELLS) {
      const child = divideCell(cell)
      if (child.generation > world.maxGen) world.maxGen = child.generation
      newCells.push(child)
    }

    // Energy cap
    if (cell.energy > t.divisionEnergy * 1.5) cell.energy = t.divisionEnergy * 1.5
  }

  world.cells.push(...newCells)
  world.cells = world.cells.filter(c => c.alive)
  world.nutrients = world.nutrients.filter(n => n.alive)
}
