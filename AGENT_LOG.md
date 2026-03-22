# Agent Log

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
