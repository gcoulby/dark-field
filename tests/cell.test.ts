import { describe, it, expect } from 'vitest'
import { makeCell, divideCell } from '../src/simulation/cell.js'

describe('makeCell', () => {
  it('creates a cell with valid initial state', () => {
    const cell = makeCell(100, 200)
    expect(cell.x).toBe(100)
    expect(cell.y).toBe(200)
    expect(cell.alive).toBe(true)
    expect(cell.age).toBe(0)
    expect(cell.generation).toBe(0)
    expect(cell.bonds).toEqual([])
    expect(cell.genome).toBeGreaterThanOrEqual(0)
    expect(cell.genome).toBeLessThanOrEqual(0xFFFF)
    expect(cell.energy).toBeGreaterThan(0)
    expect(cell.traits.radius).toBeGreaterThan(0)
  })

  it('respects provided genome', () => {
    const cell = makeCell(0, 0, 0b0000000011000000, 0) // flagella + photo
    expect(cell.genome).toBe(0b0000000011000000)
    expect(cell.traits.photo).toBe(1)
    expect(cell.traits.flagella).toBe(1)
  })

  it('respects provided generation', () => {
    const cell = makeCell(0, 0, undefined, 5)
    expect(cell.generation).toBe(5)
  })

  it('starts with half divisionEnergy', () => {
    const cell = makeCell(0, 0, 0)
    expect(cell.energy).toBeCloseTo(cell.traits.divisionEnergy * 0.5)
  })

  it('assigns unique IDs', () => {
    const a = makeCell(0, 0)
    const b = makeCell(0, 0)
    expect(a.id).not.toBe(b.id)
  })
})

describe('divideCell', () => {
  it('splits energy approximately in half', () => {
    const parent = makeCell(500, 500)
    parent.energy = 200
    const child = divideCell(parent)
    expect(parent.energy).toBeCloseTo(90, 0) // 200 * 0.45
    expect(child.energy).toBeCloseTo(90, 0)
  })

  it('increments generation', () => {
    const parent = makeCell(0, 0, undefined, 3)
    const child = divideCell(parent)
    expect(child.generation).toBe(4)
  })

  it('child is alive and has bonds array', () => {
    const parent = makeCell(0, 0)
    parent.energy = 300
    const child = divideCell(parent)
    expect(child.alive).toBe(true)
    expect(child.bonds).toEqual([])
  })
})
