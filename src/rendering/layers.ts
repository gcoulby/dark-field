/**
 * layers.ts — Multi-layer parallax compositor
 *
 * Layer stack (back to front):
 *   0 (factor 0.15): Background debris — out-of-focus drifting particles
 *   1 (factor 1.00): Barriers — impassable walls at world parallax
 *   2 (factor 0.45): Nutrient wash — chemical gradient heatmap
 *   3 (factor 1.00): Cells — main simulation layer
 *   4 (factor 1.05): Colony membranes — extracellular matrix (slightly ahead)
 *   5 (factor 1.00): Bloom glow — screen-blend on top of cells
 *
 * Parallax transform per layer f:
 *   layerVx = vp.vx * f + WORLD_CX * (1 - f)
 *   layerVy = vp.vy * f + WORLD_CY * (1 - f)
 */

import type { WorldSnapshot } from '../simulation/serialize.js'
import type { FieldMode, Viewport } from './renderer.js'
import { drawDebrisLayer, stepDebris, createDebrisPool } from './debris.js'
import type { DebrisParticle } from './debris.js'
import { drawNutrientWash } from './nutrientWash.js'
import { drawBarrierLayer } from './barrierLayer.js'
import { drawColonyMembranes } from './colonyMembrane.js'
import { drawDarkFieldCells, drawLightFieldCells } from './cellLayer.js'
import { drawFluorescenceCells } from './fluorescence.js'
import { drawBloomPass } from './bloom.js'

export const WORLD_CX = 3200 / 2
export const WORLD_CY = 3200 / 2

// indices: 0=debris, 1=barriers, 2=nutrientWash, 3=cells, 4=colonyMembrane, 5=bloom
// Nutrient wash is at 1.0 so the heatmap aligns with cell/nutrient world positions
const LAYER_FACTORS = [0.15, 1.0, 1.0, 1.0, 1.05, 1.0] as const

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

    // 6 offscreen canvases for each layer
    this.offscreens = Array.from({ length: 6 }, () => new OffscreenCanvas(width, height))
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

    // Legacy layers accept only 'dark'|'light' — map 'fluoro' to 'dark' (black bg)
    const legacyMode = this.fieldMode === 'light' ? 'light' : 'dark'
    const isFluoro = this.fieldMode === 'fluoro'

    // Layer 0: debris background
    const vp0 = parallaxViewport(vp, LAYER_FACTORS[0])
    drawDebrisLayer(this.offCtxs[0]! as unknown as CanvasRenderingContext2D, this.debris, makeWorldToScreen(vp0), vp0.vscale, W, H, legacyMode)

    // Layer 1: barriers (world parallax = 1.0)
    const vp1 = parallaxViewport(vp, LAYER_FACTORS[1])
    drawBarrierLayer(this.offCtxs[1]! as unknown as CanvasRenderingContext2D, snapshot.barriers, makeWorldToScreen(vp1), vp1.vscale, W, H, legacyMode)

    // Layer 2: nutrient wash (same parallax as cells so heatmap aligns with nutrients)
    const vp2 = parallaxViewport(vp, LAYER_FACTORS[2])
    drawNutrientWash(this.offCtxs[2]! as unknown as CanvasRenderingContext2D, snapshot, makeWorldToScreen(vp2), vp2.vscale, W, H, legacyMode)

    // Layer 3: cells (world parallax = 1.0)
    const vp3 = parallaxViewport(vp, LAYER_FACTORS[3])
    const wts3 = makeWorldToScreen(vp3)
    if (isFluoro) {
      drawFluorescenceCells(this.offCtxs[3]! as unknown as CanvasRenderingContext2D, snapshot, wts3, vp3.vscale, W, H, this.selectedId)
    } else if (this.fieldMode === 'dark') {
      drawDarkFieldCells(this.offCtxs[3]!, snapshot, wts3, vp3.vscale, W, H, this.selectedId)
    } else {
      drawLightFieldCells(this.offCtxs[3]!, snapshot, wts3, vp3.vscale, W, H, this.selectedId)
    }

    // Layer 4: colony membranes (parallax 1.05 — slightly foreground; skip in fluoro)
    const vp4 = parallaxViewport(vp, LAYER_FACTORS[4])
    if (!isFluoro) {
      drawColonyMembranes(this.offCtxs[4]! as unknown as CanvasRenderingContext2D, snapshot.cells, makeWorldToScreen(vp4), vp4.vscale, W, H, legacyMode)
    } else {
      this.offCtxs[4]!.clearRect(0, 0, W, H)
    }

    // Layer 5: bloom scratch — active in dark and fluoro modes
    if (this.fieldMode === 'dark' || isFluoro) {
      drawBloomPass(this.bloomCtx as unknown as CanvasRenderingContext2D, snapshot.cells, wts3, vp3.vscale, W, H, false)
      this.offCtxs[5]!.clearRect(0, 0, W, H)
      this.offCtxs[5]!.drawImage(this.bloomOffscreen, 0, 0)
    } else {
      this.offCtxs[5]!.clearRect(0, 0, W, H)
    }

    // ── Composite onto main canvas ──
    this.mainCtx.clearRect(0, 0, W, H)

    // Layer 0: background + debris (opaque base)
    this.mainCtx.drawImage(this.offscreens[0]!, 0, 0)

    // Layer 1: barriers
    this.mainCtx.drawImage(this.offscreens[1]!, 0, 0)

    // Layer 2: nutrient wash — screen for dark/fluoro, multiply for light
    if (this.fieldMode === 'light') {
      this.mainCtx.globalCompositeOperation = 'multiply'
      this.mainCtx.globalAlpha = 0.7
    } else {
      this.mainCtx.globalCompositeOperation = 'screen'
      this.mainCtx.globalAlpha = isFluoro ? 0.4 : 0.6  // subtler in fluoro
    }
    this.mainCtx.drawImage(this.offscreens[2]!, 0, 0)
    this.mainCtx.globalCompositeOperation = 'source-over'
    this.mainCtx.globalAlpha = 1

    // Layer 3: cells (fluoro draws its own black bg, so it's opaque)
    this.mainCtx.drawImage(this.offscreens[3]!, 0, 0)

    // Layer 4: colony membranes
    this.mainCtx.drawImage(this.offscreens[4]!, 0, 0)

    // Layer 5: bloom (screen blend — stronger alpha in fluoro for that fluorescence bleed)
    if (this.fieldMode === 'dark' || isFluoro) {
      this.mainCtx.globalCompositeOperation = 'screen'
      this.mainCtx.globalAlpha = isFluoro ? 0.85 : 0.65
      this.mainCtx.drawImage(this.offscreens[5]!, 0, 0)
      this.mainCtx.globalCompositeOperation = 'source-over'
      this.mainCtx.globalAlpha = 1
    }
  }
}
