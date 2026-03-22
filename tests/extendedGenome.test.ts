import { describe, it, expect } from 'vitest'
import { getBits, getBit, traitsFrom, randomGenome, mutate, permeabilityMultiplier } from '../src/simulation/genome.js'

describe('extended genome — bit extraction (bits 16-29)', () => {
  // A genome with all extended bits set: bits 16-29 = 0b11_1111_1111_1111 = 0x3FFF shifted to 16
  const EXTENDED_ALL = (0x3FFF << 16) >>> 0   // bits 16-29 all 1
  const EXTENDED_NONE = 0x0000FFFF             // bits 16-29 all 0

  it('permeability bits (16-17) extracted correctly', () => {
    expect(getBits(EXTENDED_NONE, 16, 2)).toBe(0)
    expect(getBits(EXTENDED_ALL, 16, 2)).toBe(3)
    // Only bit 16 set
    const g = (1 << 16) >>> 0
    expect(getBits(g, 16, 2)).toBe(1)
  })

  it('role bits (18-19) extracted correctly', () => {
    expect(getBits(EXTENDED_NONE, 18, 2)).toBe(0)
    expect(getBits(EXTENDED_ALL, 18, 2)).toBe(3)
    const g = (2 << 18) >>> 0
    expect(getBits(g, 18, 2)).toBe(2)
  })

  it('emitter bit (20) extracted correctly', () => {
    expect(getBit(EXTENDED_NONE, 20)).toBe(0)
    expect(getBit(EXTENDED_ALL, 20)).toBe(1)
    const g = (1 << 20) >>> 0
    expect(getBit(g, 20)).toBe(1)
  })

  it('receiver bit (21) extracted correctly', () => {
    expect(getBit(EXTENDED_NONE, 21)).toBe(0)
    expect(getBit(EXTENDED_ALL, 21)).toBe(1)
  })

  it('signalType bits (22-23) extracted correctly', () => {
    expect(getBits(EXTENDED_NONE, 22, 2)).toBe(0)
    expect(getBits(EXTENDED_ALL, 22, 2)).toBe(3)
    const g = (1 << 22) >>> 0
    expect(getBits(g, 22, 2)).toBe(1)
  })

  it('pigmentation bits (24-25) extracted correctly', () => {
    expect(getBits(EXTENDED_NONE, 24, 2)).toBe(0)
    expect(getBits(EXTENDED_ALL, 24, 2)).toBe(3)
  })

  it('lineage high bits (26-27) extracted correctly', () => {
    expect(getBits(EXTENDED_NONE, 26, 2)).toBe(0)
    expect(getBits(EXTENDED_ALL, 26, 2)).toBe(3)
    const g = (2 << 26) >>> 0
    expect(getBits(g, 26, 2)).toBe(2)
  })

  it('size modifier bits (28-29) extracted correctly', () => {
    expect(getBits(EXTENDED_NONE, 28, 2)).toBe(0)
    expect(getBits(EXTENDED_ALL, 28, 2)).toBe(3)
  })
})

