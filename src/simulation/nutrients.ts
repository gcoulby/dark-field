export interface Nutrient {
  x: number
  y: number
  energy: number
  alive: boolean
  drift: number
}

export function makeNutrient(x?: number, y?: number, worldW = 3200, worldH = 3200): Nutrient {
  return {
    x: x !== undefined ? x : Math.random() * worldW,
    y: y !== undefined ? y : Math.random() * worldH,
    energy: 8 + Math.random() * 12,
    alive: true,
    drift: (Math.random() - 0.5) * 0.25,
  }
}
