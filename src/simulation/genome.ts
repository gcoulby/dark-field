/**
 * genome.ts — 32-bit genome encoding
 *
 * JavaScript bitwise ops treat values as signed 32-bit ints. All functions
 * use `>>> 0` (unsigned right shift) to ensure correct unsigned behaviour.
 *
 * Bit layout:
 *   ── Retained from 16-bit genome ──
 *   0-1  : adhesion type (0=none, 1=A, 2=B, 3=C)
 *   2-3  : metabolism rate index (0-3)
 *   4-5  : size index (0-3)
 *   6    : photosynthesis (0/1)
 *   7    : flagella (0/1)
 *   8-9  : division energy threshold index (0-3)
 *  10    : chemotaxis (0/1)
 *  11    : toxin (0/1)  ← also predator component (with flagella)
 *  12-13 : shape (0=round, 1=elongated, 2=spiky, 3=irregular)
 *  14-15 : lineage tag low bits (0-3)
 *
 *   ── Extended traits (bits 16-29) ──
 *  16-17 : membrane permeability (0=sealed → ×0.5 nutrient absorption, 3=open → ×1.5)
 *  18-19 : cell role (0=none, 1=wall, 2=reproductive, 3=sensor)
 *  20    : signalling emitter (0/1)
 *  21    : signalling receiver (0/1)
 *  22-23 : signal type (0-3) — channel cells communicate on
 *  24-25 : pigmentation (0-3) — used by fluorescence mode
 *  26-27 : lineage tag high bits (extends lineage to 4 bits, 0-15)
 *  28-29 : extended size modifier (0=none, 1=+10%, 2=+25%, 3=+40%)
 *  30-31 : reserved (always read as 0; future use)
 */

export const SHAPE_NAMES = ['round', 'elongated', 'spiky', 'irregular'] as const
export type ShapeName = (typeof SHAPE_NAMES)[number]

export type CellRole = 'none' | 'wall' | 'reproductive' | 'sensor'
const CELL_ROLES: CellRole[] = ['none', 'wall', 'reproductive', 'sensor']

export interface Traits {
  // Core traits (bits 0-15)
  adhesion: number
  metabolism: number
  radius: number
  photo: 0 | 1
  flagella: 0 | 1
  divisionEnergy: number
  chemotaxis: 0 | 1
  toxin: 0 | 1
  shape: 0 | 1 | 2 | 3
  lineage: number        // 4-bit extended lineage (0-15)

  // Extended traits (bits 16-29)
  permeability: number   // 0-3 → nutrient absorption multiplier 0.5-1.5
  role: CellRole
  emitter: 0 | 1
  receiver: 0 | 1
  signalType: number     // 0-3
  pigmentation: number   // 0-3

  // Derived flags
  isPredator: boolean
}

export interface ShapePoint {
  x: number
  y: number
}

/** Unsigned right shift — ensures correct behaviour for bits 16-31 */
export function getBits(genome: number, start: number, length: number): number {
  return (genome >>> start) & ((1 << length) - 1)
}

export function getBit(genome: number, n: number): 0 | 1 {
  return ((genome >>> n) & 1) as 0 | 1
}

const METABOLISM_VALUES = [0.28, 0.55, 0.95, 1.5] as const
const RADIUS_BASE_VALUES = [4, 6, 8.5, 12] as const
const DIVISION_ENERGY_VALUES = [80, 120, 170, 230] as const
const PERMEABILITY_MULT = [0.5, 0.85, 1.15, 1.5] as const
const SIZE_MODIFIER = [1.0, 1.1, 1.25, 1.4] as const

export function traitsFrom(genome: number): Traits {
  const flagella = getBit(genome, 7)
  const toxin = getBit(genome, 11)
  const lineageLow = getBits(genome, 14, 2)
  const lineageHigh = getBits(genome, 26, 2)
  const lineage = (lineageHigh << 2) | lineageLow

  const baseRadius = RADIUS_BASE_VALUES[getBits(genome, 4, 2)]!
  const sizeMod = SIZE_MODIFIER[getBits(genome, 28, 2)]!
  const radius = baseRadius * sizeMod

  return {
    adhesion: getBits(genome, 0, 2),
    metabolism: METABOLISM_VALUES[getBits(genome, 2, 2)]!,
    radius,
    photo: getBit(genome, 6),
    flagella,
    divisionEnergy: DIVISION_ENERGY_VALUES[getBits(genome, 8, 2)]!,
    chemotaxis: getBit(genome, 10),
    toxin,
    shape: getBits(genome, 12, 2) as 0 | 1 | 2 | 3,
    lineage,

    permeability: getBits(genome, 16, 2),
    role: CELL_ROLES[getBits(genome, 18, 2)]!,
    emitter: getBit(genome, 20),
    receiver: getBit(genome, 21),
    signalType: getBits(genome, 22, 2),
    pigmentation: getBits(genome, 24, 2),

    isPredator: flagella === 1 && toxin === 1,
  }
}

export function permeabilityMultiplier(permeability: number): number {
  return PERMEABILITY_MULT[permeability] ?? 1.0
}

export function mutate(genome: number): number {
  let g = genome >>> 0 // ensure unsigned
  for (let i = 0; i < 30; i++) { // bits 0-29; 30-31 reserved
    if (Math.random() < 0.018) g = (g ^ (1 << i)) >>> 0
  }
  return g
}

export function randomGenome(): number {
  // Generate a 30-bit random genome (bits 30-31 stay 0)
  const lo = Math.floor(Math.random() * 0x10000)  // bits 0-15
  const hi = Math.floor(Math.random() * 0x4000)   // bits 16-29 (14 bits)
  return ((hi << 16) | lo) >>> 0
}

export function buildShapePoints(
  shapeIdx: number,
  radius: number,
  genome: number,
): ShapePoint[] | null {
  if (shapeIdx === 0) return null

  const pts: ShapePoint[] = []

  if (shapeIdx === 1) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      pts.push({ x: Math.cos(a) * radius * 1.1, y: Math.sin(a) * radius * 0.6 })
    }
    return pts
  }

  if (shapeIdx === 2) {
    const spikes = 5 + (genome & 3)
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i / (spikes * 2)) * Math.PI * 2
      const r = i % 2 === 0 ? radius * 1.55 : radius * 0.5
      pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r })
    }
    return pts
  }

  if (shapeIdx === 3) {
    const sides = 7 + (genome & 3)
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 + ((genome >> i) & 1) * 0.28
      const r = radius * (0.65 + 0.65 * Math.abs(Math.sin(i * 1.8 + genome * 0.01)))
      pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r })
    }
    return pts
  }

  return null
}