describe('traitsFrom — extended traits', () => {
  it('permeability is 0-3', () => {
    for (let p = 0; p < 4; p++) {
      const g = (p << 16) >>> 0
      expect(traitsFrom(g).permeability).toBe(p)
    }
  })

  it('role maps correctly', () => {
    const roles = ['none', 'wall', 'reproductive', 'sensor'] as const
    for (let r = 0; r < 4; r++) {
      const g = (r << 18) >>> 0
      expect(traitsFrom(g).role).toBe(roles[r])
    }
  })

  it('emitter and receiver flags', () => {
    const emitterG = (1 << 20) >>> 0
    expect(traitsFrom(emitterG).emitter).toBe(1)
    expect(traitsFrom(0).emitter).toBe(0)

    const receiverG = (1 << 21) >>> 0
    expect(traitsFrom(receiverG).receiver).toBe(1)
    expect(traitsFrom(0).receiver).toBe(0)
  })

  it('signalType is 0-3', () => {
    for (let s = 0; s < 4; s++) {
      const g = (s << 22) >>> 0
      expect(traitsFrom(g).signalType).toBe(s)
    }
  })

  it('pigmentation is 0-3', () => {
    for (let p = 0; p < 4; p++) {
      const g = (p << 24) >>> 0
      expect(traitsFrom(g).pigmentation).toBe(p)
    }
  })

  it('4-bit lineage combines low (14-15) and high (26-27) bits', () => {
    // lineageLow=3, lineageHigh=2 → lineage = (2<<2)|3 = 11
    const g = ((2 << 26) | (3 << 14)) >>> 0
    expect(traitsFrom(g).lineage).toBe(11)
    // All zero → lineage=0
    expect(traitsFrom(0).lineage).toBe(0)
    // lineageLow=3, lineageHigh=3 → lineage=15
    const maxG = ((3 << 26) | (3 << 14)) >>> 0
    expect(traitsFrom(maxG).lineage).toBe(15)
  })

  it('size modifier scales radius', () => {
    // size index 2 (radius 8.5) with no size mod vs +40% mod
    const base = (2 << 4) >>> 0                   // size=2, sizemod=0
    const modded = ((3 << 28) | (2 << 4)) >>> 0   // size=2, sizemod=3 (+40%)
    const baseTraits = traitsFrom(base)
    const moddedTraits = traitsFrom(modded)
    expect(moddedTraits.radius).toBeGreaterThan(baseTraits.radius)
    expect(moddedTraits.radius / baseTraits.radius).toBeCloseTo(1.4, 5)
  })
})

describe('permeabilityMultiplier', () => {
  it('returns correct multipliers for each level', () => {
    expect(permeabilityMultiplier(0)).toBe(0.5)
    expect(permeabilityMultiplier(1)).toBe(0.85)
    expect(permeabilityMultiplier(2)).toBe(1.15)
    expect(permeabilityMultiplier(3)).toBe(1.5)
  })

  it('falls back to 1.0 for out-of-range values', () => {
    expect(permeabilityMultiplier(99)).toBe(1.0)
  })
})

describe('randomGenome — 30-bit range', () => {
  it('always produces values in [0, 0x3FFFFFFF]', () => {
    for (let i = 0; i < 200; i++) {
      const g = randomGenome()
      expect(g).toBeGreaterThanOrEqual(0)
      expect(g).toBeLessThanOrEqual(0x3FFFFFFF)
      expect(Number.isInteger(g)).toBe(true)
    }
  })

  it('bits 30-31 are always 0', () => {
    for (let i = 0; i < 200; i++) {
      const g = randomGenome()
      expect(getBit(g, 30)).toBe(0)
      expect(getBit(g, 31)).toBe(0)
    }
  })

  it('produces variety across the full 30-bit range', () => {
    const genomes = Array.from({ length: 50 }, () => randomGenome())
    const withHighBits = genomes.filter(g => g > 0xFFFF)
    expect(withHighBits.length).toBeGreaterThan(0) // some should use bits 16-29
  })
})

describe('mutate — 30-bit constraint', () => {
  it('never sets bits 30-31', () => {
    for (let i = 0; i < 100; i++) {
      const g = randomGenome()
      const m = mutate(g)
      expect(getBit(m, 30)).toBe(0)
      expect(getBit(m, 31)).toBe(0)
    }
  })

  it('can mutate extended bits (16-29)', () => {
    // With mutation rate 0.018 per bit over 30 bits, ~0.54 expected flips per call
    // Run 300 times starting from 0 — some should have bits 16-29 flipped
    let anyExtended = false
    for (let i = 0; i < 300; i++) {
      const m = mutate(0)
      if (m > 0xFFFF) { anyExtended = true; break }
    }
    expect(anyExtended).toBe(true)
  })
})
