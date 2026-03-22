# Agent Log

---

## [2026-03-22] Milestone: parallax-layers

### Plan
Add a multi-layer canvas compositor so that panning feels like a real microscope stage: deep layers drift slower, foreground layers move at full speed.

**Layer stack (back to front):**
- **Layer 0** (parallax 0.15): Slow-drifting debris particles — tiny bright specks that look like out-of-focus matter in the optical path. They drift slowly in world space and move at 15% of the pan speed so they feel deep.
- **Layer 1** (parallax 0.45): Nutrient wash — a semi-transparent colour overlay derived from nutrient concentration. Rendered as a low-resolution heatmap blurred to give a chemical-gradient feel.
- **Layer 2** (parallax 1.0): Main cell layer — existing darkfield/lightfield renderer.
- **Layer 3** (parallax 1.05): Colony membranes — convex-hull polygons per colony, slightly ahead of cells to feel like extracellular matrix on top.
- **Layer 4** (parallax 1.0, no offset): HUD overlays — selection ring, inspector highlights, fixed-position UI (not offset by world pan).

**Implementation plan:**
1. `src/rendering/layers.ts` — `LayerCompositor` class. Owns 5 `<canvas>` elements (or off-screen canvases composited onto one visible canvas). Exposes `render(snapshot, vp)` which calls each layer renderer in order and composites onto the main canvas.
2. `src/rendering/debris.ts` — `DebrisLayer`: manages a pool of ~200 debris particles with their own slow world-space drift. Rendered on Layer 0.
3. `src/rendering/nutrientWash.ts` — `NutrientWashLayer`: bins nutrients into a coarse grid (e.g. 32x32 cells), maps density to colour, renders as large soft blobs. Layer 1.
4. Colony membrane layer: extract from darkfield.ts into `src/rendering/colony.ts` renderer. Use a proper convex hull (gift-wrap on the set of cell positions in a colony). Layer 3.
5. `App.tsx`: replace the two `<canvas>` elements with a single `<canvas>` (the compositor renders to it via offscreen layers).

**Parallax math:**
Each layer has a `parallaxFactor` f. The layer-adjusted viewport shifts the world origin by:
```
layerVx = vp.vx * f + (1 - f) * WORLD_W/2
layerVy = vp.vy * f + (1 - f) * WORLD_H/2
```
So at f=0: layer stays centred regardless of pan (purely decorative). At f=1: moves with world exactly. At f=1.05: moves slightly faster (foreground feel).

**Tests to write:**
- `tests/parallax.test.ts` — parallax transform math: at f=1 layerVx === vx; at f=0 layerVx === WORLD_W/2; linearity.
- `tests/debris.test.ts` — debris particles stay in bounds after 1000 steps.

### Implementation notes
- `LayerCompositor` uses `OffscreenCanvas` for all 5 layers + 1 bloom scratch, then composites onto the single visible canvas each frame.
- `OffscreenCanvasRenderingContext2D` shares the same API as `CanvasRenderingContext2D` at runtime; casted where TypeScript requires it (gradient creation, fillStyle, strokeStyle).
- Colony grouping in the membrane layer is approximated by proximity+adhesion type (bond graph not available in snapshot). This is accurate enough for visual purposes; true bond graph edges will be added in the islands milestone when the serialisation format is revisited.
- The parallax for the nutrient wash layer uses `multiply` blend in lightfield mode and `screen` in darkfield, giving a subtle darkening effect over the background rather than a brightening one.
- Worker URL path in `useSimulation.ts` corrected to `../../workers/sim.worker.ts` (relative to the hook file).

### Test results
50/50 tests passing across 6 test files. New files: `tests/parallax.test.ts` (7 tests), `tests/debris.test.ts` (5 tests).

### Evaluation
**Achieved:**
- Full 5-layer parallax compositor with `OffscreenCanvas`
- Layer 0 debris: 220 out-of-focus drifting particles at parallax 0.15
- Layer 1 nutrient wash: density-binned heatmap blobs at parallax 0.45
- Layer 2 cells: extracted into `cellLayer.ts`, parallax 1.0
- Layer 3 colony membranes: convex-hull polygons using gift-wrapping, parallax 1.05
- Layer 4 bloom: screen-blend glow, parallax 1.0
- Pan/zoom now drives all layers simultaneously with independent offsets — visible parallax effect on pan

**Known issues:**
- Colony grouping is approximated; will improve when snapshot includes bond edges.

### Next milestone
**islands-barriers** — Polygon barrier geometry. Plan:
- Barriers defined as polygonal regions in world space
- Cell-barrier collision (ray-AABB or polygon-circle test per step)
- Nutrient diffusion blocked by barriers (lazy — just skip nutrient movement through barrier bounds)
- Visual treatment: barriers rendered as opaque regions in both field modes, with a distinctive texture
- Barrier editor: click+drag to place rectangular walls; right-click to remove

---

This file is maintained by the agent. Every milestone gets an entry before work begins (Plan) and after it completes (Evaluation). Do not edit manually unless correcting a factual error.

