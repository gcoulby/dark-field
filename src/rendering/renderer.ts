import type { WorldSnapshot } from '../simulation/serialize.js'
import { drawDarkField } from './darkfield.js'
import { drawLightField } from './lightfield.js'
import { drawFluorescenceCells } from './fluorescence.js'

export type FieldMode = 'dark' | 'light' | 'fluoro'

export interface Viewport {
  vx: number   // world X at screen centre
  vy: number   // world Y at screen centre
  vscale: number
  W: number
  H: number
}

export class Renderer {
  private ctx: CanvasRenderingContext2D
  private bloomCtx: CanvasRenderingContext2D
  private fieldMode: FieldMode = 'dark'
  private selectedId: number | null = null

  constructor(canvas: HTMLCanvasElement, bloomCanvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!
    this.bloomCtx = bloomCanvas.getContext('2d')!
  }

  setFieldMode(mode: FieldMode): void {
    this.fieldMode = mode
  }

  setSelectedId(id: number | null): void {
    this.selectedId = id
  }

  render(snapshot: WorldSnapshot, vp: Viewport): void {
    const wts = (wx: number, wy: number): [number, number] => [
      (wx - vp.vx) * vp.vscale + vp.W / 2,
      (wy - vp.vy) * vp.vscale + vp.H / 2,
    ]

    if (this.fieldMode === 'dark') {
      drawDarkField(
        this.ctx,
        this.bloomCtx,
        snapshot,
        wts,
        vp.vscale,
        vp.W,
        vp.H,
        this.selectedId,
      )
    } else if (this.fieldMode === 'fluoro') {
      drawFluorescenceCells(
        this.ctx,
        snapshot,
        wts,
        vp.vscale,
        vp.W,
        vp.H,
        this.selectedId,
      )
    } else {
      drawLightField(
        this.ctx,
        snapshot,
        wts,
        vp.vscale,
        vp.W,
        vp.H,
        this.selectedId,
      )
    }
  }

  screenToWorld(sx: number, sy: number, vp: Viewport): [number, number] {
    return [
      (sx - vp.W / 2) / vp.vscale + vp.vx,
      (sy - vp.H / 2) / vp.vscale + vp.vy,
    ]
  }
}
