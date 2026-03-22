import { describe, it, expect } from 'vitest'
import { getBit, getBits, traitsFrom, mutate, buildShapePoints } from '../src/simulation/genome.js'

describe('getBits', () => {
  it('extracts correct bits', () => {
    // 0b1100 = 12; bits 2-3 = 0b11 = 3
    expect(getBits(0b1100, 2, 2)).toBe(3)
    expect(getBits(0b0011, 0, 2)).toBe(3)
    expect(getBits(0b1010, 1, 2)).toBe(1) // bits 1-2 of 0b1010 = 0b01 = 1
  })

  it('handles single bit extraction', () => {
    expect(getBits(0b1, 0, 1)).toBe(1)
    expect(getBits(0b0, 0, 1)).toBe(0)
  })
})

describe('getBit', () => {
  it('returns correct single bit', () => {
    expect(getBit(0b1010, 1)).toBe(1)
    expect(getBit(0b1010, 0)).toBe(0)
    expect(getBit(0b1010, 3)).toBe(1)
  })
})

describe('traitsFrom', () => {
  it('produces valid traits for genome 0', () => {
    const t = traitsFrom(0)
    expect(t.adhesion).toBe(0)
    expect(t.metabolism).toBeGreaterThan(0)
    expect(t.radius).toBeGreaterThan(0)
    expect([0, 1]).toContain(t.photo)
    expect([0, 1]).toContain(t.flagella)
    expect(t.divisionEnergy).toBeGreaterThan(0)
    expect(t.shape).toBeGreaterThanOrEqual(0)
    expect(t.shape).toBeLessThanOrEqual(3)
    expect(t.lineage).toBeGreaterThanOrEqual(0)
    expect(t.lineage).toBeLessThanOrEqual(3)
  })

  it('produces valid traits for genome 0xFFFF', () => {
    const t = traitsFrom(0xFFFF)
    expect(t.metabolism).toBeGreaterThan(0)
    expect(t.radius).toBeGreaterThan(0)
    expect(t.divisionEnergy).toBeGreaterThan(0)
  })

  it('is deterministic for same genome', () => {
    const g = 0b1010101010101010
    expect(traitsFrom(g)).toEqual(traitsFrom(g))
  })

  it('adhesion values range 0-3', () => {
    for (let g = 0; g < 16; g++) {
      const t = traitsFrom(g)
      expect(t.adhesion).toBeGreaterThanOrEqual(0)
      expect(t.adhesion).toBeLessThanOrEqual(3)
    }
  })
})

describe('mutate', () => {
  it('always returns a valid 16-bit number', () => {
    for (let i = 0; i < 100; i++) {
      const g = (Math.random() * 65536) | 0
      const mutated = mutate(g)
      expect(mutated).toBeGreaterThanOrEqual(0)
      expect(mutated).toBeLessThanOrEqual(0xFFFF)
      expect(Number.isInteger(mutated)).toBe(true)
    }
  })

  it('is not always identical (mutation fires occasionally)', () => {
    let anyDiff = false
    const g = 0b0101010101010101
    for (let i = 0; i < 200; i++) {
      if (mutate(g) !== g) { anyDiff = true; break }
    }
    expect(anyDiff).toBe(true)
  })
})

describe('buildShapePoints', () => {
  it('returns null for round shape (0)', () => {
    expect(buildShapePoints(0, 8, 0)).toBeNull()
  })

  it('returns points for elongated (1)', () => {
    const pts = buildShapePoints(1, 8, 0)
    expect(pts).not.toBeNull()
    expect(pts!.length).toBe(12)
  })

  it('returns points for spiky (2)', () => {
    const pts = buildShapePoints(2, 8, 0)
    expect(pts).not.toBeNull()
    expect(pts!.length).toBeGreaterThan(0)
  })

  it('returns points for irregular (3)', () => {
    const pts = buildShapePoints(3, 8, 0)
    expect(pts).not.toBeNull()
    expect(pts!.length).toBeGreaterThan(0)
  })
})
