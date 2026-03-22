/**
 * genome.ts — 16-bit genome encoding
 *
 * Bit layout:
 *  0-1  : adhesion type (0=none, 1=A, 2=B, 3=C)
 *  2-3  : metabolism rate index (0-3)
 *  4-5  : size index (0-3)
 *  6    : photosynthesis (0/1)
 *  7    : flagella (0/1)
 *  8-9  : division energy threshold index (0-3)
 * 10    : chemotaxis (0/1)
 * 11    : toxin (0/1)
 * 12-13 : shape (0=round, 1=elongated, 2=spiky, 3=irregular)
 * 14-15 : lineage tag (0-3)
 */

export const SHAPE_NAMES = ['round', 'elongated', 'spiky', 'irregular'] as const
export type ShapeName = (typeof SHAPE_NAMES)[number]

export interface Traits {
  adhesion: number       // 0-3
  metabolism: number     // actual rate value
  radius: number         // actual pixel radius
  photo: 0 | 1
  flagella: 0 | 1
  divisionEnergy: number // actual energy threshold
  chemotaxis: 0 | 1
  toxin: 0 | 1
  shape: 0 | 1 | 2 | 3
  lineage: number        // 0-3
}

export interface ShapePoint {
  x: number
  y: number
}

export function getBits(genome: number, start: number, length: number): number {
  return (genome >> start) & ((1 << length) - 1)
}

export function getBit(genome: number, n: number): 0 | 1 {
  return ((genome >> n) & 1) as 0 | 1
}

const METABOLISM_VALUES = [0.28, 0.55, 0.95, 1.5] as const
const RADIUS_VALUES = [4, 6, 8.5, 12] as const
const DIVISION_ENERGY_VALUES = [80, 120, 170, 230] as const

export function traitsFrom(genome: number): Traits {
  return {
    adhesion: getBits(genome, 0, 2),
    metabolism: METABOLISM_VALUES[getBits(genome, 2, 2)]!,
    radius: RADIUS_VALUES[getBits(genome, 4, 2)]!,
    photo: getBit(genome, 6),
    flagella: getBit(genome, 7),
    divisionEnergy: DIVISION_ENERGY_VALUES[getBits(genome, 8, 2)]!,
    chemotaxis: getBit(genome, 10),
    toxin: getBit(genome, 11),
    shape: getBits(genome, 12, 2) as 0 | 1 | 2 | 3,
    lineage: getBits(genome, 14, 2),
  }
}

export function mutate(genome: number): number {
  let g = genome
  for (let i = 0; i < 16; i++) {
    if (Math.random() < 0.018) g ^= 1 << i
  }
  return g & 0xffff
}

export function buildShapePoints(
  shapeIdx: number,
  radius: number,
  genome: number,
): ShapePoint[] | null {
  if (shapeIdx === 0) return null

  const pts: ShapePoint[] = []

  if (shapeIdx === 1) {
    // Elongated
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      pts.push({ x: Math.cos(a) * radius * 1.1, y: Math.sin(a) * radius * 0.6 })
    }
    return pts
  }

  if (shapeIdx === 2) {
    // Spiky
    const spikes = 5 + (genome & 3)
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i / (spikes * 2)) * Math.PI * 2
      const r = i % 2 === 0 ? radius * 1.55 : radius * 0.5
      pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r })
    }
    return pts
  }

  if (shapeIdx === 3) {
    // Irregular
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
