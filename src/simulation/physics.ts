export const GRID_SIZE = 64

export type Grid<T> = Map<number, T[]>

function cellKey(gx: number, gy: number): number {
  return gx * 10000 + gy
}

export function buildGrid<T>(
  items: T[],
  getX: (item: T) => number,
  getY: (item: T) => number,
): Grid<T> {
  const map: Grid<T> = new Map()
  for (const item of items) {
    const k = cellKey(
      Math.floor(getX(item) / GRID_SIZE),
      Math.floor(getY(item) / GRID_SIZE),
    )
    let bucket = map.get(k)
    if (!bucket) {
      bucket = []
      map.set(k, bucket)
    }
    bucket.push(item)
  }
  return map
}

export function nearby<T>(grid: Grid<T>, x: number, y: number, radius: number): T[] {
  const out: T[] = []
  const x0 = Math.floor((x - radius) / GRID_SIZE)
  const x1 = Math.floor((x + radius) / GRID_SIZE)
  const y0 = Math.floor((y - radius) / GRID_SIZE)
  const y1 = Math.floor((y + radius) / GRID_SIZE)
  for (let gx = x0; gx <= x1; gx++) {
    for (let gy = y0; gy <= y1; gy++) {
      const bucket = grid.get(cellKey(gx, gy))
      if (bucket) {
        for (const item of bucket) out.push(item)
      }
    }
  }
  return out
}
