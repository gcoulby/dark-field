/**
 * layers.ts — Multi-layer parallax compositor
 *
 * Layer stack:
 *   0 (factor 0.15): Background debris — out-of-focus drifting particles
 *   1 (factor 0.45): Nutrient wash — chemical gradient heatmap
 *   2 (factor 1.00): Cells — main simulation layer
 *   3 (factor 1.05): Colony membranes — extracellular matrix (slightly ahead)
 *   4 (factor 1.00): Bloom glow — composited screen-blend on top of cells
 *
 * Parallax transform per layer f:
 *   layerVx = vp.vx * f + WORLD_CX * (1 - f)
 *   layerVy = vp.vy * f + WORLD_CY * (1 - f)
 *
 * At f=1.0: layer tracks world perfectly.
 * At f=0.15: layer barely moves (deep background).
 * At f=1.05: layer moves slightly faster (foreground feel).
 */

import type { WorldSnapshot } from '../simulation/serialize.js'
import type { FieldMode, Viewport } from './renderer.js'
import { drawDebrisLayer, stepDebris, createDebrisPool } from './debris.js'
import type { DebrisParticle } from './debris.js'
import { drawNutrientWash } from './nutrientWash.js'
import { drawColonyMembranes } from './colonyMembrane.js'
import { drawDarkFieldCells, drawLightFieldCells } from './cellLayer.js'
import { drawBloomPass } from './bloom.js'

export const WORLD_CX = 3200 / 2
export const WORLD_CY = 3200 / 2

const LAYER_FACTORS = [0.15, 0.45, 1.0, 1.05, 1.0] as const

export function parallaxViewport(vp: Viewport, factor: number): Viewport {
  return {
    vx: vp.vx * factor + WORLD_CX * (1 - factor),
    vy: vp.vy * factor + WORLD_CY * (1 - factor),
    vscale: vp.vscale,
    W: vp.W,
    H: vp.H,
  }
}

export function makeWorldToScreen(vp: Viewport): (wx: number, wy: number) => [number, number] {
  return (wx, wy) => [
    (wx - vp.vx) * vp.vscale + vp.W / 2,
    (wy - vp.vy) * vp.vscale + vp.H / 2,
  ]
}

export class LayerCompositor {
  private offscreens: OffscreenCanvas[]
  private offCtxs: OffscreenCanvasRenderingContext2D[]
  private bloomOffscreen: OffscreenCanvas
  private bloomCtx: OffscreenCanvasRenderingContext2D
  private debris: DebrisParticle[]
  private fieldMode: FieldMode = 'dark'
  private selectedId: number | null = null
  private mainCtx: CanvasRenderingContext2D

  constructor(canvas: HTMLCanvasElement) {
    this.mainCtx = canvas.getContext('2d')!
    const { width, height } = canvas

    // 5 offscreen canvases: debris, nutrientWash, cells, colonyMembrane, bloom
    this.offscreens = Array.from({ length: 5 }, () => new OffscreenCanvas(width, height))
    this.offCtxs = this.offscreens.map(c => c.getContext('2d')!)
    this.bloomOffscreen = new OffscreenCanvas(width, height)
    this.bloomCtx = this.bloomOffscreen.getContext('2d')!
    this.debris = createDebrisPool()
  }

  resize(W: number, H: number): void {
    for (const c of this.offscreens) { c.width = W; c.height = H }
    this.bloomOffscreen.width = W
    this.bloomOffscreen.height = H
  }

  setFieldMode(mode: FieldMode): void { this.fieldMode = mode }
  setSelectedId(id: number | null): void { this.selectedId = id }

  render(snapshot: WorldSnapshot, vp: Viewport): void {
    const { W, H } = vp

    stepDebris(this.debris)

    // Layer 0: debris background
    const vp0 = parallaxViewport(vp, LAYER_FACTORS[0])
    drawDebrisLayer(
      this.offCtxs[0]!,
      this.debris,
      makeWorldToScreen(vp0),
      vp0.vscale,
      W, H,
      this.fieldMode,
    )

    // Layer 1: nutrient wash
    const vp1 = parallaxViewport(vp, LAYER_FACTORS[1])
    drawNutrientWash(
      this.offCtxs[1]!,
      snapshot.nutrients,
      makeWorldToScreen(vp1),
      vp1.vscale,
      W, H,
      this.fieldMode,
    )

    // Layer 2: cells
    const vp2 = parallaxViewport(vp, LAYER_FACTORS[2])
    const wts2 = makeWorldToScreen(vp2)
    if (this.fieldMode === 'dark') {
      drawDarkFieldCells(this.offCtxs[2]!, snapshot, wts2, vp2.vscale, W, H, this.selectedId)
    } else {
      drawLightFieldCells(this.offCtxs[2]!, snapshot, wts2, vp2.vscale, W, H, this.selectedId)
    }

    // Layer 3: colony membranes
    const vp3 = parallaxViewport(vp, LAYER_FACTORS[3])
    drawColonyMembranes(
      this.offCtxs[3]!,
      snapshot.cells,
      makeWorldToScreen(vp3),
      vp3.vscale,
      W, H,
      this.fieldMode,
    )

    // Layer 4: bloom (screen blend, same parallax as cells)
    if (this.fieldMode === 'dark') {
      drawBloomPass(this.bloomCtx as unknown as CanvasRenderingContext2D, snapshot.cells, wts2, vp2.vscale, W, H, false)
      this.offCtxs[4]!.clearRect(0, 0, W, H)
      this.offCtxs[4]!.drawImage(this.bloomOffscreen, 0, 0)
    } else {
      this.offCtxs[4]!.clearRect(0, 0, W, H)
    }

    // Composite all layers onto main canvas
    this.mainCtx.clearRect(0, 0, W, H)

    // Layer 0: draw normally
    this.mainCtx.drawImage(this.offscreens[0]!, 0, 0)

    // Layer 1: nutrient wash (screen blend for dark, normal for light)
    if (this.fieldMode === 'dark') {
      this.mainCtx.globalCompositeOperation = 'screen'
      this.mainCtx.globalAlpha = 0.6
    } else {
      this.mainCtx.globalCompositeOperation = 'multiply'
      this.mainCtx.globalAlpha = 0.7
    }
    this.mainCtx.drawImage(this.offscreens[1]!, 0, 0)
    this.mainCtx.globalCompositeOperation = 'source-over'
    this.mainCtx.globalAlpha = 1

    // Layer 2: cells
    this.mainCtx.drawImage(this.offscreens[2]!, 0, 0)

    // Layer 3: colony membranes
    this.mainCtx.drawImage(this.offscreens[3]!, 0, 0)

    // Layer 4: bloom (screen blend)
    if (this.fieldMode === 'dark') {
      this.mainCtx.globalCompositeOperation = 'screen'
      this.mainCtx.globalAlpha = 0.65
      this.mainCtx.drawImage(this.offscreens[4]!, 0, 0)
      this.mainCtx.globalCompositeOperation = 'source-over'
      this.mainCtx.globalAlpha = 1
    }
  }
}