---

<!-- Agent appends entries below in reverse chronological order (newest at top) -->

## [2026-03-22] Milestone: scaffold

### Plan
Port the `life-sim.html` single-file prototype into a clean Vite/React/TypeScript project with a Web Worker architecture. All existing behaviour must be preserved.

**Modules to create:**
- `src/simulation/genome.ts` — 16-bit genome encoding, `getBit`, `getBits`, `traitsFrom`, `mutate`, `buildShapePoints`
- `src/simulation/cell.ts` — `Cell` type, `makeCell`
- `src/simulation/nutrients.ts` — `Nutrient` type, `makeNutrient`
- `src/simulation/physics.ts` — spatial grid (`buildGrid`, `nearby`), constants
- `src/simulation/colony.ts` — `getColony`, `countColonies`
- `src/simulation/world.ts` — `WorldState`, `initWorld`, `stepWorld`, closed-system step function
- `src/simulation/stats.ts` — `getStats` for HUD data
- `src/rendering/shapes.ts` — `drawShape`
- `src/rendering/darkfield.ts` — `drawDarkField`
- `src/rendering/lightfield.ts` — `drawLightField`
- `src/rendering/bloom.ts` — bloom two-pass helper
- `src/rendering/renderer.ts` — orchestrates layers, owns both canvases
- `src/workers/sim.worker.ts` — runs `stepWorld` in a loop, postMessages serialised snapshots
- `src/ui/hooks/useSimulation.ts` — React hook wrapping the worker
- `src/App.tsx` — canvas mount, controls, HUD, inspector
- `src/main.tsx` — React entry point

**Tests to write:**
- `tests/genome.test.ts` — getBits, getBit, traitsFrom, mutate (property: always valid 16-bit output)
- `tests/cell.test.ts` — makeCell produces valid initial state
- `tests/physics.test.ts` — buildGrid / nearby correctness
- `tests/world.test.ts` — stepWorld conserves energy (nutrients + cell energy before ≈ after + tolerance for photosynthesis)

**Worker protocol:**
- Main → Worker: `{ type: 'init' | 'step' | 'pause' | 'seed' | 'inject' | 'kill' | 'addCluster', payload? }`
- Worker → Main: `{ type: 'snapshot', world: SerializedWorld }`

### Implementation notes
- Simulation state (cells[], nutrients[]) lives entirely in the worker. Main thread only receives a lightweight snapshot each frame for rendering.
- Serialized cells include only what the renderer needs: x, y, genome, energy, age, generation, phase, rotation, bondCount, alive.
- The worker uses `setInterval` for the sim loop and `postMessage` to send snapshots. The main thread drives rendering via `requestAnimationFrame`.
- Speed multiplier is implemented by running N steps per rAF tick on the main thread (it sends N step commands).

### Test results
38/38 tests passing across 4 test files:
- `tests/genome.test.ts` — 13 tests (getBit, getBits, traitsFrom, mutate, buildShapePoints)
- `tests/cell.test.ts` — 8 tests (makeCell, divideCell)
- `tests/physics.test.ts` — 6 tests (buildGrid, nearby)
- `tests/world.test.ts` — 11 tests (initWorld, stepWorld, addCluster, seedAt, killAt, injectNutrients)

One fix during test run: `toBeOneOf` is not a Vitest built-in — replaced with `toContain` on the array side.

### Evaluation
**Achieved:**
- Full Vite/React/TypeScript project with Web Worker architecture
- All HTML prototype logic faithfully ported into typed modules: genome, cell, nutrients, physics, colony, world, stats, serialize
- Rendering split into darkfield, lightfield, bloom, shapes, renderer modules
- React App with all original controls: field mode toggle, mode buttons (observe/seed/inject/kill), speed controls, pause/step/reset, + cluster, HUD, inspector panel
- GitHub Actions deploy workflow targeting `main` → GitHub Pages
- 38 passing Vitest tests

**Not achieved / known issues:**
- Colony membrane rendering is approximated in the React port (individual bonded-cell halos instead of true convex-hull polygon per colony). This is because the serialized snapshot doesn't carry bond graph edges — only `bondCount`. The original used live object references. This is acceptable for the scaffold milestone; the colony rendering will be improved in the parallax-layers milestone when the layer system is introduced.
- Worker URL import path uses `import.meta.url` which requires Vite's worker bundling — works in dev and build, not in raw Node test environment (workers are not instantiated in tests, only pure sim logic is tested).

### Next milestone
**parallax-layers** — Multi-layer canvas compositor. Plan:
- Layer 0: slow-drifting background debris particles (out-of-focus matter, independent scroll)
- Layer 1: nutrient wash / chemical gradient colour overlay
- Layer 2: main cell layer (existing renderer)
- Layer 3: colony membranes (improve to true convex hull now that we have a layer abstraction)
- Layer 4: UI overlays
- Each layer has its own `<canvas>` element with parallax factor applied to the world→screen transform
- Pan/zoom drives all layers simultaneously with different parallax multipliers
