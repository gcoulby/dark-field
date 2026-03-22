import type { Cell } from './cell.js'

export function getColony(cell: Cell): Set<Cell> {
  const visited = new Set<Cell>()
  const queue: Cell[] = [cell]
  while (queue.length > 0) {
    const c = queue.pop()!
    if (visited.has(c)) continue
    visited.add(c)
    for (const bond of c.bonds) {
      if (bond.alive && !visited.has(bond)) queue.push(bond)
    }
  }
  return visited
}

export function countColonies(cells: Cell[]): number {
  const seen = new Set<Cell>()
  let n = 0
  for (const c of cells) {
    if (seen.has(c)) continue
    if (c.bonds.length > 0) {
      const col = getColony(c)
      if (col.size > 1) {
        for (const m of col) seen.add(m)
        n++
      }
    }
  }
  return n
}
