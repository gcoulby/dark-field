import type { CellSnapshot } from '../simulation/serialize.js'
import { traitsFrom } from '../simulation/genome.js'

export function drawBloomPass(
  bloomCtx: CanvasRenderingContext2D,
  cells: CellSnapshot[],
  worldToScreen: (wx: number, wy: number) => [number, number],
  vscale: number,
  W: number,
  H: number,
  tight: boolean,
): void {
  bloomCtx.clearRect(0, 0, W, H)

  for (const cell of cells) {
    const [sx, sy] = worldToScreen(cell.x, cell.y)
    if (sx < -100 || sx > W + 100 || sy < -100 || sy > H + 100) continue

    const t = traitsFrom(cell.genome)
    const sr = t.radius * vscale
    const ef = Math.min(1, cell.energy / t.divisionEnergy)
    const hue = (t.lineage / 4) * 360
    const sat = 50 + t.metabolism * 18
    const lit = 40 + ef * 22

    if (tight) {
      const br = sr * 1.5
      const g = bloomCtx.createRadialGradient(sx, sy, 0, sx, sy, br)
      g.addColorStop(0, `hsla(${hue},${65}%,${58}%,0.55)`)
      g.addColorStop(0.35, `hsla(${hue},${65}%,${58}%,0.22)`)
      g.addColorStop(1, `hsla(${hue},${65}%,${58}%,0)`)
      bloomCtx.beginPath()
      bloomCtx.arc(sx, sy, br, 0, Math.PI * 2)
      bloomCtx.fillStyle = g
      bloomCtx.fill()
    } else {
      const br = sr * (4 + ef * 2)
      const g = bloomCtx.createRadialGradient(sx, sy, 0, sx, sy, br)
      g.addColorStop(0, `hsla(${hue},${sat}%,${lit}%,0.25)`)
      g.addColorStop(0.25, `hsla(${hue},${sat}%,${lit}%,0.12)`)
      g.addColorStop(0.55, `hsla(${hue},${sat}%,${lit}%,0.05)`)
      g.addColorStop(1, `hsla(${hue},${sat}%,${lit}%,0)`)
      bloomCtx.beginPath()
      bloomCtx.arc(sx, sy, br, 0, Math.PI * 2)
      bloomCtx.fillStyle = g
      bloomCtx.fill()
    }
  }
}
