import { describe, it, expect } from 'vitest'
import { SnapshotRing } from '../src/recording/recorder.js'
import type { WorldSnapshot } from '../src/simulation/serialize.js'

function makeSnap(tick: number): WorldSnapshot {
  return {
    cells: [],
    nutrients: [],
    barriers: [],
    stats: {
      cellCount: 0, colonyCount: 0, nutrientCount: 0, maxGeneration: 0,
      speciesCount: 0, tick, avgGeneration: 0, avgEnergy: 0,
      genDistribution: [0, 0, 0, 0, 0] as [number,number,number,number,number],
      topGenomes: [],
    },
    nutrientGrid: [],
    gridW: 0,
    gridH: 0,
  }
}

describe('SnapshotRing', () => {
  it('starts empty', () => {
    const ring = new SnapshotRing(10)
    expect(ring.length).toBe(0)
    expect(ring.capacity).toBe(10)
  })

  it('grows up to capacity', () => {
    const ring = new SnapshotRing(5)
    for (let i = 0; i < 4; i++) ring.push(makeSnap(i))
    expect(ring.length).toBe(4)
  })

  it('does not exceed capacity', () => {
    const ring = new SnapshotRing(3)
    for (let i = 0; i < 10; i++) ring.push(makeSnap(i))
    expect(ring.length).toBe(3)
  })

  it('returns items in oldest-first order', () => {
    const ring = new SnapshotRing(5)
    ring.push(makeSnap(0))
    ring.push(makeSnap(1))
    ring.push(makeSnap(2))
    expect(ring.get(0).stats.tick).toBe(0)
    expect(ring.get(1).stats.tick).toBe(1)
    expect(ring.get(2).stats.tick).toBe(2)
  })

  it('wraps around correctly — oldest entry is evicted', () => {
    const ring = new SnapshotRing(3)
    ring.push(makeSnap(0))
    ring.push(makeSnap(1))
    ring.push(makeSnap(2))
    ring.push(makeSnap(3)) // evicts tick=0
    expect(ring.length).toBe(3)
    expect(ring.get(0).stats.tick).toBe(1)
    expect(ring.get(1).stats.tick).toBe(2)
    expect(ring.get(2).stats.tick).toBe(3)
  })

  it('continues to evict correctly past multiple wraps', () => {
    const ring = new SnapshotRing(4)
    for (let i = 0; i < 12; i++) ring.push(makeSnap(i))
    expect(ring.length).toBe(4)
    // Should hold ticks 8,9,10,11
    expect(ring.get(0).stats.tick).toBe(8)
    expect(ring.get(3).stats.tick).toBe(11)
  })

  it('toArray returns all snapshots oldest-first', () => {
    const ring = new SnapshotRing(5)
    ring.push(makeSnap(10))
    ring.push(makeSnap(20))
    ring.push(makeSnap(30))
    const arr = ring.toArray()
    expect(arr.length).toBe(3)
    expect(arr[0]!.stats.tick).toBe(10)
    expect(arr[2]!.stats.tick).toBe(30)
  })

  it('get throws RangeError for out-of-bounds index', () => {
    const ring = new SnapshotRing(5)
    ring.push(makeSnap(0))
    expect(() => ring.get(-1)).toThrow(RangeError)
    expect(() => ring.get(1)).toThrow(RangeError)
  })

  it('clear resets length to 0', () => {
    const ring = new SnapshotRing(5)
    ring.push(makeSnap(0))
    ring.push(makeSnap(1))
    ring.clear()
    expect(ring.length).toBe(0)
  })

  it('can push again after clear', () => {
    const ring = new SnapshotRing(3)
    ring.push(makeSnap(0))
    ring.clear()
    ring.push(makeSnap(99))
    expect(ring.length).toBe(1)
    expect(ring.get(0).stats.tick).toBe(99)
  })

  it('capacity 1 ring keeps only the newest entry', () => {
    const ring = new SnapshotRing(1)
    ring.push(makeSnap(5))
    ring.push(makeSnap(6))
    expect(ring.length).toBe(1)
    expect(ring.get(0).stats.tick).toBe(6)
  })
})
