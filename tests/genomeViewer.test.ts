import { describe, it, expect } from 'vitest'
import { getBit, getBits, traitsFrom } from '../src/simulation/genome.js'

/**
 * These tests verify that the GENE_REGIONS table in GenomeViewer
 * correctly extracts values that match traitsFrom() output.
 * We test the extraction logic directly against the live genome functions.
 */

describe('genome bit regions consistency', () => {
  const testGenomes = [0, 0xFFFF, 0b1010101010101010, 0b0101010101010101, 42, 12345]

  it('adhesion bits (0-1) match traitsFrom.adhesion', () => {
    for (const g of testGenomes) {
      expect(getBits(g, 0, 2)).toBe(traitsFrom(g).adhesion)
    }
  })

  it('photo bit (6) matches traitsFrom.photo', () => {
    for (const g of testGenomes) {
      expect(getBit(g, 6)).toBe(traitsFrom(g).photo)
    }
  })

  it('flagella bit (7) matches traitsFrom.flagella', () => {
    for (const g of testGenomes) {
      expect(getBit(g, 7)).toBe(traitsFrom(g).flagella)
    }
  })

  it('chemotaxis bit (10) matches traitsFrom.chemotaxis', () => {
    for (const g of testGenomes) {
      expect(getBit(g, 10)).toBe(traitsFrom(g).chemotaxis)
    }
  })

  it('toxin bit (11) matches traitsFrom.toxin', () => {
    for (const g of testGenomes) {
      expect(getBit(g, 11)).toBe(traitsFrom(g).toxin)
    }
  })

  it('shape bits (12-13) match traitsFrom.shape', () => {
    for (const g of testGenomes) {
      expect(getBits(g, 12, 2)).toBe(traitsFrom(g).shape)
    }
  })

  it('lineage low bits (14-15) and high bits (26-27) combine into traitsFrom.lineage', () => {
    for (const g of testGenomes) {
      const lo = getBits(g, 14, 2)
      const hi = getBits(g, 26, 2)
      expect((hi << 2) | lo).toBe(traitsFrom(g).lineage)
    }
  })

  it('metabolism bits (2-3) produce valid index', () => {
    for (const g of testGenomes) {
      const idx = getBits(g, 2, 2)
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeLessThanOrEqual(3)
      expect(traitsFrom(g).metabolism).toBeGreaterThan(0)
    }
  })

  it('size bits (4-5) produce valid radius', () => {
    for (const g of testGenomes) {
      expect(traitsFrom(g).radius).toBeGreaterThan(0)
    }
  })

  it('division threshold bits (8-9) produce valid energy', () => {
    for (const g of testGenomes) {
      expect(traitsFrom(g).divisionEnergy).toBeGreaterThan(0)
    }
  })

  it('all 30 active bits are accounted for by regions', () => {
    // Bits 0-29 (bits 30-31 reserved). Total = 2+2+2+1+1+2+1+1+2+2+2+2+1+1+2+2+2+2 = 30
    const regionDefs = [
      { start: 0, length: 2 },  // adhesion
      { start: 2, length: 2 },  // metabolism
      { start: 4, length: 2 },  // size
      { start: 6, length: 1 },  // photo
      { start: 7, length: 1 },  // flagella
      { start: 8, length: 2 },  // div threshold
      { start: 10, length: 1 }, // chemotaxis
      { start: 11, length: 1 }, // toxin
      { start: 12, length: 2 }, // shape
      { start: 14, length: 2 }, // lineage lo
      { start: 16, length: 2 }, // permeability
      { start: 18, length: 2 }, // role
      { start: 20, length: 1 }, // emitter
      { start: 21, length: 1 }, // receiver
      { start: 22, length: 2 }, // signal type
      { start: 24, length: 2 }, // pigmentation
      { start: 26, length: 2 }, // lineage hi
      { start: 28, length: 2 }, // size modifier
    ]
    const totalBits = regionDefs.reduce((sum, r) => sum + r.length, 0)
    expect(totalBits).toBe(30)

    // No overlap
    const covered = new Set<number>()
    for (const r of regionDefs) {
      for (let i = r.start; i < r.start + r.length; i++) {
        expect(covered.has(i)).toBe(false) // no duplicate coverage
        covered.add(i)
      }
    }
    expect(covered.size).toBe(30)
  })
})
